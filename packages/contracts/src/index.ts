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

export const AssistantFlowId = Type.String({ pattern: '^flow_[a-z0-9]+$' })
export type AssistantFlowId = `flow_${string}`

export const ConversationId = Type.String({ pattern: '^conv_[a-z0-9]+$' })
export type ConversationId = `conv_${string}`

export const TurnId = Type.String({ pattern: '^turn_[a-z0-9]+$' })
export type TurnId = `turn_${string}`

export const AssistantProviderStatus = Type.Object({
  provider: Type.Literal('openai-codex'),
  status: Type.Union([
    Type.Literal('disconnected'),
    Type.Literal('connecting'),
    Type.Literal('connected'),
    Type.Literal('unavailable'),
    Type.Literal('failed'),
  ]),
  model: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
}, { additionalProperties: false })
export type AssistantProviderStatus = Static<typeof AssistantProviderStatus>

export const AssistantError = Type.Object({
  code: Type.Union([
    Type.Literal('provider_unavailable'),
    Type.Literal('provider_failure'),
    Type.Literal('flow_conflict'),
    Type.Literal('invalid_input'),
    Type.Literal('workspace_unavailable'),
    Type.Literal('question_in_flight'),
    Type.Literal('no_relevant_evidence'),
    Type.Literal('context_limit'),
    Type.Literal('interrupted'),
    Type.Literal('cancelled'),
  ]),
  message: Type.String({ minLength: 1 }),
  retryable: Type.Boolean(),
}, { additionalProperties: false })
export type AssistantError = Static<typeof AssistantError>

export const AssistantOAuthInput = Type.Union([
  Type.Object({
    kind: Type.Literal('text'),
    label: Type.String({ minLength: 1 }),
    secret: Type.Boolean(),
    required: Type.Boolean(),
  }, { additionalProperties: false }),
  Type.Object({
    kind: Type.Literal('selection'),
    label: Type.String({ minLength: 1 }),
    options: Type.Array(Type.Object({ id: Type.String({ minLength: 1 }), label: Type.String({ minLength: 1 }) }, { additionalProperties: false }), { minItems: 1 }),
    required: Type.Boolean(),
  }, { additionalProperties: false }),
  Type.Object({
    kind: Type.Literal('device_code'),
    label: Type.String({ minLength: 1 }),
    verificationUri: Type.String({ minLength: 1 }),
    userCode: Type.String({ minLength: 1 }),
  }, { additionalProperties: false }),
])
export type AssistantOAuthInput = Static<typeof AssistantOAuthInput>

export const AssistantOAuthAuthorization = Type.Object({
  url: Type.String({ minLength: 1 }),
  instructions: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false })
export type AssistantOAuthAuthorization = Static<typeof AssistantOAuthAuthorization>

export const AssistantOAuthFlow = Type.Object({
  flowId: AssistantFlowId,
  provider: Type.Literal('openai-codex'),
  status: Type.Union([
    Type.Literal('awaiting_provider'),
    Type.Literal('awaiting_input'),
    Type.Literal('succeeded'),
    Type.Literal('failed'),
    Type.Literal('cancelled'),
  ]),
  createdAt: Type.String({ minLength: 1 }),
  updatedAt: Type.String({ minLength: 1 }),
  authorization: Type.Union([AssistantOAuthAuthorization, Type.Null()]),
  input: Type.Union([AssistantOAuthInput, Type.Null()]),
  error: Type.Union([AssistantError, Type.Null()]),
}, { additionalProperties: false })
export type AssistantOAuthFlow = Static<typeof AssistantOAuthFlow>

export const ActiveAssistantOAuthFlow = Type.Union([AssistantOAuthFlow, Type.Null()])
export type ActiveAssistantOAuthFlow = Static<typeof ActiveAssistantOAuthFlow>

export const AssistantQuestion = Type.Object({
  conversationId: Type.Optional(ConversationId),
  question: Type.String({ minLength: 1 }),
}, { additionalProperties: false })
export type AssistantQuestion = Static<typeof AssistantQuestion>

export const AssistantSource = Type.Object({
  resourceId: ResourceId,
  displayPath: Type.String({ minLength: 1 }),
  revision: NoteRevision,
  excerpt: Type.String(),
  truncated: Type.Boolean(),
}, { additionalProperties: false })
export type AssistantSource = Static<typeof AssistantSource>

const AssistantTurnBase = {
  turnId: TurnId,
  conversationId: ConversationId,
  question: Type.String({ minLength: 1 }),
  provider: Type.Literal('openai-codex'),
  model: Type.String({ minLength: 1 }),
  createdAt: Type.String({ minLength: 1 }),
  sources: Type.Array(AssistantSource),
}

export const AssistantTurn = Type.Union([
  Type.Object({
    ...AssistantTurnBase,
    status: Type.Literal('in_progress'),
    completedAt: Type.Null(),
    answer: Type.Null(),
    error: Type.Null(),
  }, { additionalProperties: false }),
  Type.Object({
    ...AssistantTurnBase,
    status: Type.Literal('completed'),
    completedAt: Type.String({ minLength: 1 }),
    answer: Type.String(),
    error: Type.Null(),
  }, { additionalProperties: false }),
  Type.Object({
    ...AssistantTurnBase,
    status: Type.Union([Type.Literal('failed'), Type.Literal('cancelled')]),
    completedAt: Type.String({ minLength: 1 }),
    answer: Type.Null(),
    error: AssistantError,
  }, { additionalProperties: false }),
])
export type AssistantTurn = Static<typeof AssistantTurn>

export function matchesContract<Schema extends RuntimeSchema>(schema: Schema, value: unknown): value is SchemaValue<Schema> {
  return Check(schema, value)
}

export const serviceDescriptor = {
  name: 'GraphiteMD',
  apiVersion: 'v1',
} as const
