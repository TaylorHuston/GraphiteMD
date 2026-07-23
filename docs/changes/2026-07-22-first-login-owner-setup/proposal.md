# Proposal: First Login Owner Setup

## Why

A fresh AnthraciteMD host currently presents the normal sign-in screen even when no owner account exists. The browser cannot complete that state, so the operator must discover and run `owner:setup` from the host CLI before the first login. That hidden prerequisite makes a healthy fresh installation look inaccessible and makes disposable or newly moved development state feel like a password reset.

## What Changes

When no owner exists, the browser will present a first-run owner setup form instead of the normal sign-in form. The owner will enter and confirm a password that satisfies the existing password policy. The authoritative service will create the single owner only if the host is still unclaimed, establish the normal protected browser session, and open the workspace.

The first-claim route will remain limited to configured application origins and the existing private-network deployment posture. It will apply CSRF protection, bounded request handling, atomic create-only-if-absent behavior, and minimal state disclosure. Once an owner exists, the browser setup path will be permanently unavailable for that security state and will direct the browser to sign in. The existing `owner:setup` command remains an alternative initial setup path, and `owner:reset` remains the host-local recovery path.

## Target Repositories

- This repository (role: canonical-app).

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- `docs/epics/amd-001-secure-workspace-access/`

The Epic update adds browser-first owner establishment to the outcome and current scope, adds Story `AMD-001/S3`, and reconciles S1 wording so the CLI is an alternative first-setup path rather than the only initial path.

## Epic Story Changes

- Add `AMD-001/S3` — **Set Up A Fresh Host From The Browser** — as a separately releasable onboarding path with discovery, atomic owner creation, request protection, concurrency, and recovery behavior.
- Preserve `AMD-001/S1/R1` and its CLI setup Scenarios as an alternative initial setup path. Do not repurpose the CLI as a prerequisite for S3.
- Preserve `AMD-001/S2` host-local reset as the recovery path after an owner exists.
- Update the Epic Story Index, outcome, current scope, cross-Story concerns, and implementation/verification gaps when S3 is implemented.

## Scope Decisions

- Confirmed:
  - A browser at the configured AnthraciteMD application origin can establish the first owner when the authoritative security state has no owner.
  - The setup form requires password confirmation and explains the existing password policy.
  - Exactly one concurrent setup attempt can create the owner; no browser setup request can replace an existing credential.
  - A successful setup establishes the same regenerated, generation-bound session used by normal login.
  - The browser exposes only the minimum state needed to choose setup versus sign-in and never reveals workspace content before authentication.
  - CLI setup and reset remain supported.
- Deferred:
  - Public signup, multiple owners, invitations, email recovery, passkeys, OAuth identity, and managed public-internet onboarding.
  - A separate pairing code, setup token, or loopback-only claim step.
  - Password-strength scoring beyond the existing byte-length policy.
- Assumptions:
  - The initial supported deployment remains a trusted private network with an exact configured application origin, as defined by the PRD and README.
  - The first browser to complete setup on an unclaimed reachable host becomes the owner; operators must not expose an unclaimed host to an untrusted network.
  - Existing application auth-panel and password-form conventions are sufficient to plan the UI without a separate experience-design convergence pass.
- User decisions that shaped the Story/Requirement split:
  - The owner password must be set through the UI on first login when none exists, without requiring the CLI method.
  - This is a distinct browser onboarding workflow, so it is planned as `AMD-001/S3` instead of enlarging the already broad S1 authentication Story.

## Change Folder

- Planned location: promoted; private draft removed
- Active location: `docs/changes/2026-07-22-first-login-owner-setup/`
- Closed location: `docs/changes/closed/2026-07-22-first-login-owner-setup/`

## Impact

- Product: removes the CLI prerequisite from normal first-run browser onboarding while preserving host recovery.
- Code: adds a typed bootstrap/setup boundary, authoritative server routing and concurrency/error handling, and a browser setup state integrated with the current auth loader.
- Tests: adds service/HTTP concurrency and request-protection proof, web interaction and accessibility proof, Storybook setup states, and production E2E that begins with empty security state.
- Docs: updates README setup/self-hosting guidance and AMD-001 durable truth during Apply.
- ADRs: no new ADR is planned; the behavior stays within the accepted service-first, single-owner, private-network authority model.

## Release Communication Impact

- Required: yes
- Record / section: `README.md` Local Development and Self-Hosting Boundary
- Public summary: Fresh installations can create the first owner password in the browser; host-local setup and reset commands remain available.

## Open Questions

- None block implementation. A setup token or loopback-only claim becomes a new planning decision if the deployment posture expands beyond trusted private networks.
