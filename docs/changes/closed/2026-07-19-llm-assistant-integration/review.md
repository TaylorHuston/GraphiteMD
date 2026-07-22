# Review: LLM Assistant Integration

## Verdict

ready

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts and status | pass | Valid Change is `in_review`; proposal, design, tasks, Epic, ADR, README, and changelog are reconciled. |
| Requirements and traceability | pass | GMD-004 S2 maps the model-policy, provenance, conversation, and Context surfaces. |
| Code and security review | pass after remediation | Request-scoped model runner, exact registered policy/descriptor checks, single-run enforcement, and no fabricated turns. |
| Tests and supporting gates | pass | Full unit suite, typecheck, lint, build, Storybook, production-built E2E, audit, and SDD validation pass. |
| Rendered UI verification | pass | Deterministic production-browser coverage exercises desktop containment plus connected narrow answer/source/long-content/focus/session-expiry states. |
| Manual UI confirmation | pass | Owner completed a live connected Codex question against the disposable test vault and confirmed the flow works. |
| Branch readiness | ready | All review evidence is accepted; the owner authorized local merge and closeout. |

## Findings

No blocking or required findings remain.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `pnpm test` | full automated suite | GMD-004/S2 | pass | 12 contracts, 15 SDK, 38 workspace, 92 server, 61 web, and bundled plugin tests pass. |
| `pnpm typecheck && pnpm lint` | supporting gate | GMD-004/S2 | pass | Repository type and static checks pass. |
| `pnpm build`, `pnpm build-storybook`, `pnpm test:storybook`, and `pnpm test:e2e` | production/supporting gate | GMD-004/S2 R4 | pass | Production build, 30 Storybook interactions, and two production-browser E2E checks pass. Storybook reports a pre-existing React `act` warning. |
| `pnpm audit --audit-level high` and `sdd validate graphitemd --change 2026-07-19-llm-assistant-integration --json` | security/artifact gate | Change | pass | No known high vulnerabilities; SDD validation has zero errors or warnings. |
| `tests/e2e/foundation.spec.ts` with a production-built server | rendered UI | GMD-004/S2 R4 | pass | Desktop Context containment plus a 390px connected busy/error/retry/answer/source/long-content/focus/session-expiry journey pass with no horizontal overflow. |
| `apps/server/tests/http/authentication.test.ts` and `apps/server/app/assistant/pi_runtime_boundary.test.ts` | deterministic boundary | GMD-004/S2 R1-R3 | pass | Authenticated XSRF dispatch persists canonical provenance, while Pi session construction admits only the declared custom tool and always disposes. |
| Owner-connected Codex playtest, `Welcome.md` | live provider/manual acceptance | GMD-004/S2 R1-R4 | pass | The real `openai-codex` `gpt-5.4` session completed a grounded turn with a `Welcome.md` service-derived source. Canonical state, file permissions, and sanitized service logs were inspected. |

## Rendered UI Verification

| Surface | Viewport | State | Result |
|---|---|---|---|
| Context panel | desktop | authenticated, deterministic connected composer/containment | pass |
| Context drawer | 390px | deterministic answer/source/long content/focus/session expiry | pass |
| Context drawer | live provider | connected Codex answer/source/canonical record | pass |

## Review Bundle

- Source branch/ref: `change/llm-assistant-integration`
- Reviewed source commit: `000824384a1dd3a3f81f384b88b3999937146089`
- Target branch/ref: `develop`
- Merge base: `4b2873ff074518e6cb5defd1434d3c0a848886f1`
- Conflict check: `git merge-tree --write-tree develop HEAD` passed for the reviewed branch after remediation.
- Dirty state: clean at the reviewed candidate.
- Branch policy: the review itself performed no push, PR, merge, or closeout; the owner subsequently authorized local merge and closeout as recorded in `tasks.md`.

## Consolidated Remediation

- Resolved: follow-up conversation collision, activation-time model work, unbound model policy, incomplete descriptor checks, fabricated terminal turns, missing busy announcement, and unnamed retry path.
- Resolved in this review: deterministic production route/Pi coverage, connected/narrow Context inspection, long-content containment, focus restoration, and browser session-expiry journey.
- Resolved: owner-authorized live Codex playtest and owner manual confirmation.

## Review Log

- 2026-07-20: Independent review remediated and reran deterministic full gates.
- 2026-07-22: Owner completed the live provider playtest; service-derived provenance, canonical state, permissions, and logs were inspected. Verdict: ready.
- 2026-07-22: Release PR feedback corrected retryable Assistant HTTP failures so they remain service-unavailable responses rather than invalid input. Fresh review at `7a401feedccbd427ce7e19bc59e118dc71686687` passed the focused HTTP test twice, the full 230-test suite, server typecheck/lint, production build, dependency audit, SDD validation, reverse traceability, code/security review, and artifact/integration rereview. Manual confirmation remains `user confirmed`; the correction does not alter the accepted UI flow.
- 2026-07-22: A later nine-finding release PR review identified current-search authorization, unbudgeted snippets, startup recovery, state-ancestor confinement, OAuth concurrency/cancellation, terminal Settings state, mounted Context refresh, and cross-plugin error-fidelity defects. Fresh review also closed replacement-flow cleanup and plugin-forgery risks. The consolidated remediation and regressions pass focused tests plus the full 236-test suite, typecheck, lint, production build, and dependency audit; the reviewed-source watermark remains pending the remediation commit.
- 2026-07-22: Current rendered verification exercised the terminal OAuth cancellation recovery in Storybook and directly inspected its `1440x900` result: Settings returns to a clean disconnected state with an actionable Connect control, no overflow, and no error overlay. The mounted Context provider refresh is covered by its focused component transition; existing accepted narrow Context layout evidence remains current because this batch changes state refresh rather than composition.
- Remaining accepted SDK constraint: Pi `AuthStorage.login` exposes no abort signal. GraphiteMD rejects replacement starts and waits during disconnect until a cancelled login unwinds, preventing an older flow from deleting or replacing newer credentials. If the upstream promise itself never settles outside its rejectable callbacks, provider setup remains safely blocked until service restart rather than risking cross-flow credential corruption.
