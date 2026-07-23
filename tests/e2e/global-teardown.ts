import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { relative } from 'node:path'
import { e2eRoot } from '../../playwright.paths.js'

export default async function teardown() {
  const relativeRoot = relative(tmpdir(), e2eRoot)
  if (relativeRoot !== 'anthracitemd-playwright-foundation') throw new Error('Refusing to remove an unexpected E2E root')
  await rm(e2eRoot, { recursive: true, force: true })
}
