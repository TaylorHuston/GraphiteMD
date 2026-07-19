import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { OwnerSetupService } from '../../app/security/owner_setup_service.js'

const port = 34_000 + Math.floor(Math.random() * 1_000)
const origin = `http://127.0.0.1:${port}`
let stateDirectory: string
let workspaceRoot: string
let server: ChildProcess
let serverError = ''

async function waitForServer(): Promise<void> {
  let lastResponse = ''
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/v1/health`)
      if (response.ok) return
      lastResponse = `${response.status} ${await response.text()}`
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`GraphiteMD test server did not start: ${lastResponse}\n${serverError}`)
}

function responseCookies(response: Response): string {
  return response.headers.getSetCookie().map((value) => value.split(';', 1)[0]!).join('; ')
}

function sessionCookie(response: Response): string {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('graphitemd_session='))
  if (!cookie) throw new Error('Expected a session cookie')
  return cookie.split(';', 1)[0]!
}

function xsrfToken(cookie: string): string {
  const match = /(?:^|; )XSRF-TOKEN=([^;]+)/.exec(cookie)
  if (!match?.[1]) throw new Error('Expected an XSRF cookie')
  return decodeURIComponent(match[1])
}

async function csrfSession(): Promise<{ cookie: string; token: string }> {
  const response = await fetch(`${origin}/api/v1/auth/current`)
  const cookie = responseCookies(response)
  return { cookie, token: xsrfToken(cookie) }
}

async function loginOwner(): Promise<{ cookie: string; token: string }> {
  const anonymous = await csrfSession()
  const login = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: anonymous.cookie,
      'x-xsrf-token': anonymous.token,
    },
    body: JSON.stringify({ account: 'owner', password: 'correct horse battery staple' }),
  })
  expect(login.status).toBe(200)
  const cookie = `${responseCookies(login)}; XSRF-TOKEN=${encodeURIComponent(anonymous.token)}`
  return { cookie, token: anonymous.token }
}

beforeAll(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), 'graphitemd-http-security-'))
  workspaceRoot = await mkdtemp(join(tmpdir(), 'graphitemd-http-workspace-'))
  await mkdir(join(workspaceRoot, 'Notes'))
  await writeFile(join(workspaceRoot, 'Notes', 'Welcome.md'), '# Welcome\n', 'utf8')
  await new OwnerSetupService(stateDirectory).createOwner('correct horse battery staple')

  server = spawn(process.execPath, ['--import=@poppinss/ts-exec', 'bin/server.ts'], {
    cwd: join(import.meta.dirname, '../..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_KEY: 'graphitemd-http-test-key-that-is-long-enough',
      GRAPHITEMD_STATE_DIR: stateDirectory,
      GRAPHITEMD_WORKSPACE_ROOT: workspaceRoot,
      GRAPHITEMD_ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  server.stderr?.on('data', (chunk) => {
    serverError += String(chunk)
  })
  await waitForServer()
})

afterAll(async () => {
  server?.kill('SIGTERM')
  await Promise.all([rm(stateDirectory, { recursive: true, force: true }), rm(workspaceRoot, { recursive: true, force: true })])
})

describe('GMD-001/S1 R2 browser session authentication', () => {
  it('R2-S1 establishes an official server-owned session and protects workspace delivery', async () => {
    const anonymous = await fetch(`${origin}/api/v1/auth/current`)
    const anonymousCookie = sessionCookie(anonymous)
    const anonymousCookies = responseCookies(anonymous)
    const login = await fetch(`${origin}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: anonymousCookies, 'x-xsrf-token': xsrfToken(anonymousCookies) },
      body: JSON.stringify({ account: 'owner', password: 'correct horse battery staple' }),
    })
    expect(login.status).toBe(200)
    expect(await login.json()).toEqual({ owner: { id: 'owner' } })
    const cookie = sessionCookie(login)
    expect(cookie).not.toBe(anonymousCookie)

    const current = await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie } })
    expect(current.status).toBe(200)
    expect(await current.json()).toEqual({ owner: { id: 'owner' } })

    const workspace = await fetch(`${origin}/api/v1/workspace`, { headers: { cookie } })
    expect(workspace.status).toBe(200)
    const projection = await workspace.json()
    expect(projection.notes).toEqual([
      expect.objectContaining({ kind: 'note', displayPath: 'Notes/Welcome.md', resourceId: expect.stringMatching(/^res_/) }),
    ])
    expect(JSON.stringify(projection)).not.toContain(workspaceRoot)
  })

  it('R2-S2 returns the same generic response and no authenticated session for unknown and incorrect credentials', async () => {
    const first = await csrfSession()
    const second = await csrfSession()
    const responses = await Promise.all([
      fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie: first.cookie, 'x-xsrf-token': first.token },
        body: JSON.stringify({ account: 'nobody', password: 'correct horse battery staple' }),
      }),
      fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie: second.cookie, 'x-xsrf-token': second.token },
        body: JSON.stringify({ account: 'owner', password: 'wrong' }),
      }),
    ])
    expect(responses.map((response) => response.status)).toEqual([401, 401])
    expect(await Promise.all(responses.map((response) => response.json()))).toEqual([
      { error: { code: 'invalid_credentials', message: 'Invalid credentials.' } },
      { error: { code: 'invalid_credentials', message: 'Invalid credentials.' } },
    ])
    expect((await fetch(`${origin}/api/v1/workspace`)).status).toBe(401)
  })

  it('R2-S3 destroys the server-side session so replaying its cookie remains unauthorized', async () => {
    const authenticated = await loginOwner()
    const cookie = authenticated.cookie
    const logout = await fetch(`${origin}/api/v1/auth/logout`, {
      method: 'POST', headers: { cookie, 'x-xsrf-token': authenticated.token },
    })
    expect(logout.status).toBe(204)
    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie } })).status).toBe(401)
    expect((await fetch(`${origin}/api/v1/workspace`, { headers: { cookie } })).status).toBe(401)
  })
})

describe('GMD-002/S1 R3 exact note reading', () => {
  it('R3-S1 returns exact source metadata only for an authenticated issued resource', async () => {
    await writeFile(
      join(workspaceRoot, 'Notes', 'Welcome.md'),
      '---\r\ntitle: Welcome\r\ntags:\r\n  - start\r\n---\r\n# Welcome\r\n',
      'utf8',
    )
    const authenticated = await loginOwner()
    const inventoryResponse = await fetch(`${origin}/api/v1/workspace`, {
      headers: { cookie: authenticated.cookie },
    })
    const inventory = await inventoryResponse.json() as {
      notes: Array<{ resourceId: string; displayPath: string }>
    }
    const welcome = inventory.notes.find((note) => note.displayPath === 'Notes/Welcome.md')
    expect(welcome).toBeDefined()

    const noteResponse = await fetch(
      `${origin}/api/v1/notes/${encodeURIComponent(welcome!.resourceId)}`,
      { headers: { cookie: authenticated.cookie } },
    )
    expect(noteResponse.status).toBe(200)
    const note = await noteResponse.json()
    expect(note).toEqual({
      resourceId: welcome!.resourceId,
      displayPath: 'Notes/Welcome.md',
      source: '---\r\ntitle: Welcome\r\ntags:\r\n  - start\r\n---\r\n# Welcome\r\n',
      revision: expect.stringMatching(/^rev_[a-f0-9]{64}$/),
      yamlProperties: [
        { name: 'title', value: 'Welcome' },
        { name: 'tags', value: ['start'] },
      ],
      yamlParseError: null,
    })
    expect(JSON.stringify(note)).not.toContain(workspaceRoot)

    expect((await fetch(`${origin}/api/v1/notes/${welcome!.resourceId}`)).status).toBe(401)
  })

  it('R3-S2 rejects an unknown resource without exposing or guessing a path', async () => {
    const authenticated = await loginOwner()
    const response = await fetch(`${origin}/api/v1/notes/res_unknown`, {
      headers: { cookie: authenticated.cookie },
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: 'resource_unavailable', message: 'The requested note is unavailable.' },
    })
  })
})

describe('GMD-002/S2 authenticated confined note mutations', () => {
  it('R2-S1 and R4-S2 saves an exact revision-bound owner draft over the authenticated route', async () => {
    await writeFile(join(workspaceRoot, 'Notes', 'Welcome.md'), '# Before\r\nline\n', 'utf8')
    const authenticated = await loginOwner()
    const workspace = await (await fetch(`${origin}/api/v1/workspace`, {
      headers: { cookie: authenticated.cookie },
    })).json() as { notes: Array<{ resourceId: string; displayPath: string }> }
    const item = workspace.notes.find(({ displayPath }) => displayPath === 'Notes/Welcome.md')!
    const opened = await (await fetch(`${origin}/api/v1/notes/${item.resourceId}`, {
      headers: { cookie: authenticated.cookie },
    })).json() as { revision: string }

    const saved = await fetch(`${origin}/api/v1/notes/${item.resourceId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: authenticated.cookie, 'x-xsrf-token': authenticated.token },
      body: JSON.stringify({ expectedRevision: opened.revision, source: '# After\r\nline\n' }),
    })

    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ resourceId: item.resourceId, source: '# After\r\nline\n' })
    expect(await readFile(join(workspaceRoot, 'Notes', 'Welcome.md'), 'utf8')).toBe('# After\r\nline\n')
    expect((await fetch(`${origin}/api/v1/notes/${item.resourceId}`, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}',
    })).status).toBe(403)
  })

  it('R2-S3 returns a recoverable conflict without canonical overwrite', async () => {
    await writeFile(join(workspaceRoot, 'Notes', 'Welcome.md'), '# Opened\n', 'utf8')
    const authenticated = await loginOwner()
    const workspace = await (await fetch(`${origin}/api/v1/workspace`, {
      headers: { cookie: authenticated.cookie },
    })).json() as { notes: Array<{ resourceId: string; displayPath: string }> }
    const item = workspace.notes.find(({ displayPath }) => displayPath === 'Notes/Welcome.md')!
    const opened = await (await fetch(`${origin}/api/v1/notes/${item.resourceId}`, {
      headers: { cookie: authenticated.cookie },
    })).json() as { revision: string }
    await writeFile(join(workspaceRoot, 'Notes', 'Welcome.md'), '# External\n', 'utf8')

    const response = await fetch(`${origin}/api/v1/notes/${item.resourceId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: authenticated.cookie, 'x-xsrf-token': authenticated.token },
      body: JSON.stringify({ expectedRevision: opened.revision, source: '# Draft\n' }),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: { code: 'revision_conflict' } })
    expect(await readFile(join(workspaceRoot, 'Notes', 'Welcome.md'), 'utf8')).toBe('# External\n')
  })

  it('R3-S1 renames in place and returns the reconciled workspace identity', async () => {
    await writeFile(join(workspaceRoot, 'Notes', 'Welcome.md'), '# Rename\n', 'utf8')
    const authenticated = await loginOwner()
    const workspace = await (await fetch(`${origin}/api/v1/workspace`, {
      headers: { cookie: authenticated.cookie },
    })).json() as { notes: Array<{ resourceId: string; displayPath: string }> }
    const item = workspace.notes.find(({ displayPath }) => displayPath === 'Notes/Welcome.md')!
    const opened = await (await fetch(`${origin}/api/v1/notes/${item.resourceId}`, {
      headers: { cookie: authenticated.cookie },
    })).json() as { revision: string }

    const response = await fetch(`${origin}/api/v1/notes/${item.resourceId}/rename`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: authenticated.cookie, 'x-xsrf-token': authenticated.token },
      body: JSON.stringify({ expectedRevision: opened.revision, fileName: 'Renamed' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      note: { displayPath: 'Notes/Renamed.md', source: '# Rename\n' },
      workspace: { notes: [expect.objectContaining({ displayPath: 'Notes/Renamed.md' })] },
    })
  })
})

describe('GMD-002/S3 authenticated local search', () => {
  it('R1-S1 and R3-S1 protects host-local search and returns opaque results', async () => {
    await writeFile(join(workspaceRoot, 'Notes', 'Searchable.md'), '---\nowner: Taylor\n---\n# Searchable\nlocalneedle\n', 'utf8')
    expect((await fetch(`${origin}/api/v1/search?q=localneedle`)).status).toBe(401)
    const authenticated = await loginOwner()
    const found = await fetch(`${origin}/api/v1/search?q=localneedle`, { headers: { cookie: authenticated.cookie } })
    expect(found.status).toBe(200)
    const body = await found.json()
    expect(body).toMatchObject({ results: [{ resourceId: expect.stringMatching(/^res_/), title: 'Searchable', displayPath: 'Notes/Searchable.md', snippet: expect.any(String) }] })
    expect(JSON.stringify(body)).not.toContain(workspaceRoot)
    expect(JSON.stringify(body)).not.toContain('http')
  })

  it('R2-S1 requires XSRF proof for an explicit rebuild', async () => {
    const authenticated = await loginOwner()
    expect((await fetch(`${origin}/api/v1/search/rebuild`, { method: 'POST', headers: { cookie: authenticated.cookie } })).status).toBe(403)
    const rebuilt = await fetch(`${origin}/api/v1/search/rebuild`, { method: 'POST', headers: { cookie: authenticated.cookie, 'x-xsrf-token': authenticated.token } })
    expect(rebuilt.status).toBe(200)
    expect(await rebuilt.json()).toMatchObject({ indexed: expect.any(Number) })
  })
})

describe('GMD-003/S1 production plugin host', () => {
  it('lists and controls the bundled plugin through authenticated endpoints and persists the setting', async () => {
    expect((await fetch(`${origin}/api/v1/plugins`)).status).toBe(401)
    const authenticated = await loginOwner()
    const inventory = await fetch(`${origin}/api/v1/plugins`, { headers: { cookie: authenticated.cookie } })
    expect(inventory.status).toBe(200)
    expect(await inventory.json()).toEqual({
      plugins: [expect.objectContaining({
        id: 'system-status',
        status: 'active',
        manifest: expect.objectContaining({ permissions: ['status:read'] }),
      })],
    })

    const disabled = await fetch(`${origin}/api/v1/plugins/system-status`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie: authenticated.cookie,
        'x-xsrf-token': authenticated.token,
      },
      body: JSON.stringify({ enabled: false }),
    })
    expect(disabled.status).toBe(200)
    expect(await disabled.json()).toEqual({
      plugin: expect.objectContaining({ id: 'system-status', status: 'disabled', contributions: {} }),
    })
    expect(JSON.parse(await readFile(join(workspaceRoot, '.graphite', 'plugins.json'), 'utf8')))
      .toEqual({ schemaVersion: 1, enabled: { 'system-status': false } })
  })
})

describe('GMD-001/S1 R3 browser request protection', () => {
  it('R3-S1 rejects a state-changing authenticated request without XSRF proof and accepts valid proof', async () => {
    const authenticated = await loginOwner()
    const missingProof = await fetch(`${origin}/api/v1/auth/logout`, {
      method: 'POST', headers: { cookie: authenticated.cookie },
    })
    expect(missingProof.status).toBe(403)

    const invalidProof = await fetch(`${origin}/api/v1/auth/logout`, {
      method: 'POST', headers: { cookie: authenticated.cookie, 'x-xsrf-token': 'invalid-proof' },
    })
    expect(invalidProof.status).toBe(403)

    const stillAuthenticated = await fetch(`${origin}/api/v1/auth/current`, {
      headers: { cookie: authenticated.cookie },
    })
    expect(stillAuthenticated.status).toBe(200)

    const validProof = await fetch(`${origin}/api/v1/auth/logout`, {
      method: 'POST', headers: { cookie: authenticated.cookie, 'x-xsrf-token': authenticated.token },
    })
    expect(validProof.status).toBe(204)
  })

  it('R3-S2 grants credentialed CORS only to an exact configured origin', async () => {
    const trustedOrigin = 'http://127.0.0.1:5173'
    const trusted = await fetch(`${origin}/api/v1/auth/current`, { headers: { origin: trustedOrigin } })
    expect(trusted.headers.get('access-control-allow-origin')).toBe(trustedOrigin)
    expect(trusted.headers.get('access-control-allow-credentials')).toBe('true')

    const authenticated = await loginOwner()
    const untrusted = await fetch(`${origin}/api/v1/auth/current`, {
      headers: { origin: 'http://127.0.0.1:51730', cookie: authenticated.cookie },
    })
    expect(untrusted.status).toBe(200)
    expect(untrusted.headers.get('access-control-allow-origin')).toBeNull()
    expect(untrusted.headers.get('access-control-allow-origin')).not.toBe('*')
  })
})
