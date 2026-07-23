import { mkdir, rm, writeFile } from 'node:fs/promises'
import { e2eRoot, e2eWorkspace } from '../../playwright.paths.js'

export default async function setup() {
  await rm(e2eRoot, { recursive: true, force: true })
  await mkdir(e2eRoot, { recursive: false })
  await mkdir(e2eWorkspace)
  await mkdir(`${e2eWorkspace}/Projects`)
  await writeFile(`${e2eWorkspace}/Welcome.md`, `---\nstatus: active\n---\n# Welcome\n\nUnique grounded fact: cobalt otter.\n${'Long grounded evidence stays inside the Context surface.\n'.repeat(500)}`)
  await writeFile(`${e2eWorkspace}/Projects/Plan.md`, '# Plan\n\nDeterministic search phrase: silver graphite.\n')
}
