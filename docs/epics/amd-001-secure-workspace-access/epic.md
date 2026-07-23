---
schema: sdd-epic-v2
id: AMD-001
status: draft
created: 2026-07-18
modified: 2026-07-22
last_verified: 2026-07-22
stories:
  - S1
  - S2
---

# AMD-001 Secure Workspace Access

## Product Context

- PRD: Private AnthraciteMD Product Brief / PRD resolved through SDD workspace topology.
- Related Epic: [AMD-002 Markdown Workbench](../amd-002-markdown-workbench/epic.md)
- Related ADR: [Service-First Web Architecture](../../adrs/2026-07-18-service-first-web-architecture.md)

AnthraciteMD runs where the user's files live and is accessed from other browsers over a private network. Network placement alone is not sufficient protection for private notes, credentials, and eventual agent authority, so the first hosted slice needs a built-in single-owner account and recoverable sessions.

## Outcome

A self-hosting owner will be able to establish one local AnthraciteMD account from a fresh browser or the host CLI, sign in securely from an authorized browser, reconnect without restarting service-owned work, change the password, and recover access from the host machine without email or an external identity provider.

## Current Scope

- Browser-first and host-local initial owner setup, plus host-local password reset.
- Same-site browser login, logout, current-session restoration, and password change.
- Secure cookie sessions, session fixation protection, CSRF protection, exact origin checks, and invalidation of prior sessions after password changes or resets.
- Machine-local security state outside the workspace content tree.

## Deferred Scope

- Public signup, multiple users, teams, roles, invitations, and tenant isolation.
- Email recovery, passkeys, OAuth identity providers, and trusted reverse-proxy identity.
- Public-internet hosting posture and untrusted-device administration.
- Multiple simultaneously active AnthraciteMD workspaces.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|
| `trusted-proxy-auth` | deferred | As an operator, I want to delegate identity to a trusted private-network proxy, so that I can use existing infrastructure without a second login. | Explicit trusted-header boundary, replay protection, and local recovery remain available. |
| `multi-user-access` | deferred | As a workspace owner, I want separate user identities and permissions, so that I can share a hosted workspace safely. | Actor-specific authorization, audit, and data ownership are defined. |

## Story Index

| Story | Implementation | Verification | Capability | Last Verified | Notes |
|---|---|---|---|---|---|
| S1 | implemented | partial | Establish an owner account and authenticate a browser session. | 2026-07-22 | Host-local setup, generation-bound browser sessions, compatible configuration/state migration, XSRF enforcement, and exact credentialed origins are implemented; terminal masking awaits manual confirmation. |
| S2 | implemented | partial | Maintain and recover access without weakening session boundaries. | 2026-07-19 | Password maintenance, owner-facing change form, cross-process global revocation, host reset, and reconnect boundaries are implemented; manual host/browser confirmation remains. |
| S3 | partial | partial | Set up a fresh host from the browser. | 2026-07-22 | The minimal typed setup-versus-login discovery boundary is implemented and HTTP-tested; browser presentation and owner-creation mutation remain in progress. |

## Stories

### Story S1: Establish And Authenticate The Owner Account

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-22
Last verified: 2026-07-22

As a self-hosting owner, I want to establish one account and sign in from my browser, so that my workspace is protected even on a private network.

#### Requirements And Scenarios

##### Requirement R1: Host-Local Owner Setup

The system SHALL provide an interactive host-local setup command that creates the only owner account without placing password material in workspace files, process arguments, logs, or shell history.

###### Scenario R1-S1: Establish The First Owner

- WHEN an operator runs initial owner setup on a host with no account
- THEN the command prompts for and confirms the password without echoing it
- AND stores only an approved password hash in machine-local security state
- AND reports that the account is ready without printing the password or hash.

###### Scenario R1-S2: Existing Owner Is Preserved

- WHEN initial owner setup runs after an account already exists
- THEN the command refuses to replace the account
- AND directs the operator to the explicit reset command.

##### Requirement R2: Browser Session Authentication

The system SHALL authenticate valid owner credentials into a regenerated secure cookie session and protect authenticated application routes.

###### Scenario R2-S1: Valid Login Establishes A Session

- WHEN the owner submits valid credentials from an allowed application origin
- THEN AnthraciteMD regenerates the session identifier
- AND returns the authenticated workspace shell without exposing password or session material to the client bundle.

###### Scenario R2-S2: Invalid Login Fails Generically

- WHEN a browser submits an unknown account or incorrect password
- THEN AnthraciteMD returns the same generic authentication failure
- AND does not establish an authenticated session.

###### Scenario R2-S3: Logout Invalidates The Current Session

- WHEN the authenticated owner logs out
- THEN the current session is invalidated server-side
- AND later use of its cookie cannot access protected routes.

##### Requirement R3: Browser Request Protection

The system SHALL accept credentialed browser requests only from configured exact origins and require CSRF proof for state-changing requests.

###### Scenario R3-S1: Missing CSRF Proof Is Rejected

- WHEN an authenticated browser sends a state-changing request without valid CSRF proof
- THEN the service rejects the request
- AND canonical workspace or security state remains unchanged.

###### Scenario R3-S2: Untrusted Origin Is Rejected

- WHEN a credentialed request originates outside the configured exact origin set
- THEN the service rejects it without granting cross-origin access
- AND wildcard credentialed CORS is never used.

##### Requirement R4: Rebrand Compatibility And Secure State Transition

The system SHALL prefer canonical AnthraciteMD configuration, safely migrate implicit machine-local security state, and reject former browser-session identities without losing owner or provider credentials.

###### Scenario R4-S1: Canonical Configuration Wins

- WHEN canonical and legacy environment names are evaluated
- THEN `ANTHRACITEMD_*` values win by presence and `GRAPHITEMD_*` values are fallback only
- AND an invalid canonical value fails visibly instead of silently using a valid legacy value.

###### Scenario R4-S2: Implicit Security State Migrates Safely

- WHEN only safe implicit `~/.graphitemd` machine state exists outside the configured workspace
- THEN it atomically becomes `~/.anthracitemd` with owner credentials and provider files preserved
- AND conflicts, symlinks, or workspace-local placement fail before mutation while explicit state overrides remain exact.

###### Scenario R4-S3: Former Sessions Require Sign-In Again

- WHEN persisted security state or a browser carries the former session identity
- THEN legacy authenticated sessions and the former cookie name cannot authenticate
- AND the preserved owner can establish a new `anthracitemd_session` normally.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S1/R1 | `apps/server/app/security/owner_setup_service.ts#createOwner` | primary | Creates the single owner credential. |
| S1/R2 | `apps/server/app/security/owner_setup_service.ts#authenticate` | primary | Authenticates owner credentials and session revocation generation. |
| S1/R3-S1 | `apps/server/config/shield.ts#csrf` | primary | Governs CSRF protection. |
| S1/R3-S2 | `apps/server/config/cors.ts#configuredOrigins` | primary | Governs exact credentialed origins. |
| S1/R4-S1 | `apps/server/config/environment.ts#anthraciteEnvironmentValue` and `apps/web/vite.config.ts#configuredPort` | primary | Governs canonical configuration precedence and legacy fallback across service and development-client configuration. |
| S1/R4-S2 | `apps/server/app/security/owner_setup_service.ts#migrateImplicitSecurityStateDirectory` | primary | Governs confined implicit machine-state migration and preservation. |
| S1/R4-S3 | `apps/server/app/security/owner_setup_service.ts#AUTH_REVOCATION_GENERATION_SESSION_KEY` and `apps/server/config/session.ts#cookieName` | primary | Rotates persisted session payload and browser cookie identity. |

#### Implementation Gaps

- None.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1 | `apps/server/tests/security/owner_setup_service.test.ts#R1-S1 stores only a password hash in machine-local security state` | Initial owner storage. | passing |
| S1/R1-S2 | `apps/server/tests/security/owner_setup_service.test.ts#R1-S2 refuses to overwrite an existing owner` | Existing owner preservation. | passing |
| S1/R2-S1 | `apps/server/tests/http/authentication.test.ts#R2-S1 establishes an official server-owned session and protects workspace delivery` | Valid login. | passing |
| S1/R2-S2 | `apps/server/tests/http/authentication.test.ts#R2-S2 returns the same generic response and no authenticated session for unknown and incorrect credentials` | Generic failed login. | passing |
| S1/R2-S3 | `apps/server/tests/http/authentication.test.ts#R2-S3 destroys the server-side session so replaying its cookie remains unauthorized` | Logout invalidation. | passing |
| S1/R3-S1 | `apps/server/tests/http/authentication.test.ts#R3-S1 rejects a state-changing authenticated request without XSRF proof and accepts valid proof` | CSRF enforcement. | passing |
| S1/R3-S2 | `apps/server/tests/http/authentication.test.ts#R3-S2 grants credentialed CORS only to an exact configured origin` | Exact CORS enforcement. | passing |
| S1/R4-S1 | `apps/server/tests/config/environment.test.ts#R4-S1 gives canonical configuration precedence` and `apps/web/vite.config.test.ts#R4-S1 prefers canonical values and rejects an invalid canonical port` | Canonical presence wins and invalid canonical values are not masked by legacy fallback. | passing |
| S1/R4-S2 | `apps/server/tests/security/owner_setup_service.test.ts#AMD-001/S1 R4-S2 atomically migrates the implicit machine state and preserves provider files`, `apps/server/tests/security/owner_setup_service.test.ts#AMD-001/S1 R4-S2 fails closed when %s`, `apps/server/tests/security/owner_setup_service.test.ts#AMD-001/S1 R4-S2 keeps explicit state overrides exact`, and `apps/server/tests/security/owner_setup_service.test.ts#AMD-001/S1 R4-S2 rejects unsafe implicit placement before migrating legacy state` | Safe migration preserves credentials/provider state; conflicts, symlinks, and unsafe placement do not mutate; explicit paths remain exact. | passing |
| S1/R4-S3 | `apps/server/tests/security/owner_setup_service.test.ts#R2-S1 upgrades legacy owner/session tables before installing generation guards` and `apps/server/tests/http/authentication.test.ts#AMD-001/S1 R4-S3 rejects the former browser cookie identity` | Legacy authenticated sessions are removed, Anthracite generation guards are installed, and the former cookie cannot authenticate. | passing |

#### Verification Gaps

- `S1/R1-S1`: Real terminal masking/no-echo behavior still needs manual confirmation; automated coverage proves the adapter calls AdonisJS's documented secure prompt seam.

#### Story Notes

- The foundation plan uses AdonisJS v7's official session guard, Auth session regeneration, Shield CSRF protection, and exact credentialed CORS configuration rather than inventing a custom session protocol.
- Production cookies require HTTPS. Loopback development may use an explicit development-only exception.

### Story S2: Maintain And Recover Access

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-22
Last verified: 2026-07-19

As the workspace owner, I want to change or recover my password and reconnect safely, so that losing a credential or closing a browser does not require replacing my workspace.

#### Requirements And Scenarios

##### Requirement R1: In-App Password Change

The system SHALL let the authenticated owner change the password after proving the current password and SHALL invalidate all existing sessions.

###### Scenario R1-S1: Correct Current Password Changes Access

- WHEN the owner supplies the correct current password and a valid replacement
- THEN the password hash is replaced atomically
- AND all previous sessions are invalidated
- AND the owner must authenticate with the replacement password.

###### Scenario R1-S2: Incorrect Current Password Preserves Access

- WHEN the owner supplies an incorrect current password
- THEN the change is rejected generically
- AND the existing password and sessions remain unchanged.

##### Requirement R2: Host-Local Password Reset

The system SHALL provide an interactive host-local reset command that replaces the owner password and invalidates every session without requiring email or network access.

###### Scenario R2-S1: Operator Resets A Forgotten Password

- WHEN an operator with host access completes the reset command
- THEN the new password hash is stored atomically
- AND every existing session is invalidated
- AND the next successful login requires the new password.

###### Scenario R2-S2: Interrupted Reset Preserves The Old Credential

- WHEN the reset command is cancelled or fails before commit
- THEN the previous password hash remains valid
- AND no partial replacement or plaintext credential remains.

##### Requirement R3: Session Reconnection

The system SHALL restore an authenticated browser from valid service-owned session state without binding application authority to the browser process.

###### Scenario R3-S1: Browser Reconnects To A Valid Session

- WHEN the owner closes or reloads a browser while its session remains valid
- THEN the browser can reconnect to the authenticated workspace shell
- AND no workspace files are copied to or made authoritative on the client.

###### Scenario R3-S2: Invalidated Session Returns To Login

- WHEN a browser reconnects with a session invalidated by logout, password change, reset, or expiry
- THEN protected APIs reject the session
- AND the browser returns to the login experience without exposing prior workspace content.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S2/R1 | `apps/server/app/security/owner_setup_service.ts#changePassword` | primary | Replaces a proven credential and revokes sessions. |
| S2/R2 | `apps/server/app/security/owner_setup_service.ts#resetPassword` | primary | Performs host-local recovery. |
| S2/R3-S1 | `apps/server/app/middleware/session_generation_middleware.ts#handle` | primary | Rejects stale persisted sessions. |
| S2/R3-S2 | `apps/web/src/App.tsx#App` | primary | Returns invalidated browser sessions to login. |

#### Implementation Gaps

- None for the currently accepted S2 behavior.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S2/R1-S1 | `apps/server/tests/http/access_maintenance.test.ts#R1-S1 requires the replacement password and invalidates every existing session` | Password change. | passing |
| S2/R1-S2 | `apps/server/tests/http/access_maintenance.test.ts#R1-S2 rejects an incorrect current password without changing credentials or sessions` | Incorrect-password preservation. | passing |
| S2/R2-S1 | `apps/server/tests/commands/reset_owner.test.ts#R2-S1 requires explicit confirmation and matching secure password prompts` | Confirmed reset. | passing |
| S2/R2-S2 | `apps/server/tests/security/owner_setup_service.test.ts#R2-S2 rolls back the credential when session invalidation fails before commit` | Interrupted reset rollback. | passing |
| S2/R3-S1 | `apps/server/tests/http/authentication.test.ts#R2-S1 rejects a persisted session whose bound credential generation is no longer current` | Valid-session reconnection. | passing |
| S2/R3-S2 | `apps/web/src/App.test.tsx#distinguishes an initial unauthenticated browser from an expired session` | Expired browser session state. | passing |

#### Verification Gaps

- `S2/R2`: Real terminal masking/no-echo behavior still needs manual confirmation; automated coverage proves the adapter uses AdonisJS's documented secure prompt seam.
- `S2/R3-S2`: Expired persisted-session rejection is not isolated in a real-HTTP test; logout, password-change, reset, and browser login-state paths are covered.

#### Story Notes

- Password hashes, session rows, and revocation state are machine-local security authority, not workspace content and not rebuildable search projections.

### Story S3: Set Up A Fresh Host From The Browser

Implementation: partial
Verification: partial
Created: 2026-07-22
Modified: 2026-07-22
Last verified: 2026-07-22

As a self-hosting owner opening a fresh AnthraciteMD installation, I want to create the first owner password in the browser, so that I can begin securely without running a host CLI command.

#### Requirements And Scenarios

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

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S3/R1 | `apps/server/start/routes.ts#/api/v1/auth/bootstrap` | primary | Exposes only the typed setup-required versus login-required state from authoritative owner existence. |
| S3/R1 | `apps/server/app/security/owner_setup_service.ts#hasOwner` | supporting | Reads the machine-local owner authority without exposing credential or workspace data. |
| S3/R1 | `packages/contracts/src/index.ts#AuthBootstrapResponse` | supporting | Defines the closed runtime contract used by browser clients. |

#### Implementation Gaps

- `S3/R1-S1`: The browser setup presentation is not implemented yet; only its server discovery boundary exists.
- `S3/R1-S2`: The browser sign-in choice based on claimed state is not implemented yet; only its server discovery boundary exists.
- `S3/R2`: Not implemented yet.
- `S3/R3`: Not implemented yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S3/R1-S1, S3/R1-S2 | `packages/contracts/src/index.test.ts#AMD-001/S3 R1 accepts only the binary bootstrap state` and `apps/server/tests/http/authentication.test.ts#R1-S1 and R1-S2 disclose only the required setup state` | The contract rejects extra state, a fresh host returns only `setup_required`, and a claimed host returns only `login_required`. | passing |

#### Verification Gaps

- `S3/R1-S1`: Rendered browser setup presentation remains unverified.
- `S3/R1-S2`: Rendered browser sign-in selection remains unverified.
- `S3/R2-S1` through `S3/R3-S2`: Not implemented or verified yet.

#### Story Notes

- S1's host-local setup command remains an alternative first-setup path; it is not a browser prerequisite.

## Cross-Story Concerns

- Authentication must be established before workspace APIs reveal note names, snippets, paths, or content.
- Production deployment must terminate HTTPS at the app or a documented trusted reverse proxy before secure cookies are enabled.
- Security-state backup and permissions must be documented separately from workspace backup.

## Open Decisions

- None block the foundation Change. Trusted reverse-proxy identity remains a later product decision.

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

- The browser is a client of service-owned authentication and workspace authority.
