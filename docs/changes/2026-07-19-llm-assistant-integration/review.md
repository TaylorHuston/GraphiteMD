# Review: LLM Assistant Integration

## Verdict

changes-requested

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts and status | pass | Valid Change is `in_review`; proposal, design, tasks, Epic, ADR, README, and changelog are reconciled. |
| Requirements and traceability | pass | GMD-004 S2 maps the model-policy, provenance, conversation, and Context surfaces. |
| Code and security review | pass after remediation | Request-scoped model runner, exact registered policy/descriptor checks, single-run enforcement, and no fabricated turns. |
| Tests and supporting gates | pass | Full unit suite, typecheck, lint, build, Storybook, foundation E2E, audit, and SDD validation pass. |
| Rendered UI verification | partial | Authenticated desktop disconnected Context was directly inspected; connected and narrow Context states remain unverified. |
| Manual UI confirmation | pending | Owner confirmation is not yet supplied. |
| Branch readiness | not ready | Required deterministic route/Pi and rendered-browser evidence remain open; no merge/PR action is authorized. |

## Findings

### BLOCKING

- [ ] External verification: a live connected Codex question against a uniquely identifiable workspace note is still required before release acceptance.

### REQUIRED

- [ ] `apps/server/start/routes.ts` / `apps/server/app/assistant/index.ts` - Add deterministic authenticated question-route coverage and a Pi allowlist characterization proving restricted session construction, custom-tool admission, and disposal.
- [ ] `apps/web/src/AssistantContext.tsx` - Directly inspect the connected/busy/error/source Context flow at 390px and verify browser-session expiry returns to login without focus or content leakage.

### SUGGESTION

- [ ] Storybook/E2E - Add Assistant-specific fixtures and a production browser journey when a deterministic server fake-runtime seam is introduced.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `pnpm test` | full automated suite | GMD-004/S2 | pass | 12 contracts, 15 SDK, 38 workspace, 90 server, 61 web, and bundled plugin tests pass. |
| `pnpm typecheck && pnpm lint` | supporting gate | GMD-004/S2 | pass | Repository type and static checks pass. |
| `pnpm build && pnpm build-storybook && pnpm test:storybook && pnpm test:e2e` | production/supporting gate | GMD-004/S2 R4 | pass | Production build, 30 Storybook interactions, and foundation desktop/narrow E2E pass. Storybook reports a pre-existing React `act` warning. |
| `pnpm audit --audit-level high` and `sdd validate graphitemd --change 2026-07-19-llm-assistant-integration --json` | security/artifact gate | Change | pass | No known high vulnerabilities; SDD validation has zero errors or warnings. |
| Authenticated Vite Context drawer inspection | rendered UI | GMD-004/S2 R4 | partial | Desktop disconnected Assistant contribution and Settings handoff render without console/overlay errors. |

## Rendered UI Verification

| Surface | Viewport | State | Result |
|---|---|---|---|
| Context drawer | desktop | authenticated, Codex disconnected | pass |
| Context drawer | desktop | connected/busy/answer/error/source | pending deterministic or live provider |
| Context drawer | 390px | drawer/focus/overflow/session expiry | pending |

## Review Bundle

- Source branch/ref: `change/llm-assistant-integration`
- Reviewed source commit: `8990b64`
- Target branch/ref: `develop`
- Merge base: `4b2873ff074518e6cb5defd1434d3c0a848886f1`
- Conflict check: `git merge-tree --write-tree develop HEAD` passed before remediation; no conflicting files were introduced by the remediation scope.
- Dirty state: user-owned `apps/web/src/styles.css` remains unstaged and untouched.
- Branch policy: no push, PR, merge, or closeout was performed.

## Consolidated Remediation

- Resolved: follow-up conversation collision, activation-time model work, unbound model policy, incomplete descriptor checks, fabricated terminal turns, missing busy announcement, and unnamed retry path.
- Open: deterministic production route/Pi coverage, connected live playtest, narrow Context inspection, and browser session-expiry journey.

## Review Log

- 2026-07-20: Independent review completed; safe remediation committed as `8990b64`; verdict remains `changes-requested` for recorded external verification gaps.
