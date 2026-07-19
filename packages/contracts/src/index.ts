import { Type, type Static, type TSchema } from 'typebox'
import { Check } from 'typebox/value'

export type RuntimeSchema = TSchema
export type SchemaValue<Schema extends RuntimeSchema> = Static<Schema>

export const WorkspaceId = Type.String({ pattern: '^wrk_[a-z0-9]+$' })
export type WorkspaceId = `wrk_${string}`

export const ResourceId = Type.String({ pattern: '^res_[a-z0-9]+$' })
export type ResourceId = `res_${string}`

export const NoteRevision = Type.String({ pattern: '^rev_[a-z0-9]+$' })
export type NoteRevision = `rev_${string}`

const NoteInventoryItem = Type.Object({
  kind: Type.Literal('note'),
  resourceId: ResourceId,
  displayPath: Type.String(),
})

const FolderInventoryItem = Type.Object({
  kind: Type.Literal('folder'),
  displayPath: Type.String(),
})

export const WorkspaceResponse = Type.Object({
  available: Type.Literal(true),
  workspaceId: WorkspaceId,
  notes: Type.Array(NoteInventoryItem),
  inventory: Type.Array(Type.Union([NoteInventoryItem, FolderInventoryItem])),
})
export type WorkspaceResponse = Static<typeof WorkspaceResponse>

export const MarkdownNoteResponse = Type.Object({
  resourceId: ResourceId,
  displayPath: Type.String(),
  source: Type.String(),
  revision: NoteRevision,
  yamlProperties: Type.Array(Type.Object({ name: Type.String(), value: Type.Unknown() })),
  yamlParseError: Type.Union([Type.String(), Type.Null()]),
})
export type MarkdownNoteResponse = Static<typeof MarkdownNoteResponse>

export const RenameNoteResponse = Type.Object({
  note: MarkdownNoteResponse,
  workspace: WorkspaceResponse,
})
export type RenameNoteResponse = Static<typeof RenameNoteResponse>

export const SearchResponse = Type.Object({
  results: Type.Array(Type.Object({
    resourceId: ResourceId,
    title: Type.String(),
    displayPath: Type.String(),
    snippet: Type.Union([Type.String(), Type.Null()]),
  })),
})
export type SearchResponse = Static<typeof SearchResponse>

export const SearchRebuildResponse = Type.Object({
  indexed: Type.Integer({ minimum: 0 }),
})
export type SearchRebuildResponse = Static<typeof SearchRebuildResponse>

const PluginContribution = Type.Object({ id: Type.String(), title: Type.String() })
const PluginContributions = Type.Object({
  commands: Type.Optional(Type.Array(PluginContribution)),
  views: Type.Optional(Type.Array(PluginContribution)),
  tools: Type.Optional(Type.Array(PluginContribution)),
  routes: Type.Optional(Type.Array(PluginContribution)),
  events: Type.Optional(Type.Array(PluginContribution)),
  background: Type.Optional(Type.Array(PluginContribution)),
})

export const PluginInventoryItem = Type.Object({
  id: Type.String(),
  status: Type.Union([
    Type.Literal('active'),
    Type.Literal('disabled'),
    Type.Literal('invalid'),
    Type.Literal('incompatible'),
    Type.Literal('duplicate'),
    Type.Literal('dependency_missing'),
    Type.Literal('activation_failed'),
  ]),
  message: Type.Optional(Type.String()),
  manifest: Type.Optional(Type.Object({
    name: Type.String(),
    version: Type.String(),
    permissions: Type.Array(Type.String()),
  })),
  contributions: PluginContributions,
})
export type PluginInventoryItem = Static<typeof PluginInventoryItem>

export const PluginsResponse = Type.Object({ plugins: Type.Array(PluginInventoryItem) })
export type PluginsResponse = Static<typeof PluginsResponse>

export const PluginResponse = Type.Object({ plugin: PluginInventoryItem })
export type PluginResponse = Static<typeof PluginResponse>

export const OwnerResponse = Type.Object({ owner: Type.Object({ id: Type.Literal('owner') }) })
export type OwnerResponse = Static<typeof OwnerResponse>

export const ErrorResponse = Type.Object({
  error: Type.Object({ code: Type.String(), message: Type.Optional(Type.String()) }),
  currentRevision: Type.Optional(NoteRevision),
})
export type ErrorResponse = Static<typeof ErrorResponse>

export function matchesContract<Schema extends RuntimeSchema>(schema: Schema, value: unknown): value is SchemaValue<Schema> {
  return Check(schema, value)
}

export const serviceDescriptor = {
  name: 'GraphiteMD',
  apiVersion: 'v1',
} as const
