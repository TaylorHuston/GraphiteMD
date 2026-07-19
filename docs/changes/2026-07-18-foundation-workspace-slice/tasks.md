---
status: in_progress
---
# Tasks: Foundation Workspace Slice

## Resume Here

- Last completed action: `GMD-002/S1 R1` package authority is implemented and focused tests prove opaque identity, fail-closed root validation/replacement, and reconnect stability; authenticated HTTP delivery remains intentionally pending on `GMD-001`.
- Next action: Implement `GMD-001/S1 R1` host-local owner setup and the machine-local security store, then add authenticated delivery for workspace state after `GMD-001/S1 R2`.
- Active branch/ref: `change/foundation-workspace-slice` from `develop`; baseline commit `1590177` exists on `main` and `develop`.
- Expected dirty files: `packages/workspace/`, `apps/server/`, `packages/contracts/`, `docs/epics/gmd-002-markdown-workbench/epic.md`, and this ledger for the current Requirement slice.
- Known blockers: None. Spike repositories are read-only reference sources.

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

- [ ] 4.1 Establish the clean monorepo foundation from the curated Coordinator skeleton.
  - [ ] Copy and rename root pnpm, TypeScript, lint, build, Storybook, Playwright, AdonisJS, and Vite scaffolding. (pnpm, TypeScript, lint/build, AdonisJS, and Vite complete; Storybook and Playwright remain.)
  - [x] Remove Coordinator-specific routes, SDD/Git/Pi/runtime packages, assets, and state assumptions before GraphiteMD behavior is added.
  - [x] Create runtime-validated GraphiteMD contract, domain, workspace, plugin SDK, and plugin testkit package boundaries.
  - [x] Document install, dev, lint, typecheck, test, build, and production start commands.
- [ ] 4.2 Implement `GMD-001/S1` Establish And Authenticate The Owner Account through BDD/TDD.
  - [ ] R1 host-local first-owner setup and existing-owner refusal.
  - [ ] R2 valid/invalid login, session regeneration, protected APIs, and logout invalidation.
  - [ ] R3 exact-origin, secure-cookie, and CSRF/XSRF enforcement.
- [ ] 4.3 Implement `GMD-001/S2` Maintain And Recover Access through BDD/TDD.
  - [ ] R1 authenticated password change with global session invalidation.
  - [ ] R2 host-local atomic reset and cancellation safety.
  - [ ] R3 current-session reconnect and invalidated-session recovery.
- [ ] 4.4 Implement `GMD-002/S1` Browse And Read Workspace Notes through BDD/TDD.
  - [ ] R1 one host-configured service-owned workspace and safe reconnect. (package authority and focused proof complete; authenticated Adonis delivery pending `GMD-001/S1 R2`.)
  - [ ] R2 nested Markdown inventory, `.graphite`/ignore/unsafe exclusions, and empty state.
  - [ ] R3 exact source/revision reads with guarded opaque-resource history.
  - [ ] R4 desktop and mobile-browser workbench composition.
- [ ] 4.5 Implement `GMD-002/S2` Edit And Rename A Note Safely through BDD/TDD.
  - [ ] R1 transplant the newer source-preserving editor and Dashboard-only general-note regressions.
  - [ ] R2 transplant single-flight autosave, version conflicts, late-response isolation, and draft guards.
  - [ ] R3 transplant no-overwrite rename and authoritative post-commit reconciliation.
  - [ ] R4 confine authenticated owner writes and preserve exact source/file mode.
- [ ] 4.6 Implement `GMD-002/S3` Search The Workspace Locally through BDD/TDD.
  - [ ] R1 adapt Dashboard title/path/frontmatter/body FTS and result-selection behavior.
  - [ ] R2 adapt rebuild/reconciliation to `.graphite/cache/search.sqlite` and `better-sqlite3`.
  - [ ] R3 prove baseline search never invokes an external provider.
- [ ] 4.7 Implement `GMD-003/S1` Inspect Control And Trust Bundled Plugins through BDD/TDD.
  - [ ] R1 manifests, compatibility, plugin inventory, and failed activation.
  - [ ] R2 inspectable enable/disable state and contribution teardown/restart.
  - [ ] R3 capability broker, opaque identities, normalized denial, and forbidden imports.
  - [ ] R4 namespaced state, recovery, shared conformance, and the System Status plugin.
- [ ] 4.8 Reconcile all affected Epic `Implemented By` and Implementation Gaps immediately after each Requirement slice.

### 5. Reuse And Migration Discipline

- [ ] 5.1 For every row in `design.md`'s Reuse And Adaptation Map, record the transplanted source files/tests and their GraphiteMD targets in the Implementation Ledger.
- [ ] 5.2 Port the source spike's applicable regression tests with each implementation slice; do not postpone all test migration until the end.
- [ ] 5.3 When overlapping implementations differ, keep the newer/safer Coordinator owner and add Dashboard-only behavior as focused adaptations rather than merging two whole modules blindly.
- [ ] 5.4 Confirm no imports, package dependencies, private paths, product names, environment variables, assets, or runtime state still couple GraphiteMD to either reference repository.
- [ ] 5.5 Inventory the final GraphiteMD source/test surface and classify every behavior-bearing file under one affected Epic or as explicit support/generated infrastructure.

### 6. Verification

- [ ] 6.1 Add focused GraphiteMD evidence for every implemented Requirement and Scenario.
- [ ] 6.2 Update each Epic `Verified By` map with concrete GraphiteMD repository-relative tests and evidence types.
- [ ] 6.3 Run the root `lint`, `typecheck`, `test`, `build`, Storybook, and deterministic E2E gates introduced by the Change.
- [ ] 6.4 Run desktop and mobile E2E over disposable security/workspace roots for authentication, browse/search, edit/conflict/rename, reconnect, password invalidation, and plugin lifecycle.
- [ ] 6.5 Inspect logs and browser bundles for passwords, hashes, session/CSRF tokens, absolute host paths, real note bodies/snippets, and provider credentials.
- [ ] 6.6 Delete the derived index and prove equivalent search rebuild without copying the database.
- [ ] 6.7 Verify `.graphite/` canonical/config/plugin-state rules and accepted ADR assumptions.
- [ ] 6.8 Run scoped `sdd validate` after Epic evidence reconciliation.

### 7. Documentation Review And Closeout

- [ ] 7.1 Update README, architecture, testing, security/deployment guidance, and `CHANGELOG.md` with current implemented behavior only.
- [ ] 7.2 Run `/sdd-review` as the independent local integration gate for Story truth, source reuse, tests, security, docs, ADRs, and branch readiness.
- [ ] 7.3 Record the review outcome in `review.md` or the ledger and resolve or explicitly defer all validated findings.
- [ ] 7.4 Walk the user through the required disposable-workspace desktop/mobile confirmation and record `user confirmed` or `accepted gap`.
- [ ] 7.5 Ensure proposal/design/tasks and all Epics no longer claim completed behavior is unimplemented, unverified, or pending.
- [ ] 7.6 Confirm current Change status, branch/ref, review record, manual confirmation, release communication, and PR/merge state agree.
- [ ] 7.7 Keep `status: in_review` until all independent review and acceptance gates are complete.
- [ ] 7.8 Commit, push, open a PR, merge, or close only after the repository policy and explicit user authorization permit each operation.

## Implementation Ledger

Record one row per meaningful transplant or Requirement slice. Include both the reference source and the GraphiteMD target so reuse remains auditable.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-18 | Planning provenance inventory | `/sdd-change --plan`; accepted ADRs; Dashboard and Coordinator live code/tests | Reference monorepos, Epics, architecture/testing docs, manifests, contracts, editor, file, index, capability, and harness surfaces | Reuse map recorded; no application code copied yet | uncommitted |
| 2026-07-18 | Apply Discovery and promotion | `/sdd-apply`; TDD; component accessibility/composition guidance; Context7 AdonisJS v7 docs | Active Change, branch policy, PRD, ADRs, Epics, both spike surfaces | Change promoted and transitioned to `in_progress`; exact transplant map confirmed; official session regeneration and credentialed SPA guidance reconfirmed | `d8c827a` |
| 2026-07-18 | Monorepo enabling slice for `GMD-002/S1 R1` | Delegated implementation; curated Coordinator scaffold | Root workspace; `apps/server`; `apps/web`; contracts/domain/workspace/plugin packages; System Status plugin | Compileable service-first skeleton established without Coordinator product behavior; package boundary tests pass; generated artifacts removed and ignored in `f3e4269` | `d8c827a`, `f3e4269` |
| 2026-07-18 | `GMD-002/S1 R1` service-owned workspace authority | Delegated TDD; Coordinator confinement/reconnect patterns adapted | `packages/workspace`; `GMD-002` Epic | Real configured-root validation, opaque identity, root replacement invalidation, and stable reconnect snapshot implemented; authenticated HTTP proof remains an explicit gap | commit pending |

## Verification Ledger

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-18 | `sdd context` and repository/Space resolution | broad supporting gate | Planned Change targets only the active `graphitemd` canonical repository while spikes remain references. | Passing |
| 2026-07-18 | Current AdonisJS v7 documentation lookup | documentation evidence | Official session guard, session regeneration, Shield XSRF cookie, exact credentialed CORS, and SPA cookie patterns exist for the planned auth boundary. | Passing |
| 2026-07-18 | Planned Change plus `GMD-001`, `GMD-002`, and `GMD-003` scoped `sdd validate` runs | broad supporting gate | Planned Change and every affected Epic are structurally valid with zero errors or warnings. | Passing |
| 2026-07-18 | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | broad supporting gate | The new nine-project workspace installs, compiles, tests, and produces server/web builds. | Passing; Adonis emits a Node deprecation warning during build |
| 2026-07-18 | `pnpm --filter @graphitemd/workspace test`; workspace lint/typecheck/build | focused automated evidence plus supporting gates | `GMD-002/S1/R1-S1..R1-S3`: opaque authority, invalid/replaced-root denial, and reconnect snapshot behavior over disposable real directories. | Passing: 4 tests |

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
- App URL / route: To be recorded after implementation; expected same-origin root route.
- Required setup or test data: Disposable GraphiteMD state directory, temporary Markdown workspace, one owner credential, nested/searchable/conflicting notes, and System Status plugin.
- Steps for the user: Log in; inspect desktop/mobile shell; browse/search/open; edit in Source and Rendered; trigger save/conflict/rename recovery; inspect Settings; disable/enable System Status; change password; confirm the old session is rejected.
- Expected result: The complete foundation path is usable without copying workspace files to the browser, unsafe writes, external search, or plugin privilege bypass.
- Feedback that would change artifacts: Authentication or host-recovery friction, unusable mobile composition, source loss, confusing conflict/rename recovery, unacceptable plugin UX, or a request to expand the first Change into Assistant behavior.

## Blockers / Open Questions

- Planning: None.
- Implementation setup: Resolved. The user authorized promotion and required Git actions; baseline history and the policy-defined branches now exist.

## Closeout

- Change status: in_progress; implementation started.
- Epic files updated: Three draft Epics created and fully planned; implementation/evidence pending.
- Story labels/references and Requirement/Scenario IDs current: Yes for planned scope.
- Implemented By maps current: All behavior honestly recorded as not implemented.
- Scenario-mapped Verified By maps current: Empty with explicit Verification Gaps.
- Superseded earlier Epic truth reconciled: Not applicable; spike Epics remain reference truth in their own repositories.
- ADR status: Four Accepted ADRs; implementation validation pending.
- Release communication current: Planned for README and new CHANGELOG during implementation.
- `sdd-review` verdict: Not run; implementation has not begun.
- Review record: None.
- `review.md` findings resolved: Not applicable.
- Planning updates resolved: None.
- Manual UI confirmation status: pending user after implementation.
- PR / merge state: Local implementation branch created; no remote, PR, or merge.
- Deferred scope accepted: Recorded in proposal/design/Epics.
- Change moved to `docs/changes/closed/`: No; active repository Change.
