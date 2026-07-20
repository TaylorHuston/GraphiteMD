import type { EditorState } from '@codemirror/state'

export type MarkdownPresentationRange = {
  from: number
  to: number
  source: string
  kind: 'heading' | 'strong' | 'emphasis' | 'list-marker' | 'task-marker' | 'table-row' | 'wikilink'
  level?: number
  checked?: boolean
  display?: string
}

const pluginFences = new Set(['dataview', 'dataviewjs', 'mermaid', 'tasks', 'query'])

function completeFrontmatter(source: string) {
  const opening = /^---[ \t]*(\r\n|\r|\n)/.exec(source)
  if (!opening?.[1]) return 0
  const end = source.indexOf(`${opening[1]}---`, opening[0].length)
  return end < 0 ? -1 : end + opening[1].length + 3
}

function escaped(source: string, at: number) {
  let slashes = 0
  for (let index = at - 1; index >= 0 && source[index] === '\\'; index -= 1) slashes += 1
  return slashes % 2 === 1
}

function addInlineRanges(
  output: MarkdownPresentationRange[],
  source: string,
  line: string,
  lineFrom: number,
) {
  const occupied: Array<[number, number]> = []
  const add = (from: number, to: number, range: Omit<MarkdownPresentationRange, 'from' | 'to' | 'source'>) => {
    if (occupied.some(([left, right]) => from < right && to > left)) return
    occupied.push([from, to])
    output.push({ from, to, source: source.slice(from, to), ...range })
  }

  for (const match of line.matchAll(/\[\[([^\]\n|[]+)(?:\|([^\]\n|[]+))?\]\]/g)) {
    const local = match.index
    if (escaped(line, local) || (local > 0 && line[local - 1] === '!')) continue
    add(lineFrom + local, lineFrom + local + match[0].length, {
      kind: 'wikilink', display: match[2] ?? match[1]!,
    })
  }
  for (const match of line.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    if (!escaped(line, match.index)) add(lineFrom + match.index, lineFrom + match.index + match[0].length, { kind: 'strong' })
  }
  for (const match of line.matchAll(/(?<!\*)\*([^*\n]+)\*(?!\*)/g)) {
    if (!escaped(line, match.index)) add(lineFrom + match.index, lineFrom + match.index + match[0].length, { kind: 'emphasis' })
  }
}

/**
 * Returns only syntax that is safe to project. Every range retains its exact
 * source slice; callers hide presentation only outside active/selected lines.
 */
export function markdownPresentationRanges(state: EditorState, activeLines = new Set<number>()) {
  const source = state.doc.toString()
  const frontmatterEnd = completeFrontmatter(source)
  if (frontmatterEnd < 0) return []
  const output: MarkdownPresentationRange[] = []
  let inFence = false
  let excludedFence = false

  for (let number = 1; number <= state.doc.lines; number += 1) {
    const docLine = state.doc.line(number)
    const line = docLine.text
    const fence = line.match(/^\s*```\s*([^\s`]*)/)
    if (fence) {
    if (!inFence) excludedFence = pluginFences.has(fence[1]!.toLowerCase())
      inFence = !inFence
      if (!inFence) excludedFence = false
      continue
    }
    if (docLine.from < frontmatterEnd || inFence || excludedFence || activeLines.has(number)) continue
    if (/^\s*>\s*\[!/.test(line) || /!\[\[/.test(line)) continue

    const heading = line.match(/^(#{1,6})\s+/)
    if (heading) output.push({ from: docLine.from, to: docLine.from + heading[0].length, source: heading[0], kind: 'heading', level: heading[1]!.length })

    const task = line.match(/^\s*[-+*]\s+\[([ xX])\]\s+/)
    const list = task ? null : line.match(/^\s*(?:[-+*]|\d+[.)])\s+/)
    if (task) output.push({ from: docLine.from, to: docLine.from + task[0].length, source: task[0], kind: 'task-marker', checked: task[1]!.toLowerCase() === 'x' })
    else if (list) output.push({ from: docLine.from, to: docLine.from + list[0].length, source: list[0], kind: 'list-marker' })

    const next = number < state.doc.lines ? state.doc.line(number + 1).text : ''
    const previous = number > 1 ? state.doc.line(number - 1).text : ''
    const delimiter = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
    const nextDelimiter = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(next)
    const previousDelimiter = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(previous)
    if ((line.includes('|') && (nextDelimiter || previousDelimiter)) || delimiter) {
      output.push({ from: docLine.from, to: docLine.to, source: line, kind: 'table-row' })
    }
    if (!delimiter) addInlineRanges(output, source, line, docLine.from)
  }
  return output.sort((left, right) => left.from - right.from || left.to - right.to)
}
