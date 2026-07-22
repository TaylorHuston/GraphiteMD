---
status: in_review
---
# Tasks: Bundled Plugin Recovery Verification

## Resume Here

- Last completed action: independent review completed ready after remediation commit `96aed1d`.
- Next action: await user authorization to merge and close, or further direction.
- Active branch/ref: `change/bundled-plugin-recovery-verification`.
- Expected dirty files: review-ledger finalization only.
- Known blockers: none.

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Summarize the proposed scope boundary and confirm any unresolved decisions.
- [x] 1.2 Challenge each proposed Story for user-path fit, Epic ownership, and unnecessary UI-task fragmentation.
- [x] 1.3 Refine Requirements and Scenarios into observable behavior, including relevant happy path, empty state, failure mode, permission/validation case, recovery path, integration boundary, or security-sensitive condition.
- [x] 1.4 Record assumptions, open questions, candidate Stories, and deferred scope instead of silently promoting uncertain behavior into accepted Requirements.
- [x] 1.5 Confirm the planned `Verified By` sections can become scenario-mapped evidence indexes.
- [x] 1.6 For UI-bearing changes with material experience uncertainty, complete `/sdd-design` or record why existing product conventions already make the direction implementation-ready.
- [x] 1.7 For UI-bearing changes, define a proportional Visual Verification Matrix with affected surfaces, routes or fixtures, representative desktop/mobile viewports, relevant states/interactions, expected rendered behavior, and preferred tooling or fallback.
- [x] 1.8 Seed the living risk, decision fan-out, and verification-environment sections with end-state obligations already known. Do not turn them into an exhaustive implementation sequence; `/sdd-apply` must refine them from real implementation evidence.
- [x] 1.9 Set `status: planned` after the proposal, design, tasks, Epic actions, and verification strategy are coherent and validated.

### 2. Epic Artifacts

- [x] 2.1 Create or update the Epic directories named in `proposal.md` and `design.md`.
- [x] 2.2 Create or update each Epic's `epic.md` file.
- [x] 2.3 Confirm each Story has a stable Epic-scoped label or documented legacy Story ID, local Requirement IDs, local Scenario IDs, independent implementation/verification state, behavior-mapped Implemented By, Implementation Gaps, scenario-mapped Verified By, and Verification Gaps.
- [x] 2.4 Check whether this change supersedes earlier Story, Requirement, Scenario, implementation ownership/gaps, or verification evidence/gaps; reconcile any stale truth.

### 3. Architecture Decisions

- [x] 3.1 Confirm `design.md` compares viable technical options or records why only one path is reasonable.
- [x] 3.2 Create or update ADRs named in `design.md` when the change makes durable architecture decisions.
- [x] 3.3 Confirm ADR status is accurate: proposed / accepted / superseded / not applicable.

### 4. Implementation

- [x] 4.1 Add deterministic persisted enablement, restart, and interrupted-state recovery proof for `GMD-003/S1/R4-S3` across every current bundled plugin.
- [x] 4.2 Add short enabling phases only when needed before a Requirement can be tested or implemented.
- [x] 4.3 Re-evaluate and update applicable end-state risks, decision fan-out, and evidence-environment readiness as each slice reveals implementation reality.
- [x] 4.4 When a new adapter, client, route, workspace, worker, migration, command, or similar surface parallels an established implementation, complete the applicable Pattern Parity Matrix rows and explain intentional divergences.
- [x] 4.5 When the slice owns editable, autosaving, cached, routed, asynchronous, or identity-sensitive state, complete the applicable Stateful Transition Matrix rows.
- [x] 4.6 Update Story-level Implemented By maps with current code locations.
- [x] 4.7 Commit every completed, verified, reconciled phase before beginning the next unless commits are explicitly disabled or prohibited.

### 5. Verification

- [x] 5.1 Add or update focused verification for `GMD-003/S1/R4-S3`.
- [x] 5.2 For automated evidence, inspect the cited source and record `path#exact test title or stable test anchor` plus the assertion, route, selector, injected failure, or observation that proves the Scenario.
- [x] 5.3 Update Story-level Verified By maps with scenario-mapped evidence, not chronological command logs. Do not aggregate Scenarios unless the named test explicitly exercises each one.
- [x] 5.4 Label evidence types where useful: focused automated test, broad supporting gate, deterministic E2E, live-provider playtest, manual UI confirmation, or debug/log inspection.
- [x] 5.5 Verify ADR assumptions or record the remaining decision risk.
- [x] 5.6 Confirm every required database, migration, browser, provider, generated-contract, platform, or production-path environment actually ran before treating its behavior as verified.
- [x] 5.7 Reopen any checklist or verification claim whose cited proof is missing, too broad, skipped, undiscovered, or weaker than the behavior claimed.
- [x] 5.8 Run scoped `sdd validate` and resolve deterministic artifact errors before handoff.

### 6. Review And Closeout

- [x] 6.1 Update the project-defined release communication when `proposal.md` says release-communication impact is required or TBD.
- [x] 6.2 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, release communication, ADR consistency, and branch readiness.
- [x] 6.3 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit user-approved review waiver.
- [x] 6.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 6.5 Record manual UI confirmation status as `not applicable`, `pending user`, `user confirmed`, or `accepted gap`.
- [x] 6.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [x] 6.7 Confirm machine-readable Change status agrees with Resume Here, checklist, review, manual confirmation, release communication, ADR, PR/merge, deferred-gap, and folder-location claims.
- [x] 6.8 Keep `status: in_review` while independent review and closeout gates are underway.
- [x] 6.9 Before `in_review`, record an immutable candidate commit, confirm intended implementation is committed, pass commit-sensitive contract/diff checks, and leave no required risk, fan-out, environment, or verification obligation silently pending.
- [ ] 6.10 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 6.11 After review/PR/merge/acceptance is complete and `status: in_review` remains accurate, run `sdd change close` for this Space and Change instead of writing a `closed` status.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-22 | GMD-003/S1/R4-S3 | main; independent review remediation | `packages/plugin-sdk`, production runtime test, GMD-003 map | Recovery now rejects malformed JSON and semantically invalid state envelopes before every bundled plugin activation; current bundle IDs derive from the production bundle list. | `96aed1d` |

## Verification Ledger

Record proof as it happens. Keep chronological command output here; summarize only durable scenario-mapped evidence into Epic `Verified By`. Do not blur deterministic E2E, live-provider playtests, manual UI confirmation, broad gates, and debug/log inspection into one evidence bucket.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-22 | `pnpm --filter @graphitemd/server test -- plugin_runtime_service.test.ts` | focused automated test | GMD-003/S1/R4-S3: every current bundle ID persists explicit disable/enable, recovers complete temporary state, and isolates malformed JSON or invalid state envelopes. | passing: 96 tests |
| 2026-07-22 | `pnpm --filter @graphitemd/plugin-sdk test` | focused automated test | `PluginHost.enable` recovery guard preserves SDK lifecycle coverage. | passing: 15 tests |
| 2026-07-22 | `pnpm --filter @graphitemd/server typecheck` | broad supporting gate | Server TypeScript surface remains valid. | passing |
| 2026-07-22 | `sdd validate graphitemd --change 2026-07-22-bundled-plugin-recovery-verification --repo /Users/taylor/src/my-life/spaces/graphitemd --workspace /Users/taylor --json` | artifact validation | Active Change structure and status are valid. | passing: 0 errors, 0 warnings |
| 2026-07-22 | `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm audit --audit-level=high` | broad supporting gates | Monorepo regressions, static checks, and high-severity dependency advisories. | passing; 96 server tests; no known vulnerabilities |
| 2026-07-22 | `sdd validate graphitemd --repo /Users/taylor/src/my-life/spaces/graphitemd --workspace /Users/taylor --json` | repository artifact validation | All current GraphiteMD Change and Epic artifacts remain coherent after evidence reconciliation. | passing: 0 errors, 0 warnings |

## Manual Feedback

Not applicable: this Change has no browser-visible behavior or requested user confirmation.

## Planning Updates

None. Review findings remained within the accepted recovery scope.

## Design Updates

Not applicable: no experience design or UI surface changed.

## Implementation Risk And Confirmation Matrix

This is a living end-state and evidence surface, not an upfront implementation script. Planning seeds known obligations; `/sdd-apply` must add, remove, split, and refine rows as real code, failures, decisions, and relevant review history reveal the actual risks.

| Requirement / Surface | End-State Invariant | Risk / Failure Mode | Check Or Confirmation Needed | Evidence / Finding | Status |
|---|---|---|---|---|---|
| GMD-003/S1/R4-S3 | Every enabled bundle recovers a valid state envelope before activation; malformed state activates no contributions. | Assistant could bypass recovery because it does not read/write state during activation; syntactically valid but structurally invalid state could also be accepted. | Exercise durable temporary state through the production runtime for every production bundle ID. | `PluginHost.enable` invokes recovery then validates the persisted envelope; focused tests prove complete recovery and isolated `activation_failed` for malformed JSON and invalid envelopes. | proved |

## Pattern Parity Matrix

Required when implementation adds a surface parallel to an established adapter, client, route, workspace, worker, migration, command, or other sibling pattern. Compare behavior and evidence, not only source shape. If not applicable, record why.

| Concern | Reference Location / Contract | New Location / Contract | Focused Proof | Intentional Divergence / Gap | Status |
|---|---|---|---|---|---|
| recovery and activation failure | Existing `FilesystemPluginStateBackend.recovery` contract | `PluginHost.enable` before plugin activation | malformed or structurally invalid temporary state produces `activation_failed` with `{}` contributions while its sibling remains active | no new adapter; host now applies recovery and envelope validation uniformly | matched |

## Stateful Transition Matrix

Required when implementation owns editable, autosaving, cached, routed, asynchronous, or identity-sensitive state. Cover applicable edges such as entity changes, pending writes plus navigation, conflict/failure recovery, return context, browser history, session expiry/sign-out, authoritative refresh, and slow or hung requests. If not applicable, record why.

| Start State | Trigger / Transition | Expected Invariant | Focused Test Or Runtime Observation | Result |
|---|---|---|---|---|
| durable temporary state | runtime recreation then activation | complete state becomes canonical before activation; malformed JSON or invalid state envelopes affect only their namespace/plugin | `GMD-003/S1 R4-S3` recovery and invalid-state focused tests | passed |

## Decision Fan-Out Ledger

Record implementation discoveries, user decisions, replans, ADR changes, defaults, security rules, contract changes, or experience decisions that alter the accepted end state or its consequences. Inspect affected surfaces as they become known; do not require planning to predict them all.

| Date | Decision / Discovery | End-State Consequence | Affected Surfaces To Reconcile | Evidence / Artifact Updates | Status |
|---|---|---|---|---|---|
| 2026-07-22 | Runtime recovery must occur at host activation and reject a structurally invalid persisted envelope, not only malformed JSON or plugin state reads. | Assistant receives the same recovery enforcement as System Status without a provider or UI change. | SDK host, runtime tests, GMD-003 ownership/evidence, Change tasks. | Updated `PluginHost.enable`, bundle-derived runtime coverage, and GMD-003 evidence; retained R4-S2 platform gap. | reconciled |

## Verification Environment

Track environment readiness continuously. Missing setup may allow unrelated safe work to continue, but the affected behavior cannot be marked verified or handed to review until the evidence runs or the gap is explicitly accepted where permitted.

| Evidence Obligation | Required Setup / Safety Boundary | Needed For | Current Readiness | Result / Resolution |
|---|---|---|---|---|
| Per-bundle runtime recovery | Disposable `mkdtemp` workspace with `ConfiguredWorkspaceAuthority`; no provider credentials or browser | GMD-003/S1/R4-S3 | ready | Ran focused runtime and SDK tests successfully |

## Manual UI Confirmation

- Status: not applicable
- Reason: no browser-visible behavior changed; the proof is server/runtime lifecycle coverage.

## Visual Verification Matrix

Required for UI-bearing changes. If not applicable, record why.

| Surface / Route or Fixture | Viewport | State / Interaction | Expected Rendered Behavior | Tool / Setup | Inspected Evidence | Console / Network | Result |
|---|---|---|---|---|---|---|---|
| Not applicable | not applicable | no UI change | no rendered behavior changed | server/runtime tests | not applicable | not applicable | not applicable |

## Blockers / Open Questions

- None identified yet.

## Review Handoff Candidate

- Integration target / merge base: `develop` / `c0e80a653657204fb1057deee314dda5b3bc8da1`.
- Candidate source commit: `96aed1d` (review remediation; implementation baseline `ae3891f`).
- Source differs from target when implementation changed: yes.
- Intended implementation fully committed: yes, including review remediation `96aed1d`.
- Unrelated dirty state preserved: yes.
- Commit-sensitive generated-contract / diff / integration checks: `git diff --check develop...ae3891f` passing; no generated contract applies.
- Required risk, fan-out, environment, or verification rows still pending or blocked: no implementation blockers; R4-S2 process-kill/pathname-race limits remain deferred outside this Change.
- Pattern parity and stateful transition matrices reconciled or not applicable with reason: reconciled; this uses the existing state-backend contract at the host activation boundary.
- Evidence claims falsified against exact tests, assertions, routes, or observations: focused tests inspected and passed.
- Fresh-context failure-seeking passes completed: discovery and coverage reviews identified and closed the invalid-envelope activation gap.

## Closeout

- Change status: `in_review`.
- Epic files updated: GMD-003; prior all-Epic audit reconciliation is committed in `ad3e1b9`.
- Story labels/references and Requirement/Scenario IDs current: yes.
- Implemented By maps current: yes.
- Scenario-mapped Verified By maps current: yes.
- Superseded earlier Epic truth reconciled: yes; Assistant's platform conformance is current scope while product behavior remains GMD-004.
- ADR status: no ADR change required.
- Release communication current: not required; no user-facing change.
- `sdd-review` verdict: ready.
- Review record: `docs/changes/2026-07-22-bundled-plugin-recovery-verification/review.md`.
- `review.md` findings resolved: yes; required invalid-envelope recovery finding resolved in `96aed1d`.
- Planning updates resolved: yes.
- Implementation risk and confirmation rows resolved: yes; R4-S2 platform limit remains explicit and outside this Change.
- Pattern parity and stateful transition rows resolved: yes.
- Evidence-claim integrity checked: yes; fresh-context code/evidence review passed.
- Decision fan-out reconciled: yes.
- Verification environment obligations resolved: yes; disposable workspace, no provider/browser required.
- Immutable review handoff candidate: `96aed1d` (review remediation; implementation baseline `ae3891f`).
- Manual UI confirmation status: not applicable; no UI change.
- Rendered UI verification status: not applicable; no UI change.
- PR / merge state: not created; no user authorization to push or merge.
- Deferred scope accepted: R4-S2 process-kill durability and pathname race remain documented platform limits.
- Change moved to `docs/changes/closed/`: no; review and user-authorized merge/closeout remain.
