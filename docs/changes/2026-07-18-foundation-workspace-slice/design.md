# Design: Foundation Workspace Slice

## Context

GraphiteMD began this Change as a clean canonical repository with four accepted ADRs and no application code. The implementation now follows the service-first monorepo selected below; this section retains the original spike evidence that informed that choice:

- Dashboard proves general Markdown inventory, YAML parsing, source-preserving editing, note history, conflict-safe autosave, rename, disposable FTS search, responsive workbench behavior, a static bundled-plugin registry, Storybook fixtures, and safe disposable-vault E2E.
- Coordinator proves the intended pnpm/AdonisJS/React monorepo, framework-neutral contracts and domain packages, persistent service authority, opaque resource locators, bounded and no-follow file operations, native no-overwrite rename, runtime-neutral capability mediation, service-owned reconnect behavior, normalized failure contracts, and a broader test harness.

The overlap is substantial. Coordinator's later editor and artifact changes incorporate or advance many Dashboard patterns, but Dashboard retains general-vault parsing, search, configuration, and regression cases that Coordinator never needed. The implementation should therefore start from selective code/test transplantation, not a blank framework generator and not an in-place rename of either spike.

The only major foundation capability without a direct spike implementation is remote single-user authentication. Current AdonisJS v7 documentation confirms the official session guard, session regeneration, Shield CSRF/XSRF support, exact credentialed CORS configuration, secure cookies, password hashing, and Ace commands needed for this boundary.

## Goals / Non-Goals

**Goals:**

- Deliver one runnable, deployable, authenticated GraphiteMD vertical slice.
- Prove a browser on another device can use server-owned Markdown without receiving filesystem authority or a local workspace copy.
- Reuse the safest existing editor, file, search, plugin, contract, component, fixture, and test implementations from both spikes.
- Establish package and API boundaries the later Assistant and development plugins can reuse.
- Keep Markdown and inspectable `.graphite/` files canonical while derived search state remains rebuildable.
- Prove bundled plugins use one manifest, lifecycle, state, contribution, and capability path without privileged shortcuts.

**Non-Goals:**

- Implement the Assistant, model/provider onboarding, proposals, grants, agent runs, or durable AI histories.
- Complete all PRD kernel behavior. Full file/folder lifecycle, backlinks, property editing, and task toggles follow separately.
- Preserve spike package names, product-specific SDD topology, Dashboard's plain Node server, Coordinator's Pi runtime, or either spike's large app component unchanged.
- Ship community plugins, untrusted-code isolation, public hosting, multi-user tenancy, sync, offline support, Electron, or a native mobile app.
- Make a production release, deploy a host, create a remote repository, or migrate a real private workspace during this Change.

## Planning Interview / Story Refinement

- Scope boundary reviewed: The Change stops after secure access, browse/read/edit/rename/search, and one capability-mediated bundled plugin. Assistant behavior and the remaining note lifecycle are named follow-ups.
- User decisions: Reuse both spikes heavily; use a clean repository; keep search in the kernel; make AI core but proposal-first; use an exclusion model for AI reads; retain inspectable workspace state; support private-network browsers before Electron/native mobile; use bundled plugins through the real SDK.
- Assumptions: One host-configured workspace and host-local credential recovery are acceptable for the first technically capable self-hosting audience.
- Deferred scope: AI, advanced lifecycle and knowledge features, development plugins, community plugins, and broader hosting are recorded in the proposal and Epics.
- Story boundaries challenged: Authentication/recovery, Markdown browsing/editing/search, and plugin control have distinct outcomes and evidence maps, so they remain separate Stories across three Epics rather than one oversized “bootstrap” Story.
- Requirements refined: Happy paths, empty states, stale revisions, unsafe paths, invalid credentials, CSRF/origin denial, reconnect, index rebuild, plugin denial, disabled lifecycle, and partial-operation recovery are explicit.
- Scenario gaps considered: Mobile composition, no notes, invalid workspace, external file changes, late saves, indeterminate rename, plugin restart, interrupted password reset, and missing index are covered.
- Open questions that block implementation: None.

## Epic Changes

### Epic: GMD-001 Secure Workspace Access

- Implemented directory: `docs/epics/gmd-001-secure-workspace-access/`
- Canonical file: `docs/epics/gmd-001-secure-workspace-access/epic.md`

#### Epic

The self-hosting owner establishes and recovers one built-in account while browser sessions remain service-owned, origin/CSRF protected, invalidatable, and separate from workspace files.

#### Story GMD-001/S1: Establish And Authenticate The Owner Account

- R1 Host-local owner setup: prove first setup and refusal to overwrite an existing owner.
- R2 Browser session authentication: prove valid login/session regeneration, generic invalid login, and server-side logout invalidation.
- R3 Browser request protection: prove missing CSRF and untrusted credentialed origins fail before mutation.
- Current implementation and verification: Reconciled in the canonical Epic Story; this design entry records the accepted planning baseline.
- Current gaps: See the canonical `GMD-001/S1` Implementation Gaps and Verification Gaps; this planning snapshot is not the evidence ledger.

#### Story GMD-001/S2: Maintain And Recover Access

- R1 In-app password change: prove current-password validation and global session invalidation.
- R2 Host-local password reset: prove atomic interactive reset and cancellation safety.
- R3 Session reconnection: prove valid reconnect and invalidated-session return to login.
- Current implementation and verification: Reconciled in the canonical Epic Story; this design entry records the accepted planning baseline.
- Current gaps: See the canonical `GMD-001/S2` Implementation Gaps and Verification Gaps; this planning snapshot is not the evidence ledger.

### Epic: GMD-002 Markdown Workbench

- Implemented directory: `docs/epics/gmd-002-markdown-workbench/`
- Canonical file: `docs/epics/gmd-002-markdown-workbench/epic.md`

#### Epic

The authenticated owner browses, reads, edits, renames, and searches Markdown in one server-hosted workspace while exact files remain canonical and responsive browser clients remain adapters.

#### Story GMD-002/S1: Browse And Read Workspace Notes

- R1 Service-owned workspace authority: prove valid open, invalid-root fail-closed behavior, and browser reconnect.
- R2 Confined Markdown inventory: prove nested tree, internal/unsafe exclusion, and empty state.
- R3 Exact note reading and navigation: prove source/revision reads plus safe Back/Forward/reload.
- R4 Responsive workspace composition: prove desktop and mobile-browser access.
- Current implementation and verification: Reconciled in the canonical Epic Story; this design entry records the accepted planning baseline.
- Current gaps: See the canonical `GMD-002/S1` Implementation Gaps and Verification Gaps; this planning snapshot is not the evidence ledger.

#### Story GMD-002/S2: Edit And Rename A Note Safely

- R1 Source-preserving editor: prove exact mode round-trip, supported live presentation, and literal fallback.
- R2 Conflict-safe autosave: prove debounced save, single-flight queue, conflict retention, and guarded transitions.
- R3 Safe selected-note rename: prove success reconciliation, pre-commit denial, and post-commit reconciliation.
- R4 Confined human writes: prove traversal/symlink denial and direct owner authority distinct from agent grants.
- Current implementation and verification: Reconciled in the canonical Epic Story; this design entry records the accepted planning baseline.
- Current gaps: See the canonical `GMD-002/S2` Implementation Gaps and Verification Gaps; this planning snapshot is not the evidence ledger.

#### Story GMD-002/S3: Search The Workspace Locally

- R1 Baseline search experience: prove matches, empty/no-result states, and recoverable index failure.
- R2 Rebuildable search projection: prove deletion/rebuild, external-source convergence, and `.graphite/` exclusion.
- R3 Local search boundary: prove baseline queries and note content stay on the host.
- Current implementation and verification: Reconciled in the canonical Epic Story; this design entry records the accepted planning baseline.
- Current gaps: See the canonical `GMD-002/S3` Implementation Gaps and Verification Gaps; this planning snapshot is not the evidence ledger.

### Epic: GMD-003 Bundled Plugin Platform

- Implemented directory: `docs/epics/gmd-003-bundled-plugin-platform/`
- Canonical file: `docs/epics/gmd-003-bundled-plugin-platform/epic.md`

#### Epic

The owner inspects and controls bundled plugins while manifests, capability mediation, namespaced state, contribution lifecycle, and recovery are enforced through one production path.

#### Story GMD-003/S1: Inspect Control And Trust Bundled Plugins

- R1 Validated plugin inventory: prove compatible activation and invalid/incompatible failure.
- R2 Owner-controlled enablement: prove contribution removal and restart persistence.
- R3 Capability-mediated access: prove declared in-scope operations and denied out-of-scope operations.
- R4 Namespaced inspectable state and recovery: prove isolation, interruption recovery, and shared conformance.
- Current implementation and verification: Reconciled in the canonical Epic Story; this design entry records the accepted planning baseline.
- Current gaps: See the canonical `GMD-003/S1` Implementation Gaps and Verification Gaps; this planning snapshot is not the evidence ledger.

## Epic File Rules

- Stories remain embedded in their Epic files and use Epic-scoped `S#`, `R#`, and `R#-S#` identifiers.
- Spike Story IDs remain provenance, not GraphiteMD aliases.
- During implementation, every Requirement must gain a primary GraphiteMD code anchor or remain an explicit Implementation Gap.
- Existing spike tests are porting sources; `Verified By` will name GraphiteMD repository-relative tests after transplantation, not cross-repository files.

## Technical Options

### Option 1: Selective Transplant Into A Clean Service-First Monorepo

- Summary: Seed the repository from Coordinator's monorepo and service boundaries, then transplant the strongest Dashboard and Coordinator implementations into GraphiteMD-owned packages and contracts.
- User impact: Delivers the intended product boundary with proven behavior and fewer regressions.
- Implementation complexity: Moderate; requires deliberate extraction and renaming but avoids re-solving known problems.
- Reversibility: High at package seams; the clean repository keeps product-specific code explicit.
- Client surfaces: Responsive React/Vite browser now; future native, CLI, and integration clients use the same service contracts.
- API / contract shape: Versioned `/api/v1` JSON contracts with runtime schemas and same-origin production sessions.
- Frontend/backend boundary: AdonisJS owns authority; React owns presentation and client-local interaction state.
- Data / schema impact: Introduces machine-local security state, `.graphite/` workspace config/plugin state, and a disposable search index.
- Auth / security impact: Uses official Adonis session/auth/security packages and adapts Coordinator's confinement patterns.
- Testability: Strongest option because both spike suites can be transplanted and compared.
- Operational risk: Moderate around extraction errors and initial deployment configuration.
- Fit with project conventions: Best fit with every accepted ADR and the clean-repository decision.

### Option 2: Fork Coordinator And Remove Coordinator-Specific Behavior

- Summary: Copy the Coordinator repository wholesale, rename packages, and delete SDD, Git, Pi, and workflow behavior.
- User impact: Reaches a runnable shell quickly but risks hidden Coordinator assumptions in workspace identity, APIs, state, and UI.
- Implementation complexity: Low initially, high during subtraction and orphan cleanup.
- Reversibility: Low after deletion/refactoring obscures which inherited behavior is intentional.
- Client surfaces: Correct service/client topology.
- API / contract shape: Starts with SDD/workspace routes that do not match GraphiteMD.
- Frontend/backend boundary: Mostly correct.
- Data / schema impact: Carries Coordinator state concepts that conflict with `.graphite/` workspace state.
- Auth / security impact: Loopback trust is insufficient for remote browsers.
- Testability: Large suite, but much of it proves the wrong product.
- Operational risk: High risk of inherited product coupling and stranded code.
- Fit with project conventions: Better architectural seed than Dashboard, but not acceptable as a blind fork.

### Option 3: Fork Dashboard And Replace Its Server/Plugin Boundaries

- Summary: Copy Dashboard wholesale, retain the PKM UI, and replace the plain Node service with AdonisJS plus new contracts and capabilities.
- User impact: Preserves the familiar Markdown shell quickly.
- Implementation complexity: High because the largest modules and API boundary would be rewritten while in use.
- Reversibility: Medium.
- Client surfaces: Browser-first, but persistent remote service and alternate clients remain underdeveloped.
- API / contract shape: Existing ad hoc local endpoints would need replacement.
- Frontend/backend boundary: Privileged work is separated, but domain/contracts/plugin boundaries are too weak.
- Data / schema impact: `.dashboard/` semantics must be migrated to `.graphite/`.
- Auth / security impact: No session authentication and a local-root chooser unsuited to remote hosting.
- Testability: Strong Markdown coverage, weak service/plugin foundation.
- Operational risk: High risk of repeating Coordinator's architecture work.
- Fit with project conventions: Conflicts with the accepted AdonisJS and capability-broker architecture.

## Selected Approach

Use Option 1. Start from a curated Coordinator skeleton and transplant behavior into GraphiteMD ownership rather than copying either repository wholesale.

### Repository Shape

```text
apps/
  server/                 AdonisJS authority, auth, HTTP, workspace and plugin adapters
  web/                    React/Vite workbench and client-local interaction state
packages/
  contracts/              Runtime schemas, DTOs, commands, errors, events, and API client types
  domain/                 Framework-neutral workspace, auth-policy, and plugin-lifecycle rules
  workspace/              Markdown parsing, tree, revisions, index/search, and safe operation interfaces
  plugin-sdk/             Manifest, contributions, capability client, state, and lifecycle contracts
  plugin-testkit/         Headless bundled-plugin conformance harness and fixtures
plugins/
  system-status/          Small real bundled plugin using only the production SDK
tests/e2e/                Disposable-workspace browser acceptance
```

Use Coordinator's current verified toolchain as the bootstrap baseline: Node 24, pnpm 11.5.2, TypeScript 6, AdonisJS 7, React 19, Vite 8, Vitest 4, Playwright 1.61, Storybook 10.5, CodeMirror 6, and `better-sqlite3`. Dependency versions should be copied from the current Coordinator lockfile first and upgraded only when a GraphiteMD requirement or current documentation requires it.

### Reuse And Adaptation Map

| GraphiteMD Area | Primary Source | Secondary Source | Action |
|---|---|---|---|
| Root workspace scripts, TypeScript config, pnpm workspace, Adonis bootstrap, React/Vite bootstrap | Coordinator root, `apps/server`, `apps/web` | Dashboard scripts for write-safe E2E modes | Copy and rename the verified skeleton; remove Coordinator routes/services before adding GraphiteMD behavior. |
| Runtime-neutral contracts and domain boundaries | Coordinator `packages/contracts`, `packages/domain` | Dashboard vault-core DTOs | Preserve package separation; replace Coordinator concepts with TypeBox-backed GraphiteMD resource/session/plugin schemas. |
| Workspace open/reconnect and service-owned state | Coordinator workspace registry/projection services | Dashboard root validation and switch regression cases | Adapt to one host-configured workspace; remove SDD topology and browser directory chooser. |
| Markdown discovery, tree, title/path handling, YAML parsing | Dashboard `packages/vault-core` and tree tests | Coordinator manifest inventory and ignore rules | Transplant parsing/tree behavior; use Coordinator's bounded locators, Git-ignore support, and unsafe-entry handling. |
| Read/save/rename confinement | Coordinator `ArtifactWorkspace`, native exclusive rename, capability host | Dashboard version conflicts, atomic save, mixed-line endings, stale-root tests | Use Coordinator's no-follow descriptor and indeterminate-outcome model; port Dashboard's general-note regressions and exact-source expectations. |
| Markdown editor and autosave | Coordinator `MarkdownEditor`, presentation, autosave, history, tree components | Dashboard editor, browser history, wikilink, GFM table, and root-switch tests | Use the newer Coordinator implementation as the base; transplant Dashboard-only general-vault behavior and regression fixtures. |
| Search catalog and FTS | Dashboard vault-core index/search and server/web tests | Coordinator projection-state boundaries | Adapt schema/query/reconciliation to `better-sqlite3`, `.graphite/cache/search.sqlite`, opaque resources, and Adonis services. |
| UI primitives and component states | Coordinator app components and Storybook | Dashboard search, properties, settings, and responsive workbench stories | Copy app-owned primitives and comparison fixtures; compose a GraphiteMD shell rather than either spike's `App.tsx`. |
| Plugin manifest and enablement | Dashboard Core Plugin manifest/config behavior | Coordinator capability contracts and denial semantics | Use Dashboard as the smallest seed, then replace static privileged registration with the production SDK/host. |
| Capability broker and conformance | Coordinator `RepositoryCapabilityHost`, normalized tool contracts, runtime tests | Dashboard disable/abort plugin cases | Generalize to workspace/resource/plugin-state capabilities; add forbidden-import and conformance tests. |
| Test harness | Coordinator Japa/Vitest/Playwright/Storybook setup | Dashboard disposable-vault and write-safety fixtures | Reuse configs and fixture builders; never point automated writes at a real workspace. |
| Auth and remote-browser security | No direct spike implementation | Coordinator origin middleware and machine-state path conventions | Add official Adonis Auth/session/Shield/Lucid behavior; preserve exact-origin and secret-handling disciplines. |

Reuse is considered complete only when the applicable source test is either ported, deliberately replaced by stronger GraphiteMD evidence, or documented as irrelevant because the product boundary changed. Copying source without its regression cases is incomplete.

### Explicit Non-Reuse

- Do not copy Coordinator's SDD topology, board, Git evidence, Pi/OAuth runtime, Developer panels, or run routes into the kernel.
- Do not copy Dashboard's plain Node HTTP server, process-global browser root chooser, `.dashboard/` names, direct Pi chat integration, or large monolithic `App.tsx` as final structure.
- Do not retain loopback-only trust as authentication, absolute paths in client contracts, or raw Node/SQLite access inside bundled plugins.
- Do not import either spike as a workspace dependency. Proven code becomes GraphiteMD-owned code with renamed contracts, tests, and provenance recorded in this Change.

### Authentication And Security State

- Add official AdonisJS v7 Auth session guard, Session, Shield, CORS, hashing, and Lucid/SQLite support.
- Store the owner record, password hash, session rows, and revocation generation in a machine-local `GRAPHITEMD_STATE_DIR/security.sqlite`, outside every workspace and client bundle.
- Provide interactive Ace commands for first setup and reset. Passwords are read from a hidden prompt, never command arguments.
- Use secure, HTTP-only, SameSite cookies in production. Regenerate the session after login. Require XSRF proof for `POST`, `PUT`, `PATCH`, and `DELETE`.
- Prefer one same-origin production URL. Development may use exact configured loopback origins and credentials; production rejects wildcard credentialed CORS.
- Password change/reset increments a revocation generation and deletes or invalidates all sessions atomically.

### Workspace And State Layout

The host points GraphiteMD at one workspace through explicit operator configuration. The browser cannot browse arbitrary server directories.

```text
<workspace>/
  .graphite/
    workspace.json         Stable versioned workspace identity/configuration
    plugins.json           Stable plugin enablement and configuration
    plugins/
      <plugin-id>/         Versioned inspectable durable plugin state
    operations/
      renames/             Durable idempotent rename-recovery receipts
    cache/
      search.sqlite        Disposable catalog and FTS projection
    .gitignore             Ignores cache and operation receipts by default
  <ordinary Markdown and nested repositories>
```

- Use schema-versioned JSON and atomic same-directory replacement for stable GraphiteMD files.
- Exclude `.graphite/` from ordinary note navigation and baseline note search.
- Treat `cache/` as disposable. Prepared rename receipts are removed after a known rollback. Committed receipts are retained indefinitely in this foundation so old-resource retries remain idempotent; a future versioned compaction policy may bound retention only after it preserves that guarantee. Receipts under `operations/` are ignored operational recovery state: retain them in full-filesystem backups when possible, but never treat them as note or configuration authority.
- Back up ordinary workspace content, `workspace.json`, `plugins.json`, and durable plugin namespaces together. Back up machine-local security/session state separately with host secrets; the workspace alone cannot restore owner access.
- Preserve nested Git repository boundaries; this Change does not run Git commands.
- Auth state, secrets, locks, and transient buffers remain outside the workspace.

### Client And Service Contracts

Define runtime-validated contracts in `packages/contracts` for:

- session setup status, login, logout, current owner, password change, and normalized auth errors;
- current workspace identity and generation;
- Markdown inventory nodes, opaque resource locator, display path, source, revision, properties, and availability;
- save, rename, conflict, indeterminate-result, and recovery responses;
- search query/results, index health, and rebuild state;
- plugin manifest, compatibility, permission, contribution, lifecycle, enablement, and normalized denial;
- health/readiness responses.

Use `/api/v1` routes and keep Adonis request/response types out of product packages. The browser uses a small typed client adapter and validates server responses. An OpenAPI document is not required for the first internal route set, but the schemas must permit later OpenAPI generation without changing product semantics.

### Plugin Host

- Service and web plugins expose manifests at build time and receive only `PluginContext` SDK objects.
- The host loads configuration before activation and registers contributions transactionally; failed activation removes partial contributions.
- Bundled plugin packages may not import server internals, database packages, credential services, Node filesystem/process/shell modules, or another plugin's state. Enforce the allowed dependency graph with package exports, TypeScript project references, forbidden-import tests, and review.
- Runtime capability checks remain authoritative even for enabled plugins. The initial in-process bundled-plugin model is trusted first-party code, not a containment boundary for malicious code; community execution remains deferred until process/container and UI sandboxing exist.
- The bundled System Status plugin contributes a small settings/status view and refresh command showing safe service, workspace, index, and plugin health. It exercises service/web contributions, read-only capabilities, events, state, enable/disable, and recovery without stealing a kernel capability.

## Experience Design

- Applicability: Required, but implementation-ready from existing confirmed spike behavior; a separate `/sdd-design --plan` is not required before promotion.
- Confirmed direction: Minimal dark-first Obsidian-like workbench, dense and focused rather than a dashboard of cards. The document is primary; files/search and context become persistent regions on desktop and drawers on mobile.
- User confirmation: The user explicitly framed vanilla GraphiteMD as a minimal focused editor that becomes powerful through plugins, with responsive mobile browser access and AI as a later first-class surface.
- Reference artifacts: Dashboard and Coordinator `Comparison/Workbench` Storybook states, both Markdown editor catalogs, Dashboard search/settings states, and their style guides.

### User Flow And Information Architecture

1. An unauthenticated browser sees only login and service availability.
2. After login, the app restores the current workspace and last safe note route or shows the file/search empty state.
3. Files and search share the navigation region. Selecting either opens the same guarded note transition.
4. The document region contains the title/relative path, Source/Rendered control, restrained save state, and editor.
5. Context exposes generic properties and settings. Plugin settings show System Status and enablement.
6. Password change, logout, index rebuild, and plugin settings live in Settings rather than the editing toolbar.

### Responsive Composition

- Desktop: three regions with resizable/collapsible navigation and context; the centered document measure remains stable.
- Mobile: one primary document surface with touch-safe Files/Search and Context/Settings drawers; no attempt to reproduce simultaneous desktop panes.
- Intermediate widths: overlays or collapsible regions preserve both side surfaces without shrinking the editor below a usable measure.

### Component And State Contract

#### Component Strategy

| Component Or Pattern | Strategy | Initial Owner Or Reference | Required Preview States | Follow-Up |
|---|---|---|---|---|
| Button, IconButton, TextField, EmptyState | adopted reference | Coordinator production components | default, hover, focus, disabled, pending, error | Rename and retheme under GraphiteMD ownership. |
| Markdown editor and rendered presentation | adopted reference | Coordinator editor plus Dashboard regression fixtures | source, rendered, active syntax, table overflow, conflict, read-only display, long source | Preserve exact source and transplant both suites. |
| Files tree and note history | adopted reference | Coordinator manifest tree/history; Dashboard general-note tree | nested, empty, unavailable, selected, collapsed, stale route | Replace SDD owner concepts with workspace resources. |
| Search surface | adopted reference | Dashboard indexed search | idle, loading, results, no results, error, long path, mobile | Adapt to opaque resource contract. |
| Login and password forms | application-specific | GraphiteMD | setup-required, idle, invalid, pending, session-expired, reset-complete | Follow existing form primitives and generic errors. |
| Workbench shell | adopted reference | Dashboard minimal PKM composition with Coordinator primitives | desktop, mobile, empty, service unavailable, dirty note, drawer open | Remove spike product names and specialized panels. |
| Plugin settings and System Status | application-specific | GraphiteMD plugin SDK | enabled, disabled, incompatible, denied, failed activation, recovery | Becomes reference for later bundled plugins. |

Preview reconciliation: `idle`, `invalid`, `pending`, and `session-expired` are browser login previews; `setup-required` and `reset-complete` are host-command states proved through command/HTTP evidence rather than browser-rendered forms. Plugin inventory previews cover enabled, disabled, incompatible, failed-activation, and recoverable workbench states. Denied capability is operation-level headless evidence, not an inventory lifecycle screen; failed activation is the user-visible recovery preview for this bundled-plugin slice.

### Accessibility And Interaction

- Preserve visible keyboard focus, semantic form labels, tree expansion state, selected-resource state, and accessible save/error announcements.
- Keep touch targets usable on narrow screens and honor reduced motion.
- Source remains available to assistive technologies even when Rendered presentation decorates it.
- Authentication and plugin errors must be identified by text, not color alone.

### Visual Direction

- Dark-mode-first, utilitarian, quiet structural surfaces, one restrained action color, conventional semantic status colors, and locally bundled Geist typography.
- Avoid oversized cards, decorative gradients, marketing composition, and generic AI chrome.
- GraphiteMD's final brand identity remains open, so this Change establishes a neutral product shell rather than a permanent launch brand system.

### Open Design Questions

- None block implementation. Exact GraphiteMD brand polish and a future Assistant layout remain separate design work.

## Client And API Boundary

- Current clients: Responsive React/Vite browser.
- Plausible future clients: Native mobile, Electron wrapper, CLI, IDE, and integration clients.
- Reusable product capabilities: Authentication, workspace inventory, resource read/save/rename, search/rebuild, plugin inventory/lifecycle, and status.
- API or typed contract: Runtime schemas in `packages/contracts`, `/api/v1` JSON routes, cookie session, XSRF token/header, and a validated browser client adapter.
- OpenAPI plan, if HTTP-facing: Defer generated OpenAPI until the first route set stabilizes; do not defer runtime contract validation.
- Backend platform exposed directly to clients?: No. Clients do not import Adonis, SQLite, filesystem, or plugin-host implementations.
- Client-specific presentation or local state: Drawer/sidebar state, selected presentation mode, pending draft, history cursor, focus, and transient query state.
- Rationale: The same authority must remain reusable by later native and agent surfaces.

## Alternatives Considered

- Option: Blindly copy Coordinator, then delete unwanted features.
  - Why not: Fast bootstrap would retain SDD, Pi, loopback-trust, state, and UI assumptions that are harder to detect than deliberate extraction.
- Option: Blindly copy Dashboard, then replatform the server.
  - Why not: Repeats proven Coordinator architecture work and leaves the plugin/contract boundary weakest where GraphiteMD needs it strongest.
- Option: Rebuild from framework generators and specifications only.
  - Why not: Discards extensive verified source, fixtures, and regression evidence for no product benefit.
- Option: Implement the Assistant in the same Change.
  - Why not: It would combine authentication, editor/search, plugin platform, provider/runtime choices, proposals, grants, and durable AI records into an unreviewable bootstrap.

## Why This Approach

The selected approach preserves the clean product identity and accepted architecture while treating the spikes as executable research. It chooses one owner for each overlapping subsystem, names secondary regression sources, and makes test transplantation part of the definition of reuse. The resulting foundation is a real user path, not scaffolding for its own sake, and it leaves the Assistant as the next coherent vertical slice over proven authority boundaries.

## ADRs

- Required: Yes; all are already Accepted.
- ADR paths:
  - `docs/adrs/2026-07-18-service-first-web-architecture.md`
  - `docs/adrs/2026-07-18-capability-mediated-plugin-platform.md`
  - `docs/adrs/2026-07-18-filesystem-canonical-workspace-state.md`
  - `docs/adrs/2026-07-18-proposal-first-agent-authority.md`
- Decision summary: Persistent Adonis service and browser adapters; one capability-mediated plugin SDK; canonical workspace files with disposable projections; later agent writes proposal-first with explicit run grants.
- Reconsider when: Use the triggers in each ADR. This Change does not introduce a contradictory decision.

## Implementation Constraints

- Work from disposable fixtures; never run automated writes against a real private workspace.
- Keep every source transplant traceable in the implementation ledger and avoid copying obsolete product-specific modules around it.
- Preserve unrelated dirty state in both reference repositories; they are read-only sources for this Change.
- Keep secrets, hashes, session IDs, CSRF tokens, absolute host paths, and real note content out of logs, snapshots, fixtures, Storybook, and browser bundles.
- Validate lexical and canonical path confinement, root identity, encoding, size, revision, and collision before writes.
- Use exact allowed origins and same-site production deployment; never combine credentialed sessions with wildcard CORS.
- Keep `.graphite/` excluded from ordinary note inventory/search and protect plugin namespaces independently.
- Treat search databases as disposable and security state as machine-local authority; do not conflate them.
- Do not add raw Node, filesystem, database, credential, shell, or Git APIs to the plugin SDK.
- Run BDD/TDD per Requirement or coherent Scenario slice and update Epic implementation/evidence maps immediately.

## Verification Strategy

- Focused automated tests:
  - Port Coordinator service bootstrap, contract, locator, artifact confinement, no-follow, exclusive rename, autosave, editor, history, component, and capability-host tests.
  - Port Dashboard tree, YAML, mixed-line-ending, root/stale-client, FTS/reconciliation, query escaping, search UI, and disposable-vault regression tests.
  - Add auth setup/login/logout/change/reset/session-revocation, CSRF, origin, cookie, and security-state permission tests.
  - Add plugin manifest, enable/disable, transactional contribution, denied capability, state isolation, restart, partial failure, forbidden-import, and conformance tests.
- Broad supporting gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:storybook`, and `pnpm test:e2e` from the new root.
- Deterministic E2E: Build and start the compiled same-origin Adonis production artifact with temporary security/workspace roots; establish an owner, log in, browse, search, open, edit, conflict, rename, reload, disable/enable System Status, change password, and confirm session invalidation at desktop and mobile viewports.
- Live-provider or external-service playtests: Not applicable; this Change uses no model or external provider.
- Manual UI confirmation: Owner confirms login, desktop/mobile composition, tree/search usability, Source/Rendered fidelity, autosave/conflict/rename recovery, Settings, password change, and plugin enable/disable against a disposable or intentionally selected test workspace.
- Debug/log inspection: Confirm structured logs omit secrets, note bodies, snippets, tokens, and absolute host paths; inspect failed-path and plugin-denial codes only as supporting evidence.

## Decisions

- Use a curated Coordinator skeleton rather than a framework generator or wholesale fork.
- Use the newer Coordinator editor/write implementation as primary and Dashboard behavior/tests as secondary gap coverage.
- Use Dashboard's FTS design adapted to `better-sqlite3` and `.graphite/cache/search.sqlite`.
- Use official AdonisJS session/auth/security packages for the one-owner boundary.
- Configure one workspace on the host; do not expose a remote filesystem directory chooser.
- Ship a small System Status plugin to prove the real SDK and broker before the Assistant is built.
- Keep the full Assistant as the next Change rather than a partial feature in this foundation.

## Risks / Trade-Offs

- Selective transplantation can miss implicit coupling. The source-to-target map and ported tests reduce that risk.
- The Change remains broad because a useful foundation crosses auth, service, files, UI, index, and plugins. Requirement-sized implementation slices and three Epic boundaries keep it reviewable.
- Same-process bundled plugins are trusted first-party code, not malicious-code containment. Package/import boundaries and capability checks prevent accidental privilege bypass; community isolation remains a separate prerequisite.
- Secure remote access depends on correct HTTPS/origin deployment. The application must fail loudly on unsafe production configuration and document a supported reverse-proxy path.
- Filesystem edge behavior differs by platform. macOS and Linux no-follow/no-overwrite paths receive automated coverage; unsupported platforms fail closed rather than falling back unsafely.
- Reusing spike UI can make GraphiteMD feel inherited. Components and behavior are adopted, but composition, names, contracts, and product-specific surfaces remain GraphiteMD-owned.
