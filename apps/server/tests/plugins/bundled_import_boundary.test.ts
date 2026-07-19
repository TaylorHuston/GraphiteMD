import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const pluginsRoot = resolve(import.meta.dirname, '../../../../plugins')
const productionAllowedImports = new Set(['@graphitemd/plugin-sdk'])
const forbiddenGlobals = new Set([
  'process', 'global', 'globalThis', 'fetch', 'require', 'createRequire', 'module', 'eval', 'Function',
])

function boundaryViolations(source: string, fileName = 'plugin.ts'): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const violations: string[] = []
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) && !productionAllowedImports.has(node.moduleSpecifier.text)) {
      violations.push(`forbidden module ${node.moduleSpecifier.text}`)
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      violations.push('dynamic import')
    }
    if (ts.isImportEqualsDeclaration(node)) violations.push('import equals')
    if (ts.isIdentifier(node) && forbiddenGlobals.has(node.text)) {
      violations.push(`forbidden global ${node.text}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return [...new Set(violations)]
}

async function productionSources(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await productionSources(path))
    else if (['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(extname(entry.name)) && !entry.name.includes('.test.')) files.push(path)
  }
  return files
}

describe('GMD-003/S1 R3 bundled plugin build boundary', () => {
  it('detects accidental bypasses that the former static-import regex missed', () => {
    expect(boundaryViolations(`
      const fs = await import('node:fs')
      const env = process.env.SECRET
      const response = await fetch('https://example.test')
    `)).toEqual(expect.arrayContaining([
      'dynamic import',
      'forbidden global process',
      'forbidden global fetch',
    ]))
    expect(boundaryViolations(`
      import { createRequire } from 'node:module'
      const load = require
      globalThis.fetch('https://example.test')
    `)).toEqual(expect.arrayContaining([
      'forbidden module node:module',
      'forbidden global createRequire',
      'forbidden global require',
      'forbidden global globalThis',
    ]))
  })

  it('allows every production bundled plugin source to use only the capability SDK', async () => {
    const pluginDirectories = (await readdir(pluginsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory())
    expect(pluginDirectories.length).toBeGreaterThan(0)
    for (const plugin of pluginDirectories) {
      const sources = await productionSources(join(pluginsRoot, plugin.name, 'src'))
      expect(sources.length, plugin.name).toBeGreaterThan(0)
      for (const path of sources) {
        expect(boundaryViolations(await readFile(path, 'utf8'), path), path).toEqual([])
      }
    }
  })

  it('keeps the bundled plugin production dependency graph limited to the capability SDK', async () => {
    const pluginDirectories = (await readdir(pluginsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory())
    for (const plugin of pluginDirectories) {
      const packageJson = JSON.parse(await readFile(join(pluginsRoot, plugin.name, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>
        exports?: unknown
      }
      expect(Object.keys(packageJson.dependencies ?? {}), plugin.name).toEqual(['@graphitemd/plugin-sdk'])
      expect(packageJson.exports, plugin.name).toBeDefined()
    }
  })
})
