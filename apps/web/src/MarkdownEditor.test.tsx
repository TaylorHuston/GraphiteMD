import { cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarkdownEditor, createMarkdownDocument, preserveUneditedSource, renderedPresentationAllowed } from './MarkdownEditor.js'

const exactSource = [
  '---\r\n', 'tags: [graphite, markdown]\n', '---\r\n',
  '# Heading\n', '**strong** and [[Complete Note]]\r\n',
  '![[embed.png]]\n', '| A | B |\n| - | - |\n', '- [ ] task\n', '```ts\nconst x = 1\n```\n',
].join('')

afterEach(cleanup)

describe('GMD-002/S2 source-preserving Markdown editor', () => {
  it('R1-S1 creates one exact CodeMirror document for Source/Rendered mode round trips', async () => {
    const onChange = vi.fn(); const user = userEvent.setup()
    const view = render(<MarkdownEditor source={exactSource} onChange={onChange} />)
    expect(createMarkdownDocument(exactSource).toString()).toBe(exactSource.replaceAll('\r\n', '\n'))
    expect(view.container.querySelector('.cm-editor')).not.toBeNull()
    await user.click(view.getByRole('button', { name: 'Source' }))
    await user.click(view.getByRole('button', { name: 'Rendered' }))
    expect(view.container.querySelectorAll('.cm-line')).toHaveLength(13)
    expect(onChange).not.toHaveBeenCalled()
    expect(preserveUneditedSource('one\r\ntwo\nthree\r\n', 'one\ntwo\nthree\n', 'one\nTWO\nthree\n'))
      .toBe('one\r\nTWO\nthree\r\n')
  })

  it('R1-S2 keeps supported syntax source-backed and reveals exact syntax on focus', async () => {
    const user = userEvent.setup()
    const view = render(<MarkdownEditor source={'# Heading\n**strong**\n- [ ] task\n'} onChange={() => undefined} />)
    expect(view.container.querySelector('.markdown-editor.rendered')).not.toBeNull()
    const content = view.container.querySelector('.cm-content') as HTMLElement
    expect(view.container.querySelectorAll('.cm-line')).toHaveLength(4)
    await user.click(content)
    expect(view.container.querySelector('.markdown-editor.syntax-visible')).not.toBeNull()
  })

  it('R1-S3 leaves unsupported and over-budget source literal and permits Source mode', async () => {
    expect(renderedPresentationAllowed('x'.repeat(200_001))).toBe(false)
    const source = '![[broken embed\n<unknown-widget value="x">\n'
    const user = userEvent.setup(); const view = render(<MarkdownEditor source={source} onChange={() => undefined} />)
    expect(view.container.querySelectorAll('.cm-line')).toHaveLength(3)
    await user.click(view.getByRole('button', { name: 'Source' }))
    expect(view.container.querySelector('.markdown-editor.source')).not.toBeNull()
  })
})
