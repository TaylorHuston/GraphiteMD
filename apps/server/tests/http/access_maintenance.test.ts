import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { OwnerSetupService } from '../../app/security/owner_setup_service.js'
import { runOwnerReset } from '../../commands/reset_owner.js'

const port = 35_000 + Math.floor(Math.random() * 1_000)
const origin = `http://127.0.0.1:${port}`
let stateDirectory: string
let workspaceRoot: string
let server: ChildProcess
let serverError = ''

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(`${origin}/api/v1/health`)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`AnthraciteMD test server did not start\n${serverError}`)
}

function responseCookies(response: Response): string {
  return response.headers.getSetCookie().map((value) => value.split(';', 1)[0]!).join('; ')
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

async function login(password: string): Promise<{ cookie: string; token: string; response: Response }> {
  const anonymous = await csrfSession()
  const response = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: anonymous.cookie,
      'x-xsrf-token': anonymous.token,
    },
    body: JSON.stringify({ account: 'owner', password }),
  })
  return {
    cookie: `${responseCookies(response)}; XSRF-TOKEN=${encodeURIComponent(anonymous.token)}`,
    token: anonymous.token,
    response,
  }
}

beforeAll(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), 'anthracitemd-access-maintenance-'))
  workspaceRoot = await mkdtemp(join(tmpdir(), 'anthracitemd-access-workspace-'))
  await mkdir(join(workspaceRoot, 'Notes'))
  await writeFile(join(workspaceRoot, 'Notes', 'Welcome.md'), '# Welcome\n', 'utf8')
  await new OwnerSetupService(stateDirectory).createOwner('original password')

  server = spawn(process.execPath, ['--import=@poppinss/ts-exec', 'bin/server.ts'], {
    cwd: join(import.meta.dirname, '../..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_KEY: 'anthracitemd-access-test-key-that-is-long-enough',
      ANTHRACITEMD_STATE_DIR: stateDirectory,
      ANTHRACITEMD_WORKSPACE_ROOT: workspaceRoot,
      ANTHRACITEMD_ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
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
  await Promise.all([
    rm(stateDirectory, { recursive: true, force: true }),
    rm(workspaceRoot, { recursive: true, force: true }),
  ])
})

describe('AMD-001/S2 R1 in-app password change', () => {
  it('R1-S1 requires the replacement password and invalidates every existing session', async () => {
    const first = await login('original password')
    const second = await login('original password')
    expect(first.response.status).toBe(200)
    expect(second.response.status).toBe(200)

    const changed = await fetch(`${origin}/api/v1/auth/password`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie: first.cookie,
        'x-xsrf-token': first.token,
      },
      body: JSON.stringify({ currentPassword: 'original password', password: 'replacement password' }),
    })
    expect(changed.status).toBe(204)

    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie: first.cookie } })).status).toBe(401)
    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie: second.cookie } })).status).toBe(401)
    expect((await login('original password')).response.status).toBe(401)
    expect((await login('replacement password')).response.status).toBe(200)
  })

  it('R1-S2 rejects an incorrect current password without changing credentials or sessions', async () => {
    const authenticated = await login('replacement password')
    expect(authenticated.response.status).toBe(200)

    const rejected = await fetch(`${origin}/api/v1/auth/password`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie: authenticated.cookie,
        'x-xsrf-token': authenticated.token,
      },
      body: JSON.stringify({ currentPassword: 'incorrect password', password: 'unwanted password' }),
    })
    expect(rejected.status).toBe(401)
    expect(await rejected.json()).toEqual({
      error: { code: 'invalid_credentials', message: 'Invalid credentials.' },
    })

    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie: authenticated.cookie } })).status).toBe(200)
    expect((await login('replacement password')).response.status).toBe(200)
    expect((await login('unwanted password')).response.status).toBe(401)
  })

  it('R1-S2 rate-limits repeated current-password guesses from one source', async () => {
    const authenticated = await login('replacement password')
    expect(authenticated.response.status).toBe(200)

    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch(`${origin}/api/v1/auth/password`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: authenticated.cookie,
          'x-xsrf-token': authenticated.token,
        },
        body: JSON.stringify({ currentPassword: `wrong-${attempt}`, password: 'unwanted password' }),
      })
      statuses.push(response.status)
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429, 429])
    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie: authenticated.cookie } })).status).toBe(200)
  })
})

describe('AMD-001/S2 R2 host-local password reset', () => {
  it('R2-S1 resets the credential and invalidates every persisted session', async () => {
    const first = await login('replacement password')
    const second = await login('replacement password')
    expect(first.response.status).toBe(200)
    expect(second.response.status).toBe(200)

    const resetPassword = 'host recovered password'
    const exitCode = await runOwnerReset(
      {
        confirm: async () => true,
        secure: async () => resetPassword,
        info: () => {},
        warning: () => {},
      },
      new OwnerSetupService(stateDirectory)
    )
    expect(exitCode).toBe(0)

    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie: first.cookie } })).status).toBe(401)
    expect((await fetch(`${origin}/api/v1/auth/current`, { headers: { cookie: second.cookie } })).status).toBe(401)
    expect((await login('replacement password')).response.status).toBe(401)
    expect((await login(resetPassword)).response.status).toBe(200)
  })
})
