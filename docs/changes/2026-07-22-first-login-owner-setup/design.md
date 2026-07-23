# Design: First Login Owner Setup

## Context

AnthraciteMD already stores the single owner credential in machine-local security state, enforces a 12–1024 UTF-8 byte password policy, creates the owner atomically, rejects replacement, and authenticates through regenerated generation-bound AdonisJS sessions. The CLI adapters expose initial setup and reset. The browser loader currently treats every unauthenticated `/api/v1/auth/current` result as normal login, so it cannot discover or resolve an empty owner state.

This Change adds a browser adapter to the existing service-owned authority. It does not move owner state or password policy into React, and it does not make the browser authoritative for deciding whether setup is allowed.

## Goals / Non-Goals

**Goals:**

- Let a fresh private-network installation create its first owner password entirely through the browser.
- Preserve exactly-one-owner and create-only-if-absent semantics under concurrent or stale setup attempts.
- Establish the normal secure browser session after successful creation and provide a recoverable path if session establishment or response delivery fails.
- Keep unauthenticated disclosure, origin access, CSRF behavior, rate limiting, password handling, and error behavior proportional to the existing auth boundary.
- Preserve CLI setup as an alternative and CLI reset as recovery.

**Non-Goals:**

- Public signup, multi-user identity, remote recovery, public-internet claim hardening, setup invitations, or pairing codes.
- Changing password hashing, security-state storage, session schema, or password policy.
- Redesigning the workbench or authenticated account settings.

## Planning Interview / Story Refinement

- Scope boundary reviewed: only the empty-owner first-run browser path and its security/recovery edges are in scope.
- User decisions: a missing owner password must be creatable through the UI on first login without requiring the CLI.
- Assumptions: the configured application origin is reachable only through the documented trusted private-network deployment boundary; the first completed browser claim owns an unclaimed host.
- Deferred scope: loopback-only setup, host-issued setup tokens, public signup, multi-user identity, and stronger public-internet bootstrap controls.
- Story boundaries challenged: adding more Scenarios to S1 would push an already broad setup/authentication Story beyond the review signal and hide a separately releasable browser onboarding path. A new S3 keeps one user path and one outcome.
- Requirements refined: discovery/minimal disclosure, atomic creation/session establishment, and request/security protection have distinct governing owners and are separate Requirements.
- Scenario gaps considered: fresh state, existing owner, mismatched/invalid password, concurrent claim, stale form, lost response/session failure, untrusted origin, missing CSRF, and repeated requests.
- Open questions that block implementation: none.

## Epic Changes

### Update Epic: AMD-001 Secure Workspace Access

- Target Epic: `docs/epics/amd-001-secure-workspace-access/epic.md`
- Change Type: added and modified scope

#### Story Changes

- Added: `AMD-001/S3` — Set Up A Fresh Host From The Browser.
- Modified: S1 outcome/context wording to preserve CLI setup as an alternative instead of implying it is the only initial setup path; Epic outcome and current scope gain browser-first setup.
- Removed: none.

#### Story S3: Set Up A Fresh Host From The Browser

As a self-hosting owner opening a fresh AnthraciteMD installation, I want to create the first owner password in the browser, so that I can begin securely without running a host CLI command.

##### Requirement R1: Browser Setup Discovery

The system SHALL present first-owner setup only when authoritative machine-local security state has no owner, while disclosing no protected workspace or security data.

###### Scenario R1-S1: Fresh Host Presents Setup

- WHEN an unauthenticated browser at the configured application origin opens a host with no owner
- THEN AnthraciteMD presents the first-owner password setup experience instead of normal sign-in
- AND the response exposes only the minimum setup-versus-sign-in state needed by the client.

###### Scenario R1-S2: Existing Owner Presents Sign-In

- WHEN an unauthenticated browser opens a host whose owner already exists
- THEN AnthraciteMD presents normal sign-in
- AND does not expose or enable the first-owner setup form.

##### Requirement R2: Atomic Browser Owner Creation

The system SHALL validate a confirmed password, create the only owner through an atomic create-only-if-absent transition, and establish the normal protected browser session after successful creation.

###### Scenario R2-S1: Valid Password Creates And Authenticates Owner

- WHEN a fresh-host browser submits matching password values that satisfy the existing password policy
- THEN the service stores only the approved password hash in machine-local security state
- AND establishes the same regenerated, generation-bound session used by normal login
- AND opens the authenticated workspace.

###### Scenario R2-S2: Invalid Or Mismatched Password Preserves Empty State

- WHEN the setup password is invalid or its browser confirmation does not match
- THEN AnthraciteMD reports actionable validation without submitting or committing an owner
- AND the host remains available for a corrected setup attempt.

###### Scenario R2-S3: Concurrent Or Stale Setup Cannot Replace Owner

- WHEN multiple browsers submit setup while the host is unclaimed, or a stale setup form submits after another request succeeds
- THEN exactly one request can create the owner
- AND every losing request is refused without replacing the credential or receiving an authenticated session
- AND the losing browser can refresh into normal sign-in.

###### Scenario R2-S4: Committed Owner Survives Session Or Response Failure

- WHEN owner creation commits but browser-session establishment or response delivery does not complete
- THEN the created credential remains valid and is never rolled back into an ambiguous partial account
- AND the next browser load presents sign-in, where the chosen password can authenticate normally.

##### Requirement R3: First-Claim Request Protection

The system SHALL protect browser owner setup with the configured exact-origin, CSRF, bounded-request, generic-error, and password-secrecy controls applicable to the authentication boundary.

###### Scenario R3-S1: Untrusted Or Unproved Mutation Is Rejected

- WHEN a setup request comes from an untrusted origin or lacks valid CSRF proof
- THEN the service rejects the request
- AND no owner, session, workspace, or other security state changes.

###### Scenario R3-S2: Repeated Setup Requests Are Bounded

- WHEN one source repeatedly submits setup requests
- THEN the service bounds expensive password-processing attempts and responds without exposing password, hash, session, or workspace data
- AND a rate-limited request does not create or replace the owner.

##### Implemented By

Not implemented yet.

##### Implementation Gaps

- `S3/R1`: Not implemented yet.
- `S3/R2`: Not implemented yet.
- `S3/R3`: Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- `S3/R1-S1`: Not verified yet.
- `S3/R1-S2`: Not verified yet.
- `S3/R2-S1`: Not verified yet.
- `S3/R2-S2`: Not verified yet.
- `S3/R2-S3`: Not verified yet.
- `S3/R2-S4`: Not verified yet.
- `S3/R3-S1`: Not verified yet.
- `S3/R3-S2`: Not verified yet.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes: S1 and the Epic's Current Scope currently frame initial owner setup as host-local only. The CLI Requirement remains valid, but exclusivity wording must be removed.
- Story implementation/verification state, `Implemented By`, `Implementation Gaps`, `Verified By`, or `Verification Gaps` entries that must be rewritten or reclassified: add S3 as `not implemented` / `unverified` during the first Apply reconciliation, then advance each state only from implementation and scenario evidence; preserve S1/S2 evidence unless touched behavior invalidates it.
- Closed or active Change artifacts likely to need status cleanup: the closed Foundation Workspace Slice is historical and needs no rewrite unless Apply finds a current-state claim that says CLI setup is the only supported path.
- Manual confirmation status updates expected: S3 remains `pending user` until the user completes fresh-state browser setup and subsequent sign-in on the rendered implementation.

## Technical Options

### Option 1: Dedicated Bootstrap State And Setup Route

- Summary: add a minimal unauthenticated bootstrap-state contract plus a dedicated first-owner creation route; the client consults it only after normal current-session restoration fails.
- User impact: clear setup form on a fresh host, normal sign-in once claimed.
- Implementation complexity: moderate, with explicit contracts and state transitions.
- Reversibility: high; routes and client state can evolve without changing stored credentials.
- Client surfaces: browser now; reusable by future native clients.
- API / contract shape: typed setup-required versus sign-in-required state, plus a setup request that returns the normal owner/session success shape.
- Frontend/backend boundary: React owns confirmation and presentation; the server revalidates policy and exclusively owns create permission and session authority.
- Data / schema impact: none; reuse the existing owner row, hash, session, and revocation generation.
- Auth / security impact: deliberately exposes one binary bootstrap state; must retain exact origin, CSRF, rate limiting, password secrecy, and atomic refusal after claim.
- Testability: strong across service, HTTP, client, Storybook, and production E2E.
- Operational risk: first reachable browser can claim an unclaimed private-network host; this must be documented.
- Fit with project conventions: best fit with service-first authority and typed cross-layer contracts.

### Option 2: Overload Login To Create A Missing Owner

- Summary: treat a login attempt as owner creation when no owner exists.
- User impact: fewer visible states but a password typo could become the credential and confirmation would be awkward.
- Implementation complexity: superficially low, but login and setup error/retry semantics become ambiguous.
- Reversibility: moderate; clients and tests would couple login to destructive first-claim behavior.
- Client surfaces: browser and any future login client.
- API / contract shape: one overloaded login route whose meaning depends on hidden server state.
- Frontend/backend boundary: the client cannot explain whether it is signing in or claiming ownership.
- Data / schema impact: none.
- Auth / security impact: increases accidental claim risk and makes rate limiting and generic failures harder to reason about.
- Testability: weaker because setup, login, retries, and concurrent claims share one response surface.
- Operational risk: higher chance of an unintended password becoming authoritative.
- Fit with project conventions: poor; it erases a meaningful domain distinction at the adapter boundary.

### Option 3: Loopback-Only Or Host-Token Browser Claim

- Summary: require the setup browser to run on the host or present a one-time host-generated token.
- User impact: stronger host-presence proof but retains a host-side prerequisite and blocks straightforward remote first login.
- Implementation complexity: highest; requires token lifecycle or network-source trust rules.
- Reversibility: moderate.
- Client surfaces: browser plus host output/configuration.
- API / contract shape: bootstrap challenge and token verification.
- Frontend/backend boundary: setup UI depends on host-delivered material.
- Data / schema impact: token state and expiry may be needed.
- Auth / security impact: strongest against first-visitor claim on an exposed host.
- Testability: good but broader than the requested private-network slice.
- Operational risk: operators can lose or misroute token material.
- Fit with project conventions: appropriate only if the deployment posture expands beyond trusted private networks.

## Selected Approach

Use Option 1. Preserve `/api/v1/auth/current` as authenticated-session restoration. After it returns unauthenticated, the client consults a small typed bootstrap-state endpoint that reports only `setup_required` or `login_required`. A dedicated setup mutation accepts one password after client-side confirmation, revalidates the shared domain password policy server-side, and invokes an authoritative create-only-if-absent transition. On success it establishes the ordinary regenerated owner session and returns the existing owner response shape. Already-claimed, concurrent-loser, invalid, rate-limited, origin, and CSRF outcomes remain distinct enough for safe client behavior but do not expose protected state.

The implementation may reuse or refine `OwnerSetupService` and the login/session seam, but it must not duplicate password rules or create a second persistence authority. No database migration is expected. A committed owner is durable even if session establishment or the response fails; the recovery path is normal sign-in with the chosen password.

## Experience Design

- Applicability: required
- Confirmed direction: reuse the existing centered AnthraciteMD auth panel and Account password-form language for a dedicated “Create owner password” first-run state.
- User confirmation: the user explicitly requested password creation through the UI on first login when no password exists.
- Reference artifacts: current `apps/web/src/App.tsx` sign-in panel and `apps/web/src/SettingsPanel.tsx` password form.

### User Flow And Information Architecture

1. The app restores an existing session.
2. If unauthenticated, it checks minimal bootstrap state.
3. An unclaimed host shows “Set up AnthraciteMD” with password, confirmation, policy guidance, inline validation, and one primary “Create owner” action.
4. Success opens the workspace. A claimed host or a lost setup race shows the normal sign-in experience.
5. Later logout, expiry, and reload never return to setup while the owner exists.

### Responsive Composition

Use the existing single-column centered auth panel at desktop and narrow mobile viewports. The form must fit a 390×844 viewport without horizontal scrolling; guidance and errors wrap within the panel, and the primary action remains reachable without a modal or drawer.

### Component And State Contract

- States: bootstrap loading, setup-ready, client validation error, server validation/error, setup pending, lost-race/claimed refresh, normal sign-in, and authenticated transition.
- Never flash workspace content or the setup form before authoritative state resolves.
- Preserve typed distinction between setup-required, login-required, and service-unavailable behavior; do not collapse a failed bootstrap check into a sign-in guess.

#### Component Strategy

| Component Or Pattern | Strategy | Initial Owner Or Reference | Required Preview States | Follow-Up |
|---|---|---|---|---|
| Centered authentication panel | existing application component | `apps/web/src/App.tsx` login panel and auth styles | loading, setup-ready, sign-in, service error | Keep shared visual language without forcing a premature component extraction. |
| First-owner setup form | application-specific | Existing Account password fields and guidance | default, mismatch, policy error, pending, server error, claimed/lost race | Consider extraction only if implementation shows useful shared behavior. |

### Accessibility And Interaction

- Give every password input a persistent label and correct `new-password` autocomplete value.
- Associate policy guidance and errors with the relevant field; announce server errors through `role="alert"` without relying on color.
- Move initial focus to the first password field after bootstrap resolves and preserve keyboard-only submission.
- Disable duplicate submission while pending without removing guidance or progress text.
- Do not reveal entered password values in logs, responses, browser text, or accessible names.

### Visual Direction

Match the existing AnthraciteMD sign-in typography, brand mark, spacing, field, error, and button treatment. This Change adds a state, not a new visual system.

### Open Design Questions

- None. Existing application patterns make the direction implementation-ready; `/sdd-design` is not required before promotion.

## Client And API Boundary

- Current clients: responsive React/Vite browser.
- Plausible future clients: native or alternate browser clients that need the same bootstrap-state and create-first-owner capability.
- Reusable product capabilities: minimal auth bootstrap discovery and atomic first-owner claim.
- API or typed contract: add runtime-validated bootstrap-state and setup-request/response contracts under `@anthracitemd/contracts`; preserve the existing owner success contract.
- OpenAPI plan, if HTTP-facing: no generated OpenAPI exists; runtime TypeBox contracts and HTTP tests remain authoritative for this slice.
- Backend platform exposed directly to clients?: no; AdonisJS routes mediate the security service.
- Client-specific presentation or local state: password confirmation, focus, pending state, and inline explanatory copy.
- Rationale: the server must own whether setup is allowed and the resulting session; confirmation and presentation remain client concerns.

## Alternatives Considered

- Option: overload normal login to claim a missing owner.
  - Why not: it makes an accidental login password authoritative and obscures setup-specific concurrency and recovery.
- Option: require loopback or a host-issued token.
  - Why not: it preserves a host-side prerequisite contrary to the requested first-run UI flow under the current trusted private-network scope.

## Why This Approach

It adds only the missing adapter capability while reusing the existing owner persistence, password policy, session, CORS, and CSRF boundaries. Explicit bootstrap state gives the UI honest behavior and future clients a stable contract. A dedicated mutation makes create-only-if-absent, concurrency, rate limiting, and recovery independently testable.

## ADRs

- Required: no
- ADR path: not applicable
- Decision summary: browser setup is an additional adapter path within the accepted service-first, single-owner, private-network model; it does not change durable storage or authority architecture.
- Reconsider when: an unclaimed host may be exposed beyond a trusted private network, or setup must prove physical/host possession.

## Implementation Constraints

- Password rules remain defined once in `@anthracitemd/domain` and enforced on the server; client guidance must not become authority.
- Passwords, confirmation values, hashes, and session material must not enter logs, URLs, process arguments, workspace files, or response bodies.
- Owner existence and creation remain service-owned and machine-local; no browser cache or workspace file can authorize setup.
- Setup must fail closed after the first committed owner, including concurrent requests and stale forms.
- Exact-origin, CSRF, and session-regeneration behavior must match the established auth routes.
- The persistent development server on ports 5174/3334 must remain running; implementation verification should use separate ports and disposable empty security state.

## Verification Strategy

- Focused automated tests:
  - Domain/service tests for create-only-if-absent, invalid input, concurrency, and committed-owner recovery.
  - HTTP tests for bootstrap disclosure, setup success, existing-owner refusal, session establishment, CSRF/origin rejection, rate limiting, and generic error bodies.
  - Web tests for authoritative routing, confirmation/policy validation, pending/error/lost-race states, and no setup flash after an owner exists.
  - Contract tests for every new runtime-validated payload.
- Broad supporting gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm audit --audit-level=high` on the exact candidate.
- Deterministic E2E: update the production-path fixture to begin with empty security state, create the owner through the browser, enter the workspace, then prove logout/reload returns to sign-in and setup cannot replace the credential; retain desktop and 390×844 coverage.
- Storybook/rendered UI: add and inspect setup default, mismatch/policy error, pending, server error, and existing-owner/sign-in states at desktop and mobile; run `pnpm test:storybook`.
- Live-provider or external-service playtests: not applicable.
- Manual UI confirmation: user completes first-owner browser setup against a disposable fresh state, then signs out/reloads and confirms only sign-in remains.
- Debug/log inspection: inspect server and browser logs/network payloads during setup to confirm no password or hash disclosure and no unexpected workspace request before authentication.

## Decisions

- Add `AMD-001/S3` rather than expanding S1.
- Use a dedicated typed bootstrap/setup boundary rather than overloading login.
- Permit first claim from the configured application origin within the documented trusted private-network posture.
- Keep CLI setup and reset paths.
- Treat a committed credential as durable if session establishment or response delivery fails; recover through normal sign-in.
- No ADR or separate design-planning pass is required for this bounded adapter change.

## Risks / Trade-Offs

- Any browser that can reach an unclaimed host at its allowed origin can win the first claim. Documentation and private-network placement are required until a stronger bootstrap factor is planned.
- A binary setup-versus-login state is observable before authentication. It is the minimum disclosure required for the UI and must not grow into owner, session, or workspace metadata.
- Concurrent setup and session establishment cross persistence and auth boundaries. Losing requests must never inherit the winner's authority or replace the credential.
- Client-side confirmation improves safety but cannot replace server-side password-policy enforcement.
