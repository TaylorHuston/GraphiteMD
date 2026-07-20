---
schema: sdd-epic-v2
id: GMD-004
status: draft
created: 2026-07-19
modified: 2026-07-20
last_verified:
stories:
  - S1
  - S2
---

# GMD-004 Workspace-Grounded Assistant

## Product Context

- PRD: private GraphiteMD Product Brief / PRD
- Related docs: `README.md`
- Related ADRs:
  - `docs/adrs/2026-07-18-service-first-web-architecture.md`
  - `docs/adrs/2026-07-18-capability-mediated-plugin-platform.md`
  - `docs/adrs/2026-07-18-filesystem-canonical-workspace-state.md`
  - `docs/adrs/2026-07-18-proposal-first-agent-authority.md`
  - `docs/adrs/2026-07-19-pi-backed-assistant-runtime.md`

GraphiteMD makes documents, not conversation, the durable center of the product. The bundled Assistant should help the owner understand authorized workspace notes while preserving service authority, inspectable state, visible provenance, and a useful non-AI workbench.

## Outcome

The workspace owner will be able to connect an OpenAI Codex subscription and ask a read-only Assistant questions grounded in eligible Markdown notes, with visible evidence of the notes GraphiteMD actually supplied.

## Current Scope

- One built-in workspace Assistant surfaced through the existing Context experience.
- OpenAI Codex subscription OAuth through a replaceable Pi runtime adapter.
- Brokered search and bounded note reads over opaque resources issued by the active workspace authority.
- Service-derived source provenance and a versioned, inspectable conversation record under `.graphitemd/`.
- One authenticated owner and one configured workspace.
- Read-only questions; no proposal, write, process, Git, network-tool, or autonomous authority.

## Deferred Scope

- Document proposals, direct writes, autonomous grants, consequential actions, background runs, and developer-agent workflows.
- Additional providers, API-key onboarding, model selection UI, custom agents/prompts, long-term memory, and multi-agent delegation.
- Conversation library/navigation, cross-device resume, attachments, voice, image input, and polished citation navigation.
- Assistant-specific user-configurable folder or mount exclusions beyond the existing workspace eligible-resource boundary.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|
| `review-document-proposals` | deferred | As an owner, I want to review Assistant-proposed note changes, so that AI help remains inspectable before canonical files change. | Proposal artifacts, diff review, conflict handling, and accept/reject behavior satisfy the agent-authority ADR. |
| `resume-conversation-library` | deferred | As an owner, I want to find and resume earlier Assistant conversations, so that useful context survives browser and service restarts. | A workspace-local conversation index and responsive resume flow exist without introducing database-only truth. |
| `configure-assistant-read-exclusions` | deferred | As an owner, I want to exclude selected folders or mounts from Assistant access, so that sensitive workspace areas never reach a provider. | One exclusion rule is enforced across search, direct reads, context, logs, provenance, and provider requests. |

## Story Index

| Story | Implementation | Verification | Capability | Last Verified | Notes |
|---|---|---|---|---|---|
| S1 | implemented | partial | Connect and disconnect an OpenAI Codex subscription safely. | 2026-07-20 | OAuth/runtime behavior is implemented; live owner authorization remains a gap. |
| S2 | partial | partial | Ask the read-only Assistant about eligible workspace notes with visible source evidence. | 2026-07-20 | Retrieval, persistence, and the Pi question path are implemented; the bundled Assistant contribution and Context UI remain. |

## Stories

### Story S1: Connect OpenAI Codex

Implementation: implemented
Verification: partial
Created: 2026-07-19
Modified: 2026-07-20
Last verified: 2026-07-20

As the workspace owner, I want to connect and disconnect my Codex subscription, so that I control whether GraphiteMD can use the provider without exposing its credential.

#### Requirements And Scenarios

##### Requirement R1: GraphiteMD-Owned Codex OAuth

The system SHALL let only the authenticated owner start, inspect, answer, cancel, and retry an OpenAI Codex OAuth flow through normalized GraphiteMD contracts.

###### Scenario R1-S1: Complete Codex OAuth

- WHEN the authenticated owner starts Codex setup and completes the provider's required browser, selection, device-code, or manual-code steps
- THEN GraphiteMD exposes the provider's transient browser authorization link alongside any manual-code fallback
- AND GraphiteMD reports the Codex provider as connected
- AND the credential remains in the host's machine-local protected state.

###### Scenario R1-S2: Cancel Or Recover From Failed OAuth

- WHEN the owner cancels setup, reloads or remounts Settings during setup, supplies invalid input, the provider rejects authorization, or the callback cannot complete
- THEN an active flow is restored to the authenticated owner, or the flow reaches an explicit cancelled or failed state without a false connected status
- AND the owner can safely retry while concurrent active flows are rejected.

##### Requirement R2: Protected Credential Lifecycle

The system SHALL keep the Codex credential in protected machine-local state, expose only sanitized connection status, and let only the authenticated owner disconnect it.

###### Scenario R2-S1: Credential Stays Outside Browser And Workspace

- WHEN Codex is connected or GraphiteMD restarts
- THEN provider status reports only sanitized provider/model/configuration metadata
- AND credentials, callback codes, and refresh material remain absent from workspace files, browser storage/responses, conversation records, and logs.

###### Scenario R2-S2: Disconnect Codex Without Affecting The Workspace

- WHEN the authenticated owner disconnects Codex
- THEN the stored provider credential is removed and new questions are disabled
- AND existing Markdown, search, conversation records, and non-AI workbench behavior remain available.

###### Scenario R2-S3: Unauthenticated Provider Mutation Is Rejected

- WHEN a client without a valid owner session attempts to start, answer, cancel, or disconnect a Codex flow
- THEN GraphiteMD rejects the request without changing provider state
- AND returns no provider secret or interaction payload.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S1/R1 | `apps/server/app/assistant/index.ts#AssistantOAuthFlowManager` | primary | Owns normalized Codex OAuth flow state, including transient browser authorization links, provider-supplied opaque selection IDs, cancellation, retry, and sanitized provider status. |
| S1/R1-S2 | `apps/server/start/routes.ts#oauthManager` and `/api/v1/assistant/oauth/active` | supporting route | Restricts OAuth mutations and active-flow recovery to the owner session. |
| S1/R1 | `apps/web/src/SettingsPanel.tsx#AssistantSettings` and `apps/web/src/AssistantSettings.css` | browser adapter | Presents the active provider browser-login link, restores an active OAuth prompt after Settings remount, presents provider-supplied choices as labelled radio cards, names the selected continuation action, and retains independent cancellation. |
| S1/R2-S1 | `apps/server/app/security/owner_setup_service.ts#resolveSecurityStateDirectory` and `#assertMachineLocalStateDirectory` | primary | Defaults secrets to the machine vault and rejects workspace-contained or symlinked overrides. |
| S1/R2-S1 | `apps/server/app/assistant/index.ts#PiRuntimeBoundary.create` | supporting runtime | Keeps Pi credentials and scratch in owner-only machine-local state. |
| S1/R2-S2, S1/R2-S3 | `apps/server/start/routes.ts#assistantOAuthErrorResponse` | primary | Exposes only sanitized status and owner-authorized disconnect/error behavior. |

#### Implementation Gaps

None for the accepted Codex onboarding scope.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1, S1/R1-S2, S1/R2-S2, S1/R2-S3 | `apps/server/tests/assistant/oauth_flow_manager.test.ts` and authenticated HTTP tests | Normalized OAuth lifecycle, active-only browser-link delivery, provider selection-ID preservation, active-flow recovery, cancellation/retry, sanitized state, and owner-only mutation behavior. | focused automated passing |
| S1/R1-S1, S1/R1-S2 | `apps/web/src/SettingsPanel.test.tsx` and direct Vite-browser inspection at 1440x900 and 390x844 | Browser authorization link is explicit and opens safely; an active OAuth choice is restored after Settings remount; choice radios use the selected/default answer value, continuation names that choice, cancellation remains available, and the pending-selection control is visually contained without console errors. | focused automated and rendered pending-selection state passing |
| S1/R2-S1 | `apps/server/tests/security/owner_setup_service.test.ts` | Default machine-vault state and direct/symlinked workspace override refusal. | focused automated passing |

#### Verification Gaps

- `S1/R1-S1`: Live owner-completed Codex authorization remains unverified.

#### Story Notes

- Live Codex authorization is separate evidence from deterministic OAuth tests and requires owner interaction.
- Connection never grants workspace write or autonomous authority.

### Story S2: Ask The Workspace Through Codex

Implementation: partial
Verification: partial
Created: 2026-07-19
Modified: 2026-07-20
Last verified: 2026-07-20

As the workspace owner, I want to ask Codex questions about my Markdown notes, so that I can prove the Assistant can read and reason over my workspace without receiving write authority.

#### Requirements And Scenarios

##### Requirement R1: Read-Only Workspace-Grounded Answers

The system SHALL answer an owner's question using Pi with only GraphiteMD-brokered search and bounded note-read tools over the active workspace.

###### Scenario R1-S1: Answer From An Eligible Note

- WHEN the connected owner asks a question whose answer is present in one or more eligible Markdown notes
- THEN the Assistant searches and reads relevant opaque note resources
- AND returns an answer grounded in the retrieved content without receiving any write, shell, raw-path, or unrestricted network tool.

###### Scenario R1-S2: No Relevant Note Produces An Honest Answer

- WHEN workspace search and bounded reads do not provide enough relevant evidence
- THEN the Assistant states that it could not answer from the available notes
- AND does not invent a workspace source or silently substitute unrelated model knowledge as workspace evidence.

###### Scenario R1-S3: Provider Or Workspace Is Unavailable

- WHEN Codex is disconnected, the configured model is unavailable, the workspace authority is unavailable, or a question is empty or already in flight
- THEN GraphiteMD does not start an ambiguous duplicate run
- AND presents a specific recoverable state while ordinary workbench behavior remains usable.

##### Requirement R2: Confined Context And Source Provenance

The system SHALL enforce the active workspace's eligible-resource boundary across Assistant search, reads, provider context, logs, and displayed source evidence.

###### Scenario R2-S1: Ineligible Content Never Reaches The Model

- WHEN `.graphitemd/`, legacy `.graphite/`, configured inventory exclusions, symlinks, unsupported files, oversized sources, unknown resources, or a replaced workspace root are encountered
- THEN those sources are denied before their content can enter the provider request, Assistant log, or source list
- AND the denial cannot be bypassed by note text or model instructions.

###### Scenario R2-S2: Retrieval Remains Bounded

- WHEN a relevant note or result set exceeds the Assistant context budget
- THEN GraphiteMD supplies a deterministic bounded excerpt or rejects the read with an explicit truncation/unavailable result
- AND records that limitation for the model and provenance layer.

###### Scenario R2-S3: Displayed Sources Reflect Successful Reads

- WHEN an Assistant answer is completed
- THEN every displayed source is derived from a successful brokered note read for that run
- AND model-authored citation text alone cannot add a source badge or reveal a host path.

##### Requirement R3: Inspectable Conversation Record

The system SHALL keep a versioned workspace-local record of each submitted question, terminal answer or failure, provider/model identity, and successful source references without storing provider credentials.

###### Scenario R3-S1: Successful Turn Is Inspectable

- WHEN an Assistant turn completes
- THEN its question, answer, timestamps, provider/model identity, and opaque/display source references are committed beneath `.graphitemd/`
- AND deleting a derived index does not remove that canonical record.

###### Scenario R3-S2: Interrupted Turn Recovers Honestly

- WHEN the provider request, service process, or conversation write is interrupted
- THEN restart or retry preserves the last valid record and identifies any incomplete turn without fabricating completion
- AND malformed or partial state fails closed instead of becoming browser or model context.

##### Requirement R4: Accessible Context Experience

The system SHALL provide a responsive, keyboard-accessible Assistant question flow in the existing Context surface and direct disconnected owners to Codex setup.

###### Scenario R4-S1: Desktop Context Question Flow

- WHEN a connected owner opens the desktop workbench
- THEN the right Context panel presents the conversation, source evidence, and a labeled question input
- AND loading, empty, unavailable, answer, long-content, and error states do not obscure the active note or workbench controls.

###### Scenario R4-S2: Narrow Context Drawer Flow

- WHEN the owner uses the Assistant at a narrow viewport
- THEN the existing full-screen Context drawer provides touch-sized setup, question, answer, source, retry, and close controls
- AND focus is contained while open and restored when closed.

###### Scenario R4-S3: Busy And Failure States Remain Operable

- WHEN a question is in progress, cancelled, fails, or the owner session expires
- THEN duplicate actions are disabled, status and errors are announced accessibly, secrets are never rendered, and session expiry returns to owner login.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S2/R1-S2, S2/R1-S3 | `apps/server/app/assistant/question_service.ts#AssistantQuestionService` | primary | Serializes normalized questions, persists terminal outcomes, requires provider state, and refuses empty, duplicate, unavailable, or ungrounded runs. |
| S2/R2-S1, S2/R2-S2, S2/R2-S3 | `apps/server/app/assistant/workspace_context.ts#AssistantWorkspaceContext` | primary | Performs bounded opaque search/read revalidation and derives source evidence only from successful reads. |
| S2/R3-S1, S2/R3-S2 | `apps/server/app/assistant/conversation_store.ts#ConversationStore` | primary | Writes confined versioned turns atomically and recovers incomplete turns as explicit interrupted failures. |
| S2/R4 | Not implemented yet. | primary | Responsive Assistant presentation after implementation. |

#### Implementation Gaps

- `S2/R1-S1`: Pi adapter and authenticated browser path are not implemented yet.
- `S2/R4`: Not implemented yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S2/R2-S1, S2/R2-S2, S2/R2-S3 | `apps/server/app/assistant/workspace_context.test.ts` | Internal/symlinked/unknown resources cannot enter the broker; UTF-8 and total context limits are deterministic; provenance appears only after a successful authority read. | focused automated passing |
| S2/R2-S1 | `packages/workspace/src/index.test.ts` | Canonical `.graphitemd/` state is excluded, a safe legacy vault migrates atomically, and conflicting or symlinked layouts fail closed. | focused automated passing |
| S2/R3-S1, S2/R3-S2 | `apps/server/app/assistant/conversation_store.test.ts` | Canonical versioned turns persist beneath `.graphitemd/conversations`; malformed and redirected state fails closed; interrupted turns are recovered honestly. | focused automated passing |
| S2/R1-S2, S2/R1-S3 | `apps/server/app/assistant/question_service.test.ts` | Only brokered tools can produce sources; no-read replies become honest no-evidence failures; disconnected, empty, and concurrent requests are refused. | focused automated passing |

#### Verification Gaps

- `S2/R1-S1`: Pi adapter and authenticated browser path are not verified yet.
- `S2/R4-S1`, `S2/R4-S2`, `S2/R4-S3`: Not verified yet.

#### Story Notes

- The answer's source list is service provenance, not a model-generated citation parser.
- The Pi adapter must disable automatic project resources and built-in tools; only brokered search/read tools are admitted.
- Live Codex success is separate evidence from deterministic provider/OAuth tests and requires owner authorization.

## Cross-Story Concerns

- Provider credentials and callback material stay outside the workspace and are never returned by typed contracts.
- Conversation records are canonical workspace files; any list/index is a disposable projection.
- Future proposal/write Stories must extend this read-only boundary rather than treating connected Codex access as write authority.
- The bundled Assistant must use the production SDK and capability broker; first-party status does not grant a raw filesystem or credential bypass.

## Open Decisions

- None block this Story. The documented default Codex model may change as Pi's provider registry evolves, but the selected provider/model must always be visible in status and conversation provenance.

## Completion Criteria

This Epic is healthy when:

- Embedded Stories cover the current scope.
- Requirements and Scenarios describe implemented behavior or intentional gaps.
- Story implementation and verification state match the Story Index and their respective gap sections.
- `Implemented By` maps every implemented Requirement to a concrete repository-relative location and stable code anchor.
- `Implementation Gaps` names accepted behavior that does not exist yet.
- `Verified By` maps concrete evidence to Requirements/Scenarios; automated evidence names existing repository-relative test paths.
- `Verification Gaps` are real, current, and explicit.
- Related changes, docs, indexes, reviews, and release communication do not contradict this Epic.

## Notes

- `GMD-003` owns the reusable plugin platform; this Epic owns Assistant behavior using it.
- The first slice proves workspace reading only. Proposal-first writes and run-scoped autonomy remain governed by the accepted agent-authority ADR and require later Stories.
