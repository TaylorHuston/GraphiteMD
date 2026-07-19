# Review: Foundation Workspace Slice

## Verdict

changes-requested

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | findings | Runtime-contract and required-preview commitments remain incomplete. |
| Change status | pass after safe fix | Returned to `in_progress` for implementation remediation. |
| Epic truth | findings | GMD-002 contains stale or overstated verification evidence. |
| Requirements and Scenarios | findings | Credential revocation, plugin authority, rename retry, responsive composition, and contract validation are incomplete. |
| Story reference traceability | pass | Epic-scoped Story, Requirement, and Scenario identifiers remain unique and structurally valid. |
| Reverse traceability | pass | 108 changed candidates classified with no broken implementation or verification references. |
| Tests and verification | findings | All existing gates pass, but they do not exercise the uncovered risk windows or complete the accepted preview matrix. |
| Manual UI confirmation | pending user | Deferred until the implementation findings are remediated. |
| Code review | findings | Two blocking authority/revocation defects and required stale-state/confinement defects remain. |
| Visual / UX consistency | findings | Desktop Search composition, intermediate-width containment, and mobile touch targets remain incomplete. |
| Security review | findings | Session persistence, workspace-bound plugin authority, plugin isolation, and remaining path-commit windows require remediation. |
| Documentation | pass after safe fixes | Current review state, manual steps, and rename-receipt retention were corrected. |
| Idea repository / current-state truth | pass after safe fix | The private Idea front door now reflects rereview and remediation status. |
| Release communication | pass | README and changelog remain public-safe and aligned to the implemented foundation. |
| Branch and merge readiness | blocked | The policy-correct branch is conflict-free with `develop`, but blocking/required findings and manual acceptance remain. |
| PRD alignment | pass | The Change remains within the accepted foundation boundary. |

## Findings

### BLOCKING

- [ ] `apps/server/app/security/owner_setup_service.ts#authenticate`, `apps/server/start/routes.ts#login` - Credential revocation can still lose to deferred Adonis session persistence. The credential lock and generation check finish before session middleware commits the new session row, so a password change or host reset can delete sessions and increment the generation before the old-password login is persisted afterward. Recommendation: bind every authenticated session to `revocation_generation` and reject mismatches on load, or establish an equivalent authoritative atomic boundary; add a deterministic HTTP-level post-route persistence race test.
- [ ] `apps/server/app/plugins/plugin_runtime_service.ts#PluginRuntimeService` - Plugin enablement and state authority are bound to the raw configured pathname rather than the workspace identity accepted by `ConfiguredWorkspaceAuthority`. After the configured root is replaced, workspace reads correctly fail with `identity_changed`, but plugin mutations can create `.graphite/plugins.json` in the replacement directory. Recommendation: retain and validate the canonical workspace/root identity for every plugin read and mutation, and fail closed whenever workspace authority is unavailable; add replacement-root coverage.

### REQUIRED

- [ ] `packages/workspace/src/index.ts#renameNote` - A successful rename result is cached indefinitely. If the renamed note is edited through its new resource ID, retrying the original rename returns the stale pre-edit source and revision instead of current authoritative target state. Recommendation: reconcile cached committed receipts against the current target before returning and add a rename-edit-retry regression.
- [ ] `packages/plugin-sdk/src/index.ts#PluginHost.enable`, `apps/server/tests/plugins/bundled_import_boundary.test.ts` - Bundled plugins activate in the unrestricted server process, while the current boundary test checks only static import text. A plugin can access `process.env`, global network APIs, or dynamic Node imports without declared capability permission, contradicting GMD-003 and the accepted capability ADR. Recommendation: add a real runtime isolation/enforcement boundary, or explicitly revise the accepted trusted-plugin contract and product claims.
- [ ] `apps/server/app/plugins/plugin_runtime_service.ts#FilesystemPluginStateBackend.recovery`, `apps/server/app/search/local_search_service.ts#rebuild` - Recovery and search commit paths validate directories before later pathname mutations but do not retain and revalidate ancestor identity immediately before delete/rename. A directory swap can redirect recovery mutations or the content-bearing FTS database outside the workspace. Recommendation: use the established retained-identity precommit pattern and deterministic early/late swap tests.
- [ ] `packages/contracts/src/index.ts`, `apps/web/src/App.tsx`, `apps/web/src/SettingsPanel.tsx` - The public API is not runtime-validated as designed. The contracts package defines only workspace identity/service metadata, while the browser trusts response JSON through TypeScript casts. Recommendation: define shared request/response schemas, validate browser responses through a typed adapter, normalize malformed-response recovery, and add malformed/forward-incompatible response tests.
- [ ] `apps/web/src/App.tsx#Search`, `apps/web/src/styles.css` - Desktop Search always opens as a modal even though the accepted desktop design places Files and Search in persistent navigation. Widened desktop panes can also overflow between 60rem and 79rem, and mobile plugin/rebuild controls remain below the accepted touch target. Recommendation: implement the accepted desktop switcher, constrain intermediate tracks, cover every interactive mobile control, and add responsive evidence.
- [ ] `apps/web/src/App.stories.tsx`, `docs/changes/2026-07-18-foundation-workspace-slice/design.md#component-and-state-contract` - The 18 passing stories still omit accepted preview states, including editor active-syntax/table-overflow/read-only, tree unavailable/collapsed/stale-route, search idle/loading/no-results/long-path/mobile, and plugin incompatible. The design explicitly claims incompatible coverage that does not exist. Recommendation: add the rendered states or reconcile the accepted design with equivalent explicit evidence.
- [ ] `docs/epics/gmd-002-markdown-workbench/epic.md` - Evidence truth remains inconsistent: the Epic claims a missing rename component test despite current focused coverage and claims a no-result Storybook preview that does not exist. Reconcile these statements with the implementation and new preview work.
- [ ] `docs/changes/2026-07-18-foundation-workspace-slice/tasks.md#manual-ui-confirmation` - Manual terminal, visual, device, safe-area, and screen-reader acceptance remains pending after implementation remediation.

### SUGGESTION

- [ ] `apps/web/src/App.tsx#Search` - Announce completed search result state through a live region.
- [ ] `apps/web/src/App.tsx#logout` - Surface logout network failure with a recoverable message rather than silently returning to the workbench.
- [ ] Production builds report a roughly 718 KB initial browser chunk and a Node `module.register()` deprecation warning; track optimization/toolchain cleanup outside this correctness gate unless either becomes operationally material.

## Verification Evidence

| Command / Scenario | Evidence Type | Result | What It Proves |
|---|---|---|---|
| `sdd validate change` plus scoped GMD-001/GMD-002/GMD-003 validation | broad supporting gate | pass, zero errors/warnings | Canonical artifacts and forward references are structurally valid. |
| `sdd-orphan-audit ... --changed-from develop` for all three Epics | reverse-traceability inventory | pass | 108 candidates classify across affected Epics or support; no missing implementation/verification paths. |
| `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | broad supporting gate | pass | All packages compile, current focused suites pass, and production artifacts build. |
| `pnpm test:storybook` | component/browser evidence | 18/18 pass with coverage findings | Existing previews and configured accessibility checks pass; the accepted matrix is incomplete. |
| `pnpm test:e2e` | deterministic production E2E | 2/2 pass with risk gaps | Compiled same-origin desktop/narrow owner paths work; uncovered concurrency and filesystem cases remain outside this coverage. |
| `pnpm audit --prod --audit-level=high` | dependency security check | pass | No known high-severity production advisory was reported. |
| independent replacement-root and rename-edit-retry probes | focused adversarial evidence | reproduced | Plugin mutation crosses a replaced workspace identity; cached rename retry returns stale state. |

## Review Bundle

- Source branch/ref: `change/foundation-workspace-slice`
- Reviewed source commit: `019677434dd1108798ef68e63f4db85d9fe0ee78`
- Target branch/ref: `develop` at `15901773ce4565c4facfc7c50d1835463ef808c8`
- Merge base: `15901773ce4565c4facfc7c50d1835463ef808c8`
- Source-only commits: 31
- Target-only commits: 0
- Changed files: 108
- Diff stat: 15,416 insertions, 104 deletions
- Conflict check: clean; `git merge-tree --write-tree develop HEAD` produced `0bbc51b658cd57124b3ae6124459a67c9bc22ac1`
- Dirty state: clean at discovery.
- Branch policy: correct `change/*` source targeting non-production `develop`; no PR, merge, or closeout authorized.
- Manual confirmation: pending user; not run against a source with unresolved implementation findings.

## Discovery Wave

| Pass | Result | Notes |
|---|---|---|
| Artifact/product truth | findings | Preview, Epic evidence, manual, retention, and Idea current-state truth reviewed. |
| Reverse traceability | pass | Per-Epic and consolidated changed-surface audit complete. |
| Code/security diff | findings | Adversarial authority, concurrency, stale-retry, isolation, and confinement cases found. |
| Verification/UI | findings | Existing evidence is useful but does not cover the accepted state/risk surface. |
| Docs/PRD/release communication | pass after safe fixes | Product boundary and public docs align; review/current-state corrections applied. |
| Integration readiness | blocked | Clean branch/conflict state does not outweigh blocking and required findings. |

## Consolidated Remediation

- Safe review fixes: repository review/current-state, GMD-002, manual walkthrough, and rename-receipt retention corrections were committed as `49078f7`; the private Idea front door was committed in its owning vault repository as `41a8c3c4`.
- Apply-side work: every code, runtime-contract, security, responsive-composition, and preview finding above.
- Required next verification: focused adversarial tests for each finding, then the full root/Storybook/production-E2E gate and a fresh independent review.
- Manual acceptance remains deferred until the implementation review is clean.

## PR / Merge Readiness

- Source branch: `change/foundation-workspace-slice`
- Target branch: `develop`
- PR status: none; not required for routine local integration.
- Merge status: not ready; blocking and required findings remain.
- Closeout status: not authorized and not eligible.

## Review Log

- 2026-07-18: Deep review against `ee54ee1`; verdict `changes-requested`.
- 2026-07-19: Fresh deep rereview against `0196774`; all existing verification gates passed, but new adversarial and contract/experience findings keep the verdict at `changes-requested`. Safe artifact corrections were applied; implementation returns to `/sdd-apply`.
