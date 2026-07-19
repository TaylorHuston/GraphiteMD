import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { useEffect, useRef, useState } from 'react'

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
