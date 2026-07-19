---
schema: sdd-epic-v2
id: GMD-001
status: draft
created: 2026-07-18
modified: 2026-07-19
last_verified: 2026-07-19
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
| S1 | implemented | partial | Establish an owner account and authenticate a browser session. | 2026-07-19 | Host-local setup, generation-bound browser sessions, XSRF enforcement, and exact credentialed origins are implemented; terminal masking awaits manual confirmation. |
| S2 | implemented | partial | Maintain and recover access without weakening session boundaries. | 2026-07-19 | Password maintenance, owner-facing change form, cross-process global revocation, host reset, and reconnect boundaries are implemented; manual host/browser confirmation remains. |

## Stories

### Story S1: Establish And Authenticate The Owner Account

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-19
Last verified: 2026-07-19

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
| S1/R1 | `apps/server/app/security/owner_setup_service.ts#OwnerSetupService` | primary | Owns singleton owner creation, shared bounded UTF-8 password policy, Scrypt hashing, machine-local SQLite persistence, and overwrite refusal. |
| S1/R1, S1/R2 | `packages/domain/src/index.ts#acceptsPasswordInput` | primary | Owns the runtime-neutral UTF-8 byte policy shared by host commands and HTTP authentication before hashing. |
| S1/R1-S1 | `apps/server/commands/setup_owner.ts#runOwnerSetup` | adapter | Collects password and confirmation through secure prompt callbacks and emits credential-free operator messages. |
| S1/R1-S1 | `apps/server/commands/setup_owner.ts#SetupOwner` | adapter | Exposes the host-local `owner:setup` Ace command and resolves `GRAPHITEMD_STATE_DIR`. |
| S1/R2 | `apps/server/app/security/owner_setup_service.ts#OwnerSetupService.authenticate` | primary | Serializes password verification and immediate session persistence with in-process credential mutations, binds the issued session to the current revocation generation, and installs database write guards that reject stale-generation session inserts or updates. |
| S1/R2 | `apps/server/app/middleware/session_generation_middleware.ts#SessionGenerationMiddleware` | primary | Validates the generation bound to every persisted authenticated session before the Auth guard loads it and invalidates missing or stale-generation authority. |
| S1/R2 | `apps/server/start/routes.ts#ownerSetup` | primary | The owner-authentication routes reject out-of-policy inputs before hashing, validate the singleton credential generically, acquire an atomic attempt lease, and use the official AdonisJS Auth session guard for regenerated login, current-owner checks, and server-side logout. |
| S1/R2 | `apps/server/app/security/login_attempt_limiter.ts#LoginAttemptLimiter.acquire` | support | Atomically reserves in-flight attempts per source, applies the quiet period, expires idle sources, and bounds storage with non-in-flight LRU eviction without changing generic credential failures. |
| S1/R2 | `apps/server/config/auth.ts`; `apps/server/config/session.ts`; `apps/server/config/database.ts` | configuration | Configures the official session guard and persistent database session store in machine-local `security.sqlite` with HTTP-only SameSite cookies. |
| S1/R2 | `apps/server/config/encryption.ts#appKey` | configuration | Requires an operator-provided `APP_KEY` outside the explicit test environment; no known development fallback can start production encryption. |
| S1/R3-S1 | `apps/server/config/shield.ts#defineConfig` | primary | Enables official Shield CSRF enforcement for state-changing methods and its encrypted SPA XSRF cookie proof flow. |
| S1/R3-S2 | `apps/server/config/cors.ts#defineConfig` | primary | Restricts credentialed cross-origin responses to the exact origins supplied through `GRAPHITEMD_ALLOWED_ORIGINS`; never configures reflection or wildcard access. |

#### Implementation Gaps

- None.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| `S1/R1-S1` | `apps/server/tests/security/owner_setup_service.test.ts`; `apps/server/tests/commands/setup_owner.test.ts` | Focused automated evidence proves the first owner is stored only as a verifiable Scrypt hash in permission-restricted `security.sqlite`, and the command adapter uses secure prompts without printing the password or hash. | Passing |
| `S1/R1-S2` | `apps/server/tests/security/owner_setup_service.test.ts`; `apps/server/tests/commands/setup_owner.test.ts` | Focused automated evidence proves an existing owner is preserved, setup refuses before prompting, and the operator is directed to explicit reset. | Passing |
| `S1/R2-S1` | `apps/server/tests/http/authentication.test.ts` — `R2-S1 establishes an official server-owned session and protects workspace delivery` | Real HTTP evidence proves login replaces an anonymous session identifier, returns only the public owner identity, and the resulting cookie reaches protected current-owner and workspace routes. | Passing 2026-07-18. |
| `S1/R2-S1` | `apps/server/tests/http/authentication.test.ts` — stale session commit and bound-generation rejection cases | Real HTTP evidence forces credential rotation at the session-store write boundary, proves the stale write cannot authenticate or persist, and proves a previously persisted generation-mismatched session is rejected on replay. | Passing 2026-07-19. |
| `S1/R2-S2` | `apps/server/tests/http/authentication.test.ts` — `R2-S2 returns the same generic response and no authenticated session for unknown and incorrect credentials` | Real HTTP evidence proves unknown-account and incorrect-password attempts return the same generic 401 body and cannot access the protected workspace route. | Passing 2026-07-18. |
| `S1/R2-S1` | `apps/server/tests/security/owner_setup_service.test.ts` — serialized authentication and host-reset generation-change cases | Focused automated evidence proves an old-password login cannot survive an overlapping in-process password mutation and a session issued across an external generation change is rejected and cleaned up. | Passing 2026-07-18. |
| `S1/R2-S2` | `apps/server/tests/security/login_attempt_limiter.test.ts` — parallel reservation and bounded-LRU cases | Focused automated evidence proves parallel attempts cannot bypass the threshold and idle source tracking expires or evicts without displacing in-flight reservations. | Passing 2026-07-18. |
| `S1/R1-S1`, `S1/R2-S2` | `apps/server/tests/security/owner_setup_service.test.ts` — `applies one UTF-8 byte policy`; `apps/server/tests/security/login_attempt_limiter.test.ts` | Focused automated evidence proves setup/change/reset share one 12–1024-byte policy, login rejects oversized input before Scrypt, and repeated failures are bounded per source with success/quiet-period recovery. | Passing 2026-07-18. |
| `S1/R2-S1` | Production build import check with `APP_KEY` unset and `NODE_ENV=production`; production build inventory assertion | Deterministic command evidence proves encryption configuration fails closed without `APP_KEY` and server test sources are absent from production output. | Passing 2026-07-18. |
| `S1/R2-S3` | `apps/server/tests/http/authentication.test.ts` — `R2-S3 destroys the server-side session so replaying its cookie remains unauthorized` | Real HTTP evidence proves logout destroys the persisted server session and replaying its old cookie cannot reach current-owner or workspace routes. | Passing 2026-07-18. |
| `S1/R3-S1` | `apps/server/tests/http/authentication.test.ts` — `R3-S1 rejects a state-changing authenticated request without XSRF proof and accepts valid proof` | Real HTTP evidence proves missing and invalid XSRF proof reject logout without invalidating the session, while the official cookie/header proof permits the same mutation. | Passing 2026-07-18. |
| `S1/R3-S2` | `apps/server/tests/http/authentication.test.ts` — `R3-S2 grants credentialed CORS only to an exact configured origin` | Real HTTP evidence proves an exact configured origin receives its own ACAO value plus credential permission, while a near-match untrusted credentialed origin receives no ACAO and wildcard access is absent. | Passing 2026-07-18. |
| `S1/R2`, `S1/R3` | `tests/e2e/foundation.spec.ts` — desktop owner path | Deterministic real-browser evidence proves XSRF-protected login establishes the service session and reaches the protected workspace through the Vite/Adonis production path. | Passing 2026-07-18. |

#### Verification Gaps

- `S1/R1-S1`: Real terminal masking/no-echo behavior still needs manual confirmation; automated coverage proves the adapter calls AdonisJS's documented secure prompt seam.

#### Story Notes

- The foundation plan uses AdonisJS v7's official session guard, Auth session regeneration, Shield CSRF protection, and exact credentialed CORS configuration rather than inventing a custom session protocol.
- Production cookies require HTTPS. Loopback development may use an explicit development-only exception.

### Story S2: Maintain And Recover Access

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-19
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
| S2/R1 | `apps/server/app/security/owner_setup_service.ts#changePassword` | primary | Proves the current credential, atomically swaps the hash and revocation generation, deletes all persisted sessions, and forces the caller to sign in again. |
| S2/R1, S2/R3-S2 | `apps/web/src/SettingsPanel.tsx#SettingsPanel` | presentation | Collects the current and confirmed replacement credentials, submits them with CSRF protection, offers XSRF-protected logout, and delegates both exits through the workbench draft/in-flight transition guard before returning to sign-in. |
| S2/R1, S2/R3 | `packages/contracts/src/index.ts`; `apps/web/src/api.ts#requestJson` | support | Runtime-validates successful owner and error response envelopes before authentication or Settings state changes. |
| S2/R1, S2/R2 | `apps/server/app/security/owner_setup_service.ts#OwnerSetupService.authenticate` | support | Commits generation-bound session issuance before releasing credential coordination and rejects stale-generation session writes even when host reset runs in another process. |
| S2/R1, S2/R2, S2/R3 | `apps/server/app/middleware/session_generation_middleware.ts#SessionGenerationMiddleware` | primary | Rechecks persisted session generation on every authenticated request so password change/reset authority survives process and middleware timing boundaries. |
| S2/R2 | `apps/server/app/security/owner_setup_service.ts#OwnerSetupService.resetPassword` | primary | Atomically replaces the host-owned credential and invalidates all persisted sessions with rollback on failure. |
| S2/R2 | `apps/server/commands/reset_owner.ts#runOwnerReset`; `apps/server/commands/reset_owner.ts#ResetOwner` | adapter | Exposes explicit confirmation and secure matching prompts through the host-local `owner:reset` Ace command without logging credential material. |
| S2/R3 | `apps/server/start/routes.ts#ownerSetup` | primary | The current-owner route restores valid service-owned sessions and normalizes rejected reconnects into the login experience without making browser state authoritative. |

#### Implementation Gaps

- None for the currently accepted S2 behavior.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| `S2/R1-S1` | `apps/server/tests/security/owner_setup_service.test.ts`; `apps/server/tests/http/access_maintenance.test.ts` — `R1-S1 requires the replacement password and invalidates every existing session` | Focused service and disposable real-HTTP evidence proves atomic hash replacement, global persisted-session invalidation, forced re-login, rejection of the old credential, and acceptance of the replacement. | Passing 2026-07-18. |
| `S2/R1-S2` | `apps/server/tests/http/access_maintenance.test.ts` — `R1-S2 rejects an incorrect current password without changing credentials or sessions` | Disposable real-HTTP evidence proves the generic rejection leaves both the established session and prior credential valid without accepting the proposed replacement. | Passing 2026-07-18. |
| `S2/R1-S1`, `S2/R1-S2` | `apps/web/src/SettingsPanel.test.tsx` — `GMD-001/S2 R1 changes a confirmed password and returns to sign in`; `rejects mismatched confirmation locally without transmitting credentials` | Browser-component evidence proves the Settings form submits only a confirmed replacement with the CSRF token, avoids transmitting a mismatched confirmation, and returns to sign-in after successful global invalidation. | Passing 2026-07-18. |
| `S2/R1-S1`, `S2/R3-S2` | `apps/web/src/SettingsPanel.test.tsx` — malformed password-change/logout response cases; `apps/web/src/api.test.ts` | Browser evidence proves malformed successful owner responses fail closed with recoverable feedback while logout network failure remains visible without discarding the workbench. | Passing 2026-07-19. |
| `S2/R3-S2` | `apps/web/src/App.test.tsx` — initial-versus-expired authentication and guarded logout cases; `tests/e2e/foundation.spec.ts` — narrow Settings logout | Component and production-browser evidence prove a fresh unauthenticated browser gets an honest login prompt, later invalidation is labeled expired, and logout uses XSRF only after dirty/in-flight transition approval. | Passing 2026-07-18. |
| `S2/R1-S1`, `S2/R2-S1` | `apps/server/tests/security/owner_setup_service.test.ts` — serialized authentication and host-reset generation-change cases | Focused automated evidence proves overlapping password mutation prevents old-password session survival and an external reset generation change rejects and cleans up a just-issued session. | Passing 2026-07-18. |
| `S2/R1-S1`, `S2/R2-S1`, `S2/R3-S2` | `apps/server/tests/http/authentication.test.ts` — stale session commit and bound-generation rejection cases; `apps/server/tests/security/owner_setup_service.test.ts` — legacy security database migration | Real HTTP and compatibility evidence proves deferred/cross-process persistence cannot resurrect a revoked session, replayed stale generations fail closed, and existing owner/session tables gain the generation column plus write guards without losing access. | Passing 2026-07-19. |
| `S2/R2-S1` | `apps/server/tests/commands/reset_owner.test.ts`; `apps/server/tests/http/access_maintenance.test.ts` — `R2-S1 resets the credential and invalidates every persisted session` | Command-adapter and disposable real-HTTP evidence proves explicit host confirmation, matching secure prompts, atomic reset, global invalidation, and next login with only the recovered credential. | Passing 2026-07-18. |
| `S2/R2-S2` | `apps/server/tests/commands/reset_owner.test.ts`; `apps/server/tests/security/owner_setup_service.test.ts` — `R2-S2 rolls back the credential when session invalidation fails before commit` | Focused evidence proves cancel and confirmation mismatch perform no write, while an injected failure during session revocation rolls back the credential replacement. | Passing 2026-07-18. |
| `S2/R3-S1` | `apps/server/tests/http/authentication.test.ts` — `R2-S1 establishes an official server-owned session and protects workspace delivery` | Disposable real-HTTP evidence proves the same persisted cookie reconnects to current-owner and workspace APIs while the response omits the host workspace path. | Passing 2026-07-18. |
| `S2/R3-S2` | `apps/server/tests/http/authentication.test.ts`; `apps/server/tests/http/access_maintenance.test.ts`; `apps/web/src/App.test.tsx` — `distinguishes an initial unauthenticated browser from an expired session`; `returns a note-read 401 to the expired-session login state` | HTTP evidence proves logout, password change, and host reset reject replayed cookies generically; browser-component evidence distinguishes a fresh login from later invalidation and returns rejected note reads to login without prior workspace content. | Passing with gap 2026-07-18. |
| `S2/R1`, `S2/R3` | `tests/e2e/foundation.spec.ts` — password rotation and second-session invalidation | Deterministic real-browser evidence proves an owner changes the credential, all existing sessions are invalidated, and only the replacement credential reconnects. | Passing 2026-07-18. |

#### Verification Gaps

- `S2/R2`: Real terminal masking/no-echo behavior still needs manual confirmation; automated coverage proves the adapter uses AdonisJS's documented secure prompt seam.
- `S2/R3-S2`: Expired persisted-session rejection is not isolated in a real-HTTP test; logout, password-change, reset, and browser login-state paths are covered.

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
