import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { MarkdownEditor } from './MarkdownEditor.js'

const richMarkdown = [
  '# Active syntax',
  '',
  '**Strong text** and *emphasis* stay source-backed.',
  '- [ ] Inspect the exact Markdown',
  'See [[Workspace Notes|notes]].',
].join('\n')

const meta = {
  title: 'Editor/Markdown states',
  component: MarkdownEditor,
  decorators: [(Story) => <div style={{ width: 'min(100vw, 48rem)', height: '32rem', margin: '0 auto' }}><Story /></div>],
  args: { source: richMarkdown, onChange: () => undefined },
} satisfies Meta<typeof MarkdownEditor>

export default meta
type Story = StoryObj<typeof meta>

export const ActiveSyntax: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('textbox', { name: 'Markdown editor' }))
    await expect(canvasElement.querySelector('.markdown-editor.syntax-visible')).toBeTruthy()
  },
}

export const WideTableOverflow: Story = {
  args: {
    source: '| Owner | Milestone | Repository | Change | Verification | Follow-up |\n| --- | --- | --- | --- | --- | --- |\n| Taylor | Foundation workspace | anthracitemd | Browser response validation | Focused browser and contract suites | Independent review |\n',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const table = await canvas.findByRole('table', { name: 'Markdown table' })
    await expect(within(table).getAllByRole('cell')).toHaveLength(6)
    const scroller = canvasElement.querySelector<HTMLElement>('.cm-scroller')
    await expect(scroller).toHaveAttribute('tabindex', '0')
    await expect(scroller?.scrollWidth).toBeGreaterThan(scroller?.clientWidth ?? 0)
  },
}

export const ReadOnlyNote: Story = {
  args: { readOnly: true, ariaLabel: 'Read-only Markdown note' },
  play: async ({ canvasElement }) => {
    const editor = await within(canvasElement).findByRole('textbox', { name: 'Read-only Markdown note' })
    await expect(editor).toHaveAttribute('aria-readonly', 'true')
  },
}
