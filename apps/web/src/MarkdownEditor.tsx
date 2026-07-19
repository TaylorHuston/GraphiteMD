import { markdown } from '@codemirror/lang-markdown'
import { Compartment, EditorState, type Range } from '@codemirror/state'
import { Decoration, EditorView, keymap, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { useEffect, useRef, useState } from 'react'
import { markdownPresentationRanges, type MarkdownPresentationRange } from './markdownPresentation.js'

export type MarkdownEditorMode = 'source' | 'rendered'

export interface MarkdownEditorProps {
  source: string
  onChange(source: string): void
  readOnly?: boolean
  ariaLabel?: string
}

const MAX_RENDERED_PRESENTATION_CHARACTERS = 200_000

export function renderedPresentationAllowed(source: string): boolean {
  return source.length <= MAX_RENDERED_PRESENTATION_CHARACTERS
}

export function createMarkdownDocument(source: string) {
  return EditorState.create({ doc: source }).doc
}

export function preserveUneditedSource(raw: string, previous: string, next: string): string {
  let prefix = 0
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1
  let suffix = 0
  while (suffix < previous.length - prefix && suffix < next.length - prefix
    && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix += 1
  const rawStart = normalizedOffsetInRaw(raw, prefix)
  const rawEnd = normalizedOffsetInRaw(raw, previous.length - suffix)
  return raw.slice(0, rawStart) + next.slice(prefix, next.length - suffix) + raw.slice(rawEnd)
}

class SourceBackedWidget extends WidgetType {
  constructor(readonly range: MarkdownPresentationRange) { super() }
  eq(other: SourceBackedWidget) { return other.range.source === this.range.source && other.range.kind === this.range.kind }
  toDOM() {
    const element = document.createElement('span')
    element.className = `cm-readable-${this.range.kind}`
    element.setAttribute('aria-label', this.range.source)
    if (this.range.kind === 'wikilink') {
      element.textContent = this.range.display ?? this.range.source
      element.setAttribute('role', 'img')
      element.setAttribute('aria-roledescription', 'wikilink')
    } else if (this.range.kind === 'task-marker') {
      element.textContent = this.range.checked ? '☑' : '☐'
      element.setAttribute('role', 'img')
      element.setAttribute('aria-roledescription', `${this.range.checked ? 'checked' : 'unchecked'} task marker`)
    } else {
      element.textContent = this.range.source.trim().match(/^\d/)?.[0] ? this.range.source.trim() : '•'
      element.setAttribute('role', 'img')
      element.setAttribute('aria-roledescription', 'list marker')
    }
    return element
  }
  ignoreEvent() { return true }
}

function tableCells(source: string) {
  return source.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((value) => value.trim())
}

function isTableDelimiter(source: string) {
  return /^\s*\|?\s*:?-{3,}:?/.test(source)
}

class TableWidget extends WidgetType {
  constructor(readonly rows: readonly string[]) { super() }
  eq(other: TableWidget) { return other.rows.length === this.rows.length && other.rows.every((row, index) => row === this.rows[index]) }
  toDOM() {
    const table = document.createElement('table')
    table.className = 'cm-readable-table'
    table.setAttribute('aria-label', 'Markdown table')

    const delimiterIndex = this.rows.findIndex(isTableDelimiter)
    const headerIndex = delimiterIndex > 0 ? delimiterIndex - 1 : -1
    if (headerIndex >= 0) {
      const head = table.createTHead()
      const row = head.insertRow()
      for (const value of tableCells(this.rows[headerIndex]!)) {
        const cell = document.createElement('th')
        cell.scope = 'col'
        cell.textContent = value
        row.append(cell)
      }
    }

    const body = table.createTBody()
    this.rows.forEach((source, index) => {
      if (index === headerIndex || index === delimiterIndex) return
      const row = body.insertRow()
      for (const value of tableCells(source)) row.insertCell().textContent = value
    })
    return table
  }
  ignoreEvent() { return true }
}

function activeLines(view: EditorView) {
  const lines = new Set<number>()
  for (const range of view.state.selection.ranges) {
    const start = view.state.doc.lineAt(range.from).number
    const end = view.state.doc.lineAt(range.to).number
    for (let line = start; line <= end; line += 1) lines.add(line)
  }
  return lines
}

function renderedDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const tableLines = new Set<number>()
  const ranges = markdownPresentationRanges(view.state, activeLines(view))

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]!
    if (range.kind !== 'table-row') continue
    const group = [range]
    let lastLine = view.state.doc.lineAt(range.from).number
    while (index + 1 < ranges.length) {
      const next = ranges[index + 1]!
      if (next.kind !== 'table-row') break
      const nextLine = view.state.doc.lineAt(next.from).number
      if (nextLine !== lastLine + 1) break
      group.push(next)
      lastLine = nextLine
      index += 1
    }
    const firstLine = view.state.doc.lineAt(group[0]!.from)
    const last = view.state.doc.lineAt(group[group.length - 1]!.to)
    for (let line = firstLine.number; line <= last.number; line += 1) tableLines.add(line)
    decorations.push(Decoration.widget({ widget: new TableWidget(group.map((item) => item!.source)), side: -1 }).range(firstLine.from))
    for (const item of group) decorations.push(Decoration.replace({ inclusive: false }).range(item!.from, item!.to))
  }

  for (const range of ranges) {
    if (tableLines.has(view.state.doc.lineAt(range.from).number)) continue
    if (range.kind === 'heading') {
      decorations.push(Decoration.replace({ inclusive: false }).range(range.from, range.to))
      decorations.push(Decoration.line({ class: `cm-readable-heading cm-readable-h${range.level}` }).range(view.state.doc.lineAt(range.from).from))
    } else if (range.kind === 'strong' || range.kind === 'emphasis') {
      const width = range.kind === 'strong' ? 2 : 1
      decorations.push(Decoration.replace({ inclusive: false }).range(range.from, range.from + width))
      decorations.push(Decoration.mark({ class: `cm-readable-${range.kind}` }).range(range.from + width, range.to - width))
      decorations.push(Decoration.replace({ inclusive: false }).range(range.to - width, range.to))
    } else if (range.kind !== 'table-row') {
      decorations.push(Decoration.replace({ widget: new SourceBackedWidget(range) }).range(range.from, range.to))
    }
  }
  return Decoration.set(decorations, true)
}

function renderedPresentation() {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = renderedDecorations(view) }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) this.decorations = renderedDecorations(update.view)
    }
  }, { decorations: (plugin) => plugin.decorations })
}

function renderedExtensions() {
  return [renderedPresentation(), EditorView.editorAttributes.of({ class: 'cm-markdown-rendered' })]
}

function normalizedOffsetInRaw(raw: string, target: number): number {
  let normalized = 0
  for (let rawOffset = 0; rawOffset < raw.length; rawOffset += 1) {
    if (normalized === target) return rawOffset
    if (raw[rawOffset] === '\r' && raw[rawOffset + 1] === '\n') rawOffset += 1
    normalized += 1
  }
  return raw.length
}

/**
 * A single exact CodeMirror document owns both modes. Rendered mode is a
 * bounded source-backed presentation: syntax highlighting improves ordinary
 * Markdown while focus keeps every delimiter in the editable document.
 */
export function MarkdownEditor({ source, onChange, readOnly = false, ariaLabel = 'Markdown editor' }: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const applyingExternalSource = useRef(false)
  const exactSource = useRef(source)
  const normalizedSource = useRef(createMarkdownDocument(source).toString())
  const [mode, setMode] = useState<MarkdownEditorMode>('rendered')
  const [syntaxVisible, setSyntaxVisible] = useState(false)
  const presentation = useRef(new Compartment())
  onChangeRef.current = onChange

  useEffect(() => {
    if (!host.current) return
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: source,
        extensions: [
          markdown(), history(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          presentation.current.of(renderedPresentationAllowed(source) ? renderedExtensions() : []),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
          EditorView.updateListener.of((update) => {
            if (update.focusChanged) setSyntaxVisible(update.view.hasFocus)
            if (update.docChanged && !applyingExternalSource.current) {
              const next = update.state.doc.toString()
              exactSource.current = preserveUneditedSource(exactSource.current, normalizedSource.current, next)
              normalizedSource.current = next
              onChangeRef.current(exactSource.current)
            }
          }),
          EditorView.theme({
            '&': { height: '100%', backgroundColor: 'transparent' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono, ui-monospace, monospace)' },
            '.cm-content': { padding: '1rem 0 4rem', caretColor: 'currentColor' },
            '.cm-line': { padding: '0 1rem' },
            '&.cm-focused': { outline: 'none' },
          }),
        ],
      }),
    })
    editor.scrollDOM.tabIndex = 0
    view.current = editor
    return () => { editor.destroy(); view.current = null }
  }, [ariaLabel, readOnly])

  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === source) return
    applyingExternalSource.current = true
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: source } })
    exactSource.current = source
    normalizedSource.current = createMarkdownDocument(source).toString()
    applyingExternalSource.current = false
  }, [source])

  useEffect(() => {
    const editor = view.current
    if (!editor) return
    const enabled = mode === 'rendered' && renderedPresentationAllowed(source)
    editor.dispatch({ effects: presentation.current.reconfigure(enabled ? renderedExtensions() : []) })
  }, [mode, source])

  const rendered = mode === 'rendered' && renderedPresentationAllowed(source)
  return <section className={`markdown-editor ${mode} ${rendered ? 'rendered-enabled' : 'literal'} ${syntaxVisible ? 'syntax-visible' : ''}`}>
    <div className="editor-mode-switch" role="group" aria-label="Editor mode">
      <button type="button" aria-pressed={mode === 'rendered'} onClick={() => setMode('rendered')}>Rendered</button>
      <button type="button" aria-pressed={mode === 'source'} onClick={() => setMode('source')}>Source</button>
    </div>
    {!rendered && mode === 'rendered' && <p className="editor-budget-note" role="status">Showing literal source for this note.</p>}
    <div className="editor-codemirror" ref={host} />
  </section>
}
