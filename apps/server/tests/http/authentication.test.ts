import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { OwnerSetupService } from '../../app/security/owner_setup_service.js'

const port = 34_000 + Math.floor(Math.random() * 1_000)
const origin = `http://127.0.0.1:${port}`
let stateDirectory: string
let workspaceRoot: string
let server: ChildProcess

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(`${origin}/api/v1/health`)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('GraphiteMD test server did not start')
}

function sessionCookie(response: Response): string {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('graphitemd_session='))
  if (!cookie) throw new Error('Expected a session cookie')
  return cookie.split(';', 1)[0]!
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
    },
    stdio: 'ignore',
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
    const login = await fetch(`${origin}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: anonymousCookie },
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
    const responses = await Promise.all([
      fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account: 'nobody', password: 'correct horse battery staple' }),
      }),
      fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
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
    const login = await fetch(`${origin}/api/v1/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ account: 'owner', password: 'correct horse battery staple' }),
    })
    const cookie = sessionCookie(login)
    const logout = await fetch(`${origin}/api/v1/auth/logout`, { method: 'POST', headers: { cookie } })
    expect(logout.status).toBe(204)
    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie } })).status).toBe(401)
    expect((await fetch(`${origin}/api/v1/workspace`, { headers: { cookie } })).status).toBe(401)
  })
})
