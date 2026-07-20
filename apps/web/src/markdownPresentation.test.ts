import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { markdownPresentationRanges } from './markdownPresentation.js'

const ranges = (source: string, activeLines = new Set<number>()) =>
  markdownPresentationRanges(EditorState.create({ doc: source }), activeLines)

describe('GMD-002/S2/R1-S2 rendered Markdown presentation', () => {
  it('presents supported headings, emphasis, lists, tasks, tables, and complete wikilinks from exact source', () => {
    const source = '# Heading\n**strong** and *emphasis*\n- item\n- [x] task\n| Name | State |\n| --- | --- |\n| Graphite | [[Ready Note|Ready]] |'
    expect(ranges(source)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'heading', source: '# ' }),
      expect.objectContaining({ kind: 'strong', source: '**strong**' }),
      expect.objectContaining({ kind: 'emphasis', source: '*emphasis*' }),
      expect.objectContaining({ kind: 'list-marker', source: '- ' }),
      expect.objectContaining({ kind: 'task-marker', source: '- [x] ' }),
      expect.objectContaining({ kind: 'table-row', source: '| Name | State |' }),
      expect.objectContaining({ kind: 'wikilink', source: '[[Ready Note|Ready]]', display: 'Ready' }),
    ]))
    for (const range of ranges(source)) expect(range.source).toBe(source.slice(range.from, range.to))
  })

  it('reveals exact syntax for every active or selected line', () => {
    const source = '# Heading\n**strong**\n- [ ] task'
    expect(ranges(source, new Set([1, 2]))).toEqual([
      expect.objectContaining({ kind: 'task-marker', source: '- [ ] ' }),
    ])
  })

  it('leaves malformed, embedded, plugin-owned, and incomplete syntax literal', () => {
    const source = '---\nstatus: open\n# no closing fence\n\n![[embed]] [[broken\n```dataview\n**owned**\n```'
    expect(ranges(source)).toEqual([])
  })

  it('recognizes complete frontmatter across CRLF and CR line endings', () => {
    for (const eol of ['\r\n', '\r']) {
      const source = `---${eol}title: Hidden${eol}---${eol}# Visible${eol}`
      expect(ranges(source)).toEqual([
        expect.objectContaining({ kind: 'heading', source: '# ' }),
      ])
    }
  })
})
