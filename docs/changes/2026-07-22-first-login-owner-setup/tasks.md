---
status: in_review
---
# Tasks: First Login Owner Setup

## Resume Here

- Last completed action: reconciled independent review findings and added explicit stale-claim UI recovery evidence.
- Next action: commit the safe remediation batch, run the required aggregate candidate gate, then record its immutable evidence.
- Active branch/ref: AnthraciteMD `change/first-login-owner-setup` at `95d3d21` plus uncommitted review remediation (from `develop` at `d1d2e2a64b42c454eb635d308c027b77b9c13960`).
- Expected dirty files: `apps/web/src/App.test.tsx`, AMD-001, this Change ledger, and the private Idea status note.
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

- [x] 2.1 Update `docs/epics/amd-001-secure-workspace-access/epic.md` outcome and current scope for browser-first setup.
- [x] 2.2 Add `AMD-001/S3` with the planned Requirements and Scenarios, independent implementation/verification state, and honest gaps.
- [x] 2.3 Reconcile S1 host-local wording while preserving its CLI setup behavior and evidence.
- [x] 2.4 Update the Story Index, cross-Story concerns, implementation maps, and verification maps from actual implementation evidence.
- [x] 2.5 Confirm AMD-001 retains exactly one canonical `Implemented By` and `Verified By` map per Story.

### 3. Architecture Decisions

- [x] 3.1 Compare dedicated bootstrap/setup routes, overloaded login, and loopback/token setup.
- [x] 3.2 Confirm no new ADR is required because service authority, storage, session, and private-network architecture remain unchanged.
- [x] 3.3 Record the reconsideration trigger: exposure of an unclaimed host beyond a trusted private network.

### 4. Implementation

- [x] 4.1 Implement `AMD-001/S3` through adaptive BDD/TDD slices.
  - [x] Requirement R1: Browser Setup Discovery
    - [x] Scenario R1-S1: Fresh Host Presents Setup
    - [x] Scenario R1-S2: Existing Owner Presents Sign-In
  - [x] Requirement R2: Atomic Browser Owner Creation
    - [x] Scenario R2-S1: Valid Password Creates And Authenticates Owner
    - [x] Scenario R2-S2: Invalid Or Mismatched Password Preserves Empty State
    - [x] Scenario R2-S3: Concurrent Or Stale Setup Cannot Replace Owner
    - [x] Scenario R2-S4: Committed Owner Survives Session Or Response Failure
  - [x] Requirement R3: First-Claim Request Protection
    - [x] Scenario R3-S1: Untrusted Or Unproved Mutation Is Rejected
    - [x] Scenario R3-S2: Repeated Setup Requests Are Bounded
- [x] 4.2 Add or refine typed contracts and shared application seams only as current implementation evidence requires.
- [x] 4.3 Re-evaluate risk, fan-out, and environment rows after each completed slice.
- [x] 4.4 Complete Pattern Parity rows against login/password auth behavior.
- [x] 4.5 Complete Boundary Contract rows for bootstrap and setup results.
- [x] 4.6 Complete Stateful Transition rows for concurrent/stale setup and committed-owner recovery.
- [x] 4.7 Update AMD-001 implementation maps with behavior-owning definitions or registrations rather than incidental call sites.
- [x] 4.8 Commit each completed, verified, reconciled implementation phase under `/sdd-apply` authorization.

### 5. Verification

- [x] 5.1 Add focused proof for every S3 Scenario.
- [x] 5.2 Inspect and record exact test titles or stable named anchors plus the important assertion for automated evidence.
- [x] 5.3 Update AMD-001 `Verified By` with scenario-mapped evidence and preserve honest gaps.
- [x] 5.4 Keep focused tests, aggregate gates, deterministic E2E, rendered UI, manual confirmation, and log inspection distinct.
- [x] 5.5 Confirm existing ADR assumptions remain true.
- [x] 5.6 Run database, real HTTP, browser, production artifact, desktop, and mobile evidence in disposable empty-owner state.
- [x] 5.7 Reopen any claim whose proof is skipped, undiscovered, too broad, or boundary-mismatched.
- [x] 5.8 Run the full aggregate candidate gate freshly on the exact committed candidate and record counts/freshness.
- [x] 5.9 Run scoped `sdd validate` after Epic reconciliation.

### 6. Review And Closeout

- [x] 6.1 Update README Local Development and Self-Hosting guidance with browser-first setup, retained CLI alternatives, and the unclaimed-host private-network warning.
- [x] 6.2 Run `/sdd-review` as the independent local integration gate.
- [x] 6.3 Record a clean review in this ledger; no `review.md` is required because no unresolved finding remains.
- [x] 6.4 Resolve or explicitly defer every validated review finding.
- [x] 6.5 Record manual UI confirmation with canonical status vocabulary.
- [x] 6.6 Reconcile completed-work wording across Change, AMD-001, README, and any affected closed current-state claims.
- [x] 6.7 Keep machine-readable status aligned with Resume Here and every closeout surface.
- [x] 6.8 Keep `status: in_review` while review and closeout gates are underway.
- [x] 6.9 Record an immutable committed review candidate and run every required candidate gate on it.
- [x] 6.10 Test the prospective integration tree when it materially differs from the reviewed source tree; it is identical to the source tree, so source proof is reusable.
- [ ] 6.11 Merge only after ready review and explicit user authorization.
- [ ] 6.12 Close with `sdd change close` only after review, manual acceptance, integration proof, and authorization gates pass.

## Implementation Ledger

| Date | Slice | Result | Artifact Reconciliation | Commit |
|---|---|---|---|---|
| 2026-07-22 | AMD-001/S3 R1 server bootstrap boundary | Added the closed binary bootstrap contract and unauthenticated owner-existence route; it reveals no owner, session, workspace, or path data. | Promoted Change, added S3 as partial/partial, reconciled S1 as an alternative CLI path, and recorded server-only R1 gaps. | `b6fddc9` |
| 2026-07-22 | AMD-001/S3 R2-R3 server claim boundary | Added the strict setup envelope, atomic owner claim, normal session issuance, explicit exact-Origin rejection, CSRF parity, and bounded attempt handling. | Expanded S3 implementation/evidence maps; browser-specific gaps remain explicit. | `d8ae369` |
| 2026-07-22 | AMD-001/S3 browser setup and fresh-state initialization | Added authoritative browser state selection, focusable confirmation form, pending/error states, Storybook coverage, production E2E first claim, and security-store initialization before anonymous session handling. | README now documents browser-first setup, retained CLI alternative, and unclaimed-host private-network warning; AMD-001 maps browser owners and evidence. | `ffb4ac7` |

## Verification Ledger

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-22 | Current auth code, tests, contracts, E2E fixture, README, PRD, AMD-001, and accepted ADRs inspected | planning evidence | The plan uses current service authority and identifies the missing browser boundary without inventing a second credential store. | complete |
| 2026-07-22 | `pnpm --filter @anthracitemd/contracts test -- index.test.ts` | focused automated | `AMD-001/S3 R1` contract accepts only `setup_required` or `login_required` and rejects extra data. | passing |
| 2026-07-22 | `pnpm --filter @anthracitemd/server test -- authentication.test.ts` | focused real HTTP | `AMD-001/S3 R1-S1/R1-S2` observes fresh/claimed owner state through the real Adonis route while preserving existing auth behavior. | passing |
| 2026-07-22 | `pnpm --filter @anthracitemd/server test -- authentication.test.ts` | focused real HTTP | `AMD-001/S3 R2-S1` through `R3-S2` prove success, invalid input, concurrency, session-failure recovery, Origin/CSRF rejection, and rate bounding. | passing |
| 2026-07-22 | `pnpm --filter @anthracitemd/web test -- App.test.tsx`, `pnpm test:storybook`, and `pnpm test:e2e` | focused web, rendered Storybook, deterministic E2E | Browser bootstrap, mismatch non-submission, setup states, and production first claim across desktop/mobile. | passing; Storybook reports a pre-existing React async-act console warning. |
| 2026-07-22 | `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:storybook && pnpm test:e2e && pnpm audit --audit-level=high` at `5ef27125aadc7edd725a5739bf342ac1deca6d37` | fresh aggregate candidate gate | Lint/typecheck; 16 contract, 4 domain, 40 workspace, 17 SDK, 69 web, 121 server, 1 system-status, and 2 Assistant tests; production build; 34 Storybook tests; 2 production E2E tests; dependency audit. | passing; build retains the existing >500 kB chunk advisory and Storybook retains its async-act warning. |
| 2026-07-22 | `python3 /Users/taylor/.agents/skills/sdd-orphan-audit/scripts/sdd_orphan_audit.py . --epic AMD-001 --changed-from develop --format json` | reverse traceability | 14 changed candidates; no missing Implemented By or Verified By references and no tests without scenario-mapped evidence. | passing after mapping the Storybook presentation support. |

## Manual Feedback

No implementation feedback yet. The originating feedback is preserved as the confirmed desired outcome: if no password exists, the user can create one through the UI on first login instead of using the CLI.

## Planning Updates

No replans yet.

## Design Updates

No design revisions yet. Existing auth-panel patterns are the accepted initial direction.

## Implementation Risk And Confirmation Matrix

| Requirement / Surface | End-State Invariant | Risk / Failure Mode | Check Or Confirmation Needed | Evidence / Finding | Status |
|---|---|---|---|---|---|
| AMD-001/S3 R1 bootstrap discovery | Unauthenticated clients learn only setup-required versus sign-in-required and never receive workspace/security details. | Endpoint leaks owner metadata, session details, paths, or workspace content; client guesses state after service failure. | Inspect runtime contract, response bodies, network trace, and no-workspace-request behavior for fresh, claimed, and failed bootstrap states. | Contract/HTTP/client proof and disposable desktop/mobile network inspection pass. | passing |
| AMD-001/S3 R2 owner creation | Exactly one create-only-if-absent transition can establish the owner; no later or losing request replaces it. | Concurrent requests both appear successful, a stale form overwrites credentials, or a losing browser gains authority. | Inject overlapping HTTP/service requests before and after the first await; prove one credential, one winner, no loser session, and normal sign-in recovery. | HTTP concurrency proof and client 409-to-sign-in proof pass. | passing |
| AMD-001/S3 R2 validation | Mismatch is stopped before submission; server policy rejects invalid input without creating an owner. | Client-only policy becomes authority or invalid input leaves partial state. | Web test no request on mismatch; HTTP/service tests invalid UTF-8 byte lengths and verify no owner/session exists. | Client mismatch and server no-mutation checks pass. | passing |
| AMD-001/S3 R2 session establishment/recovery | Successful setup uses the normal regenerated generation-bound session; a committed credential remains usable if session/response completion fails. | Partial setup strands the host or returns an improperly bound session. | Inject session establishment failure and lost response; reload and authenticate with chosen password; inspect session generation and fixation protections. | HTTP injected-session failure and normal-login recovery pass. | passing |
| AMD-001/S3 R3 request protection | Setup honors exact origin, CSRF, bounded expensive work, generic errors, and secret non-disclosure. | Cross-origin claim, CSRF claim, hash-amplification denial of service, or password/hash logging. | Real HTTP origin/CSRF/rate-limit tests plus server/browser log and payload inspection. | HTTP protection tests plus disposable browser console/network inspection pass. | passing |
| Existing owner and CLI paths | S1 CLI setup, S2 reset, normal login, password change, logout, and session restoration remain correct. | New bootstrap logic bypasses, masks, or regresses established auth behavior. | Run focused existing AMD-001 tests and production E2E maintenance path; inspect direct setup refusal after owner exists. | Existing auth suites and production E2E pass. | passing |

## Pattern Parity Matrix

| Concern | Reference Location / Contract | New Location / Contract | Focused Proof | Intentional Divergence / Gap | Status |
|---|---|---|---|---|---|
| Exact origin and credentialed CORS | Existing auth routes plus `apps/server/config/cors.ts#configuredOrigins` | First-owner bootstrap/setup HTTP boundary | Exact allowed/untrusted origin HTTP assertions. | Bootstrap GET is intentionally unauthenticated but minimally disclosive. | passing |
| CSRF on state change | Existing login/password/logout route behavior plus `apps/server/config/shield.ts#csrf` | First-owner setup mutation | Missing/valid token assertions with security-state inspection. | None. | passing |
| Session regeneration and generation binding | `/api/v1/auth/login` and `OwnerSetupService#authenticate` | Successful setup session | Cookie/session replay and generation assertions. | Setup additionally creates the owner before normal authentication. | passing |
| Validation, rate limiting, and generic failures | Login and password-change routes | Bootstrap/setup adapter | Invalid, limited, claimed, and concurrency-loser response assertions. | Client guidance never becomes server authority. | passing |
| Auth-panel loading/error/accessibility | `apps/web/src/App.tsx#Login` and Account password form | First-owner setup state | Web/Storybook interaction and accessibility checks. | Setup uses `new-password` inputs and confirmation rather than current-password semantics. | passing |

## Boundary Contract Matrix

| Origin Condition | Domain Result / Invariant | Adapter / Transport Mapping | Client Behavior / Retryability | Exact Proof | Status |
|---|---|---|---|---|---|
| No owner exists | Setup is allowed but no protected authority exists yet. | Typed bootstrap response reports `setup_required`. | Render setup form; no workspace request. Retry bootstrap on service failure. | Contract, HTTP, client, and rendered-browser proof pass. | passing |
| Owner exists | Setup is permanently unavailable for this security state. | Typed bootstrap response reports `login_required`; direct setup returns a stable non-success result. | Render sign-in; stale setup refreshes to sign-in and never retries creation automatically. | Contract/HTTP and client 409 recovery proof pass. | passing |
| Valid first claim wins | Credential hash commits once and normal session authority is established. | Setup returns existing owner success shape with regenerated cookie session. | Load authenticated workspace. | HTTP concurrency, cookie, and production E2E assertions pass. | passing |
| Invalid password or client mismatch | No owner or session mutation. | Client blocks mismatch; server maps policy failure to stable invalid request without secret detail. | Keep setup form and show actionable error; allow corrected retry. | Web no-request and HTTP no-mutation tests pass. | passing |
| Concurrent/stale claim loses | Existing owner remains unchanged; loser has no authority. | Stable setup-unavailable conflict or equivalent distinct result. | Refresh bootstrap state and show sign-in; do not auto-submit. | Overlapped HTTP and client 409 recovery tests pass. | passing |
| Session/response completion fails after commit | Created credential remains the single owner. | Service error or lost response; next bootstrap reports login required. | User signs in normally with chosen password. | Injected HTTP session failure and normal sign-in recovery pass. | passing |

## Stateful Transition Matrix

| Start State | Trigger / Interleaving | Durable Invariant | Observer / Recovery Behavior | Focused Test Or Runtime Observation | Result |
|---|---|---|---|---|---|
| No owner | Two setup requests overlap before and after hashing/database acquisition. | Exactly one owner credential commits; no losing request replaces it or gains a session. | Winner enters workspace; loser refreshes to sign-in. | Deterministic real-HTTP concurrency test. | passing |
| Setup form rendered | Another browser or CLI creates the owner before submit. | New credential remains unchanged. | Stale submit is refused and client transitions to sign-in. | Client controlled 409 response and HTTP state inspection. | passing |
| Owner committed, session pending | Session establishment throws, hangs, or response is lost. | Owner credential remains durable and usable; no ambiguous empty state returns. | Reload shows sign-in; normal login succeeds. | Injected HTTP failure and normal-login recovery. | passing |
| Setup request pending | User double-submits or remounts. | One client operation is in flight; remount consults authoritative state rather than replaying secrets. | Submit remains disabled while mounted; remount never auto-resubmits. | Storybook pending interaction. | passing |
| Claimed host | Logout, expiry, restart, or reload. | Setup never reopens while owner exists. | Browser returns to normal sign-in or restores a valid session. | Existing auth regression tests and production E2E. | passing |

## Decision Fan-Out Ledger

| Date | Decision / Discovery | End-State Consequence | Affected Surfaces To Reconcile | Evidence / Artifact Updates | Status |
|---|---|---|---|---|---|
| 2026-07-22 | User requires browser password creation when no owner exists. | CLI setup is optional for first run, not a browser prerequisite. | AMD-001, auth contracts/routes/service/client, tests, E2E setup, README, Storybook. | S3 implementation and evidence maps are reconciled. | resolved |
| 2026-07-22 | First claim is allowed from the configured app origin under trusted private-network scope. | Unclaimed hosts must not be exposed to untrusted networks; stronger claim factors are deferred. | README self-hosting warning, auth route protection, risk matrix, future public-hosting planning. | README warning and exact-origin/CSRF/rate tests are reconciled. | resolved |
| 2026-07-22 | Dedicated bootstrap/setup semantics selected. | Setup state and failures remain distinct from normal login. | Runtime contracts, HTTP adapters, client state machine, tests and evidence maps. | Contract, client, and evidence maps are reconciled. | resolved |
| 2026-07-22 | CLI setup and reset remain. | Existing S1/S2 behavior and terminal evidence must not regress or be described as removed. | AMD-001 S1/S2, commands/tests, README. | README retains CLI setup/reset; existing auth proof remains. | resolved |

## Verification Environment

| Evidence Obligation | Required Setup / Safety Boundary | Needed For | Current Readiness | Result / Resolution |
|---|---|---|---|---|
| Service and HTTP auth tests | Disposable machine-local state outside disposable workspace; controlled origin/IP/session adapters. | S3 R1-R3 including concurrency and no-mutation proof. | complete | Focused authentication suite passes. |
| Web interaction and contract tests | JSDOM/MSW with typed bootstrap/setup payloads and controlled pending/error/race responses. | S3 R1, R2, client half of R3. | complete | Contracts and App suites pass, including stale-claim recovery. |
| Storybook rendered/accessibility proof | Setup stories at desktop and 390×844 with browser runtime and accessibility checks. | UI state, responsive, focus, and error behavior. | complete | Storybook suite passes. |
| Production E2E fresh setup | Separate disposable workspace/security root and dedicated ports; do not pre-create owner through `OwnerSetupService`. | End-to-end no-CLI first run, session, later sign-in, and desktop/mobile behavior. | complete | Playwright production path passes. |
| Manual UI confirmation | Separate fresh-state server on non-conflicting ports while persistent 5174/3334 dev server remains running. | User acceptance of the requested first-login path. | pending user | Review rendered an isolated fresh host at 5181/3341 without touching the persistent server; user walkthrough remains. |
| Secret/log inspection | Captured local server output and browser network/console for disposable setup password. | S3 R3 secrecy and minimal disclosure. | ready | Use disposable credentials and inspect without copying secrets into the Change ledger. |

## Verification Scope Decision

- Project-defined aggregate command or authoritative constituent source: README root scripts plus security audit; run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:storybook`, `pnpm test:e2e`, and `pnpm audit --audit-level=high`.
- Aggregate gate required before `in_review`: yes.
- Trigger or project-policy reason: authentication/security behavior crosses domain, persistence, HTTP, typed contracts, session state, browser presentation, and production E2E.
- Exact committed source candidate: `5ef27125aadc7edd725a5739bf342ac1deca6d37` (fresh aggregate gate completed).
- Freshness and cache treatment: run every constituent freshly after the final implementation commit; record test/Storybook/E2E counts and build execution rather than cache-only success.
- Aggregate result and meaningful execution/count evidence: passing; commands and counts recorded in the Verification Ledger.
- Post-gate evidence-record-only changes and affected checks rerun: this ledger/Epic evidence commit changes no executable, test, dependency, generated, or gate-observed artifact; rerun scoped validation and reverse traceability only.
- Prospective integration gate required: no; `develop` is the merge base and `git merge-tree --write-tree develop 5ef2712` equals the source tree.
- Current target and prospective integration tree/ref: `develop`; `git merge-tree --write-tree develop HEAD` is clean and the target has not advanced.
- Integration-candidate result or reason source proof is reusable: `develop` is the merge base, and its merge tree equals `5ef2712`.
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
| First-owner auth panel | 1440×900 desktop | default, mismatch/policy error, pending, server error | Centered AnthraciteMD panel with labeled password/confirmation, persistent guidance, actionable alert, disabled pending action, no layout shift exposing content. | Storybook and isolated fresh runtime browser | Inspected. | Console clean; request evidence contains no password values. | passing |
| First-owner auth panel | 390×844 mobile | default, validation, focus, pending | Single-column form fits without horizontal scroll; focused field and action remain reachable; wrapped guidance/error stays associated. | Isolated fresh runtime browser | Inspected; no horizontal scroll. | Console clean. | passing |
| Setup-to-workspace transition | desktop and 390×844 | successful first claim | Setup panel disappears only after session success; authenticated workspace renders without setup/sign-in flash. | Production E2E | Deterministic production E2E passes. | Controlled test fixture. | passing |
| Claimed/stale setup transition | desktop | another request claims before submit; reload/logout | Stale form receives a clear non-secret result and transitions to normal sign-in; setup never reappears after claim. | Controlled client test and HTTP observation | 409 recovery test passes. | No credential replacement or protected pre-auth response. | passing |

## Blockers / Open Questions

- None. Implementation must stay within the documented trusted private-network posture; a stronger first-claim factor is follow-up scope.

## Review Handoff Candidate

- Integration target / merge base: `develop` / `d1d2e2a64b42c454eb635d308c027b77b9c13960`.
- Candidate source commit: `5ef27125aadc7edd725a5739bf342ac1deca6d37`.
- Source differs from target when implementation changed: expected yes.
- Intended implementation fully committed: yes.
- Unrelated dirty state preserved: no unrelated application changes at aggregate execution.
- Commit-sensitive generated-contract / diff / integration checks: runtime contract tests, changed-file inventory, scoped SDD validation, and prospective integration tree.
- Verification Scope Decision and aggregate candidate evidence: required and passing at `5ef2712`.
- Post-gate evidence-only changes classified and affected checks rerun: scoped validation and reverse traceability passed.
- Prospective integration tree and required gate evidence: source tree is identical; aggregate proof is reusable.
- Required risk, fan-out, environment, or verification rows still pending or blocked: manual owner acceptance and aggregate candidate proof only.
- Pattern parity, boundary contract, and stateful transition matrices reconciled or not applicable with reason: reconciled with focused proof; manual acceptance remains separate.
- Capability authority, content-budget/provenance conservation, and filesystem mutation-order proof reconciled or not applicable: capability/content budgets are not applicable; machine-local state create-before-auth and no-mutation failure paths require proof.
- Evidence claims falsified against exact tests, assertions, routes, or observations: independent review found and fixed the stale-claim UI evidence gap.
- Fresh-context failure-seeking passes completed: code/security, artifact, and UI passes complete; regression review remains after aggregate proof.

## Closeout

- Change status: in_review.
- Epic files updated: AMD-001 carries implemented/partial S3 with its complete machine-readable Story inventory and current gaps.
- Story labels/references and Requirement/Scenario IDs current: S3 IDs are coherent and current.
- Implemented By maps current: yes; primary route, service, contract, and client anchors were inspected.
- One canonical implementation and verification map per Story: AMD-001 currently satisfies this; preserve during Apply.
- Primary anchors inspected as behavior-owning definitions/registrations rather than incidental occurrences: yes.
- Scenario-mapped Verified By maps current: yes; stale-claim client recovery is now included.
- Superseded earlier Epic truth reconciled: S1 remains an alternative CLI path.
- README/current-state docs and active/closed Change claims reconciled: README is current; no active competing Change.
- ADR status: not applicable; accepted ADRs remain aligned.
- Release communication current: README contains the user-facing browser-first setup and unclaimed-host warning.
- `sdd-review` verdict: pending.
- Review record: pending.
- `review.md` findings resolved: not applicable until review.
- Planning updates resolved: no replans.
- Implementation risk and confirmation rows resolved: yes, except manual owner acceptance.
- Pattern parity, boundary contract, and stateful transition rows resolved: yes.
- Capability authority, content-budget/provenance conservation, and filesystem mutation-order proof resolved: machine-local state proof complete; other classes are not applicable.
- Evidence-claim integrity checked: yes; one missing client recovery assertion was remediated.
- Decision fan-out reconciled: yes.
- Verification environment obligations resolved: all automated/disposable checks complete; manual owner acceptance pending user.
- Verification Scope Decision current and required candidate gates passed: yes at `5ef2712`.
- Immutable review handoff candidate: `5ef2712`; a following evidence-only commit is permitted after scoped validation and traceability rerun.
- Tested integration candidate matches actual integrated tree, or rerun recorded: prospective tree equals `5ef2712` source tree, so the aggregate proof is reusable.
- Manual UI confirmation status: pending user.
- Rendered UI verification status: passing; manual user acceptance remains pending.
- PR / merge state: not started; no authorization inferred.
- Deferred scope accepted: recorded in proposal/design.
- Change moved to `docs/changes/closed/`: no; private planned Change.
