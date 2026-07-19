---
status: in_progress
---
# Tasks: Foundation Workspace Slice

## Resume Here

- Last completed action: Fresh deep `/sdd-review` against immutable implementation source `0196774` passed every existing automated gate but found two blocking and eight required findings; review-safe truth corrections are being committed separately.
- Next action: Run `/sdd-apply` from `review.md`, starting with credential-generation/session persistence and workspace-bound plugin authority, then remediate the required rename, plugin isolation, confinement, runtime-contract, responsive, preview, and Epic-evidence findings.
- Active branch/ref: `change/foundation-workspace-slice` from `develop`; baseline commit `1590177` exists on `main` and `develop`.
- Expected dirty files: None after the review-safe artifact commit; implementation findings remain intentionally unmodified by review.
- Known blockers: Credential revocation can still race deferred session persistence, and plugin mutations are not bound to the accepted workspace identity. Required findings and manual terminal/visual/device/screen-reader confirmation also remain open.

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Confirm the scope boundary: secure one-owner access, one workspace, browse/read/edit/rename/search, and one bundled plugin; Assistant and remaining kernel capabilities are deferred.
- [x] 1.2 Challenge Story boundaries and keep authentication/recovery, Markdown user paths, and plugin control in capability-sized Epics.
- [x] 1.3 Define observable happy, empty, failure, permission, conflict, recovery, responsive, integration, and security Scenarios.
- [x] 1.4 Record assumptions, later candidate Stories, and deferred product scope explicitly.
- [x] 1.5 Confirm every planned Scenario can receive focused automated, E2E, or manual evidence under its GraphiteMD Epic.
- [x] 1.6 Record the existing Dashboard/Coordinator comparison states as adopted references; no separate `/sdd-design --plan` is required before promotion.
- [x] 1.7 Set `status: planned` after final scoped validation and complete re-read.

### 2. Epic Artifacts

- [x] 2.1 Create `GMD-001`, `GMD-002`, and `GMD-003` through `sdd epic create` in the canonical repository.
- [x] 2.2 Define all six embedded Stories with independent implementation and verification state.
- [x] 2.3 Give every Story local Requirement/Scenario IDs, behavior-mapped future ownership, Implementation Gaps, empty Verified By maps, and explicit Verification Gaps.
- [x] 2.4 Keep Dashboard `DASH-*` and Coordinator `CL-*` Stories as reference evidence rather than pretending they are implemented GraphiteMD truth.

### 3. Architecture Decisions

- [x] 3.1 Compare selective transplantation, a Coordinator fork/subtraction, and a Dashboard fork/replatform.
- [x] 3.2 Apply the four existing Accepted GraphiteMD ADRs; no new durable decision requires another ADR before implementation.
- [x] 3.3 Record ADR status as Accepted and name their implementation obligations.

### 4. Implementation

- [x] 4.1 Establish the clean monorepo foundation from the curated Coordinator skeleton.
  - [x] Copy and rename root pnpm, TypeScript, lint, build, Storybook, Playwright, AdonisJS, and Vite scaffolding.
  - [x] Remove Coordinator-specific routes, SDD/Git/Pi/runtime packages, assets, and state assumptions before GraphiteMD behavior is added.
  - [x] Create runtime-validated GraphiteMD contract, domain, workspace, plugin SDK, and plugin testkit package boundaries.
  - [x] Document install, dev, lint, typecheck, test, build, and production start commands.
- [x] 4.2 Implement `GMD-001/S1` Establish And Authenticate The Owner Account through BDD/TDD.
  - [x] R1 host-local first-owner setup and existing-owner refusal.
  - [x] R2 valid/invalid login, session regeneration, protected APIs, and logout invalidation.
  - [x] R3 exact-origin, secure-cookie, and CSRF/XSRF enforcement.
- [x] 4.3 Implement `GMD-001/S2` Maintain And Recover Access through BDD/TDD.
  - [x] R1 authenticated password change with global session invalidation.
  - [x] R2 host-local atomic reset and cancellation safety.
  - [x] R3 current-session reconnect and invalidated-session recovery. (isolated expiry HTTP proof remains a verification gap.)
- [x] 4.4 Implement `GMD-002/S1` Browse And Read Workspace Notes through BDD/TDD.
  - [x] R1 one host-configured service-owned workspace and safe reconnect.
  - [x] R2 nested Markdown inventory, `.graphite`/ignore/unsafe exclusions, and empty state.
  - [x] R3 exact source/revision reads with guarded opaque-resource history.
  - [x] R4 desktop and mobile-browser workbench composition. (automated structure/interaction proof complete; manual viewport confirmation pending.)
- [x] 4.5 Implement `GMD-002/S2` Edit And Rename A Note Safely through BDD/TDD.
  - [x] R1 transplant the newer source-preserving editor and Dashboard-only general-note regressions.
  - [x] R2 transplant single-flight autosave, version conflicts, late-response isolation, and draft guards.
  - [x] R3 transplant no-overwrite rename and authoritative post-commit reconciliation.
  - [x] R4 confine authenticated owner writes and preserve exact source/file mode.
- [x] 4.6 Implement `GMD-002/S3` Search The Workspace Locally through BDD/TDD.
  - [x] R1 adapt Dashboard title/path/frontmatter/body FTS and result-selection behavior.
  - [x] R2 adapt rebuild/reconciliation to `.graphite/cache/search.sqlite` and `better-sqlite3`.
  - [x] R3 prove baseline search uses only the local service/index path. (automated network-egress isolation remains a verification gap.)
- [x] 4.7 Implement `GMD-003/S1` Inspect Control And Trust Bundled Plugins through BDD/TDD.
  - [x] R1 manifests, compatibility, plugin inventory, and failed activation.
  - [x] R2 inspectable enable/disable state and contribution teardown/restart.
  - [x] R3 capability broker, opaque identities, normalized denial, and forbidden imports for the accepted System Status scope.
  - [x] R4 namespaced state, recovery, shared conformance, and the System Status plugin. (process-kill durability remains a verification gap, not an implementation gap.)
- [x] 4.8 Reconcile all affected Epic `Implemented By` and Implementation Gaps immediately after each Requirement slice.

### 5. Reuse And Migration Discipline

- [x] 5.1 For every row in `design.md`'s Reuse And Adaptation Map, record the transplanted source files/tests and their GraphiteMD targets in the Implementation Ledger.
- [x] 5.2 Port the source spike's applicable regression tests with each implementation slice; do not postpone all test migration until the end.
- [x] 5.3 When overlapping implementations differ, keep the newer/safer Coordinator owner and add Dashboard-only behavior as focused adaptations rather than merging two whole modules blindly.
- [x] 5.4 Confirm no imports, package dependencies, private paths, product names, environment variables, assets, or runtime state still couple GraphiteMD to either reference repository.
- [x] 5.5 Inventory the final GraphiteMD source/test surface and classify every behavior-bearing file under one affected Epic or as explicit support/generated infrastructure.

### 6. Verification

- [x] 6.1 Add focused GraphiteMD evidence for every implemented Requirement and Scenario.
- [x] 6.2 Update each Epic `Verified By` map with concrete GraphiteMD repository-relative tests and evidence types.
- [x] 6.3 Run the root `lint`, `typecheck`, `test`, `build`, Storybook, and deterministic E2E gates introduced by the Change.
- [x] 6.4 Run desktop and mobile E2E over disposable security/workspace roots for authentication, browse/search, edit/conflict/rename, reconnect, password invalidation, and plugin lifecycle.
- [x] 6.5 Inspect logs and browser bundles for passwords, hashes, session/CSRF tokens, absolute host paths, real note bodies/snippets, and provider credentials.
- [x] 6.6 Delete the derived index and prove equivalent search rebuild without copying the database.
- [x] 6.7 Verify `.graphite/` canonical/config/plugin-state rules and accepted ADR assumptions, including stable identity, selective ignores, durable rename receipts, parent-swap denial, and backup guidance.
- [x] 6.8 Run scoped `sdd validate` after Epic evidence reconciliation.

### 7. Documentation Review And Closeout

- [x] 7.1 Update README, architecture, testing, security/deployment guidance, and `CHANGELOG.md` with current implemented behavior only.
- [x] 7.2 Run `/sdd-review` as the independent local integration gate for Story truth, source reuse, tests, security, docs, ADRs, and branch readiness.
- [ ] 7.3 Record the review outcome in `review.md` and remediate its code/artifact findings; the 2026-07-19 rereview is recorded, but its implementation findings remain open and manual acceptance remains explicitly pending.
- [ ] 7.4 Walk the user through the required disposable-workspace desktop/mobile confirmation and record `user confirmed` or `accepted gap`.
- [ ] 7.5 Ensure proposal/design/tasks and all Epics no longer claim completed remediation behavior is unimplemented, unverified, or pending after the fresh finding set is resolved.
- [x] 7.6 Confirm current Change status, branch/ref, review record, manual confirmation, release communication, and PR/merge state agree.
- [ ] 7.7 Return the implementation-complete Change to `in_review` only after the fresh finding set is remediated and self-checked; manual acceptance may remain open.
- [ ] 7.8 Commit, push, open a PR, merge, or close only after the repository policy and explicit user authorization permit each operation.

## Implementation Ledger

Record one row per meaningful transplant or Requirement slice. Include both the reference source and the GraphiteMD target so reuse remains auditable.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-18 | Planning provenance inventory | `/sdd-change --plan`; accepted ADRs; Dashboard and Coordinator live code/tests | Reference monorepos, Epics, architecture/testing docs, manifests, contracts, editor, file, index, capability, and harness surfaces | Reuse map recorded; no application code copied yet | uncommitted |
| 2026-07-18 | Apply Discovery and promotion | `/sdd-apply`; TDD; component accessibility/composition guidance; Context7 AdonisJS v7 docs | Active Change, branch policy, PRD, ADRs, Epics, both spike surfaces | Change promoted and transitioned to `in_progress`; exact transplant map confirmed; official session regeneration and credentialed SPA guidance reconfirmed | `d8c827a` |
| 2026-07-18 | Monorepo enabling slice for `GMD-002/S1 R1` | Delegated implementation; curated Coordinator scaffold | Root workspace; `apps/server`; `apps/web`; contracts/domain/workspace/plugin packages; System Status plugin | Compileable service-first skeleton established without Coordinator product behavior; package boundary tests pass; generated artifacts removed and ignored in `f3e4269` | `d8c827a`, `f3e4269` |
| 2026-07-18 | `GMD-002/S1 R1` service-owned workspace authority | Delegated TDD; Coordinator confinement/reconnect patterns adapted | `packages/workspace`; `GMD-002` Epic | Real configured-root validation, opaque identity, root replacement invalidation, and stable reconnect snapshot implemented; authenticated HTTP proof remains an explicit gap | `762e713` |
| 2026-07-18 | `GMD-002/S1 R2` confined Markdown inventory | Delegated TDD; Dashboard inventory cases plus Coordinator no-follow confinement adapted | `packages/workspace`; `GMD-002` Epic | Deterministic tree-ready inventory, opaque resources, exclusions, bounded strict UTF-8 reads, and empty projection implemented; presentation remains under R4 | `a70f7da` |
| 2026-07-18 | `GMD-001/S1 R1` host-local owner setup | Delegated TDD; current AdonisJS v7 Ace/hash guidance | Server security service, `owner:setup` command, focused tests, `GMD-001` Epic | Machine-local permission-restricted SQLite owner store, Scrypt hash, secure prompt seam, and overwrite refusal implemented; real TTY masking is a manual evidence gap | `88ea988` |
| 2026-07-18 | `GMD-001/S1 R2` browser session authentication and `GMD-002/S1 R1` delivery | Delegated TDD; official Adonis Auth/Session/Lucid guidance | Auth/session/database configs, singleton Owner model, login/current/logout/workspace routes, real HTTP fixture, GMD-001/GMD-002 Epics | Regenerated persistent sessions, generic denial, server-side logout invalidation, and authenticated confined workspace projection implemented | `323a053` |
| 2026-07-18 | `GMD-002/S1 R3` exact note read package slice | Delegated TDD; Dashboard YAML cases plus Coordinator locator/no-follow patterns | `packages/workspace`; GMD-002 Epic | Exact bounded UTF-8 source, revision, YAML state, stale/unknown locator and symlink/root replacement denial implemented; HTTP/browser history remains | `323a053` |
| 2026-07-18 | `GMD-001/S1 R3` browser request protection | Delegated TDD; official Adonis Shield/CORS guidance | Shield/CORS config and middleware; real HTTP fixture; GMD-001 Epic | Missing/invalid XSRF fails before logout mutation; exact configured origin receives credentialed CORS while near-match untrusted origin receives none | `7e0d5a5` |
| 2026-07-18 | `GMD-003/S1` headless plugin core | Delegated TDD; Dashboard enablement semantics plus Coordinator capability-host patterns | Plugin SDK/testkit, System Status plugin, GMD-003 Epic | Versioned manifest/host lifecycle, capability broker, namespaced state contract, and shared conformance implemented; inspectable filesystem persistence and service/web integration remain | `ba074f7` |
| 2026-07-18 | `GMD-002/S1 R4` responsive browse shell and R2 presentation | Delegated TDD; component accessibility/composition guidance; Coordinator primitives and Dashboard PKM composition adapted | Web App/tree/drawers/state shell, responsive tokens/styles, GMD-002 Epic | Authenticated bootstrap, deterministic accessible tree, empty/session/error states, desktop regions, and narrow drawers implemented; editor/search/settings remain scoped placeholders | `b53fc90` |
| 2026-07-18 | `GMD-001/S2` access maintenance and recovery | Delegated TDD; official session/Shield patterns | Owner security service, password API, reset command, service/command/HTTP tests, GMD-001 Epic | Atomic password compare-and-swap/reset, revocation generation, global session deletion, rollback, and invalidated-session recovery implemented; Settings UI and isolated expiry proof remain | `4c23898` |
| 2026-07-18 | `GMD-002/S1 R3` authenticated note navigation | Delegated TDD; Coordinator confinement patterns and Dashboard note presentation behavior adapted | Authenticated note route, real HTTP fixture, web history/selection/source/properties presentation, GMD-002 Epic | Opaque selection, exact source delivery, Back/Forward/reload restoration, stale-route denial, and expired-session recovery implemented without exposing host paths | `da26f5a` |
| 2026-07-18 | `GMD-002/S2` source-safe editor/save/rename slice | Delegated TDD; Coordinator editor/autosave/artifact authority plus Dashboard exactness/conflict/collision regressions adapted | Workspace mutations, authenticated routes, CodeMirror editor, autosave coordinator, workbench controls, GMD-002 Epic | Exact-source editing, mixed-ending preservation, single-flight revision saves, draft/conflict guards, file-mode-safe writes, and collision-safe rename implemented; richer rendered presentation and indeterminate rename recovery remain | `90fcdb2` |
| 2026-07-18 | `GMD-003/S1` plugin persistence and production service slice | Delegated TDD; Dashboard config-backed lifecycle and Coordinator broker/confinement concepts adapted | Atomic plugin config/state service, System Status production host/provider, authenticated inventory/control routes, GMD-003 Epic | Inspectable enablement, namespaced atomic state/recovery, symlink denial, restart-safe activation, and authenticated inventory/control implemented; browser mounting and broader static/runtime boundaries remain | `90fcdb2` |
| 2026-07-18 | `GMD-002/S3` local kernel search | Delegated TDD; Dashboard FTS/reconciliation/result-navigation patterns adapted | Local FTS5 service, authenticated search/rebuild routes, workbench Search UI, GMD-002 Epic | `.graphite/cache/search.sqlite` projection searches title/path/frontmatter/body with bounded opaque results and rebuild-on-search external reconciliation; fault-injection/egress/manual evidence remain | `40c95ad` |
| 2026-07-18 | Owner Settings for access and plugins | Delegated TDD; existing spike Settings interaction patterns adapted | SettingsPanel, workbench drawer integration, GMD-001/GMD-003 Epics | Password change forces reauthentication; plugin inventory, permissions, contributions, status, and enable/disable control are inspectable; contribution mounting remains | `40c95ad` |
| 2026-07-18 | Apply-side implementation self-check and remediation wave | Delegated fresh-context code/coverage, security, and docs/traceability passes; TDD/component guidance | Browser transitions and recovery; auth/password/rate limits; search/plugin filesystem confinement; import/build boundaries; README/CHANGELOG/ADRs/design/Epics | Three browser-path defects, conflict recovery, System Status mounting, high-risk production defaults and write boundaries, build leakage, and stale artifacts remediated; no scope expansion | `ffe53fc` |
| 2026-07-18 | Final rendered-editor and rename-recovery slice | Delegated TDD/component guidance; Coordinator presentation and artifact-recovery patterns selectively adapted | Markdown presentation projection, editor tests, workspace rename authority, HTTP recovery proof, GMD-002 Epic | Supported Markdown now presents in place with exact syntax reveal/literal fallback; indeterminate committed rename retries reconcile by exact canonical state and issue refreshed authority | `b787322` |
| 2026-07-18 | Storybook and deterministic browser integration gate | Delegated TDD/component/browser-verification guidance; Coordinator/Dashboard harness patterns adapted | Storybook configuration/states, Playwright disposable setup/teardown, desktop+narrow foundation flow, package scripts | Eight accessible preview states and one production-path browser flow cover auth, workspace, search, editing/conflict/rename, reconnect, password/session invalidation, and plugin lifecycle | `b787322` |
| 2026-07-18 | Changed-surface reverse traceability | `sdd-orphan-audit --changed-from develop` for GMD-001/GMD-002/GMD-003 plus consolidated classification | 107-file final changed surface | Zero missing implementation/evidence references; behavior sources/tests are Epic-owned; Storybook/Playwright/bootstrap/manifests are support; contracts/domain are now runtime-owned rather than scaffold-only | `b787322` |
| 2026-07-18 | Same-origin production delivery | Context7 official AdonisJS v7 static guidance; delegated production-path remediation | Static provider/middleware, SPA fallback, staged browser build, conditional compiled package exports, production Playwright server | `pnpm build && pnpm start` now serves the compiled browser, hashed assets, client history, and API from one Adonis origin; API 404s never fall through to HTML | `b787322` |
| 2026-07-18 | Consolidated review remediation | Delegated TDD slices plus fresh combined-tree security, coverage/UI, and artifact self-checks | Auth issuance/revocation and bounded limiter; persisted workspace identity/selective ignores/durable rename receipts; workspace/plugin confinement; logout/accessibility/responsive panes; 18 Storybook states; README/CHANGELOG/design/Epics | Blocking credential race and required restart, confinement, throttling, browser, accessibility, responsive, preview, and documentation findings remediated; self-check edge cases folded into the same wave | `949dd77` |

## Verification Ledger

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-18 | `sdd context` and repository/Space resolution | broad supporting gate | Planned Change targets only the active `graphitemd` canonical repository while spikes remain references. | Passing |
| 2026-07-18 | Current AdonisJS v7 documentation lookup | documentation evidence | Official session guard, session regeneration, Shield XSRF cookie, exact credentialed CORS, and SPA cookie patterns exist for the planned auth boundary. | Passing |
| 2026-07-18 | Planned Change plus `GMD-001`, `GMD-002`, and `GMD-003` scoped `sdd validate` runs | broad supporting gate | Planned Change and every affected Epic are structurally valid with zero errors or warnings. | Passing |
| 2026-07-18 | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | broad supporting gate | The new nine-project workspace installs, compiles, tests, and produces server/web builds. | Passing; Adonis emits a Node deprecation warning during build |
| 2026-07-18 | `pnpm --filter @graphitemd/workspace test`; workspace lint/typecheck/build | focused automated evidence plus supporting gates | `GMD-002/S1/R1-S1..R1-S3`: opaque authority, invalid/replaced-root denial, and reconnect snapshot behavior over disposable real directories. | Passing: 4 tests |
| 2026-07-18 | Workspace package 7-test suite plus lint/typecheck/build | focused automated evidence plus supporting gates | `GMD-002/S1/R2-S1..R2-S3`: nested deterministic inventory, unsafe/internal/excluded content denial, and honest empty inventory. | Passing: 7 tests |
| 2026-07-18 | Server 8-test suite, lint/typecheck/build, `node ace list`, and scoped SDD validation | focused automated evidence plus supporting gates | `GMD-001/S1/R1-S1..R1-S2`: hash-only singleton owner setup, permission-restricted machine state, secure prompt adapter, credential-free output, and overwrite refusal. | Passing; TTY masking pending manual confirmation |
| 2026-07-18 | Real HTTP auth fixture plus server tests | deterministic integration evidence | `GMD-001/S1/R2-S1..R2-S3` and `GMD-002/S1/R1-S1`: session replacement, generic denial, logout replay denial, protected workspace delivery, and no host-path exposure. | Passing: 7 source tests after generated-output exclusion |
| 2026-07-18 | Workspace 13-test suite | focused automated evidence | `GMD-002/S1/R3-S1..R3-S2`: exact reads, revisions, YAML states, external edits, stale/unknown identities, root replacement, and symlink substitution. | Passing: 13 tests |
| 2026-07-18 | `pnpm build && pnpm test` | broad supporting regression gate | Generated output does not get rediscovered as duplicate tests; every workspace package remains green after a full build. | Passing after adding `apps/server/vitest.config.ts` |
| 2026-07-18 | Server 9-test suite plus lint/typecheck/build and scoped SDD validation | deterministic integration evidence plus supporting gates | `GMD-001/S1/R3-S1..R3-S2`: missing/invalid/valid XSRF behavior and exact trusted versus near-match untrusted credentialed origins. | Passing |
| 2026-07-18 | Plugin SDK 7 focused tests plus System Status conformance; plugin package lint/typecheck/build | focused automated evidence plus supporting gates | Headless portions of `GMD-003/S1/R1..R4`: manifest and dependency denial, lifecycle teardown, capability denial, state isolation contract, and production-SDK conformance. | Passing; filesystem/service/browser gaps remain explicit |
| 2026-07-18 | Web 4-test suite plus lint/typecheck/build and scoped SDD validation | focused component evidence plus supporting gates | `GMD-002/S1/R2-S1`, `R2-S3`, `R4-S1`, `R4-S2`: accessible tree, empty reachability, responsive drawer semantics, focus/Escape, and expired-session state. | Passing; real viewport/touch/overflow confirmation pending user |
| 2026-07-18 | Server 18-test suite plus lint/typecheck/build | focused service/command/HTTP evidence plus supporting gates | `GMD-001/S2/R1..R3`: correct/wrong password behavior, multi-session revocation, reset/cancel/mismatch/rollback, and invalidated-session recovery. | Passing; Settings UI, terminal masking, and isolated expiry proof remain explicit gaps |
| 2026-07-18 | Server 20-test and web 7-test suites; root test/typecheck/lint; scoped SDD validation | deterministic integration and component evidence plus supporting gates | `GMD-002/S1/R3-S1..R3-S2`: authenticated exact-note reads, path-free denial, opaque-resource selection/history restoration, invalid-route recovery, and note-read session expiry. | Passing; responsive manual confirmation remains explicit |
| 2026-07-18 | Workspace 18, web 14, and server 29 tests; root build/test/lint/typecheck; scoped GMD-002/GMD-003 validation; diff check | focused, integration, component, and broad supporting evidence | Partial `GMD-002/S2` exact editor/autosave/save/rename behavior and `GMD-003/S1` atomic plugin persistence, production host/provider, restart/recovery, confinement, and authenticated control. | Passing; documented editor/plugin browser and fault-injection gaps remain; Vite reports a roughly 700 KB chunk warning |
| 2026-07-18 | Workspace 18, web 20, and server 36 tests; root build/test/lint/typecheck; scoped Epic validation; diff check | focused, integration, component, and broad supporting evidence | `GMD-002/S3` local FTS/rebuild/reconciliation/navigation plus owner password and plugin Settings interactions. | Passing; deterministic DB-fault/network-isolation and manual responsive confirmation remain explicit gaps |
| 2026-07-18 | Workspace 19, web 26, and server 42 tests; root test/typecheck/lint/build; scoped Change and all Epic validation; production bundle/config inspection | focused automated, integration, broad gate, and debug inspection evidence | Self-check remediations: rename/search/history transitions, save recovery, plugin contribution lifecycle, password policy/throttling, fail-closed APP_KEY, confined atomic state/index writes, forbidden imports, and deployable-build exclusion. | Passing; Vite chunk warning and documented OS-level TOCTOU/process-kill/manual gaps remain |
| 2026-07-18 | Root lint/typecheck/test/build; Storybook build; Storybook browser tests 8/8; Playwright 2/2; scoped Change and three Epic validations | broad supporting, component preview, accessibility, and deterministic E2E evidence | Final integrated foundation over disposable state/workspace roots, including production static/history/API confinement, all browser-exposed owner paths, and desktop plus 390x844 narrow browse composition. Host-only setup/reset remain focused command and HTTP integration evidence. | Passing; `agent-browser` CLI unavailable, equivalent Playwright Chromium production path passes; Vite emits a 714 KB chunk warning |
| 2026-07-18 | Workspace 21, web 29, server 43, and domain 4 focused tests | focused automated and integration evidence | Rendered projection/literal fallbacks, isolated per-resource editor history, safe committed-rename fault/retry reconciliation, password-policy ownership, login XSRF proof, and all prior regressions. | Passing |
| 2026-07-18 | Deep `/sdd-review` of `develop...ee54ee1`; per-Epic reverse audit; `pnpm audit --prod --audit-level=high` | independent artifact, code/security, verification/UI, dependency, and integration review | Existing gates remain useful, but credential revocation, durable workspace/rename identity, confinement/throttling, accepted UI behavior, preview coverage, and acceptance are not integration-ready. | `changes-requested`; no known high-severity production dependency advisory |
| 2026-07-18 | Workspace 29, server 48, web 33 focused tests; root lint/typecheck/test/build | focused automated, integration, and broad supporting evidence | Credential race/generation cleanup, atomic bounded throttling, stable/existing-install workspace identity, rollback-safe durable rename recovery, early/late parent-swap denial, guarded logout, dynamic tree focus, drawer/save accessibility, and verified responsive pane controls. | Passing; Vite reports a 718 KB chunk warning and Adonis reports a Node deprecation warning |
| 2026-07-18 | Storybook 18/18 and Playwright 2/2 | component preview/accessibility and deterministic production E2E evidence | Accepted browser-renderable auth, workbench, editor, search, and plugin states plus compiled desktop/narrow owner flow, focus, and logout behavior. Host-only setup/reset and capability-denial states remain command/headless evidence. | Passing; manual visual/device/screen-reader confirmation remains pending |
| 2026-07-18 | Scoped Change and GMD-001/GMD-002/GMD-003 validation | broad supporting gate | Reconciled change artifacts and Epic implementation/evidence references are structurally valid with zero errors or warnings. | Passing |
| 2026-07-18 | `sdd-orphan-audit --changed-from develop --epic` for GMD-001, GMD-002, and GMD-003 | changed-surface reverse-traceability inventory | 108 candidates classify across the three affected Epics or shared framework/test/documentation support; all implementation and verification references resolve, with no stranded replacement surface identified. | Passing; zero missing implementation or verification references |

## Manual Feedback

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|

## Planning Updates

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|

## Design Updates

| Date | Feedback / Discovery | Classification | Reference / Target | Preserve / Change / Non-Goals | Artifact Updates | Next Apply Starting Point |
|---|---|---|---|---|---|---|

## Manual UI Confirmation

- Status: pending user
- App URL / route: `http://127.0.0.1:3333/` with the disposable setup below running.
- Required setup or test data: From the repository root, create a disposable directory with `mktemp -d`, record the printed path, and create `workspace/Projects` plus `state` beneath it. Add `Welcome.md` and `Projects/Plan.md` containing non-sensitive test Markdown. Export absolute `GRAPHITEMD_WORKSPACE_ROOT` and `GRAPHITEMD_STATE_DIR` paths, `GRAPHITEMD_ALLOWED_ORIGINS=http://127.0.0.1:3333`, and a newly generated throwaway `APP_KEY` of at least 32 characters.
- Host setup: Run `pnpm --filter @graphitemd/server exec node ace owner:setup`; confirm both password prompts mask input and no credential/hash is printed. Run `pnpm build && pnpm start`, keeping the terminal open. After browser testing, stop the service before running `pnpm --filter @graphitemd/server exec node ace owner:reset`; confirm its password prompts are masked, restart the service, and verify the prior browser session and credential are rejected.
- Browser steps: After implementation rereview passes, log in from a fresh browser and confirm it does not claim an earlier session expired. Open a second private/browser-profile session with the same owner credential and keep it active for revocation testing. Inspect the desktop regions and collapse/resize controls; browse/search/open a nested note; exercise Source and Rendered modes; edit without waiting for save, attempt navigation, cancel it, and confirm the draft and URL remain; then save. In another terminal, append a line to the open test note, edit again in the browser, and confirm the conflict preserves the draft and offers recovery. Rename the note, reload its URL, and restart the service to confirm the same note URL remains valid. Inspect Settings; disable/re-enable System Status; log out with a clean draft; sign in again; change the password; and confirm the second session is revoked.
- Narrow-browser steps: At approximately 390x844, confirm Files/Search/Context/Settings remain reachable, drawers contain and restore keyboard focus, tree Arrow/Home/End navigation works, controls are touch-sized, safe areas do not hide controls, and the page has no horizontal overflow.
- Screen-reader steps: With VoiceOver, confirm the login form, Files tree selection/expansion, drawer name and close control, editor identity, save-state announcements, search result/recovery state, Settings/plugin status, and logout/password errors are announced in a usable order without relying on color.
- Expected result: The complete foundation path is usable without copying workspace files to the browser, unsafe writes, external search, or plugin privilege bypass.
- Feedback that would change artifacts: Authentication or host-recovery friction, unusable mobile composition, source loss, confusing conflict/rename recovery, unacceptable plugin UX, or a request to expand the first Change into Assistant behavior.

## Blockers / Open Questions

- Planning: None.
- Implementation setup: Resolved. The user authorized promotion and required Git actions; baseline history and the policy-defined branches now exist.

## Closeout

- Change status: in_progress; the fresh review against `0196774` returned implementation findings to `/sdd-apply`.
- Epic files updated: GMD-001, GMD-002, and GMD-003 remain structurally valid, but implementation/evidence truth must be reconciled again with the fresh findings.
- Story labels/references and Requirement/Scenario IDs current: Yes for planned scope.
- Implemented By maps current: Yes; new auth, workspace, plugin persistence, and browser owners have stable code anchors.
- Scenario-mapped Verified By maps current: No; the fresh review identified missing risk-shaped evidence and an overstated GMD-002 preview claim. Manual confirmation remains an explicit gap.
- Superseded earlier Epic truth reconciled: Not applicable; spike Epics remain reference truth in their own repositories.
- ADR status: Four Accepted ADRs remain linked; plugin isolation and client runtime-contract obligations are not yet satisfied. Initial rename-receipt retention is now documented.
- Release communication current: README and public-safe `CHANGELOG.md` describe the implemented foundation and operator boundary.
- `sdd-review` verdict: `changes-requested` against source commit `019677434dd1108798ef68e63f4db85d9fe0ee78` and target `develop@15901773ce4565c4facfc7c50d1835463ef808c8`.
- Review record: `docs/changes/2026-07-18-foundation-workspace-slice/review.md`.
- `review.md` findings resolved: No; two blocking and seven required roots remain for `/sdd-apply`.
- Planning updates resolved: No; accepted runtime-contract, responsive composition, plugin authority/isolation, and preview behavior remain incomplete.
- Manual UI confirmation status: pending user; deterministic desktop/narrow browser evidence passes, but user acceptance remains intentionally unclaimed.
- PR / merge state: Local implementation branch created; no remote, PR, or merge.
- Deferred scope accepted: Recorded in proposal/design/Epics.
- Change moved to `docs/changes/closed/`: No; active repository Change.
