import { appendFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { e2eWorkspace, initialPassword, replacementPassword } from '../../playwright.paths.js'

test('production artifact serves browser assets and confines SPA fallback away from APIs', async ({ request }) => {
  const root = await request.get('/')
  expect(root.status()).toBe(200)
  expect(root.headers()['content-type']).toContain('text/html')
  const html = await root.text()
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^\"]+)"/)?.[1]
  expect(assetPath).toBeTruthy()
  const asset = await request.get(assetPath!)
  expect(asset.status()).toBe(200)
  expect(asset.headers()['content-type']).not.toContain('text/html')

  const historyFallback = await request.get('/workspace/history')
  expect(historyFallback.status()).toBe(200)
  expect(historyFallback.headers()['content-type']).toContain('text/html')

  const unknownApi = await request.get('/api/v1/not-a-route', { headers: { accept: 'text/html' } })
  expect(unknownApi.status()).toBe(404)
  expect(unknownApi.headers()['content-type'] ?? '').not.toContain('text/html')
})

async function signIn(page: import('@playwright/test').Page, password: string) {
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Your workspace' })).toBeVisible()
}

test('foundation owner path works on desktop and a narrow mobile browser', async ({ page, context }) => {
  await page.goto('/')
  await signIn(page, initialPassword)

  await page.getByRole('treeitem', { name: /Welcome/ }).click()
  await expect(page.getByRole('heading', { name: 'Welcome', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/resource=res_[a-z0-9]+/)

  const search = page.getByRole('complementary', { name: 'Workspace navigation' })
  await search.getByRole('searchbox').fill('silver graphite')
  await search.getByRole('searchbox').press('Enter')
  await search.getByRole('button', { name: /Plan/ }).click()
  await expect(page.getByRole('heading', { name: 'Plan', level: 1 })).toBeVisible()

  const editor = page.getByRole('textbox', { name: 'Markdown editor' })
  await page.getByRole('button', { name: 'Source', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Rendered', exact: true }).click()
  await editor.press('ControlOrMeta+End')
  await editor.press('Enter')
  await editor.type('Saved through the browser.')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })

  await appendFile(`${e2eWorkspace}/Projects/Plan.md`, '\nExternal host edit.\n')
  await editor.type('Conflicting browser edit.')
  await expect(page.getByText('Conflict', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Discard draft and reload' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()

  const refreshedSearch = page.getByRole('complementary', { name: 'Workspace navigation' })
  await refreshedSearch.getByRole('searchbox').fill('External host edit')
  await refreshedSearch.getByRole('searchbox').press('Enter')
  await expect(refreshedSearch.getByRole('button', { name: /Plan/ })).toBeVisible()

  await page.getByLabel('Filename').fill('Roadmap.md')
  await page.getByRole('button', { name: 'Rename' }).click()
  await expect(page.getByRole('heading', { name: 'Roadmap', level: 1 })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Roadmap', level: 1 })).toBeVisible()

  const secondPage = await context.newPage()
  await secondPage.goto('/')
  await expect(secondPage.getByRole('heading', { name: 'Your workspace' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).last().click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('tab', { name: 'Plugins' }).click()
  await expect(settings.getByRole('article', { name: 'System Status plugin' })).toBeVisible()
  await settings.getByRole('button', { name: 'Disable System Status' }).click()
  await expect(settings.getByText('Disabled')).toBeVisible()
  await settings.getByRole('button', { name: 'Enable System Status' }).click()
  await expect(settings.getByText('Active', { exact: true })).toBeVisible()
  await settings.getByRole('tab', { name: 'Account' }).click()
  await settings.getByLabel('Current password').fill(initialPassword)
  await settings.getByLabel('New password', { exact: true }).fill(replacementPassword)
  await settings.getByLabel('Confirm new password').fill(replacementPassword)
  await settings.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to GraphiteMD' })).toBeVisible()
  await secondPage.reload()
  await expect(secondPage.getByRole('heading', { name: 'Sign in to GraphiteMD' })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, replacementPassword)
  await expect(page.getByTestId('mobile-files')).toBeVisible()
  await page.getByTestId('mobile-files').click()
  const files = page.getByRole('dialog', { name: 'Files' })
  await expect(files.getByRole('button', { name: 'Close Files' })).toBeFocused()
  await expect(files.getByRole('treeitem', { name: /Roadmap/ })).toBeVisible()
  await files.getByRole('treeitem', { name: /Roadmap/ }).click()
  await expect(page.getByRole('heading', { name: 'Roadmap', level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  await page.getByRole('button', { name: 'Settings' }).first().click()
  const mobileSettings = page.getByRole('dialog', { name: 'Settings' })
  await mobileSettings.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByText('Enter the owner password for this host.')).toBeVisible()
})
