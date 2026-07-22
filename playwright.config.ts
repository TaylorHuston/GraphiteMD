import { defineConfig, devices } from '@playwright/test'
import { e2eState, e2eWorkspace } from './playwright.paths.js'

const productionPort = 4387
const productionOrigin = `http://127.0.0.1:${productionPort}`

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, retries: 0,
  timeout: 45_000, expect: { timeout: 10_000 }, reporter: 'line',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: { baseURL: productionOrigin, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
      command: 'pnpm build && NODE_ENV=test GRAPHITEMD_ASSISTANT_TEST_RUNTIME=grounded node --import=tsx --conditions=graphitemd-production tests/e2e/start-production-server.ts', url: `${productionOrigin}/api/v1/health`,
      timeout: 120_000, reuseExistingServer: false,
      env: {
        NODE_ENV: 'production', PORT: String(productionPort), HOST: '127.0.0.1', LOG_LEVEL: 'silent',
        APP_KEY: 'graphitemd-e2e-key-that-is-at-least-32-characters',
        GRAPHITEMD_STATE_DIR: e2eState, GRAPHITEMD_WORKSPACE_ROOT: e2eWorkspace,
        GRAPHITEMD_ALLOWED_ORIGINS: productionOrigin,
      },
    },
})
