---
status: in_progress
---
# Tasks: LLM Assistant Integration

## Resume Here

- Last completed action: implemented `GMD-004/S2/R2` service-side brokered retrieval, context limits, UTF-8-safe truncation, and source provenance.
- Next action: implement `GMD-004/S2/R3` canonical conversation persistence, then connect it to the restricted Pi question loop.
- Active branch/ref: `change/llm-assistant-integration` at OAuth phase checkpoint `f5738d7`.
- Expected dirty files: conversation runtime/tests, restricted run orchestration, authenticated question routes/tests, bundled Assistant plugin, Context UI/test, and this ledger.
- Known blockers: none for deterministic implementation. A separate owner-completed Codex OAuth is still required for live-provider verification.

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

### 4. Implementation

- [ ] 4.1 Establish the runtime-neutral Assistant contracts and service boundaries through BDD/TDD.
  - [x] Define provider status, normalized OAuth flow/input, conversation, turn, source, and error schemas used by service, plugin, and browser adapters.
  - [x] Add injected model/auth/runtime and conversation-store interfaces; keep AdonisJS, React, Pi, paths, and credentials out of domain contracts.
  - [x] Add the Pi `0.80.x` dependency at the reviewed current version and lock the exact resolution.
- [ ] 4.2 Implement `GMD-004/S1/R1 GraphiteMD-Owned Codex OAuth`.
  - [ ] `R1-S1`: complete normalized Codex OAuth through Assistant Settings and persist owner-only machine-local credentials.
  - [ ] `R1-S2`: cover accessible cancel/input/progress/error states, invalid/stale input, provider failure, bounded terminal retention, retry, and concurrent-flow conflict.
- [ ] 4.3 Implement `GMD-004/S1/R2 Protected Credential Lifecycle`.
  - [ ] `R2-S1`: keep credentials/callback material out of workspace, browser, conversations, and logs while exposing sanitized status in Settings.
  - [ ] `R2-S2`: disconnect through Settings without changing workspace or canonical conversation content.
  - [ ] `R2-S3`: reject unauthenticated provider mutations without revealing interaction state.
- [ ] 4.4 Implement `GMD-004/S2/R1 Read-Only Workspace-Grounded Answers`.
  - [ ] `R1-S1`: create a restricted Pi session with only brokered search/read tools and return a grounded answer.
  - [ ] `R1-S2`: require an honest insufficient-evidence result when retrieval does not support an answer.
  - [ ] `R1-S3`: fail specifically for disconnected provider, missing model, unavailable workspace, empty prompt, and duplicate in-flight work.
- [ ] 4.5 Implement `GMD-004/S2/R2 Confined Context And Source Provenance`.
  - [x] `R2-S1`: revalidate eligible opaque resources and deny internal/excluded/symlinked/unsupported/oversized/stale/replaced-root content before provider context.
  - [x] `R2-S2`: enforce deterministic search/read/turn budgets and explicit truncation.
  - [x] `R2-S3`: derive source evidence only from successful brokered reads and never from model citation text.
- [ ] 4.6 Implement `GMD-004/S2/R3 Inspectable Conversation Record`.
  - [ ] `R3-S1`: atomically store versioned normalized turns beneath `.graphite/conversations/` without credentials or host paths.
  - [ ] `R3-S2`: reconcile interrupted turns honestly and fail closed on malformed/partial state.
- [ ] 4.7 Implement `GMD-004/S2/R4 Accessible Context Experience`.
  - [ ] `R4-S1`: add desktop Context question/answer/source states without obscuring the document workbench.
  - [ ] `R4-S2`: reuse the narrow full-screen Context drawer with touch targets and focus containment/restoration.
  - [ ] `R4-S3`: add accessible question busy/error announcements, duplicate-action prevention, and owner-session expiry handling.
- [ ] 4.8 Exercise the production bundled-plugin boundary.
  - [ ] Add the Assistant manifest/contributions and only the narrow model/workspace capabilities needed by `S1-S2`.
  - [x] Extend the SDK/host capability facade without giving the Assistant raw credential, filesystem, process, shell, or unrestricted network access.
  - [ ] Update the bundled-source/dependency boundary with explicit reviewed capability imports rather than a blanket plugin exception.
- [ ] 4.9 Reconcile implementation truth and user documentation.
  - [ ] Replace `GMD-004/S1-S2` implementation gaps with requirement-mapped concrete locations and stable anchors.
  - [ ] Update README setup/security/backup guidance, plugin/Assistant boundaries, and the `CHANGELOG.md` user-facing entry.
  - [ ] Keep all accepted ADRs and `GMD-003` ownership accurate.

### 5. Verification

- [ ] 5.1 Add focused contract, OAuth, Pi-adapter, retrieval/confinement, conversation, plugin, server-route, and browser-component evidence for every Scenario.
- [ ] 5.2 Add deterministic production-server/browser E2E using fake OAuth/runtime boundaries and a disposable workspace with uniquely identifiable notes.
- [ ] 5.3 Verify the deterministic E2E proves visible service-derived sources and the canonical conversation file, not merely plausible model text.
- [ ] 5.4 Run and directly inspect the rendered UI matrix across desktop and narrow viewports, including console and network failures.
- [ ] 5.5 Run a separate owner-authorized live Codex playtest against a disposable uniquely identifiable note; inspect answer, provenance, canonical state, permissions, and sanitized logs.
- [ ] 5.6 Update `GMD-004/S1-S2` `Verified By` with scenario-mapped evidence and retain any unproved live/manual/platform cases as gaps.
- [ ] 5.7 Verify the Proposed ADR assumptions and decide during review whether evidence supports `Accepted` or requires revision.
- [ ] 5.8 Run focused package tests, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:storybook`, `pnpm build-storybook`, `pnpm test:e2e`, `pnpm audit --audit-level high`, and scoped `sdd validate`.

### 6. Review And Closeout

- [ ] 6.1 Confirm README and `CHANGELOG.md` describe only shipped user-visible behavior and current operational/security guidance.
- [ ] 6.2 Run `/sdd-review` as the independent local integration gate for behavior, auth, credential handling, context disclosure, prompt injection, persistence, plugin boundaries, UI, docs, ADRs, and branch readiness.
- [ ] 6.3 Record review outcome in `review.md` and resolve or explicitly defer every finding.
- [ ] 6.4 Record manual UI confirmation as `user confirmed` or an explicit `accepted gap`; do not conflate agent-rendered inspection with owner acceptance.
- [ ] 6.5 Keep `status: in_review` while independent review, live provider, manual confirmation, and closeout remain underway.
- [ ] 6.6 Reconcile proposal/design/tasks/review/Epic/ADR/README/changelog truth after the final implementation commit.
- [ ] 6.7 Create a PR or merge only after review is ready and the user grants the exact Git operation.
- [ ] 6.8 Run `sdd change close` only after accepted review/merge/confirmation state is accurately recorded.

## Implementation Ledger

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-19 | Enabling contracts and capability facade | main + bounded discovery worker; Context7 Pi API check and Coordinator-local `0.80.6` reference | `packages/contracts`, `packages/plugin-sdk` | Failing-first contract coverage followed by runtime-validated sanitized provider/OAuth/question/turn/source schemas and a declared service-owned Assistant capability facade. No Pi, OAuth, routes, manifest, retrieval, persistence, or UI behavior yet. | `452a781` |
| 2026-07-19 | GMD-004/S1 OAuth boundary and Settings controls | main | `apps/server/app/assistant`, authenticated assistant routes/tests, Settings UI, contracts, Pi package lock | Locked Pi's compatible `0.80.6` adapter graph; credentials and session scratch remain machine-local. Deterministic tests cover flow conflict/cancel/retry/failure, transient device-code instructions, credential permissions, normalized owner provider state, and unauthenticated route rejection. The Settings tab polls only normalized flow state and never receives credentials. Live OAuth remains an external verification gap. | `f5738d7` |
| 2026-07-20 | GMD-004/S2 R2 confined context and provenance | main + bounded discovery worker | `apps/server/app/assistant/workspace_context.*`, Assistant error contract, GMD-004 Epic | A service-owned broker limits search/read context, revalidates every opaque resource through workspace authority, avoids UTF-8 replacement output, emits explicit context-limit failure, and records source evidence only after successful reads. | `9d9a551` |
| YYYY-MM-DD | GMD-004/S1 R1-R2 | main | Codex provider/OAuth, credential lifecycle, browser Settings | pending | pending |
| YYYY-MM-DD | GMD-004/S2 R1-R2 | main | Assistant loop, brokered search/read, provenance | pending | pending |
| YYYY-MM-DD | GMD-004/S2 R3 | main | canonical conversation authority | pending | pending |
| YYYY-MM-DD | GMD-004/S2 R4 | main | Context/Settings responsive experience | pending | pending |
| 2026-07-19 | Promotion and implementation start | main | active Change artifacts, GMD-004 draft Epic, proposed Pi/Codex ADR, related ADR index/link | validated; promotion completed and status transitioned to `in_progress` | `3e6d89b` |

## Verification Ledger

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| YYYY-MM-DD | Assistant focused suites | focused automated test | GMD-004/S1-S2 deterministic behavior and risky boundaries | pending |
| 2026-07-19 | `pnpm --filter @graphitemd/contracts test`; `pnpm --filter @graphitemd/plugin-sdk test`; package lints/typechecks; server bundled import-boundary suite | focused automated test / supporting gate | Sanitized Assistant contracts reject token-bearing or malformed terminal payloads; SDK operations require declared capabilities and validate replies before plugins can consume them; the existing bundled import boundary remains green. | passing; enables later Story evidence but does not verify a GMD-004 Scenario alone |
| 2026-07-19 | contracts/plugin SDK suites; server OAuth and authenticated HTTP suites; web Settings suite; package lint/typecheck | focused automated test | S1 deterministic flow states, protected state permissions, normalized owner-only service responses, unauthenticated mutation rejection, and accessible three-tab Settings navigation. | passing; live provider path remains pending owner OAuth |
| 2026-07-20 | `pnpm --filter @graphitemd/server test -- workspace_context.test.ts`; server typecheck/lint; contracts and plugin SDK suites | focused automated test | `GMD-004/S2/R2-S1-S3`: existing workspace authority is rechecked at brokered reads; `.graphite`, unknown and symlinked content stay out; context bounds are UTF-8 safe and source provenance follows successful reads only. | passing |
| YYYY-MM-DD | Production fake-provider browser journey | deterministic E2E | Connect, ask, brokered read, service-derived sources, persistence, disconnect, desktop/mobile continuity | pending |
| YYYY-MM-DD | Rendered Context/Settings matrix | rendered UI verification | GMD-004/S2 R4 responsive states, interaction, accessibility, and visual containment | pending |
| YYYY-MM-DD | Live Codex note-grounding playtest | live-provider playtest | Real OAuth/model can answer from a uniquely identifiable note with matching source provenance | pending owner authorization |
| YYYY-MM-DD | Root gates and scoped SDD validation | broad supporting gate | Repository integration and artifact consistency | pending |

## Manual Feedback

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| YYYY-MM-DD | Owner tests Codex connection and asks a known vault question. | verification gap / defect / requirement refinement | Update code, GMD-004 evidence/gaps, review, and this ledger as appropriate. | pending |

## Planning Updates

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | proposal.md / design.md / tasks.md | `/sdd-apply` TBD |

## Design Updates

| Date | Feedback / Discovery | Classification | Reference / Target | Preserve / Change / Non-Goals | Artifact Updates | Next Apply Starting Point |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | TBD | experience refinement / experience defect / accessibility correction / responsive correction | Context / Settings | Preserve read-only connect-and-ask behavior and source provenance. | design.md / tasks.md | `/sdd-apply` TBD |
| 2026-07-19 | Pi `0.80.10` removed the programmatic `AuthStorage` export used by the accepted service adapter, while the `0.80.6` package and its matching internal packages expose the characterized API. | technical constraint | Pi runtime adapter | Preserve the accepted `0.80.x` dependency range and service boundary; lock `0.80.6` with workspace overrides until a separately characterized upgrade. | design.md / tasks.md | `/sdd-apply` GMD-004/S2 |
| 2026-07-20 | Context exhaustion needs a distinct normalized result so it is not misreported as a workspace outage. | technical constraint | Assistant error contract | Add `context_limit`; retain `workspace_unavailable` only for authority/search availability failures. | contracts / tasks.md | `/sdd-apply` GMD-004/S2 R3 |

## Implementation Risk And Confirmation Matrix

| Risk / Boundary | Confirmation | Evidence / Status |
|---|---|---|
| Opaque workspace authority, root replacement, symlinks, internal state | Every provider-bound read re-enters `ConfiguredWorkspaceAuthority.readNote`; no search snippet is model context. | `workspace_context.test.ts`; passing |
| Byte/context exhaustion and malformed UTF-8 | Per-source and total byte limits preserve valid text; exhaustion is explicit. | `workspace_context.test.ts`; passing |
| Provenance forgery | Sources derive only from brokered successful reads, never model-authored text. | `workspace_context.test.ts`; passing |
| Canonical conversation durability | Atomic, confined versioned record plus interruption recovery. | pending `S2/R3` |
| Provider/tool confinement | Pi has exactly brokered search/read custom tools and no ambient built-ins/resources. | pending `S2/R1` adapter characterization |

## Verification Environment

| Environment | Purpose | Readiness |
|---|---|---|
| Temporary filesystem workspace | Authority, boundary, persistence, and recovery tests. | available; retrieval suite passing |
| Deterministic injected Pi runtime | Production-path question, provenance, and conversation E2E. | pending implementation |
| Owner Codex subscription | Live OAuth/model grounding playtest. | pending owner interaction after deterministic path |

## Manual UI Confirmation

- Status: pending user
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
| Settings > Assistant | 1440x900 | disconnected, start OAuth, auth URL/device code, input/select/manual code, cancel, failed, connected, disconnect | Vertical tabs and provider controls remain contained; status is explicit; no credential/callback secret renders. | Storybook production fixture plus production browser | screenshot/direct inspection and accessibility result | inspect; no secret-bearing response/log | pending |
| Context panel | 1440x900 | disconnected, empty/ready, submitting, grounded answer, no evidence, error, retry, long answer, multiple/long sources | Document remains visible and unobscured; panel scroll is contained; input/status/sources stay operable and distinct. | Storybook fixtures plus deterministic E2E | screenshot/direct inspection and trace | clean or findings recorded | pending |
| Settings > Assistant | 390x844 | horizontal tab navigation, OAuth input, failure/retry, connected | Tabs do not overflow; touch targets and safe areas hold; modal remains focus-contained. | Storybook fixture plus production browser | screenshot/direct inspection and keyboard/touch checks | clean or findings recorded | pending |
| Context drawer | 390x844 | open/close, prompt, busy, answer, sources, error, long content | Full-screen drawer contains focus, restores trigger focus, respects safe areas, and avoids page overflow. | Deterministic E2E plus runtime browser | screenshot/direct inspection, focus trace | clean or findings recorded | pending |
| Auth/session recovery | 1440x900 and 390x844 | owner session expires during OAuth or question | Assistant state fails safely and the app returns to login without exposing stale content or trapping focus. | Deterministic E2E | direct inspection and network trace | expected 401; no unexpected console error | pending |

## Blockers / Open Questions

- No planning blockers.
- Live-provider completion requires owner OAuth during implementation verification.

## Closeout

- Change status: in progress; promoted but not implemented.
- Epic files updated: `GMD-004` draft created; implementation remains `not implemented`.
- Story labels/references and Requirement/Scenario IDs current: yes for planned `S1` onboarding and `S2` Q&A scope.
- Implemented By maps current: honest `Not implemented yet.` entries.
- Scenario-mapped Verified By maps current: empty; all Scenarios are explicit verification gaps.
- Superseded earlier Epic truth reconciled: no superseded behavior; `GMD-003` boundary retained.
- ADR status: `docs/adrs/2026-07-19-pi-backed-assistant-runtime.md` Proposed.
- Release communication current: planned for README and `CHANGELOG.md`; not written as shipped behavior.
- `sdd-review` verdict: not run.
- Review record: none.
- `review.md` findings resolved: not applicable yet.
- Planning updates resolved: none.
- Manual UI confirmation status: pending user after implementation.
- Rendered UI verification status: pending implementation.
- PR / merge state: local implementation branch `change/llm-assistant-integration`; no push, PR, merge, or closeout authorization inferred.
- Deferred scope accepted: yes, as recorded in proposal/design/Epic.
- Change moved to `docs/changes/closed/`: no.
