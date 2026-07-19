---
schema: sdd-epic-v2
id: GMD-001
status: draft
created: 2026-07-18
modified: 2026-07-18
last_verified: 2026-07-18
stories:
  - S1
  - S2
---

# GMD-001 Secure Workspace Access

## Product Context

- PRD: Private GraphiteMD Product Brief / PRD resolved through SDD workspace topology.
- Related Epic: [GMD-002 Markdown Workbench](../gmd-002-markdown-workbench/epic.md)
- Related ADR: [Service-First Web Architecture](../../adrs/2026-07-18-service-first-web-architecture.md)

GraphiteMD runs where the user's files live and is accessed from other browsers over a private network. Network placement alone is not sufficient protection for private notes, credentials, and eventual agent authority, so the first hosted slice needs a built-in single-owner account and recoverable sessions.

## Outcome

A self-hosting owner will be able to establish one local GraphiteMD account, sign in securely from an authorized browser, reconnect without restarting service-owned work, change the password, and recover access from the host machine without email or an external identity provider.

## Current Scope

- Host-local initial owner setup and password reset.
- Same-site browser login, logout, current-session restoration, and password change.
- Secure cookie sessions, session fixation protection, CSRF protection, exact origin checks, and invalidation of prior sessions after password changes or resets.
- Machine-local security state outside the workspace content tree.

## Deferred Scope

- Public signup, multiple users, teams, roles, invitations, and tenant isolation.
- Email recovery, passkeys, OAuth identity providers, and trusted reverse-proxy identity.
- Public-internet hosting posture and untrusted-device administration.
- Multiple simultaneously active GraphiteMD workspaces.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|
| `trusted-proxy-auth` | deferred | As an operator, I want to delegate identity to a trusted private-network proxy, so that I can use existing infrastructure without a second login. | Explicit trusted-header boundary, replay protection, and local recovery remain available. |
| `multi-user-access` | deferred | As a workspace owner, I want separate user identities and permissions, so that I can share a hosted workspace safely. | Actor-specific authorization, audit, and data ownership are defined. |

## Story Index

| Story | Implementation | Verification | Capability | Last Verified | Notes |
|---|---|---|---|---|---|
| S1 | partial | partial | Establish an owner account and authenticate a browser session. | 2026-07-18 | Host-local setup and browser session authentication are implemented; request protection remains pending. |
| S2 | not implemented | unverified | Maintain and recover access without weakening session boundaries. |  | Foundation Change. |

## Stories

### Story S1: Establish And Authenticate The Owner Account

Implementation: partial
Verification: partial
Created: 2026-07-18
Modified: 2026-07-18
Last verified: 2026-07-18

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
- THEN GraphiteMD regenerates the session identifier
- AND returns the authenticated workspace shell without exposing password or session material to the client bundle.

###### Scenario R2-S2: Invalid Login Fails Generically

- WHEN a browser submits an unknown account or incorrect password
- THEN GraphiteMD returns the same generic authentication failure
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

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S1/R1 | `apps/server/app/security/owner_setup_service.ts#OwnerSetupService` | primary | Owns singleton owner creation, Scrypt hashing, machine-local SQLite persistence, and overwrite refusal. |
| S1/R1-S1 | `apps/server/commands/setup_owner.ts#runOwnerSetup` | adapter | Collects password and confirmation through secure prompt callbacks and emits credential-free operator messages. |
| S1/R1-S1 | `apps/server/commands/setup_owner.ts#SetupOwner` | adapter | Exposes the host-local `owner:setup` Ace command and resolves `GRAPHITEMD_STATE_DIR`. |
| S1/R2 | `apps/server/start/routes.ts` — `/api/v1/auth/login`, `/api/v1/auth/current`, `/api/v1/auth/logout` | primary | Validates the singleton owner credential and uses the official AdonisJS Auth session guard for regenerated login, current-owner checks, and server-side logout. |
| S1/R2 | `apps/server/config/auth.ts`; `apps/server/config/session.ts`; `apps/server/config/database.ts` | configuration | Configures the official session guard and persistent database session store in machine-local `security.sqlite` with HTTP-only SameSite cookies. |
| S1/R3 | Not implemented yet. | primary | Origin, cookie, and CSRF enforcement. |

#### Implementation Gaps

- `S1/R3`: GraphiteMD-specific origin and CSRF enforcement does not exist yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| `S1/R1-S1` | `apps/server/tests/security/owner_setup_service.test.ts`; `apps/server/tests/commands/setup_owner.test.ts` | Focused automated evidence proves the first owner is stored only as a verifiable Scrypt hash in permission-restricted `security.sqlite`, and the command adapter uses secure prompts without printing the password or hash. | Passing |
| `S1/R1-S2` | `apps/server/tests/security/owner_setup_service.test.ts`; `apps/server/tests/commands/setup_owner.test.ts` | Focused automated evidence proves an existing owner is preserved, setup refuses before prompting, and the operator is directed to explicit reset. | Passing |
| `S1/R2-S1` | `apps/server/tests/http/authentication.test.ts` — `R2-S1 establishes an official server-owned session and protects workspace delivery` | Real HTTP evidence proves login replaces an anonymous session identifier, returns only the public owner identity, and the resulting cookie reaches protected current-owner and workspace routes. | Passing 2026-07-18. |
| `S1/R2-S2` | `apps/server/tests/http/authentication.test.ts` — `R2-S2 returns the same generic response and no authenticated session for unknown and incorrect credentials` | Real HTTP evidence proves unknown-account and incorrect-password attempts return the same generic 401 body and cannot access the protected workspace route. | Passing 2026-07-18. |
| `S1/R2-S3` | `apps/server/tests/http/authentication.test.ts` — `R2-S3 destroys the server-side session so replaying its cookie remains unauthorized` | Real HTTP evidence proves logout destroys the persisted server session and replaying its old cookie cannot reach current-owner or workspace routes. | Passing 2026-07-18. |

#### Verification Gaps

- `S1/R1-S1`: Real terminal masking/no-echo behavior still needs manual confirmation; automated coverage proves the adapter calls AdonisJS's documented secure prompt seam.
- `S1/R3-S1`, `S1/R3-S2`: Not verified yet.

#### Story Notes

- The foundation plan uses AdonisJS v7's official session guard, Auth session regeneration, Shield CSRF protection, and exact credentialed CORS configuration rather than inventing a custom session protocol.
- Production cookies require HTTPS. Loopback development may use an explicit development-only exception.

### Story S2: Maintain And Recover Access

Implementation: not implemented
Verification: unverified
Created: 2026-07-18
Modified: 2026-07-18
Last verified:

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
| S2/R1 | Not implemented yet. | primary | Authenticated password-change transaction and invalidation. |
| S2/R2 | Not implemented yet. | primary | Host-local recovery command and atomic reset. |
| S2/R3 | Not implemented yet. | primary | Current-session query and reconnect behavior. |

#### Implementation Gaps

- `S2/R1`: In-app password change does not exist yet.
- `S2/R2`: Host-local password reset does not exist yet.
- `S2/R3`: Authenticated reconnect behavior does not exist yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|

#### Verification Gaps

- `S2/R1-S1`, `S2/R1-S2`: Not verified yet.
- `S2/R2-S1`, `S2/R2-S2`: Not verified yet.
- `S2/R3-S1`, `S2/R3-S2`: Not verified yet.

#### Story Notes

- Password hashes, session rows, and revocation state are machine-local security authority, not workspace content and not rebuildable search projections.

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
