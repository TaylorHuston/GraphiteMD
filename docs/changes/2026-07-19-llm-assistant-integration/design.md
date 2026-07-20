# Design: LLM Assistant Integration

## Context

GraphiteMD already has a persistent authenticated AdonisJS service, opaque workspace resource identities, confined note reads, local full-text search, a React workbench with desktop and narrow Context surfaces, a capability-mediated bundled-plugin host, and filesystem-canonical `.graphite/` state. It has no model provider, Assistant contract, OAuth flow, conversation store, or model-backed UI.

Coordinator-Local provides a working reference for embedding `@earendil-works/pi-coding-agent`, driving OpenAI Codex OAuth through application-owned callbacks, disabling Pi's ambient resources, defining custom tools, normalizing session events, and keeping credentials in application-owned state. GraphiteMD must adapt that precedent to its accepted plugin and workspace boundaries rather than copy Coordinator's developer-agent scope.

As of planning, npm reported `@earendil-works/pi-coding-agent` `0.80.10` as current. Direct package characterization found that `0.80.10` no longer exports the programmatic `AuthStorage` boundary selected by this design. The implementation therefore locks the compatible `0.80.6` package family through workspace overrides, still within the accepted `0.80.x` range; a later Pi upgrade requires a fresh adapter characterization.

## Goals / Non-Goals

**Goals:**

- Let the authenticated owner connect and disconnect an OpenAI Codex subscription from GraphiteMD.
- Let the owner ask a question about any eligible Markdown note and receive a read-only answer.
- Prove grounding through service-derived source evidence tied to successful brokered reads.
- Keep credentials outside the workspace and expose no raw host paths or provider secrets.
- Keep Pi behind runtime-neutral contracts with automatic resources and built-in tools disabled.
- Preserve an inspectable canonical conversation record under `.graphite/`.
- Exercise the bundled Assistant through the production plugin/capability boundary.
- Keep all non-AI workbench behavior usable when the provider is absent or fails.

**Non-Goals:**

- Proposals, file mutation, autonomous grants, shell, Git, external tools, background work, or developer-agent behavior.
- Additional providers, API keys, model selection UI, custom prompts, named agents, memory, or multi-agent work.
- A conversation library, full resume UX, streaming-token polish, attachments, images, voice, or citation navigation.
- New Assistant-specific exclusion management; the existing eligible-resource boundary is enforced now and a unified exclusion configuration remains later work.

## Planning Interview / Story Refinement

- Scope boundary reviewed: yes; the user selected a usable vertical slice and narrowed its proof to Codex auth plus questions about workspace notes.
- User decisions: use Pi as the core; authenticate with Codex; use Coordinator-Local as the implementation reference; prove that the LLM can read any eligible note.
- Assumptions: one owner, one workspace, one Codex provider, one documented default model (`gpt-5.4`, overridable by a host setting), and one read-only question at a time.
- Deferred scope: writes, autonomy, multiple providers/models, conversation library/resume, Assistant-specific exclusions, memory, attachments, and developer capabilities.
- Story boundaries challenged: the first draft combined onboarding and Q&A into fourteen Scenarios. It was split into `S1` provider connection and `S2` workspace Q&A so each Story owns one predictable user path without changing the vertical-slice outcome.
- Requirements refined: onboarding, grounded answering, confinement/provenance, canonical conversation state, and responsive UI are independently observable across the two primary paths.
- Scenario gaps considered: OAuth success/cancel/failure/concurrency/logout, missing provider/model/workspace, empty/duplicate question, no relevant note, excluded/stale/oversized resources, fabricated citations, interrupted persistence, desktop/mobile, accessibility, and owner-session expiry.
- Open questions that block implementation: none.

## Epic Changes

### Create Epic: GMD-004 Workspace-Grounded Assistant

- Proposed directory: `docs/epics/gmd-004-llm-assistant/`
- Proposed file: `docs/epics/gmd-004-llm-assistant/epic.md`
- Scaffold status: created as a draft by `sdd epic create`; implementation and verification remain explicitly absent.

#### Epic

The workspace owner can use an inspectable, read-only Assistant to understand authorized Markdown notes without turning provider access into filesystem or write authority.

#### Story S1: Connect OpenAI Codex

As the workspace owner, I want to connect and disconnect my Codex subscription, so that I control whether GraphiteMD can use the provider without exposing its credential.

##### Requirement R1: GraphiteMD-Owned Codex OAuth

The system SHALL let only the authenticated owner start, inspect, answer, cancel, and retry OpenAI Codex through normalized GraphiteMD contracts.

- `R1-S1 Complete Codex OAuth`: normalized provider prompts/events reach the owner and successful completion reports connected state with protected machine-local credentials.
- `R1-S2 Cancel Or Recover From Failed OAuth`: cancellation, invalid input, provider failure, and flow conflicts fail honestly and permit safe retry.

##### Requirement R2: Protected Credential Lifecycle

The system SHALL keep the Codex credential in protected machine-local state, expose only sanitized status, and let only the authenticated owner disconnect it.

- `R2-S1 Credential Stays Outside Browser And Workspace`: provider status and restart expose no token, callback, workspace, browser-storage, conversation, or log secret.
- `R2-S2 Disconnect Codex Without Affecting The Workspace`: logout removes the credential and disables new questions without damaging notes, search, conversations, or non-AI behavior.
- `R2-S3 Unauthenticated Provider Mutation Is Rejected`: invalid owner sessions cannot start, answer, cancel, or disconnect flows and receive no interaction secret.

##### Implemented By

Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- All `GMD-004/S1` Scenarios remain unverified until implementation.
- Live Codex authorization requires owner interaction and cannot be replaced by deterministic OAuth fakes.

#### Story S2: Ask The Workspace Through Codex

As the workspace owner, I want to ask Codex questions about my Markdown notes, so that I can prove the Assistant can read and reason over my workspace without receiving write authority.

##### Requirement R1: Read-Only Workspace-Grounded Answers

The system SHALL answer an owner's question using Pi with only GraphiteMD-brokered search and bounded note-read tools over the active workspace.

- `R1-S1 Answer From An Eligible Note`: Pi searches and reads opaque note resources and returns a grounded answer with no write, shell, raw-path, or external tool.
- `R1-S2 No Relevant Note Produces An Honest Answer`: insufficient retrieved evidence yields an explicit cannot-answer result rather than invented workspace evidence.
- `R1-S3 Provider Or Workspace Is Unavailable`: disconnected provider, missing model, unavailable workspace, empty prompt, and duplicate in-flight prompt fail specifically and recoverably.

##### Requirement R2: Confined Context And Source Provenance

The system SHALL enforce the active workspace's eligible-resource boundary across Assistant search, reads, provider context, logs, and displayed source evidence.

- `R2-S1 Ineligible Content Never Reaches The Model`: internal, excluded, symlinked, unsupported, oversized, unknown, stale, and replaced-root resources are denied before provider context or logs.
- `R2-S2 Retrieval Remains Bounded`: search results and note excerpts have deterministic budgets and expose truncation/unavailability to both model and provenance.
- `R2-S3 Displayed Sources Reflect Successful Reads`: only successful read events can produce source UI; model-authored text cannot add a source or reveal a host path.

##### Requirement R3: Inspectable Conversation Record

The system SHALL keep a versioned workspace-local record of submitted questions, terminal answers/failures, provider/model identity, and successful sources without credentials.

- `R3-S1 Successful Turn Is Inspectable`: the completed normalized turn is committed under `.graphite/conversations/` and survives deletion of derived indexes.
- `R3-S2 Interrupted Turn Recovers Honestly`: atomic state transitions preserve the last valid record and surface incomplete/malformed state without fabricating completion.

##### Requirement R4: Accessible Context Experience

The system SHALL provide a responsive, keyboard-accessible Assistant question flow in Context and direct disconnected owners to Codex setup.

- `R4-S1 Desktop Context Question Flow`: Context presents empty, setup, loading, answer, source, long-content, and error states without obscuring document work.
- `R4-S2 Narrow Context Drawer Flow`: the existing full-screen drawer provides touch-sized controls with contained/restored focus.
- `R4-S3 Busy And Failure States Remain Operable`: duplicate question actions disable, status/errors announce accessibly, and session expiry returns to login.

##### Implemented By

Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- All `GMD-004/S2` Scenarios remain unverified until implementation.
- Live Codex grounding requires separate owner-authorized evidence and cannot be replaced by deterministic fakes.

## Epic File Rules

- `docs/epics/gmd-004-llm-assistant/epic.md` is the durable Story contract.
- No standalone Story files or duplicate implemented-state maps are created.
- Implementation will replace every `Not implemented yet.` entry with behavior-mapped locations and every verification gap with scenario-mapped evidence or an honest remaining gap.
- `GMD-003` remains authoritative for generic plugin lifecycle/conformance; `GMD-004` records only Assistant-specific behavior.

## Technical Options

### Option 1: Service-Owned Pi Adapter With Brokered Assistant Plugin

- Summary: Put Pi/OAuth/credential mechanics behind service-owned runtime-neutral capabilities; let the bundled Assistant plugin own prompt, retrieval policy, tool use, and UI contribution.
- User impact: Reliable Codex setup and read-only Q&A with visible sources; non-AI behavior remains independent.
- Implementation complexity: Medium-high; requires model/auth capability contracts, adapter, OAuth state machine, conversation authority, and Assistant plugin contribution.
- Reversibility: High; Pi and Codex are hidden behind contracts.
- Client surfaces: Existing Settings modal and Context panel/drawer.
- API / contract shape: Versioned provider-status/OAuth-flow/conversation/question/answer/source/error schemas under `/api/v1/assistant/**`.
- Frontend/backend boundary: Browser renders normalized state only; the service owns OAuth, runs, retrieval, persistence, and provenance.
- Data / schema impact: New versioned canonical files under `.graphite/conversations/`; no canonical database table.
- Auth / security impact: Owner session plus XSRF protects mutations; credentials stay under `GRAPHITEMD_STATE_DIR`; only brokered opaque reads reach Pi.
- Testability: Strong through injected OAuth/runtime doubles and deterministic provider tool-call scripts.
- Operational risk: Pi/provider API churn and OAuth callback behavior; contained by adapter characterization and explicit status.
- Fit with project conventions: Best fit with all four accepted ADRs.

### Option 2: Direct Pi Runtime Inside The Assistant Plugin

- Summary: Let `plugins/assistant` import Pi, manage credentials, create sessions, and call Codex directly.
- User impact: Similar initial UI.
- Implementation complexity: Lower initially.
- Reversibility: Medium; Pi-specific state and behavior leak into the plugin.
- Client surfaces: Same.
- API / contract shape: Plugin-specific routes/events.
- Frontend/backend boundary: Browser remains normalized, but plugin becomes a privileged service subsystem.
- Data / schema impact: Pi and plugin state would likely mix.
- Auth / security impact: Weakens credential, network, and filesystem mediation; transitive Pi behavior bypasses the broker.
- Testability: Good for happy paths but weaker for authority enforcement.
- Operational risk: First-party privilege becomes precedent for future plugins.
- Fit with project conventions: Rejected; conflicts with the capability-mediated platform.

### Option 3: Monolithic Core Assistant

- Summary: Implement auth, retrieval, prompting, and UI directly in server/web code without a bundled plugin contribution.
- User impact: Similar proof with fewer layers.
- Implementation complexity: Lowest initial path.
- Reversibility: Low-medium; product policy couples to the kernel.
- Client surfaces: Same.
- API / contract shape: Core-only routes.
- Frontend/backend boundary: Service-authoritative but not extensible.
- Data / schema impact: Core conversation store.
- Auth / security impact: Can be secure, but bypasses the plugin contract rather than proving it.
- Testability: Strong locally.
- Operational risk: A second architecture would be needed for future Assistant/plugin evolution.
- Fit with project conventions: Rejected; contradicts the accepted plugin direction.

## Selected Approach

Select Option 1.

### Runtime And Dependency Boundary

- Add a framework-neutral GraphiteMD model/auth boundary with injected provider, clock, ID, conversation-store, and workspace-tool dependencies.
- Adapt Pi `0.80.x` using `AuthStorage`, `ModelRegistry`, a restricted resource loader, an explicit session manager, and `createAgentSession`/current equivalent APIs characterized at the locked version.
- Use OpenAI provider ID `openai-codex`; default to the Coordinator-proven `gpt-5.4` model while allowing a documented host-only `GRAPHITEMD_CODEX_MODEL` override. Missing provider/model state is explicit; production never falls back to a fake model.
- Disable automatic extensions, skills, prompts, themes, context files, and built-in tools. Only GraphiteMD's `workspace_search` and `workspace_read` tool definitions enter the session.
- Normalize Pi text, terminal failure, usage, tool request/result, provider/model, abort, and source-read events before they cross application contracts.

### Authentication And Credential State

- Store Pi auth/model settings beneath `GRAPHITEMD_STATE_DIR/assistant/pi/`, never beneath `GRAPHITEMD_WORKSPACE_ROOT`.
- Provision parent directories with owner-only permissions and verify the credential file is not group/world-readable after login and at startup.
- Model the OAuth lifecycle as `awaiting_provider`, `awaiting_input`, `succeeded`, `failed`, or `cancelled`, with auth URL, device code, progress, selection/text/manual-code prompt, timestamps, and sanitized error.
- Allow one active flow; flow IDs and request IDs are opaque. Reject stale answers, invalid selections, empty required values, and concurrent starts. Retain only a small bounded set of terminal flow summaries with no secrets.
- Require the normal owner session on status/read routes and owner session plus XSRF on start/answer/cancel/disconnect mutations.

### Assistant Capability And Retrieval

- Add the bundled `assistant` manifest with declared read-only workspace search/read and model-session capabilities plus Context/Settings contributions.
- Extend the production SDK/host with narrowly typed registration and broker operations needed by this plugin. Do not broadly exempt `plugins/assistant` from the forbidden-source/import boundary.
- Reuse `LocalSearchService` and `ConfiguredWorkspaceAuthority` through a service-owned capability provider. Search returns bounded result metadata; read accepts only an issued opaque resource ID and revalidates active workspace/root identity.
- Apply deterministic result, byte, and total-turn context budgets. Tool results state truncation or denial without returning host paths.
- Treat note contents as untrusted data in the system prompt. A note cannot grant tools, change system instructions, or create source provenance.
- Build answer sources from the run's successful `workspace_read` results. The source contract contains only resource ID, display path, revision when useful, and a bounded excerpt/usage marker; it never trusts citations parsed from model text.

### Conversation State

- Bind each conversation to one workspace ID and use opaque conversation/turn IDs.
- Store a versioned, transparent canonical document under `.graphite/conversations/<conversation-id>.json` using the existing confined atomic-write discipline: question, terminal status, answer or sanitized failure, timestamps, provider/model identity, and successful source references.
- Record an in-progress turn before provider work, then atomically reconcile it to completed/failed/cancelled. Restart exposes an interrupted state rather than replaying or inventing completion.
- Keep Pi runtime/session scratch state machine-local or ephemeral. The normalized conversation file is canonical; future indexes remain rebuildable.

### HTTP And Browser Integration

- Add runtime-validated contracts and authenticated routes for provider status, OAuth start/read/answer/cancel/disconnect, current conversation creation/read, and question submission.
- The first question endpoint may return the terminal normalized turn as one bounded request/response; token streaming is deferred. The UI still provides an accessible busy state and prevents duplicate submissions.
- Add an `Assistant` Settings area for provider status, connect flow, progress/input, retry, and disconnect.
- Add an Assistant block to the existing Context panel/drawer with transcript, source list, prompt input, busy/error state, and a direct setup action when disconnected.
- Preserve owner-session expiry handling and all existing workbench states when Assistant contracts are malformed or unavailable.

## Experience Design

- Applicability: required; implementation-ready from existing GraphiteMD composition, so a separate `/sdd-design` pass is not required.
- Confirmed direction: Assistant is an additive block in Context; Codex connection is managed in Settings.
- User confirmation: the user confirmed the minimal proof. The placement follows existing Context/Settings ownership rather than introducing a new navigation mode.
- Reference artifacts: GraphiteMD `AppRail`, Context panel/drawer, and Settings patterns; Coordinator-Local OAuth state semantics only, not its visual design.

### User Flow And Information Architecture

1. The owner opens Context. If disconnected, the Assistant explains that Codex setup is required and offers `Connect Codex`/`Open Assistant settings`.
2. Settings > Assistant shows provider status and starts the normalized OAuth flow. External auth opens in a new browser tab/window; any required provider prompt remains in the GraphiteMD dialog.
3. After connection, Context exposes one labeled multiline question input and submit action.
4. During the request, the prompt remains visible but duplicate submit is disabled; a live status names search/read/model phases without leaking content.
5. The completed answer appears with a separate `Sources used` list. Selecting a source may reuse the existing opaque note-open action when available; polished citation navigation is deferred.
6. Failures preserve the question for retry and never replace the active note or dismiss the Context surface unexpectedly.

### Responsive Composition

- Desktop: Assistant occupies the upper interactive region of the existing right Context panel; long answer/source content scrolls inside the panel without changing page width or obscuring the document.
- Narrow: Assistant uses the existing full-screen Context drawer, safe-area padding, touch targets, focus containment, close behavior, and restored trigger focus.
- Settings retains its existing modal; the third Assistant tab participates in current vertical/roving navigation and narrow horizontal tab semantics without overflow.

### Component And State Contract

#### Component Strategy

| Component Or Pattern | Strategy | Initial Owner Or Reference | Required Preview States | Follow-Up |
|---|---|---|---|---|
| Context panel/drawer shell | existing application component | `apps/web/src/App.tsx` Context composition and `Drawer` | disconnected, ready, loading, answer, no evidence, error, long answer, long sources | Preserve existing focus and responsive behavior. |
| Assistant conversation block | application-specific | New bundled Assistant view contribution rendered by the web adapter | empty, prompt retained, busy, completed, failed, unavailable, interrupted | Keep source evidence visually distinct from model text. |
| Codex provider settings | adopted reference | Coordinator-Local OAuth states adapted to GraphiteMD Settings | disconnected, starting, auth URL/device code, selection, manual input, failed, cancelled, connected, disconnecting | Do not reuse Coordinator styling or developer-agent scope. |
| Source evidence list | application-specific | GraphiteMD opaque note identity/display path | one source, multiple sources, long path, truncated read, unavailable source | Source entries must come from service provenance. |
| Settings tabs | existing application component | `apps/web/src/SettingsPanel.tsx` | desktop vertical, narrow horizontal, keyboard roving, long labels | Reconcile three-tab narrow layout. |

### Accessibility And Interaction

- Use a labeled textarea and native submit/cancel/retry buttons with at least existing touch target dimensions.
- Announce phase and terminal changes through restrained `role=status`/`aria-live`; errors use `role=alert` without repeatedly announcing streamed content.
- Keep answer text selectable and semantically grouped by turn; source evidence is a labeled list independent of answer Markdown.
- OAuth input instructions, device codes, and errors have explicit labels and do not rely on color.
- Maintain drawer focus containment/restoration, Settings tab roving keys, Escape/close semantics, reduced motion, and no focus loss after a failed request.

### Visual Direction

- Reuse the existing dark utilitarian workbench tokens and panel hierarchy.
- Keep Assistant status quiet and operational; do not style model output as authoritative note content.
- Use the existing action color for primary setup/submit controls and muted bordered surfaces for turns and sources.

### Open Design Questions

- None block implementation. A future conversation library may justify a dedicated Assistant rail surface, but this proof does not.

## Client And API Boundary

- Current clients: authenticated React/Vite browser on desktop and mobile layouts.
- Plausible future clients: native/desktop wrapper, mobile app, CLI, and plugin-provided views.
- Reusable product capabilities: provider status/OAuth interaction, normalized Assistant turn, workspace search/read tools, source provenance, conversation persistence, and cancellation/error vocabulary.
- API or typed contract: TypeBox schemas in the shared contracts package; HTTP under `/api/v1/assistant/**`; plugin capability contracts remain framework-neutral.
- OpenAPI plan, if HTTP-facing: not required in this Change because the repository does not yet maintain OpenAPI; shared runtime schemas are authoritative and must be exercised against real HTTP.
- Backend platform exposed directly to clients?: no. AdonisJS, Pi, provider credentials, filesystem paths, and plugin internals stay behind normalized contracts.
- Client-specific presentation or local state: modal/drawer visibility, draft question, focus, scroll, and transient polling/input state only.
- Rationale: service authority protects credentials, workspace scope, canonical conversation state, provenance, and future clients from browser-specific behavior.

## Alternatives Considered

- Direct Pi import in the Assistant plugin:
  - Rejected because it creates a credential/network/filesystem bypass around the production capability broker.
- Core-only Assistant:
  - Rejected because it contradicts the accepted bundled-plugin architecture.
- Preload every note into one provider prompt:
  - Rejected because it violates bounded retrieval, increases disclosure/cost, and cannot prove relevance.
- Trust model-authored citations:
  - Rejected because generated text is not reliable provenance.
- API-key-only OpenAI onboarding:
  - Rejected because the user explicitly selected Codex authentication and Coordinator-Local already proves the OAuth interaction shape.
- Streaming SSE in the first proof:
  - Deferred because a terminal request/response proves provider, retrieval, provenance, and persistence with less state-machine/UI risk. Runtime-neutral event normalization still preserves a later streaming path.

## Why This Approach

It produces the smallest slice that proves real product value and the critical trust boundary simultaneously. The owner can ask about actual notes, while Pi, credentials, search, reads, provenance, and durable state remain subordinate to GraphiteMD's accepted service, plugin, filesystem, and agent-authority decisions.

## ADRs

- Required: yes
- ADR path: `docs/adrs/2026-07-19-pi-backed-assistant-runtime.md`
- Status: Proposed until implementation and review prove the boundary.
- Decision summary: run Pi behind service-owned model/auth capabilities, keep Codex credentials machine-local, and expose only brokered read-only Assistant tools.
- Reconsider when: Pi's programmatic boundary becomes unstable, local models change disclosure assumptions, multiple providers require a registry, or community plugin isolation changes runtime placement.

## Implementation Constraints

- Do not expose raw workspace or state-directory paths through HTTP, plugin, Pi tool, conversation, log, or source contracts.
- Do not place provider credentials, auth callback material, password/session state, or encryption keys under `.graphite/`.
- Do not enable Pi built-in tools or automatic project/config/resource discovery.
- Do not create a production fake-provider fallback. Fakes exist only behind injected test seams.
- Do not weaken the all-bundled-source import/dependency boundary with a blanket Assistant exception; allow only reviewed host/model capability dependencies.
- Revalidate workspace identity and opaque resource authority at every search/read, including after asynchronous provider delays.
- Bound question length, search count, read bytes, total context, answer size, retained OAuth summaries, and concurrent active work.
- Sanitize provider errors and logs. Never log question/note content by default.
- Preserve existing non-AI auth, workspace, search, editing, plugin, and responsive behavior.

## Verification Strategy

- Focused automated tests:
  - Runtime contracts reject malformed provider/OAuth/turn/source payloads.
  - OAuth manager covers success, option/text/manual input, cancellation, failure, conflict, stale input, logout, bounded retention, and credential redaction.
  - Pi adapter characterization proves no automatic resources/built-ins and normalizes text, usage, tool, source, abort, and failure events at the locked SDK version.
  - Workspace Assistant capability covers eligible search/read, stale/unknown resource, `.graphite`, exclusions, symlink/root replacement, byte/result/context budgets, and prompt-injection text.
  - Conversation authority covers atomic create/update, interrupted turn, malformed state, workspace binding, no credentials, and derived-index independence.
  - Plugin conformance and import-boundary suites cover the Assistant's declared contributions/capabilities without privileged bypass.
  - Browser components cover all provider, question, answer, source, error, focus, tab, and session-expiry states.
- Broad supporting gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:storybook`, `pnpm build-storybook`, `pnpm test:e2e`, and `pnpm audit --audit-level high`.
- Deterministic E2E: use an injected fake OAuth/runtime boundary and a disposable workspace with uniquely identifiable notes; prove connect, ask, brokered read, visible sources, inspectable conversation file, disconnect, mobile drawer, and non-AI continuity through the production server/browser path.
- Live-provider or external-service playtests: owner completes Codex OAuth and asks a question whose answer exists only in a disposable uniquely identifiable note; inspect answer, service-derived source, conversation file, and absence of credentials/content leakage in logs. Record this separately from deterministic proof.
- Manual UI confirmation: pending user after rendered inspection; desktop Context/Settings and narrow drawer flows need owner acceptance.
- Debug/log inspection: inspect sanitized provider/runtime failures, source provenance, credential/state permissions, browser console, and network responses. Logs must not contain note bodies, prompts, tokens, callback codes, or host paths.

## Decisions

- One Story owns the complete connect-and-ask user path.
- Pi `0.80.x` is adopted behind an adapter; the characterized implementation locks the compatible `0.80.6` package family rather than the planning-time `0.80.10` latest.
- Codex OAuth is the only onboarding route and `gpt-5.4` is the initial documented default with a host-only override.
- The Assistant is a bundled plugin using service-owned model/auth/workspace capabilities.
- Context/Settings reuse makes a separate design workflow unnecessary for this slice.
- Source UI is derived from successful reads, never parsed from model text.
- Canonical conversations are versioned workspace files; credentials and Pi scratch state are not.
- First delivery is terminal request/response rather than token streaming.

## Risks / Trade-Offs

- Pi is pre-1.0 and its programmatic APIs may change; adapter characterization and lockfile pinning add maintenance work.
- Codex OAuth may require owner interaction that deterministic CI cannot complete; live acceptance remains a separate external gate.
- Context-panel space limits long conversations; this is acceptable for the proof but may force a dedicated Assistant surface later.
- Persisting normalized conversations without a library/resume UI creates inspectable truth before complete navigation; the files are intentionally canonical future input rather than hidden dead state.
- Read access can disclose sensitive note content to the provider. This slice enforces current eligibility boundaries, but user-configurable Assistant exclusions remain important follow-up work.
