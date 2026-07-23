---
status: in_progress
---
# Tasks: First Login Owner Setup

## Resume Here

- Last completed action: promoted, transitioned to `in_progress`, and completed the server-side R1 bootstrap contract/route slice with focused contract and real-HTTP proof.
- Next action: implement the browser R1 state selection and first-owner setup presentation against the typed bootstrap contract.
- Active branch/ref: AnthraciteMD `change/first-login-owner-setup` from `develop` at `d1d2e2a64b42c454eb635d308c027b77b9c13960`; phase commit pending.
- Expected dirty files: contracts, server routes/tests, AMD-001, and this Change ledger.
- Known blockers: none.

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Confirm scope: browser first-owner setup for empty security state; CLI setup/reset, login, password maintenance, and current private-network posture remain.
- [x] 1.2 Place the separately releasable browser onboarding path in new Story `AMD-001/S3` rather than overloading S1.
- [x] 1.3 Define discovery, happy path, invalid/mismatch, existing-owner, concurrent/stale claim, session/response failure, origin/CSRF, and bounded-request Scenarios.
- [x] 1.4 Record first-claim private-network assumptions and defer loopback/token/public-internet setup.
- [x] 1.5 Plan scenario-mapped service, HTTP, contract, web, Storybook, E2E, rendered, manual, and log-inspection evidence.
- [x] 1.6 Record why existing auth-panel conventions make the UI implementation-ready without `/sdd-design`.
- [x] 1.7 Define desktop and mobile Visual Verification Matrix rows and setup states.
- [x] 1.8 Seed security, concurrency, recovery, cross-boundary, environment, aggregate, and integration-candidate obligations.
- [x] 1.9 Set `status: planned` after scoped validation passes.

### 2. Epic Artifacts

- [ ] 2.1 Update `docs/epics/amd-001-secure-workspace-access/epic.md` outcome and current scope for browser-first setup.
- [ ] 2.2 Add `AMD-001/S3` with the planned Requirements and Scenarios, independent implementation/verification state, and honest gaps.
- [ ] 2.3 Reconcile S1 host-local wording while preserving its CLI setup behavior and evidence.
- [ ] 2.4 Update the Story Index, cross-Story concerns, implementation maps, and verification maps from actual implementation evidence.
- [ ] 2.5 Confirm AMD-001 retains exactly one canonical `Implemented By` and `Verified By` map per Story.

### 3. Architecture Decisions

- [x] 3.1 Compare dedicated bootstrap/setup routes, overloaded login, and loopback/token setup.
- [x] 3.2 Confirm no new ADR is required because service authority, storage, session, and private-network architecture remain unchanged.
- [x] 3.3 Record the reconsideration trigger: exposure of an unclaimed host beyond a trusted private network.

### 4. Implementation

- [ ] 4.1 Implement `AMD-001/S3` through adaptive BDD/TDD slices.
  - [ ] Requirement R1: Browser Setup Discovery
    - [ ] Scenario R1-S1: Fresh Host Presents Setup
    - [ ] Scenario R1-S2: Existing Owner Presents Sign-In
  - [ ] Requirement R2: Atomic Browser Owner Creation
    - [ ] Scenario R2-S1: Valid Password Creates And Authenticates Owner
    - [ ] Scenario R2-S2: Invalid Or Mismatched Password Preserves Empty State
    - [ ] Scenario R2-S3: Concurrent Or Stale Setup Cannot Replace Owner
    - [ ] Scenario R2-S4: Committed Owner Survives Session Or Response Failure
  - [ ] Requirement R3: First-Claim Request Protection
    - [ ] Scenario R3-S1: Untrusted Or Unproved Mutation Is Rejected
    - [ ] Scenario R3-S2: Repeated Setup Requests Are Bounded
- [ ] 4.2 Add or refine typed contracts and shared application seams only as current implementation evidence requires.
- [ ] 4.3 Re-evaluate risk, fan-out, and environment rows after each completed slice.
- [ ] 4.4 Complete Pattern Parity rows against login/password auth behavior.
- [ ] 4.5 Complete Boundary Contract rows for bootstrap and setup results.
- [ ] 4.6 Complete Stateful Transition rows for concurrent/stale setup and committed-owner recovery.
- [ ] 4.7 Update AMD-001 implementation maps with behavior-owning definitions or registrations rather than incidental call sites.
- [ ] 4.8 Commit each completed, verified, reconciled implementation phase under `/sdd-apply` authorization.

### 5. Verification

- [ ] 5.1 Add focused proof for every S3 Scenario.
- [ ] 5.2 Inspect and record exact test titles or stable named anchors plus the important assertion for automated evidence.
- [ ] 5.3 Update AMD-001 `Verified By` with scenario-mapped evidence and preserve honest gaps.
- [ ] 5.4 Keep focused tests, aggregate gates, deterministic E2E, rendered UI, manual confirmation, and log inspection distinct.
- [ ] 5.5 Confirm existing ADR assumptions remain true.
- [ ] 5.6 Run database, real HTTP, browser, production artifact, desktop, and mobile evidence in disposable empty-owner state.
- [ ] 5.7 Reopen any claim whose proof is skipped, undiscovered, too broad, or boundary-mismatched.
- [ ] 5.8 Run the full aggregate candidate gate freshly on the exact committed candidate and record counts/freshness.
- [ ] 5.9 Run scoped `sdd validate` after Epic reconciliation.

### 6. Review And Closeout

- [ ] 6.1 Update README Local Development and Self-Hosting guidance with browser-first setup, retained CLI alternatives, and the unclaimed-host private-network warning.
- [ ] 6.2 Run `/sdd-review` as the independent local integration gate.
- [ ] 6.3 Record a clean review or `review.md` path.
- [ ] 6.4 Resolve or explicitly defer every validated review finding.
- [ ] 6.5 Record manual UI confirmation with canonical status vocabulary.
- [ ] 6.6 Reconcile completed-work wording across Change, AMD-001, README, and any affected closed current-state claims.
- [ ] 6.7 Keep machine-readable status aligned with Resume Here and every closeout surface.
- [ ] 6.8 Keep `status: in_review` while review and closeout gates are underway.
- [ ] 6.9 Record an immutable committed review candidate and run every required candidate gate on it.
- [ ] 6.10 Test the prospective integration tree when it materially differs from the reviewed source tree.
- [ ] 6.11 Merge only after ready review and explicit user authorization.
- [ ] 6.12 Close with `sdd change close` only after review, manual acceptance, integration proof, and authorization gates pass.

## Implementation Ledger

| Date | Slice | Result | Artifact Reconciliation | Commit |
|---|---|---|---|---|
| 2026-07-22 | AMD-001/S3 R1 server bootstrap boundary | Added the closed binary bootstrap contract and unauthenticated owner-existence route; it reveals no owner, session, workspace, or path data. | Promoted Change, added S3 as partial/partial, reconciled S1 as an alternative CLI path, and recorded server-only R1 gaps. | pending |

## Verification Ledger

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-22 | Current auth code, tests, contracts, E2E fixture, README, PRD, AMD-001, and accepted ADRs inspected | planning evidence | The plan uses current service authority and identifies the missing browser boundary without inventing a second credential store. | complete |
| 2026-07-22 | `pnpm --filter @anthracitemd/contracts test -- index.test.ts` | focused automated | `AMD-001/S3 R1` contract accepts only `setup_required` or `login_required` and rejects extra data. | passing |
| 2026-07-22 | `pnpm --filter @anthracitemd/server test -- authentication.test.ts` | focused real HTTP | `AMD-001/S3 R1-S1/R1-S2` observes fresh/claimed owner state through the real Adonis route while preserving existing auth behavior. | passing |

## Manual Feedback

No implementation feedback yet. The originating feedback is preserved as the confirmed desired outcome: if no password exists, the user can create one through the UI on first login instead of using the CLI.

## Planning Updates

No replans yet.

## Design Updates

No design revisions yet. Existing auth-panel patterns are the accepted initial direction.

## Implementation Risk And Confirmation Matrix

| Requirement / Surface | End-State Invariant | Risk / Failure Mode | Check Or Confirmation Needed | Evidence / Finding | Status |
|---|---|---|---|---|---|
| AMD-001/S3 R1 bootstrap discovery | Unauthenticated clients learn only setup-required versus sign-in-required and never receive workspace/security details. | Endpoint leaks owner metadata, session details, paths, or workspace content; client guesses state after service failure. | Inspect runtime contract, response bodies, network trace, and no-workspace-request behavior for fresh, claimed, and failed bootstrap states. | Closed binary contract and real-HTTP fresh/claimed proof pass; browser behavior remains pending. | partial |
| AMD-001/S3 R2 owner creation | Exactly one create-only-if-absent transition can establish the owner; no later or losing request replaces it. | Concurrent requests both appear successful, a stale form overwrites credentials, or a losing browser gains authority. | Inject overlapping HTTP/service requests before and after the first await; prove one credential, one winner, no loser session, and normal sign-in recovery. | Pending implementation. | known |
| AMD-001/S3 R2 validation | Mismatch is stopped before submission; server policy rejects invalid input without creating an owner. | Client-only policy becomes authority or invalid input leaves partial state. | Web test no request on mismatch; HTTP/service tests invalid UTF-8 byte lengths and verify no owner/session exists. | Pending implementation. | known |
| AMD-001/S3 R2 session establishment/recovery | Successful setup uses the normal regenerated generation-bound session; a committed credential remains usable if session/response completion fails. | Partial setup strands the host or returns an improperly bound session. | Inject session establishment failure and lost response; reload and authenticate with chosen password; inspect session generation and fixation protections. | Pending implementation. | known |
| AMD-001/S3 R3 request protection | Setup honors exact origin, CSRF, bounded expensive work, generic errors, and secret non-disclosure. | Cross-origin claim, CSRF claim, hash-amplification denial of service, or password/hash logging. | Real HTTP origin/CSRF/rate-limit tests plus server/browser log and payload inspection. | Pending implementation. | known |
| Existing owner and CLI paths | S1 CLI setup, S2 reset, normal login, password change, logout, and session restoration remain correct. | New bootstrap logic bypasses, masks, or regresses established auth behavior. | Run focused existing AMD-001 tests and production E2E maintenance path; inspect direct setup refusal after owner exists. | Pending implementation. | known |

## Pattern Parity Matrix

| Concern | Reference Location / Contract | New Location / Contract | Focused Proof | Intentional Divergence / Gap | Status |
|---|---|---|---|---|---|
| Exact origin and credentialed CORS | Existing auth routes plus `apps/server/config/cors.ts#configuredOrigins` | First-owner bootstrap/setup HTTP boundary | Exact allowed/untrusted origin HTTP assertions. | Bootstrap GET is intentionally unauthenticated but minimally disclosive. | pending |
| CSRF on state change | Existing login/password/logout route behavior plus `apps/server/config/shield.ts#csrf` | First-owner setup mutation | Missing/valid token assertions with security-state inspection. | None planned. | pending |
| Session regeneration and generation binding | `/api/v1/auth/login` and `OwnerSetupService#authenticate` | Successful setup session | Cookie/session replay and generation assertions. | Setup additionally creates the owner before normal authentication. | pending |
| Validation, rate limiting, and generic failures | Login and password-change routes | Bootstrap/setup adapter | Invalid, limited, claimed, and concurrency-loser response assertions. | Setup may provide actionable client-side mismatch/policy guidance without exposing server security state. | pending |
| Auth-panel loading/error/accessibility | `apps/web/src/App.tsx#Login` and Account password form | First-owner setup state | Web/Storybook interaction and accessibility checks. | Setup uses `new-password` inputs and confirmation rather than current-password semantics. | pending |

## Boundary Contract Matrix

| Origin Condition | Domain Result / Invariant | Adapter / Transport Mapping | Client Behavior / Retryability | Exact Proof | Status |
|---|---|---|---|---|---|
| No owner exists | Setup is allowed but no protected authority exists yet. | Typed bootstrap response reports `setup_required`. | Render setup form; no workspace request. Retry bootstrap on service failure. | Contract and real-HTTP fresh-state assertions pass; client proof pending. | partial |
| Owner exists | Setup is permanently unavailable for this security state. | Typed bootstrap response reports `login_required`; direct setup returns a stable non-success result. | Render sign-in; stale setup refreshes to sign-in and never retries creation automatically. | Contract and real-HTTP claimed-state assertions pass; direct setup/client proof pending. | partial |
| Valid first claim wins | Credential hash commits once and normal session authority is established. | Setup returns existing owner success shape with regenerated cookie session. | Load authenticated workspace. | Service concurrency, HTTP cookie, and E2E assertions. | pending |
| Invalid password or client mismatch | No owner or session mutation. | Client blocks mismatch; server maps policy failure to stable invalid request without secret detail. | Keep setup form and show actionable error; allow corrected retry. | Web no-request and HTTP no-mutation tests. | pending |
| Concurrent/stale claim loses | Existing owner remains unchanged; loser has no authority. | Stable setup-unavailable conflict or equivalent distinct result. | Refresh bootstrap state and show sign-in; do not auto-submit. | Overlapped HTTP test and client lost-race test. | pending |
| Session/response completion fails after commit | Created credential remains the single owner. | Service error or lost response; next bootstrap reports login required. | User signs in normally with chosen password. | Injected session failure and E2E/request-abort recovery. | pending |

## Stateful Transition Matrix

| Start State | Trigger / Interleaving | Durable Invariant | Observer / Recovery Behavior | Focused Test Or Runtime Observation | Result |
|---|---|---|---|---|---|
| No owner | Two setup requests overlap before and after hashing/database acquisition. | Exactly one owner credential commits; no losing request replaces it or gains a session. | Winner enters workspace; loser refreshes to sign-in. | Deterministic service and real-HTTP concurrency tests. | pending |
| Setup form rendered | Another browser or CLI creates the owner before submit. | New credential remains unchanged. | Stale submit is refused and client transitions to sign-in. | Web controlled-response test and HTTP state inspection. | pending |
| Owner committed, session pending | Session establishment throws, hangs, or response is lost. | Owner credential remains durable and usable; no ambiguous empty state returns. | Reload shows sign-in; normal login succeeds. | Injected failure plus restart/reload observation. | pending |
| Setup request pending | User double-submits or remounts. | One client operation is in flight; remount consults authoritative state rather than replaying secrets. | Submit remains disabled while mounted; remount never auto-resubmits. | Web pending/remount test. | pending |
| Claimed host | Logout, expiry, restart, or reload. | Setup never reopens while owner exists. | Browser returns to normal sign-in or restores a valid session. | Existing auth regression tests plus production E2E. | pending |

## Decision Fan-Out Ledger

| Date | Decision / Discovery | End-State Consequence | Affected Surfaces To Reconcile | Evidence / Artifact Updates | Status |
|---|---|---|---|---|---|
| 2026-07-22 | User requires browser password creation when no owner exists. | CLI setup is optional for first run, not a browser prerequisite. | AMD-001, auth contracts/routes/service/client, tests, E2E setup, README, Storybook. | proposal.md and design.md define S3. | open |
| 2026-07-22 | First claim is allowed from the configured app origin under trusted private-network scope. | Unclaimed hosts must not be exposed to untrusted networks; stronger claim factors are deferred. | README self-hosting warning, auth route protection, risk matrix, future public-hosting planning. | design alternatives and ADR reconsideration trigger recorded. | open |
| 2026-07-22 | Dedicated bootstrap/setup semantics selected. | Setup state and failures remain distinct from normal login. | Runtime contracts, HTTP adapters, client state machine, tests and evidence maps. | Boundary Contract Matrix seeded. | open |
| 2026-07-22 | CLI setup and reset remain. | Existing S1/S2 behavior and terminal evidence must not regress or be described as removed. | AMD-001 S1/S2, commands/tests, README. | Proposal reconciliation obligation recorded. | open |

## Verification Environment

| Evidence Obligation | Required Setup / Safety Boundary | Needed For | Current Readiness | Result / Resolution |
|---|---|---|---|---|
| Service and HTTP auth tests | Disposable machine-local state outside disposable workspace; controlled origin/IP/session adapters. | S3 R1-R3 including concurrency and no-mutation proof. | ready | Existing Vitest service/HTTP harnesses provide the base; Apply must add empty-owner fixtures and injected overlaps. |
| Web interaction and contract tests | JSDOM/MSW with typed bootstrap/setup payloads and controlled pending/error/race responses. | S3 R1, R2, client half of R3. | ready | Existing App tests and contracts package provide the base. |
| Storybook rendered/accessibility proof | Setup stories at desktop and 390×844 with browser runtime and accessibility checks. | UI state, responsive, focus, and error behavior. | ready | Existing Storybook/MSW infrastructure; new setup stories required. |
| Production E2E fresh setup | Separate disposable workspace/security root and dedicated ports; do not pre-create owner through `OwnerSetupService`. | End-to-end no-CLI first run, session, later sign-in, and desktop/mobile behavior. | ready | Existing Playwright fixture can be revised to start empty. |
| Manual UI confirmation | Separate fresh-state server on non-conflicting ports while persistent 5174/3334 dev server remains running. | User acceptance of the requested first-login path. | pending | Apply must provide URL and walkthrough after rendered verification. |
| Secret/log inspection | Captured local server output and browser network/console for disposable setup password. | S3 R3 secrecy and minimal disclosure. | ready | Use disposable credentials and inspect without copying secrets into the Change ledger. |

## Verification Scope Decision

- Project-defined aggregate command or authoritative constituent source: README root scripts plus security audit; run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:storybook`, `pnpm test:e2e`, and `pnpm audit --audit-level=high`.
- Aggregate gate required before `in_review`: yes.
- Trigger or project-policy reason: authentication/security behavior crosses domain, persistence, HTTP, typed contracts, session state, browser presentation, and production E2E.
- Exact committed source candidate: pending implementation.
- Freshness and cache treatment: run every constituent freshly after the final implementation commit; record test/Storybook/E2E counts and build execution rather than cache-only success.
- Aggregate result and meaningful execution/count evidence: pending implementation.
- Post-gate evidence-record-only changes and affected checks rerun: classify after execution; rerun validation and any check whose inspected source or contract changes.
- Prospective integration gate required: yes when the reviewed change branch and `develop` produce a materially different tree.
- Current target and prospective integration tree/ref: `develop`; exact tree pending implementation.
- Integration-candidate result or reason source proof is reusable: pending review handoff.
- Remote CI role: corroborating if available; local candidate proof is required.

## Manual UI Confirmation

- Status: pending user
- App URL / route: fresh disposable-state root URL on Apply-assigned non-conflicting ports.
- Required setup or test data: empty machine-local security state, disposable Markdown workspace, exact allowed origin; keep the persistent 5174/3334 development service running separately.
- Steps for the user:
  1. Open the fresh URL and confirm “Set up AnthraciteMD” appears instead of sign-in.
  2. Confirm mismatch or invalid password guidance does not create the owner.
  3. Enter and confirm a valid test password; create the owner and reach the workspace.
  4. Sign out or reload without the session and confirm normal sign-in appears, not setup.
  5. Sign in with the chosen password and confirm the workspace opens.
- Expected result: the entire first-owner path works in the browser; setup is unavailable after the first successful claim; CLI is not required.
- Feedback that would change artifacts: requiring host-local-only claim, a setup token, different copy/layout, different password rules, or allowing setup to reopen would require replan or design revision.

## Visual Verification Matrix

| Surface / Route or Fixture | Viewport | State / Interaction | Expected Rendered Behavior | Tool / Setup | Inspected Evidence | Console / Network | Result |
|---|---|---|---|---|---|---|---|
| First-owner auth panel | 1440×900 desktop | default, mismatch/policy error, pending, server error | Centered AnthraciteMD panel with labeled password/confirmation, persistent guidance, actionable alert, disabled pending action, no layout shift exposing content. | Storybook or fresh runtime browser | Pending implementation. | Must be clean except deliberately injected request failures; no secret in payload inspection record. | pending |
| First-owner auth panel | 390×844 mobile | default, validation, focus, pending | Single-column form fits without horizontal scroll; focused field and action remain reachable; wrapped guidance/error stays associated. | Storybook or fresh runtime browser | Pending implementation. | Same constraints as desktop. | pending |
| Setup-to-workspace transition | desktop and 390×844 | successful first claim | Setup panel disappears only after session success; authenticated workspace renders without setup/sign-in flash. | Production E2E plus direct inspection | Pending implementation. | Bootstrap, setup, current-session, and workspace request order inspected. | pending |
| Claimed/stale setup transition | desktop | another request claims before submit; reload/logout | Stale form receives a clear non-secret result and transitions to normal sign-in; setup never reappears after claim. | Controlled browser test and runtime observation | Pending implementation. | No credential replacement or protected pre-auth response. | pending |

## Blockers / Open Questions

- None. Implementation must stay within the documented trusted private-network posture; a stronger first-claim factor is follow-up scope.

## Review Handoff Candidate

- Integration target / merge base: `develop`; exact merge base pending promotion and implementation.
- Candidate source commit: pending implementation.
- Source differs from target when implementation changed: expected yes.
- Intended implementation fully committed: pending implementation.
- Unrelated dirty state preserved: current application worktree is clean; recheck at Apply and review.
- Commit-sensitive generated-contract / diff / integration checks: runtime contract tests, changed-file inventory, scoped SDD validation, and prospective integration tree.
- Verification Scope Decision and aggregate candidate evidence: required and pending.
- Post-gate evidence-only changes classified and affected checks rerun: pending.
- Prospective integration tree and required gate evidence: pending.
- Required risk, fan-out, environment, or verification rows still pending or blocked: all implementation rows currently pending as expected for a plan.
- Pattern parity, boundary contract, and stateful transition matrices reconciled or not applicable with reason: seeded; Apply must refine and resolve.
- Capability authority, content-budget/provenance conservation, and filesystem mutation-order proof reconciled or not applicable: capability/content budgets are not applicable; machine-local state create-before-auth and no-mutation failure paths require proof.
- Evidence claims falsified against exact tests, assertions, routes, or observations: pending implementation.
- Fresh-context failure-seeking passes completed: pending `/sdd-review`.

## Closeout

- Change status: in_progress.
- Epic files updated: AMD-001 now carries S3 as partial/partial with server-only R1 evidence and explicit UI/R2/R3 gaps.
- Story labels/references and Requirement/Scenario IDs current: planned S3 IDs are coherent; Epic update pending.
- Implemented By maps current: pending implementation.
- One canonical implementation and verification map per Story: AMD-001 currently satisfies this; preserve during Apply.
- Primary anchors inspected as behavior-owning definitions/registrations rather than incidental occurrences: pending implementation evidence.
- Scenario-mapped Verified By maps current: pending implementation.
- Superseded earlier Epic truth reconciled: S1 exclusivity wording pending Apply.
- README/current-state docs and active/closed Change claims reconciled: README update pending; no active competing Change.
- ADR status: not applicable; accepted ADRs remain aligned.
- Release communication current: pending README update.
- `sdd-review` verdict: pending.
- Review record: pending.
- `review.md` findings resolved: not applicable until review.
- Planning updates resolved: no replans.
- Implementation risk and confirmation rows resolved: pending.
- Pattern parity, boundary contract, and stateful transition rows resolved: pending.
- Capability authority, content-budget/provenance conservation, and filesystem mutation-order proof resolved: pending applicable machine-state proof; other classes not applicable.
- Evidence-claim integrity checked: pending.
- Decision fan-out reconciled: pending implementation.
- Verification environment obligations resolved: planned; execution pending.
- Verification Scope Decision current and required candidate gates passed: decision current; gates pending.
- Immutable review handoff candidate: pending.
- Tested integration candidate matches actual integrated tree, or rerun recorded: pending.
- Manual UI confirmation status: pending user.
- Rendered UI verification status: pending implementation.
- PR / merge state: not started; no authorization inferred.
- Deferred scope accepted: recorded in proposal/design.
- Change moved to `docs/changes/closed/`: no; private planned Change.
