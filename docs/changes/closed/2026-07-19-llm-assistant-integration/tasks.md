---
status: in_review
---
# Tasks: LLM Assistant Integration

## Resume Here

- Last completed action: owner-confirmed the live Codex question, merged the Change into `develop`, and closed this artifact set.
- Next action: no active Change work; follow the deferred-scope or future verification Changes when selected.
- Integrated ref: `develop` includes merge commit `29a23d9` and closeout commit `c0e80a6`.
- Expected dirty files: none from this closed Change.
- Known constraints: service code keeps credential storage, Pi lifecycle, owner authorization, run serialization, workspace resource enforcement, provenance, and conversation persistence. The bundled Assistant owns the prompt, retrieval strategy, allowed tool selection, and Context presentation through declared capabilities.

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Confirm the read-only vertical slice: Codex authentication plus questions about any eligible Markdown note with visible service-derived sources.
- [x] 1.2 Split provider onboarding into `GMD-004/S1` and workspace Q&A into `GMD-004/S2` after semantic validation identified an oversized combined Story.
- [x] 1.3 Define observable OAuth, grounded-answer, no-evidence, unavailable, confinement, truncation, provenance, persistence/recovery, desktop/mobile, and accessibility Scenarios.
- [x] 1.4 Record proposals, writes, autonomy, other providers, conversation library/resume, memory, streaming, and Assistant-specific exclusion management as deferred.
- [x] 1.5 Define scenario-mapped deterministic, live-provider, rendered, and manual evidence obligations.
- [x] 1.6 Record why existing Context/Settings patterns make the experience implementation-ready without a separate `/sdd-design` pass.
- [x] 1.7 Define the proportional Visual Verification Matrix below.
- [x] 1.8 Set `status: planned` after artifact reconciliation and scoped validation.

### 2. Epic Artifacts

- [x] 2.1 Create `docs/epics/gmd-004-llm-assistant/` with `sdd epic create`.
- [x] 2.2 Refine `epic.md` to canonical `sdd-epic-v2` shape for `GMD-004/S1` and `GMD-004/S2`.
- [x] 2.3 Confirm both Stories have local Requirement/Scenario IDs, independent not-implemented/unverified state, explicit implementation gaps, empty evidence, and honest verification gaps.
- [x] 2.4 Confirm no existing Story moves or superseded behavior; `GMD-003` retains generic plugin-platform ownership.

### 3. Architecture Decisions

- [x] 3.1 Compare service-owned Pi capability, direct plugin Pi, and monolithic core Assistant options.
- [x] 3.2 Create `docs/adrs/2026-07-19-pi-backed-assistant-runtime.md` for `GMD-004/S1-S2` and link read-only Q&A in `GMD-004/S2` from the existing agent-authority ADR.
- [x] 3.3 Keep the new ADR `Proposed` until implementation and review prove its credential, tool, and workspace boundaries.
- [x] 3.4 Replan the user-selected split storage topology: portable workspace state under `.graphitemd/`, secrets under a machine-local `~/.graphitemd/` default (or safe override), and a fail-closed legacy migration.

### 4. Implementation

- [x] 4.0 Implement the workspace-vault and machine-vault boundary before further Assistant UI work.
  - [x] Replace `.graphite/` provisioning and all workspace-state consumers with `.graphitemd/`; atomically migrate a safe legacy directory and refuse ambiguous, symlinked, escaping, or conflicting layouts without data loss.
  - [x] Resolve an unset `GRAPHITEMD_STATE_DIR` to `~/.graphitemd/`; preserve explicit overrides only outside the workspace and enforce owner-only secret-state permissions.
  - [x] Reconcile search cache, plugin state, conversation persistence, resource exclusions, test fixtures, README backup/setup guidance, and assistant authority so `.graphitemd/` is canonical and both namespaces remain inaccessible to retrieval during the compatibility period.

- [x] 4.1 Establish the runtime-neutral Assistant contracts and service boundaries through BDD/TDD.
  - [x] Define provider status, normalized OAuth flow/input, conversation, turn, source, and error schemas used by service, plugin, and browser adapters.
  - [x] Add injected model/auth/runtime and conversation-store interfaces; keep AdonisJS, React, Pi, paths, and credentials out of domain contracts.
  - [x] Add the Pi `0.80.x` dependency at the reviewed current version and lock the exact resolution.
  - [x] Replace the core-owned question-policy seam with a policy-free brokered model-session capability that validates the enabled Assistant's declared prompt/retrieval/tool policy without exposing Pi, credentials, paths, filesystem, process, shell, or unrestricted network access.
- [x] 4.2 Implement `GMD-004/S1/R1 GraphiteMD-Owned Codex OAuth`.
  - [x] `R1-S1`: complete normalized Codex OAuth through Assistant Settings and persist owner-only machine-local credentials.
  - [x] `R1-S1a`: expose the transient provider browser-login URL in Settings alongside the manual-code fallback and clear it from terminal summaries.
  - [x] `R1-S2`: cover accessible cancel/input/progress/error states, invalid/stale input, provider failure, bounded terminal retention, retry, and concurrent-flow conflict.
  - [x] `R1-S2a`: refine the pending selection UI into a labelled radio-card group, a choice-specific primary continuation action, and a quiet secondary cancellation action without changing OAuth behavior or provider options.
  - [x] `R1-S2b`: recover the active normalized OAuth prompt after Settings remount instead of offering a conflicting second start.
  - [x] `R1-S2c`: preserve the provider-supplied opaque option ID when answering an OAuth selection prompt.
- [x] 4.3 Implement `GMD-004/S1/R2 Protected Credential Lifecycle`.
  - [x] `R2-S1`: keep credentials/callback material out of workspace, browser, conversations, and logs while exposing sanitized status in Settings.
  - [x] `R2-S2`: disconnect through Settings without changing workspace or canonical conversation content.
  - [x] `R2-S3`: reject unauthenticated provider mutations without revealing interaction state.
- [x] 4.4 Implement `GMD-004/S2/R1 Read-Only Workspace-Grounded Answers`.
  - [x] `R1-S1`: let the bundled Assistant create a restricted declared policy that invokes a service-enforced Pi session with only brokered search/read tools and returns a grounded answer.
  - [x] `R1-S2`: require an honest insufficient-evidence result when retrieval does not support an answer.
  - [x] `R1-S3`: fail specifically for disconnected provider, missing model, unavailable workspace, empty prompt, and duplicate in-flight work.
- [x] 4.5 Implement `GMD-004/S2/R2 Confined Context And Source Provenance`.
  - [x] `R2-S1`: revalidate eligible opaque resources and deny internal/excluded/symlinked/unsupported/oversized/stale/replaced-root content before provider context.
  - [x] `R2-S2`: enforce deterministic search/read/turn budgets and explicit truncation.
  - [x] `R2-S3`: derive source evidence only from successful brokered reads and never from model citation text.
- [x] 4.6 Implement `GMD-004/S2/R3 Inspectable Conversation Record`.
  - [x] `R3-S1`: atomically store versioned normalized turns beneath `.graphitemd/conversations/` without credentials or host paths.
  - [x] `R3-S2`: reconcile interrupted turns honestly and fail closed on malformed/partial state.
- [x] 4.7 Implement `GMD-004/S2/R4 Accessible Context Experience`.
  - [x] `R4-S1`: register the bundled Assistant Context contribution and render its desktop question/answer/source states without obscuring the document workbench.
  - [x] `R4-S2`: reuse the narrow full-screen Context drawer with touch targets and focus containment/restoration.
  - [x] `R4-S3`: add accessible question busy/error announcements, duplicate-action prevention, and owner-session expiry handling.
- [x] 4.8 Exercise the production bundled-plugin boundary.
  - [x] Add the Assistant manifest/contributions and only the narrow model-session/workspace capabilities needed by `S1-S2`; prove the plugin, not core routes, owns prompt, retrieval strategy, tool selection, and Context presentation.
  - [x] Extend the SDK/host capability facade without giving the Assistant raw credential, filesystem, process, shell, or unrestricted network access.
  - [x] Update the bundled-source/dependency boundary with explicit reviewed capability imports rather than a blanket plugin exception.
- [x] 4.9 Reconcile implementation truth and user documentation.
  - [x] Replace `GMD-004/S1-S2` implementation gaps with requirement-mapped concrete locations and stable anchors.
  - [x] Update README setup/security/backup guidance, plugin/Assistant boundaries, and the `CHANGELOG.md` user-facing entry.
  - [x] Keep all accepted ADRs and `GMD-003` ownership accurate.

### 5. Verification

- [x] 5.1 Add focused contract, OAuth, Pi-adapter, retrieval/confinement, conversation, plugin, server-route, and browser-component evidence for every Scenario.
- [x] 5.1a Add workspace bootstrap/state resolver evidence for fresh `.graphitemd/` initialization, lossless legacy migration, conflict and symlink refusal, cache/operation exclusions, default machine state, safe override, and secret permissions.
- [x] 5.2 Add deterministic production-server/browser E2E using fake OAuth/runtime boundaries and a disposable workspace with uniquely identifiable notes.
- [x] 5.3 Verify the deterministic E2E proves visible service-derived sources and the canonical conversation file, not merely plausible model text.
- [x] 5.4 Run and directly inspect the rendered UI matrix across desktop and narrow viewports, including console and network failures.
- [x] 5.5 Run a separate owner-authorized live Codex playtest against a disposable uniquely identifiable note; inspect answer, provenance, canonical state, permissions, and sanitized logs.
- [x] 5.6 Update `GMD-004/S1-S2` `Verified By` with scenario-mapped evidence and retain any unproved live/manual/platform cases as gaps.
- [x] 5.7 Verify the Proposed ADR assumptions and decide during review whether evidence supports `Accepted` or requires revision.
- [x] 5.8 Run focused package tests, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:storybook`, `pnpm build-storybook`, `pnpm test:e2e`, `pnpm audit --audit-level high`, and scoped `sdd validate`.

### 6. Review And Closeout

- [x] 6.1 Confirm README and `CHANGELOG.md` describe only shipped user-visible behavior and current operational/security guidance.
- [x] 6.2 Run `/sdd-review` as the independent local integration gate for behavior, auth, credential handling, context disclosure, prompt injection, persistence, plugin boundaries, UI, docs, ADRs, and branch readiness.
- [x] 6.3 Record review outcome in `review.md` and resolve or explicitly defer every finding.
- [x] 6.4 Record manual UI confirmation as `user confirmed` or an explicit `accepted gap`; do not conflate agent-rendered inspection with owner acceptance.
- [x] 6.5 Keep `status: in_progress` while independent-review remediation is underway; return to `in_review` only after the live provider and manual confirmation evidence are recorded.
- [x] 6.6 Reconcile proposal/design/tasks/review/Epic/ADR/README/changelog truth after the final implementation commit.
- [x] 6.7 Create a PR or merge only after review is ready and the user grants the exact Git operation.
- [x] 6.8 Run `sdd change close` only after accepted review/merge/confirmation state is accurately recorded.

## Implementation Ledger

This ledger is chronological. Earlier rows that describe pending proof are historical and are superseded by the final 2026-07-22 evidence, review, and Closeout sections.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-19 | Enabling contracts and capability facade | main + bounded discovery worker; Context7 Pi API check and Coordinator-local `0.80.6` reference | `packages/contracts`, `packages/plugin-sdk` | Failing-first contract coverage followed by runtime-validated sanitized provider/OAuth/question/turn/source schemas and a declared service-owned Assistant capability facade. No Pi, OAuth, routes, manifest, retrieval, persistence, or UI behavior yet. | `452a781` |
| 2026-07-19 | GMD-004/S1 OAuth boundary and Settings controls | main | `apps/server/app/assistant`, authenticated assistant routes/tests, Settings UI, contracts, Pi package lock | Locked Pi's compatible `0.80.6` adapter graph; credentials and session scratch remain machine-local. Deterministic tests cover flow conflict/cancel/retry/failure, transient device-code instructions, credential permissions, normalized owner provider state, and unauthenticated route rejection. The Settings tab polls only normalized flow state and never receives credentials. Live OAuth remains an external verification gap. | `f5738d7` |
| 2026-07-20 | GMD-004/S2 R2 confined context and provenance | main + bounded discovery worker | `apps/server/app/assistant/workspace_context.*`, Assistant error contract, GMD-004 Epic | A service-owned broker limits search/read context, revalidates every opaque resource through workspace authority, avoids UTF-8 replacement output, emits explicit context-limit failure, and records source evidence only after successful reads. | `9d9a551` |
| 2026-07-20 | GMD-004/S2 R3 canonical conversation record | main | `apps/server/app/assistant/conversation_store.*`, GMD-004 Epic | Confined atomic conversation documents persist normalized turns without provider state. Malformed/redirection state fails closed and unfinished turns recover to explicit interrupted failures. | `61de525` |
| 2026-07-20 | Workspace vault and machine secret vault | main | workspace authority/bootstrap, search/plugin/conversation state consumers, security resolver, Pi boundary, README, ADRs, GMD-004 | Safe `.graphite` state atomically migrates to `.graphitemd`; conflicts and symlinks fail closed; retrieval excludes both namespaces. Secret state defaults to `~/.graphitemd` and rejects workspace or symlink traversal. | `35d3aa0` |
| 2026-07-20 | GMD-004/S2 R1 deterministic question orchestration | main | `apps/server/app/assistant/question_service.*`, GMD-004 Epic | Normalized owner questions have one in-flight slot, a persisted in-progress/terminal record, explicit unavailable/invalid/no-evidence outcomes, and sources only from brokered reads. Pi/HTTP/UI adapters remain the next phase. | `d6edd59` |
| 2026-07-20 | GMD-004/S2 R1 Pi/HTTP adapter | main + Context7 Pi SDK documentation | Pi adapter, assistant question route, server dependency graph | The production adapter exposes only custom `workspace_search` and `workspace_read` tools to a no-builtins Pi session and routes authenticated normalized questions through the service. Direct adapter/HTTP fake-runtime evidence remains pending. | `71cfacf` |
| 2026-07-20 | GMD-004/S1 R1-S2a OAuth selection hierarchy | main | `apps/web/src/SettingsPanel.tsx`, `AssistantSettings.css`, Settings component tests | Replaced the ambiguous native inline select with a radio-card choice group, a selected-choice primary action, and a quiet cancellation action; the dynamic provider options and normalized answer/cancel contracts are unchanged. | `b2f46f9` |
| 2026-07-20 | GMD-004/S1 R1-S2b active OAuth recovery | main | OAuth manager, active-flow contract/route, Settings component tests | The owner can remount Settings during an active Codex flow and recover the same normalized prompt rather than attempt a conflicting second start. | `9c1b8a8` |
| 2026-07-20 | GMD-004/S1 R1-S2c provider selection-ID bridge | main | Pi OAuth callback adapter and OAuth manager tests | Mapped the Pi provider's `id` option shape through the normalized selection prompt, so the chosen `browser` or `device_code` value reaches Pi instead of being rejected as stale. | `6c3274e` |
| 2026-07-20 | GMD-004/S1 R1-S1a browser-login link | main | OAuth contract/manager and Settings component tests | Retained Pi’s transient authorization URL only on the active normalized flow, rendered a secure browser-login link, and cleared it from terminal summaries. | `1f86f4d` |
| 2026-07-20 | GMD-004/S2 bundled Assistant Context | main + bounded SDK/plugin worker; Context7 Pi API check | contracts, plugin SDK/host, `plugins/assistant`, Pi model-session broker, authenticated route, Context browser adapter | The bundle owns the grounded prompt, search/read declaration, and Context descriptor; the host allows one declared handler, while the service owns Pi, workspace enforcement, provenance, persistence, and credentials. | `097e180` |
| 2026-07-20 | Independent-review Assistant boundary remediation | main + independent local review | plugin SDK/host, Assistant bundle, conversation store/question service, Context UI/tests | Model execution is now request-scoped to a single dispatched handler and exact registered policy; activation-time/direct model calls and fabricated turns fail closed. Follow-up turns append atomically to canonical conversation files after retained in-progress turns are recovered. Busy state has an announced status and recoverable failures expose a named retry action. | `8990b64` |
| 2026-07-22 | Independent-review deterministic and live evidence closeout | main + independent local review + owner live confirmation | Pi boundary characterization, real HTTP question route, production-browser Context journey, live Codex playtest, design/verification artifacts | A test-only opt-in runtime exercises a production-built server without a production fallback. Real HTTP proves XSRF/dispatch/provenance/conversation persistence; browser coverage proves desktop containment and narrow answer/source/long-content/focus/session-expiry behavior; the owner-confirmed live Codex turn proves the provider path and visible source evidence. | `0008243` |
| 2026-07-19 | Promotion and implementation start | main | active Change artifacts, GMD-004 draft Epic, proposed Pi/Codex ADR, related ADR index/link | validated; promotion completed and status transitioned to `in_progress` | `3e6d89b` |

## Verification Ledger

This ledger is chronological. Earlier pending results record the state at that date; the final 2026-07-22 rows and Closeout section are authoritative for current readiness.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-19 | `pnpm --filter @graphitemd/contracts test`; `pnpm --filter @graphitemd/plugin-sdk test`; package lints/typechecks; server bundled import-boundary suite | focused automated test / supporting gate | Sanitized Assistant contracts reject token-bearing or malformed terminal payloads; SDK operations require declared capabilities and validate replies before plugins can consume them; the existing bundled import boundary remains green. | passing; enables later Story evidence but does not verify a GMD-004 Scenario alone |
| 2026-07-19 | contracts/plugin SDK suites; server OAuth and authenticated HTTP suites; web Settings suite; package lint/typecheck | focused automated test | S1 deterministic flow states, protected state permissions, normalized owner-only service responses, unauthenticated mutation rejection, and accessible three-tab Settings navigation. | passing; live provider path remains pending owner OAuth |
| 2026-07-20 | `pnpm --filter @graphitemd/server test -- workspace_context.test.ts`; server typecheck/lint; contracts and plugin SDK suites | focused automated test | `GMD-004/S2/R2-S1-S3`: existing workspace authority is rechecked at brokered reads; `.graphite`, unknown and symlinked content stay out; context bounds are UTF-8 safe and source provenance follows successful reads only. | passing |
| 2026-07-20 | `pnpm --filter @graphitemd/server test -- conversation_store.test.ts`; server typecheck/lint | focused automated test | `GMD-004/S2/R3-S1-S2`: canonical conversation files are versioned and confined, avoid credential/path leakage, recover interrupted turns honestly, and fail closed for malformed or redirected state. | passing |
| 2026-07-20 | `pnpm --filter @graphitemd/server test -- question_service.test.ts` plus retrieval/conversation suites; server typecheck/lint | focused automated test | `GMD-004/S2/R1-S2-S3`: no-evidence, disconnected, empty, and duplicate questions terminate specifically; a completed answer can only carry brokered-read sources. | passing |
| 2026-07-20 | `pnpm --filter @graphitemd/workspace test`; `pnpm --filter @graphitemd/plugin-sdk test`; focused server workspace/state/search/plugin/conversation/authentication suites; workspace/plugin-sdk/server lint and typecheck | focused automated test / supporting gate | `GMD-004/S1/R2-S1` and `GMD-004/S2/R2-S1,R3-S1`: safe legacy state migrates atomically to `.graphitemd`, conflicts and symlinks fail closed, retrieval/state consumers use the canonical namespace, and machine secret state defaults outside the workspace. | passing: 38 workspace, 14 SDK, and 64 focused server tests |
| 2026-07-20 | `pnpm --filter @graphitemd/web test -- SettingsPanel.test.tsx`; web lint and typecheck | focused automated test | `GMD-004/S1/R1-S2a`: the default provider choice is a labelled checked radio, choosing another option changes the specific continuation label and submitted value, and cancellation remains separately available. | passing: 6 files, 56 tests |
| 2026-07-20 | `pnpm --filter @graphitemd/server test -- oauth_flow_manager.test.ts`; `pnpm --filter @graphitemd/web test -- SettingsPanel.test.tsx`; contracts/server/web typechecks; `pnpm build` | focused automated test / supporting gate | `GMD-004/S1/R1-S2b`: an active flow remains available while running, terminal cancellation clears it, and Settings restores a provider-supplied choice after remount rather than posting a conflicting start. | passing: server 86, web 57, contracts 10 tests; all focused typechecks and production build passed |
| 2026-07-20 | `pnpm --filter @graphitemd/server test -- oauth_flow_manager.test.ts`; server typecheck and lint | focused automated test / supporting gate | `GMD-004/S1/R1-S2c`: a provider choice with `id: browser` is normalized to a browser `option_1` control and resolves back to `browser`, rather than producing an invalid-input error. | passing: server 87 tests |
| 2026-07-20 | Isolated `PiRuntimeBoundary` OAuth smoke using a temporary machine-state directory, then `pnpm build` | adapter smoke / supporting gate | The locked live Pi package emits a selection, accepts the normalized browser choice, and reaches its manual browser-code prompt without persisting credentials; production build succeeds. | passing; no external authorization or credential exchange performed |
| 2026-07-20 | contracts/SDK/server/web focused suites; package typechecks and lint | focused automated test / supporting gate | `GMD-004/S1/R1-S1a`: a provider authorization URL is delivered only to the active flow, rendered as a safe new-tab browser-login link beside the manual fallback, and cleared when cancelled. | passing: contracts 10, SDK 14, server 88, web 58 tests |
| 2026-07-20 | Browser preview with mock normalized owner/workspace/OAuth responses at `1440x900` and `390x844` | rendered UI verification | `GMD-004/S1/R1-S2a`: direct inspection confirms selected radio cards, an explicit primary continuation action, secondary cancellation, no narrow overflow, no error overlay, and no console errors. | passing for the pending-selection state; remaining OAuth states still pending |
| 2026-07-20 | contracts (11), plugin SDK (16), Assistant plugin (2), server (89), web (60), package typechecks/lints, bundled-import boundary, production build | focused automated / supporting gate | `GMD-004/S2/R1-S1-S3`, `R4-S1-S3`, and plugin boundary: policy is bundle-owned, the host dispatches the sole active handler, service persistence/provenance remains authoritative, and the composer preserves its prompt while preventing duplicate runs. | passing; direct connected Pi session and production fake-runtime E2E remain pending |
| 2026-07-20 | plugin SDK (15), Assistant plugin (2), server (90), web (61), repository typecheck and lint | focused automated test / supporting gate | Independent-review remediation: model work cannot start during activation, only the registered policy may execute once per dispatched question, fabricated handler turns fail closed, canonical follow-ups append/recover safely, and busy/retry UI is announced and operable. | passing; route/Pi deterministic integration and live/narrow browser evidence remain pending |
| 2026-07-20 | authenticated disposable workspace in Vite dev server, Context drawer, agent-browser | rendered UI verification | Active System Status and Assistant descriptor contributions render together; disconnected Codex gives a clear Settings handoff; no blank page, overlay, or console error. | passing for authenticated desktop disconnected state |
| 2026-07-22 | `pnpm test`, focused Pi/HTTP suites, and scoped `sdd validate` | focused automated test and artifact validation | GMD-004/S1-S2 deterministic behavior, restricted Pi construction, authenticated dispatch, provenance, persistence, and reconciled artifact truth. | passing: 12 contracts, 15 SDK, 38 workspace, 92 server, 61 web, and bundled plugin tests; 0 validation findings |
| 2026-07-22 | Production fake-runtime browser journey | deterministic E2E | Desktop and 390px connected question flow, brokered read, service-derived sources, persistence, long-content containment, retry, focus restoration, and session expiry. | passing: 2/2 Playwright tests |
| 2026-07-22 | Rendered Context/Settings matrix | rendered UI verification | Desktop Context containment, narrow answer/source/error states, Settings OAuth selection layout, and absence of horizontal overflow. | passing for the accepted surface matrix |
| 2026-07-22 | Owner-connected Codex playtest against `Welcome.md` | live-provider playtest and manual confirmation | Real OAuth/model completes a grounded turn with matching service-derived source provenance, protected canonical state, and sanitized logs. | passing; user confirmed |
| 2026-07-20 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build-storybook`, `pnpm test:storybook`, `pnpm test:e2e`, `pnpm audit --audit-level high`, scoped `sdd validate` | broad supporting gate | Repository integration, production artifact serving, Storybook interactions, foundation desktop/mobile journey, dependency audit, and artifact consistency. | passing; existing Storybook React `act` warning observed, but all 30 stories passed |
| 2026-07-22 | Release PR inline-review remediation; focused regression suites, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm audit --audit-level high` | focused automated / broad supporting gate | Current-search read authorization, snippet stripping, startup-wide conversation recovery, symlink-safe state creation, serialized OAuth start/cancel/disconnect cleanup, host-originated plugin error propagation, and live provider-state refresh. | passing: 12 contracts, 17 SDK, 38 workspace, 102 server, 63 web, and bundled plugin tests; production build and high-severity audit pass |
| 2026-07-22 | `AssistantCancellationRecovery` Storybook interaction plus direct `1440x900` inspection; mounted Context provider-refresh component test | rendered UI / focused component evidence | A terminal cancellation returns Settings to a clean disconnected state with an actionable Connect control; an already-mounted Context rechecks provider availability after Settings changes. | passing: clean desktop render with no overflow or error overlay; refresh transition passes in the focused component suite |

## Manual Feedback

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-20 | Settings showed `connecting` and a generic start error after the active OAuth flow was no longer held in the remounted browser component. | defect | Added an owner-authenticated active-flow route and Settings recovery; retained one-flow conflict enforcement. | fixed; later live OAuth completed 2026-07-22 |
| 2026-07-20 | The restored browser-login choice displayed correctly but its continuation returned `That authorization input is no longer valid.` | defect | Corrected the Pi provider option bridge from a nonexistent `value` field to the actual opaque `id` field and added a failing-first regression test. | fixed; later live OAuth completed 2026-07-22 |
| 2026-07-20 | Browser login reached a manual-code field with no authorization link or new-tab action. | defect | Matched Coordinator-Local’s proven active-flow treatment: preserve and render Pi’s transient auth URL before the manual fallback. | fixed; later live OAuth completed 2026-07-22 |

## Planning Updates

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-07-20 | Owner selected an atomic Obsidian-like workspace vault while keeping credentials out of the workspace. | scope expansion, explicitly accepted | Replanned `.graphite/` to `.graphitemd/` workspace migration, machine-local `~/.graphitemd/` state default, override safety guard, compatibility exclusions, and documentation/verification obligations in proposal/design/tasks and the Proposed ADR. Actual Epic and application code remain unchanged in this planning pass. | `/sdd-apply` 4.0 workspace-vault and machine-vault boundary |
| 2026-07-20 | Plugin-boundary discovery found current core-owned Pi/retrieval orchestration conflicts with the accepted plugin-owned Assistant policy/retrieval decision. | technical constraint / Epic ownership reconciliation | Reconfirmed the accepted brokered bundled-Assistant approach: the service becomes a policy-free model/session, enforcement, provenance, and persistence host; the bundled Assistant owns prompt, retrieval strategy, declared tool selection, and Context presentation. Updated proposal/design/tasks; the Proposed Pi ADR remains aligned and needs no decision change. No application or Epic files changed in this replan. | `/sdd-apply` 4.1 policy-free model-session capability, then 4.8 Assistant manifest/contribution and 4.7 Context UI |

## Design Updates

| Date | Feedback / Discovery | Classification | Reference / Target | Preserve / Change / Non-Goals | Artifact Updates | Next Apply Starting Point |
|---|---|---|---|---|---|---|
| 2026-07-20 | Owner selected a portable workspace vault and a separate machine secret vault. | technical constraint | Workspace initialization and configuration | Preserve the existing Context/Settings experience and read-only boundaries; change only the storage topology, migration, defaults, and recovery messaging. | proposal.md / design.md / tasks.md / ADR | `/sdd-apply` 4.0 storage boundary |
| 2026-07-19 | Pi `0.80.10` removed the programmatic `AuthStorage` export used by the accepted service adapter, while the `0.80.6` package and its matching internal packages expose the characterized API. | technical constraint | Pi runtime adapter | Preserve the accepted `0.80.x` dependency range and service boundary; lock `0.80.6` with workspace overrides until a separately characterized upgrade. | design.md / tasks.md | `/sdd-apply` GMD-004/S2 |
| 2026-07-20 | Context exhaustion needs a distinct normalized result so it is not misreported as a workspace outage. | technical constraint | Assistant error contract | Add `context_limit`; retain `workspace_unavailable` only for authority/search availability failures. | contracts / tasks.md | `/sdd-apply` GMD-004/S2 R3 |
| 2026-07-20 | Owner screenshot showed an ambiguous inline continuation action, browser-default selection control, and a cancel button that dominated the OAuth choice. | experience refinement | Settings > Assistant pending OAuth selection | Preserve provider options, normalized flow, keyboard behavior, retry, and cancellation semantics. Replace the native inline select with a labelled radio-card group; use a choice-specific primary continuation action and quiet secondary cancellation. No provider/API/scope change. | design.md / tasks.md | `/sdd-apply` GMD-004/S1 R1-S2a |
| 2026-07-22 | Pi `AuthStorage.login` has no abort primitive. | accepted SDK constraint | OAuth cancellation cleanup | Serialize replacement starts and disconnect behind cancelled-flow cleanup so stale flows cannot overwrite or erase newer credentials; a provider promise that never settles requires service restart. | review.md / OAuth manager tests | `/sdd-pr` remediation |

## Implementation Risk And Confirmation Matrix

| Risk / Boundary | Confirmation | Evidence / Status |
|---|---|---|
| Opaque workspace authority, root replacement, symlinks, internal state | Every provider-bound read re-enters `ConfiguredWorkspaceAuthority.readNote`; no search snippet is model context. | `workspace_context.test.ts`; passing |
| Byte/context exhaustion and malformed UTF-8 | Per-source and total byte limits preserve valid text; exhaustion is explicit. | `workspace_context.test.ts`; passing |
| Provenance forgery | Sources derive only from brokered successful reads, never model-authored text. | `workspace_context.test.ts`; passing |
| Canonical conversation durability | Atomic, confined versioned record plus interruption recovery. | `conversation_store.test.ts`; passing |
| Provider/tool confinement | Pi has exactly brokered search/read custom tools and no ambient built-ins/resources. | `pi_runtime_boundary.test.ts` passing; live connected run confirmed |
| Question state and no-evidence | One active run is permitted; replies without successful brokered reads fail closed and persist a terminal result. | `question_service.test.ts`; passing |
| Workspace namespace migration | Existing `.graphite/` moves only by safe atomic rename; conflict, symlink, escape, or partial layout stops without merge or deletion. | `packages/workspace` 38-test suite passing |
| Secret-vault boundary | Unset state defaults to `~/.graphitemd/`; configured state cannot resolve inside the workspace and remains owner-only. | focused `owner_setup_service` test passing |
| OAuth remount recovery | Browser reacquires the sole active normalized flow before rendering another connect action; terminal flows clear it. | OAuth manager and Settings component focused tests passing |
| OAuth provider option shape | Pi selection prompts use opaque `id` values; GraphiteMD maps the browser-visible choice back to that ID without exposing provider internals. | OAuth manager provider-shape regression test passing |
| Browser authorization handoff | Pi’s active browser authorization URL is shown only as a safe `noopener` new-tab link and is cleared from retained terminal flow summaries. | OAuth manager and Settings component browser-link tests passing |
| Policy ownership and plugin bypass | The service validates only a declared plugin policy and brokered tool set; no core route hard-codes an Assistant prompt, retrieval sequence, tool selection, or Context presentation. | SDK/plugin conformance, host dispatch, and bundled-import-boundary suites passing |
| Declared Pi tool/session boundary | Pi receives only policy-declared custom tools through an explicit allowlist and uses in-memory Pi settings/session state. | contracts/SDK/plugin, question-service, host-dispatch, bundled-import-boundary, Pi characterization, and live connected run passing |

## Verification Environment

| Environment | Purpose | Readiness |
|---|---|---|
| Temporary filesystem workspace | Authority, boundary, persistence, and recovery tests. | available; retrieval and conversation suites passing |
| Deterministic injected Pi runtime | Production-path question, provenance, and conversation E2E. | available; production-built E2E passing |
| Bundled Assistant host fixture | Manifest/contribution registration and capability boundary tests without Pi or raw workspace authority in the plugin. | available; plugin conformance and host dispatch suites passing |
| Owner Codex subscription | Live OAuth/model grounding playtest. | completed and accepted 2026-07-22 |

## Manual UI Confirmation

- Status: user confirmed 2026-07-22
- App URL / route: production-built GraphiteMD origin; authenticated workbench Context and Settings > Assistant.
- Required setup or test data: disposable workspace with at least one uniquely identifiable Markdown fact; owner-completed Codex OAuth; no real secrets in the test note.
- Steps for the user:
  1. Connect Codex through Settings and return to Context.
  2. Ask a question answerable only from the identifiable note.
  3. Confirm the answer and `Sources used` entry match that note.
  4. Ask an unsupported question and confirm the Assistant admits insufficient note evidence.
  5. Disconnect Codex and confirm editing/search remain usable while new questions are disabled.
- Expected result: connection status is honest, answers are read-only and source-backed, failures are recoverable, no secrets or host paths appear, and desktop/narrow interactions remain comfortable.
- Feedback that would change artifacts: a need for a dedicated Assistant surface, streaming, additional provider/model controls, conversation resume, different source behavior, or tighter exclusion control is planning-level input.

## Visual Verification Matrix

| Surface / Route or Fixture | Viewport | State / Interaction | Expected Rendered Behavior | Tool / Setup | Inspected Evidence | Console / Network | Result |
|---|---|---|---|---|---|---|---|
| Settings > Assistant | 1440x900 | disconnected, start OAuth, auth URL/device code, option-card selection, manual code, primary continue, cancel, failed, connected, disconnect | Vertical tabs and provider controls remain contained; status is explicit; choice cards and a choice-specific primary action make the forward path clear; cancellation stays secondary; no credential/callback secret renders. | Production Vite browser, owner live OAuth, and focused component/HTTP tests | Direct pending-selection inspection and completed live connection flow; cancel, failure, connected, and disconnect states have focused deterministic coverage. | No error overlay; normalized responses and inspected logs contain no secrets. | passing for the accepted Settings matrix |
| Context panel | 1440x900 | disconnected, empty/ready, submitting, grounded answer, no evidence, error, retry, long answer, multiple/long sources | Document remains visible and unobscured; panel scroll is contained; input/status/sources stay operable and distinct. | Production-built deterministic E2E plus live provider | Direct desktop containment and live grounded-answer/source inspection. | Clean deterministic run; live logs sanitized. | passing |
| Context panel | 1440x900 | authenticated disconnected owner opens Context | Assistant contribution appears through its active descriptor, sits beside System Status, and offers a clear Settings handoff without console or framework errors. | Disposable workspace and runtime browser | Direct screenshot and interactive snapshot. | No overlay; console errors `[]`. | passing |
| Settings > Assistant | 390x844 | horizontal tab navigation, OAuth option cards, primary continue, cancel, failure/retry, connected | Tabs do not overflow; choices and actions stack without horizontal overflow; touch targets and safe areas hold; modal remains focus-contained. | Production Vite browser plus component interaction coverage | Direct pending-selection inspection at 390x844; remaining normalized states exercised by focused component tests. | No horizontal overflow or console error. | passing for the accepted narrow Settings matrix |
| Context drawer | 390x844 | open/close, prompt, busy, answer, sources, error, long content | Full-screen drawer contains focus, restores trigger focus, respects safe areas, and avoids page overflow. | Production-built deterministic E2E | Direct screenshot, interaction, and focus trace. | Clean; no horizontal overflow. | passing |
| Auth/session recovery | 1440x900 and 390x844 | owner session expires during OAuth or question | Assistant state fails safely and the app returns to login without exposing stale content or trapping focus. | Production-built deterministic E2E | Direct browser interaction and network trace. | Expected 401; no unexpected console error. | passing |

## Pattern Parity And Stateful Transition Closure

| Lens | Reference / Transition | Evidence / Remaining Gap |
|---|---|---|
| Pattern parity | `system-status` remains a declared Context renderer; the browser maps renderer descriptors rather than plugin IDs. | `App.test.tsx` verifies active/disabled contribution removal; passing. |
| Plugin lifecycle | Assistant enabled → handler registered → question dispatch; Assistant disabled → handler unavailable and Context descriptor absent. | plugin SDK and `plugin_runtime_service.test.ts` passing. |
| Question lifecycle | idle → asking → terminal turn or recoverable error; prompt remains visible while in flight, busy is announced, duplicate submit is disabled, and recoverable errors expose a named retry. | `AssistantContext.test.tsx` passing. |
| Model-session boundary | inactive plugin → no runner; dispatched handler → one exact-policy model runner → terminal service turn; activation-time/direct calls and fabricated turns fail closed. | `packages/plugin-sdk/src/index.test.ts` passing. |
| Conversation lifecycle | first turn creates canonical record; follow-up appends a new in-progress turn; retained in-progress turns recover before append. | `question_service.test.ts` passing. |
| Provider lifecycle | disconnected → Settings handoff; connected → composer. | disconnected render, deterministic connected journey, and live-provider playtest passing. |

## Decision Fan-Out Check

| Decision | Affected Consumers | Reconciled Evidence |
|---|---|---|
| Bundle owns policy and Context descriptor | contracts, plugin SDK/host, Assistant bundle, Pi broker, route, browser adapter | `097e180`; focused suites and direct disconnected render. |
| Pi has no ambient workspace/session configuration | Pi boundary, conversation authority, credentials, source provenance | Pi characterization plus live connected check passing. |

## Changed-Surface Reverse Traceability

| Classification | Candidates | Resolution |
|---|---|---|
| Epic-owned behavior | model-session contracts/SDK, Assistant bundle, Pi broker, plugin dispatch, Context adapter and tests | `GMD-004/S2` Implemented By and Verified By maps updated with concrete anchors. |
| Supporting/shared infrastructure | System Status descriptor, Storybook fixture, package/lock metadata, README/changelog | Preserved as generic Context parity, test fixture, or delivery metadata; no orphan removal indicated. |
| Earlier Epic/shared behavior | workspace/local-search/state migration files and existing styles | Retained as `GMD-002`/prior `GMD-004` support; the user-owned `apps/web/src/styles.css` remains unstaged and unmodified by this Change. |
| Explicit verification gaps | none for this Change | All deterministic, rendered, live-provider, and owner-confirmation evidence is recorded. |

## Blockers / Open Questions

- No planning blockers. The replan retains the accepted brokered bundled-Assistant ownership and classifies the direct core orchestration as implementation drift to remove during Apply.
- None.

## Closeout

- Change status: closed after the owner-authorized local merge.
- Epic files updated: `GMD-004` maps the implemented bundled policy, broker, Context adapter, and complete accepted-scope verification evidence.
- Story labels/references and Requirement/Scenario IDs current: yes for `S1` onboarding and `S2` Q&A scope.
- Implemented By maps current: bundled policy, host dispatch, Pi broker, persistence/provenance, and Context adapters reconciled.
- Scenario-mapped Verified By maps current: complete for the accepted scope.
- Superseded earlier Epic truth reconciled: no superseded behavior; `GMD-003` boundary retained.
- ADR status: `docs/adrs/2026-07-19-pi-backed-assistant-runtime.md` Accepted.
- Release communication current: README and user-facing changelog now describe the shipped bounded Assistant surface.
- `sdd-review` verdict: ready; the release PR remediation received a fresh full review at `e7dd349d3b77f64fe5ef643c556ab260bdaf1f34`.
- Review record: `review.md` records complete deterministic, live-provider, owner-confirmation, and release PR remediation evidence.
- `review.md` findings resolved: request-scoped model execution, exact policy/descriptor enforcement, follow-up persistence, busy announcement, retry affordance, external route/Pi coverage, narrow Context, and live provider evidence.
- Planning updates resolved: 2026-07-20 split workspace-vault/machine-vault topology implemented and reconciled.
- Manual UI confirmation status: user confirmed after live connected playtest.
- Rendered UI verification status: deterministic desktop/narrow matrix and live connected Context verified.
- PR / merge state: owner authorized a local merge into `develop` and closeout; release PR [#2](https://github.com/TaylorHuston/GraphiteMD/pull/2) is open from `develop` to `main`.
- Deferred scope accepted: yes, as recorded in proposal/design/Epic.
- Change moved to `docs/changes/closed/`: yes.
