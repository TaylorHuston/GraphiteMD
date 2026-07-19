# Review: Foundation Workspace Slice

## Verdict

changes-requested

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | findings | Accepted state, interaction, and preview contracts are not fully implemented. |
| Change status | pass | Returned to `in_progress` after the consolidated review. |
| Epic truth | findings | Current maps navigate correctly, but security and restart behavior require remediation and evidence reconciliation. |
| Requirements and Scenarios | findings | Credential revocation, rename recovery, logout, accessibility, and responsive behavior are incomplete. |
| Story reference traceability | pass | Epic-scoped Story, Requirement, and Scenario identifiers are unique and structurally valid. |
| Reverse traceability | pass | 107 changed candidates classified; no broken implementation or verification references. |
| Tests and verification | findings | Existing gates pass, but risk-shaped and accepted preview evidence is incomplete. |
| Manual UI confirmation | pending user | Walkthrough refreshed; run only after implementation findings are resolved. |
| Code review | findings | Restart durability, auth concurrency, and accepted UI behavior need work. |
| Visual / UX consistency | findings | Keyboard, touch, focus, status, pane, and state-preview contracts are incomplete. |
| Security review | findings | One blocking credential-revocation race plus throttling and confinement findings. |
| Documentation | pass after safe fixes | Production secret, current product scope, E2E path, and Idea routing corrected. |
| Idea repository / current-state truth | pass after safe fix | Canonical repository and active Change now match live SDD topology. |
| Release communication | pass | `CHANGELOG.md` contains only the current user-facing foundation. |
| Branch and merge readiness | blocked | Correct branch and conflict-free target, but findings remain. |
| PRD alignment | pass | Foundation remains within the accepted product boundary. |

## Findings

### BLOCKING

- [ ] `apps/server/start/routes.ts#login`, `apps/server/app/security/owner_setup_service.ts#changePassword` - An in-flight login can verify the old password before a password change/reset deletes sessions, then create a new session after revocation completes. The stored `revocation_generation` is never bound to login completion or authenticated sessions. Recommendation: serialize verification/session issuance with credential mutation or bind issued sessions to a checked credential generation; add deterministic race coverage.

### REQUIRED

- [ ] `packages/workspace/src/index.ts#ConfiguredWorkspaceAuthority`, `docs/changes/2026-07-18-foundation-workspace-slice/design.md#workspace-and-state-layout` - Workspace identity is regenerated on every open, so opaque note URLs and bookmarks go stale after service restart. The accepted `workspace.json` and default `.graphite/.gitignore` are not provisioned even though the ledger claims the state rules were verified. Recommendation: persist and validate versioned workspace identity/configuration, derive stable resource identities, provision selective cache ignores, document backup behavior, and reconcile ADR/task evidence.
- [ ] `packages/workspace/src/index.ts#renameNote` - Indeterminate rename receipts exist only in memory and only after the source unlink. A process exit after commit loses the receipt, preventing retry-based authoritative reconciliation after restart. Recommendation: durably record an idempotent operation before commit and reconcile/finalize it at startup or retry; add process-boundary evidence.
- [ ] `packages/workspace/src/index.ts#saveNote`, `apps/server/app/plugins/plugin_runtime_service.ts#atomicJsonWrite` - Parent-directory confinement is checked separately from later create/rename operations. Replacing a writable parent with a symlink between validation and commit can redirect a write outside the workspace. Recommendation: use descriptor-relative confined operations where supported or retain and revalidate ancestor identities immediately before commit; add deterministic swap coverage and document unavoidable platform limits.
- [ ] `apps/server/app/security/login_attempt_limiter.ts#LoginAttemptLimiter`, `apps/server/start/routes.ts#login` - Parallel login attempts all pass the pre-verification check before failures are counted, and sub-threshold sources remain in an unbounded map indefinitely. Recommendation: reserve/count in-flight attempts atomically and use expiring bounded storage or LRU eviction; add parallel and eviction tests.
- [ ] `apps/web/src/App.tsx#App`, `apps/web/src/SettingsPanel.tsx#SettingsPanel` - A first-time unauthenticated browser is mislabeled as an expired session, and the accepted Settings flow has no logout action. Recommendation: distinguish initial authentication from later invalidation and add a CSRF-protected logout path that respects dirty/in-flight draft guards, with component and E2E evidence.
- [ ] `apps/web/src/App.tsx#Drawer`, `apps/web/src/App.tsx#FileTree`, `apps/web/src/MarkdownEditor.tsx#MarkdownEditor` - The accepted accessibility contract is incomplete: modal focus can escape and is not restored, the ARIA tree lacks roving focus and Arrow/Home/End behavior, save state is not announced, and CodeMirror removes its focus outline without a replacement. Recommendation: implement and test the complete keyboard/focus/status behavior.
- [ ] `apps/web/src/styles.css`, `apps/web/src/App.tsx#Workbench` - Narrow generic/tree controls are below the accepted touch-safe target and omit safe-area handling; desktop navigation/context are fixed with no accepted resize/collapse controls; the editor mode pressed state uses undefined `--raised`. Recommendation: complete the responsive composition and focused visual states, then verify with mobile-device and component evidence.
- [ ] `apps/web/src/App.stories.tsx`, `docs/changes/2026-07-18-foundation-workspace-slice/design.md#component-and-state-contract` - Eight passing stories do not cover the accepted editor, auth, workbench, mobile, and plugin failure/recovery state matrix. Recommendation: add previews for implemented required states and explicitly reconcile any state that is intentionally deferred.
- [ ] `docs/changes/2026-07-18-foundation-workspace-slice/tasks.md#manual-ui-confirmation` - Manual acceptance remains pending and must cover terminal masking, host reset, desktop/mobile use, conflict recovery, Settings, and session invalidation after implementation remediation.

### SUGGESTION

- [ ] `apps/web/src/MarkdownEditor.tsx#TableRowWidget` - `row` and `cell` roles have no table/rowgroup owner. Use a valid table semantic owner or leave the exact source with non-table presentation semantics.
- [ ] `apps/web/src/App.tsx`, `apps/web/src/SettingsPanel.tsx` - Add stable form names, disable autocomplete for search/rename, and show actionable password-policy guidance.
- [ ] `apps/web/src/styles.css#.drawer` - Add scroll containment and intentional touch/tap-highlight behavior.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `sdd validate graphitemd --change 2026-07-18-foundation-workspace-slice ...` | broad supporting gate | Change and affected Epics | pass | Canonical artifacts and forward references are structurally valid. |
| `sdd-orphan-audit ... --changed-from develop` for all three Epics | reverse-traceability inventory | GMD-001, GMD-002, GMD-003 | pass | 107 candidates, zero missing implementation or verification paths; remaining files classify across other Epics or support. |
| `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | broad supporting gate | foundation | pass at reviewed commit | All packages compile and focused suites pass. |
| `pnpm test:storybook` | browser/component evidence | UI state coverage | 8/8 pass with coverage findings | Existing preview interactions and configured axe checks pass. |
| `pnpm test:e2e` | deterministic production E2E | owner foundation path | 2/2 pass with risk gaps | Compiled same-origin delivery and current desktop/narrow owner path work. |
| `pnpm audit --prod --audit-level=high` | dependency security check | production dependencies | pass | No known high-severity production dependency vulnerability was reported. |

## Review Bundle

- Source branch/ref: `change/foundation-workspace-slice`
- Reviewed source commit: `ee54ee16a5161e9d3759ca7a763fff82afd42187`
- Target branch/ref: `develop` at `15901773ce4565c4facfc7c50d1835463ef808c8`
- Merge base: `15901773ce4565c4facfc7c50d1835463ef808c8`
- Source-only commits: 27
- Target-only commits: 0
- Changed files: 107
- Diff stat: 14,257 insertions, 103 deletions
- Conflict check: clean; `git merge-tree --write-tree develop HEAD` produced `a7518be2c973e60e9dbde8969a3c2f86e9734939`
- Dirty state: clean at discovery and after review-safe commits.
- Branch policy: correct `change/*` source targeting non-production `develop`; local merge allowed only after passing review and acceptance.
- Reverse-traceability command/result: packaged JSON audit per GMD-001/GMD-002/GMD-003 and consolidated pass; no broken paths.

## Reverse Traceability

- Candidate scope: 107 files from `develop...ee54ee1`.
- Epic ownership reconciled: behavior sources and focused tests map across GMD-001, GMD-002, and GMD-003.
- Support/generated/framework classifications: Storybook/Playwright harnesses, boot/config, manifests, lockfile, and build staging are support.
- Stranded refactor surfaces checked: routes, middleware, package registrations, production exports, static staging, tests, and spike imports.
- Explicit gaps or tracked cleanup: findings above return to `/sdd-apply`; no deletion candidate identified.

## Discovery Wave

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | fresh artifact/product pass | findings | State layout, manual walkthrough, production docs, and Idea routing reviewed. |
| Reverse traceability | orchestrator | pass | Per-Epic and consolidated changed-surface audit complete. |
| Code diff | fresh code/security pass plus orchestrator | findings | Auth concurrency, restart durability, and confinement require remediation. |
| Verification coverage | fresh verification/UI pass | findings | Passing tests do not cover every accepted risk/state. |
| Security | fresh code/security pass | findings | One blocking race and three required hardening gaps. |
| UI / visual identity | fresh UI pass with current Web Interface Guidelines | findings | Accepted interaction and responsive contract incomplete. |
| Docs / Idea truth / release communication / PRD | fresh artifact/product pass | pass after safe fixes | Current routing and startup instructions corrected; PRD and changelog align. |
| Integration readiness | orchestrator | blocked | Clean branch/conflict state, but implementation findings remain. |

## Consolidated Remediation

- Root causes addressed: stale Idea routing, missing required production secret documentation, future/current README ambiguity, stale E2E wording, and non-executable manual setup.
- Safe-fix batch: documentation and task/review truth only, committed as `27ce592`; the separate private Idea front door was committed in its owning vault repository as `2365c1b6`.
- Deferred or unsafe findings: all code, security, filesystem, state-layout, responsive, accessibility, and preview findings above require `/sdd-apply`.
- Affected verification union: docs diff check and scoped SDD validation for this review batch; full focused/broad/browser gates after implementation remediation.
- Regression-focused rereview: documentation and lifecycle consistency only; implementation rereview required after the next apply.
- New regressions introduced by remediation: none identified.

## PR / Merge Readiness

- Source branch: `change/foundation-workspace-slice`
- Reviewed source commit: `ee54ee16a5161e9d3759ca7a763fff82afd42187`
- Target branch: `develop`
- Conflict check: clean at reviewed commit
- Commit state: review record and safe source-repository documentation committed as `27ce592`; private Idea current-state correction committed separately as `2365c1b6`
- PR status: none; not required for routine non-production integration
- Merge status: not ready; blocking and required findings remain

## Review Log

- 2026-07-18: Deep independent review completed against `ee54ee1`; verdict `changes-requested`, safe documentation corrections committed as `27ce592` and `2365c1b6`, and implementation findings returned to `/sdd-apply`.
