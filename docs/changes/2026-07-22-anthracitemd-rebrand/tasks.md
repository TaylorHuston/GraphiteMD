---
status: in_progress
---
# Tasks: AnthraciteMD Rebrand

## Resume Here

- Last completed action: completed independent `/sdd-review`, remediated its consolidated findings in `5aa7af4`, and passed regression and aggregate gates on that exact candidate.
- Next action: obtain manual user UI confirmation, then recheck review staleness before any authorized merge-and-close workflow.
- Expected dirty files: none.
- Known blockers: none.

## Task Checklist

- [x] Planning defines canonical identity, legacy boundaries, migration conflicts, session transition, Epic ownership, topology order, rendered evidence, and aggregate gates.
- [x] R1 canonicalize package scope, SDK types, production condition, UI copy, runtime metadata, tests, and lockfile.
- [x] R2 implement canonical environment variables with legacy fallback and precedence tests.
- [x] R3 implement safe workspace and implicit machine-state migration with conflict/symlink tests.
- [x] R4 migrate auth/session identity, preserve credentials/provider state, invalidate legacy sessions, and test sign-in recovery.
- [x] R5 reconcile README, changelog, current ADRs, canonical Epics/IDs/directories, current private planning truth, repository guidance, and SDD config.
- [x] Render desktop/mobile sign-in and workbench identity; inspect accessibility, console, and network state.
- [x] Run focused and aggregate verification, stale-identifier inventory, reverse traceability, and implementation self-check.
- [x] Transition the recorded candidate to `in_review` and hand off to `/sdd-review`.

## Implementation Ledger

| Date | Slice | Result | Commit / Ref |
|---|---|---|---|
| 2026-07-22 | Replan | Compatibility, migration, auth, topology, and verification obligations resolved. | planning only |
| 2026-07-22 | R1-R4 | Canonical identity, configuration compatibility, safe state migration, and auth transition implemented; combined because package/config/migration imports overlap the same runtime files. | `fac4c2c` |
| 2026-07-22 | R5 | GitHub repository, local checkout, origin, SDD IDs, private planning directory/current truth, Epic IDs/directories, and rendered identity reconciled. | `046e82c`; workspace index `dcaa925`; private planning `e6919508`, `26e44c41` |

## Verification Ledger

| Date | Check | Evidence Type | Result |
|---|---|---|---|
| 2026-07-22 | `sdd validate` for Change and AMD-001 through AMD-004 | structural planning gate | passed; zero errors and zero warnings |
| 2026-07-22 | reverse-traceability audit from `develop` | ownership evidence | passed; zero missing Implemented By or Verified By references; remaining candidates classified as cross-cutting configuration, presentation, fixtures, and test support |
| 2026-07-22 | fresh-context code, docs/topology, and security self-check | implementation review | passed after reconciling design mappings, current topology links, changelog, and this ledger; no code or security findings |
| 2026-07-22 | `pnpm lint`; `pnpm typecheck`; `pnpm test` | broad supporting gates | passed; 255 tests across contracts, domain, workspace, SDK, web, bundled plugins, and server |
| 2026-07-22 | `pnpm build`; `pnpm test:storybook`; `pnpm test:e2e`; `pnpm audit --audit-level high` | production build, rendered interaction automation, deterministic E2E, security gate | passed; 31 Storybook tests, 2 E2E tests, no known vulnerabilities |
| 2026-07-22 | Storybook direct browser inspection | rendered UI verification | desktop/mobile sign-in and desktop/mobile workbench loaded with AnthraciteMD/A identity, meaningful content, no error overlay; one earlier invalid story-ID console error was explained and not present on inspected stories |
| 2026-07-22 | GitHub API, Git origin, filesystem, and `sdd context` | topology evidence | `TaylorHuston/AnthraciteMD`, local/private `anthracitemd` paths, AnthraciteMD origin, and Space/repository ID all resolved |
| 2026-07-22 | independent `/sdd-review` focused evidence | focused automated proof | passed on `5aa7af48216cf8c9390e3279ea4aa3a6138330bc`: 47 server migration/config/auth tests, 33 web config/identity tests, 40 workspace tests, and 17 plugin-SDK tests |
| 2026-07-22 | independent `/sdd-review` aggregate candidate | fresh aggregate candidate gate | passed on `5aa7af48216cf8c9390e3279ea4aa3a6138330bc`: lint, typecheck, 256 tests, build, 31 Storybook tests, 2 E2E tests, and no known audit vulnerabilities |
| 2026-07-22 | independent `/sdd-review` prospective integration | integration-candidate proof | clean merge tree `709051c63676dd3e8f56fba6f69ef71717e376b3`, identical to the reviewed source tree because `develop` is the merge base and source is not behind |

## Planning Updates

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-07-22 | Full rename crosses persistent state, configuration precedence, auth/session identity, SDD ownership, and external topology. | in-scope refinement; technical constraint | Added R1-R5, migration conflict behavior, intentional session invalidation, historical-evidence policy, topology sequencing, and concrete verification. | `/sdd-apply` R1 canonical identity |

## Implementation Risk And Confirmation Matrix

| Requirement / Surface | End-State Invariant | Risk / Failure Mode | Check Needed | Status |
|---|---|---|---|---|
| R1 packages/UI | AnthraciteMD is canonical and all imports/build conditions resolve. | split identity or broken production resolution | package tests, build, stale-name inventory, rendered UI | proved |
| R2 environment | canonical wins; legacy is fallback only | invalid canonical silently masked or config drift | canonical-only, legacy-only, both-set, invalid-canonical tests | proved |
| R3 state | data migrates atomically without merge/delete/symlink traversal | loss, unsafe traversal, conflicting sources | populated migration plus conflict and symlink tests | proved |
| R4 auth | owner/provider state survives; legacy sessions fail; new login works | lockout or stale trigger/session acceptance | security migration and HTTP auth tests | proved |
| R5 topology | GitHub/local/SDD/private paths agree | broken origin, context, links, or historical evidence | provider query, origin, context, validation, link scan | proved |

## Pattern Parity Matrix

| Concern | Reference | New Contract | Proof | Status |
|---|---|---|---|---|
| workspace migration safety | existing `.graphite` -> `.graphitemd` migration | `.graphite` or `.graphitemd` -> `.anthracitemd` | focused workspace tests | proved |
| machine state safety | workspace confinement rules | implicit default-only machine migration | focused security tests | proved |

## Boundary Contract Matrix

| Producer | Boundary | Consumer | Mapping / Invariant | Evidence | Status |
|---|---|---|---|---|---|
| environment | server configuration | workspace/security/web runtime | canonical precedence and exact legacy fallback | focused configuration tests | proved |
| package manifests | Node/pnpm resolution | server/web/plugins/tests | scope and production condition match everywhere | typecheck/build/import-boundary tests | proved |
| security database | session payload/triggers | authenticated routes | new key accepted; old sessions invalid | security and HTTP tests | proved |

## Stateful Transition Matrix

| Start State | Trigger | Expected Invariant | Proof | Result |
|---|---|---|---|---|
| legacy workspace only | first canonical startup | entire directory atomically becomes `.anthracitemd` | workspace migration test | passed |
| canonical plus any legacy | startup | fail without mutation | conflict test | passed |
| legacy machine state | implicit default startup | credentials/provider state move; sessions require re-login | security migration/auth test | passed |

## Decision Fan-Out Ledger

| Date | Decision | Affected Surfaces | Status |
|---|---|---|---|
| 2026-07-22 | Rebrand everything; retain narrow legacy migration/config boundaries and historical evidence. | code, packages, env, persistence, auth, UI, tests, README, changelog, ADRs, Epics, SDD/private topology, GitHub/local path | applied and verified |

## Verification Environment

| Obligation | Required Setup | Readiness | Resolution |
|---|---|---|---|
| migration/auth | disposable workspace, home/state root, and database | ready through test fixtures | passed in focused and aggregate tests |
| rendered identity | local Storybook or production app at desktop/mobile | available | passed in Storybook automation and direct inspection |
| E2E | Playwright disposable roots | available | passed; 2 tests |
| topology | GitHub CLI plus local filesystem and SDD config | available; run last | passed after coordinated cutover |

## Verification Scope Decision

- Aggregate gate required: yes; the change crosses packages, persistence, auth, process-global configuration, UI, SDD truth, and repository topology.
- Authoritative gates: root lint, typecheck, test, build, Storybook, E2E, audit, scoped SDD validation, stale-identifier inventory, and clean prospective integration tree.
- Exact candidate and results: `5aa7af48216cf8c9390e3279ea4aa3a6138330bc`; fresh authoritative gates passed with 256 tests, 31 Storybook tests, 2 E2E tests, and a clean dependency audit. The following review-ledger/status-only commits require only artifact-observing validation and conflict/diff rechecks.
- Remote CI role: corroborating.

## Manual UI Confirmation

- Status: pending user
- Route: sign-in and authenticated workbench.
- Confirm AnthraciteMD name and `A` mark on desktop/mobile, normal sign-in after migration, and no former brand in current UI.
- Defects include old branding outside declared compatibility/history, inaccessible labels, layout regression, or inability to sign in after migration.

## Visual Verification Matrix

| Surface | Viewport | State | Expected | Tool | Result |
|---|---|---|---|---|---|
| sign-in | 1440x900 and 390x844 | default | AnthraciteMD name and A mark; unchanged usable layout and accessible labels | Storybook/agent-browser; screenshots directly inspected | passed; no clipping/overlay, accessible password/button, clean inspected story |
| workbench | 1440x900 and 390x844 | populated/files drawer | AnthraciteMD identity with no layout or interaction change | Storybook/agent-browser; screenshots directly inspected | passed; desktop A rail and AnthraciteMD note content, mobile drawer usable, no overlay |

## Blockers / Open Questions

- None.

## Review Handoff Candidate

- Integration target: `develop`
- Candidate source commits: `fac4c2c`, `046e82c`, review remediation `5aa7af4`
- Intended implementation and topology evidence committed: yes
- Required risk, fan-out, environment, aggregate, reverse-traceability, fresh-context review, regression rereview, and integration-candidate gates: passed

## Closeout

- Review verdict: `ready` at `5aa7af48216cf8c9390e3279ea4aa3a6138330bc`; no blocking or required findings remain after remediation.
- Review record: task ledger (no separate `review.md` created); manual confirmation remains `pending user`.
- Change status: transitioning back to `in_review` after review remediation.
- Epic/current docs/topology reconciliation: complete. Historical GMD review reports remain provenance-preserving evidence and are not represented as fresh AMD verification reports.
- PR, merge, and closeout: not authorized and pending manual confirmation.
