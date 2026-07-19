---
schema: sdd-epic-v2
id: GMD-002
status: draft
created: 2026-07-18
modified: 2026-07-19
last_verified: 2026-07-19
stories:
  - S1
  - S2
  - S3
---

# GMD-002 Markdown Workbench

## Product Context

- PRD: Private GraphiteMD Product Brief / PRD resolved through SDD workspace topology.
- Related Epic: [GMD-001 Secure Workspace Access](../gmd-001-secure-workspace-access/epic.md)
- Related ADRs: [Service-First Web Architecture](../../adrs/2026-07-18-service-first-web-architecture.md), [Filesystem-Canonical Workspace State](../../adrs/2026-07-18-filesystem-canonical-workspace-state.md)

GraphiteMD must provide an excellent browser-based Markdown loop before AI or specialized plugins are required. The Dashboard and Coordinator spikes already prove much of the editor, tree, guarded write, navigation, and index behavior; this Epic gives those proven behaviors a GraphiteMD-owned contract.

## Outcome

An authenticated owner will be able to browse, read, edit, rename, and search Markdown in one server-hosted workspace from responsive desktop and mobile browsers while exact files remain canonical and derived indexes remain disposable.

## Current Scope

- One host-configured workspace with opaque client resource identities and no absolute host paths in browser URLs or API payloads.
- Recursive Markdown inventory, source-preserving reading and editing, deterministic note navigation, generic YAML property display, and ordinary task rendering.
- Versioned single-flight autosave, explicit conflict recovery, and safe selected-note rename.
- Baseline local title, path, frontmatter-text, and body search through a rebuildable SQLite projection.
- Desktop workbench and focused mobile browser composition for files, search, reading, and editing.

## Deferred Scope

- Note and folder creation, move, recoverable delete, folder rename, and link-update transactions.
- Backlinks, unresolved-link inventory, heading/block navigation, embeds, and graph visualization.
- Structured property editing, schemas, note types, validation, and specialized metadata controls.
- Interactive task checkbox toggles and task-management workflows.
- Multiple workspaces, offline clients, sync, collaboration, and native mobile or Electron applications.
- Semantic/vector search and Assistant retrieval ranking.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|
| `note-folder-lifecycle` | proposed | As an owner, I want to create, move, and recoverably delete notes and folders, so that the browser can manage the complete workspace lifecycle. | Conflict-safe operations, trash/recovery semantics, tree/index reconciliation, and link-update hooks. |
| `link-intelligence` | proposed | As an owner, I want backlinks and unresolved references, so that I can understand connections in my workspace. | Deterministic link resolution, backlink index rebuild, and safe navigation. |
| `property-editing` | proposed | As an owner, I want to edit generic YAML properties without losing source fidelity, so that structured Markdown remains approachable. | Ordered round-trip behavior, invalid YAML recovery, and schema-free controls. |
| `task-interaction` | proposed | As an owner, I want to toggle ordinary Markdown tasks, so that simple checklists remain useful without a task plugin. | Exact source change, version conflict handling, and accessible controls. |

## Story Index

| Story | Implementation | Verification | Capability | Last Verified | Notes |
|---|---|---|---|---|---|
| S1 | implemented | partial | Browse and read a server-hosted Markdown workspace. | 2026-07-19 | Service-owned authority, validated browser contracts, confined inventory, exact reads, safe history, and responsive composition are implemented; visual confirmation remains. |
| S2 | implemented | partial | Edit and rename a note with source and revision safety. | 2026-07-19 | Source-preserving Source/Rendered editing, response-bound autosave, confined atomic save, and authoritative no-overwrite rename retry are implemented; browser confirmation remains. |
| S3 | implemented | partial | Search the workspace through a rebuildable local index. | 2026-07-19 | Local FTS, validated APIs, persistent desktop/mobile search states, rebuild, external reconciliation, and guarded result navigation are implemented; manual and egress confirmation remain. |

## Stories

### Story S1: Browse And Read Workspace Notes

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-19
Last verified: 2026-07-19

As a workspace owner, I want to browse and open Markdown from any authenticated browser, so that I can reach my notes without synchronizing the underlying files to that device.

#### Requirements And Scenarios

##### Requirement R1: Service-Owned Workspace Authority

The system SHALL open one operator-configured workspace in the service and expose only confined resource identities and workspace-relative display metadata to authenticated clients.

###### Scenario R1-S1: Open The Configured Workspace

- WHEN the service starts with a readable configured workspace
- THEN an authenticated browser can retrieve the workspace identity and note inventory
- AND the browser does not receive unrestricted filesystem access or an absolute host path.

###### Scenario R1-S2: Invalid Workspace Fails Closed

- WHEN the configured workspace is missing, unreadable, not a directory, or changes identity after authorization
- THEN the service reports the workspace as unavailable
- AND it does not retain or expose authority from a previously opened root.

###### Scenario R1-S3: Browser Reconnects To Service State

- WHEN the browser reloads after the service opened a workspace
- THEN it reconnects to the service-owned workspace identity
- AND the browser does not need a local copy of workspace files.

##### Requirement R2: Confined Markdown Inventory

The system SHALL inventory eligible Markdown recursively, preserve directory structure and stable ordering, and exclude internal, ignored, unsafe, or unsupported sources.

###### Scenario R2-S1: Nested Markdown Appears As A Tree

- WHEN eligible Markdown exists at the root and in nested folders
- THEN the client shows directory nodes before file nodes with deterministic ordering
- AND users can expand, collapse, and select the tree accessibly.

###### Scenario R2-S2: Internal And Unsafe Content Is Excluded

- WHEN the workspace contains `.graphite/`, ignored files, symlinks, non-files, unsupported encodings, or over-limit sources
- THEN those entries are excluded or shown as explicitly unavailable according to policy
- AND no unsafe resource locator is issued.

###### Scenario R2-S3: Empty Workspace Is Recoverable

- WHEN the workspace contains no eligible Markdown
- THEN the workbench shows an honest empty state
- AND search and settings remain reachable.

##### Requirement R3: Exact Note Reading And Navigation

The system SHALL open the exact UTF-8 Markdown for an authorized resource with its revision and support reloadable browser history without exposing host paths.

###### Scenario R3-S1: Select A Note

- WHEN the owner selects a note from the tree or search results
- THEN the service returns its exact source, display path, generic YAML property state, and revision
- AND the browser route identifies the resource without containing an absolute filesystem path.

###### Scenario R3-S2: Back Forward And Reload Restore Safely

- WHEN the owner reloads or uses browser Back or Forward between valid opened resources
- THEN GraphiteMD restores the corresponding note through the same authorization checks
- AND invalid or stale history entries fail closed without opening another file by guess.

##### Requirement R4: Responsive Workspace Composition

The system SHALL keep reading and editing primary on desktop and narrow browsers while preserving accessible access to files, search, and context.

###### Scenario R4-S1: Desktop Workbench

- WHEN the viewport has desktop width
- THEN persistent navigation, document, and contextual regions remain usable without hiding the editor.

###### Scenario R4-S2: Mobile Browser Workbench

- WHEN the viewport is narrow
- THEN the document remains the primary surface
- AND files, search, and context remain reachable through touch-sized, keyboard-accessible controls without horizontal page overflow.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S1/R1 | `packages/workspace/src/index.ts#ConfiguredWorkspaceAuthority.openConfigured` | primary | Host-configured root validation, strict atomic workspace-identity document provisioning, stable workspace/resource identity across restart, root-identity revalidation, authority clearing, and reconnect snapshots. |
| S1/R1-S1 | `apps/server/start/routes.ts#workspace` | adapter | The workspace route requires an official authenticated owner session before delivering the confined workspace projection configured by `GRAPHITEMD_WORKSPACE_ROOT`. |
| S1/R2 | `packages/workspace/src/index.ts#inventoryMarkdown` | primary | Recursive tree-ready Markdown inventory, deterministic ordering, opaque resource identities, relative display paths, configured/internal exclusions, no-follow bounded reads, strict UTF-8 eligibility, and honest empty results. |
| S1/R3 | `packages/workspace/src/index.ts#readNote` | primary | Currently issued opaque-resource resolution, root-identity revalidation, no-follow bounded exact UTF-8 reads, content revisions, and generic YAML property/parse state. |
| S1/R3-S1 | `apps/server/start/routes.ts#workspace` | adapter | The note-read route provides authenticated exact-note delivery with normalized path-free unavailable responses over the singleton workspace authority. |
| S1/R3 | `apps/web/src/App.tsx#Workbench` | presentation | Tree selection, exact source and generic property presentation, opaque-resource history updates, and authorization-preserving reload/Back/Forward restoration. |
| S1/R2-S1, S1/R2-S3 | `apps/web/src/App.tsx#FileTree` | presentation | Deterministic nested file presentation, semantic expansion and selection, and an honest empty workspace that retains Files, Search, Context, and Settings access. |
| S1/R4 | `apps/web/src/App.tsx#Workbench` | primary | Desktop navigation/document/context composition with accessible collapse/resize controls and narrow document-primary composition with touch-sized, focus-contained, background-inert, restoring tool drawers. |
| S1/R4 | `apps/web/src/styles.css#.workbench` | presentation | Bounded desktop grid, document measure, narrow-browser breakpoint, mobile toolbar, and page-level overflow containment. |
| S1/R1, S1/R4 | `apps/server/app/middleware/spa_fallback_middleware.ts#SpaFallbackMiddleware`; `apps/server/config/static.ts`; `scripts/stage-web-build.mjs` | support | One deployable AdonisJS artifact serves the browser bundle, hashed assets, safe client-side history fallback, and authenticated API from the same origin without allowing the fallback to intercept `/api/**`. |

#### Implementation Gaps

None.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1 | `packages/workspace/src/index.test.ts` — `opens the configured directory without exposing its host path`; `apps/server/tests/http/authentication.test.ts` — `R2-S1 establishes an official server-owned session and protects workspace delivery` | Package and real HTTP evidence prove a readable configured directory returns an opaque identity and inventory only to an authenticated browser, with no serialized absolute host path. | Passing 2026-07-18. |
| S1/R1-S2 | `packages/workspace/src/index.test.ts` — `clears authority when the configured root changes identity`; `fails closed for missing, non-directory, and unreadable roots` | Missing, unreadable, non-directory, and replaced roots fail closed without retaining the opened identity. | Passing 2026-07-18. |
| S1/R1-S3 | `packages/workspace/src/index.test.ts` — `reconnects to the service-owned workspace identity` | Repeated client-facing current-state reads return the same service-owned snapshot without client filesystem state. | Passing 2026-07-18. |
| S1/R1-S1, S1/R1-S3 | `packages/workspace/src/index.test.ts` — stable restart identity, malformed configuration, and selective ignore provisioning cases | Focused filesystem evidence proves bookmarks/resource IDs survive a new authority instance, malformed identity fails closed, and default cache/operation ignores never overwrite an existing `.graphite/.gitignore`. | Passing 2026-07-18. |
| S1/R2-S1 | `packages/workspace/src/index.test.ts` — `inventories nested Markdown in deterministic tree order`; `apps/web/src/App.test.tsx` — `R2-S1 presents a deterministic accessible tree with selection and collapse` | The service supplies deterministic folders-before-files inventory and the browser exposes semantic tree items with stable nesting, expansion, collapse, and selected state through native controls. | Passing 2026-07-18. |
| S1/R2-S2 | `packages/workspace/src/index.test.ts` — `excludes internal, configured, symlinked, unsupported, and oversized sources` | `.graphite/`, configured exclusions, symlinks, non-Markdown entries, invalid UTF-8, and over-limit sources issue no resource locator; bounded reads use no-follow file opens. | Passing 2026-07-18. |
| S1/R2-S3 | `packages/workspace/src/index.test.ts` — `returns an honest empty inventory for a workspace without eligible Markdown`; `apps/web/src/App.test.tsx` — `R2-S3 keeps files, search, context, and settings reachable in an empty workspace` | An empty inventory produces an honest browser empty state while every surrounding workbench surface remains reachable. | Passing 2026-07-18. |
| S1/R3-S1 | `packages/workspace/src/index.test.ts` — `reads exact source, generic YAML properties, and a content revision`; `reports malformed YAML while preserving exact source`; `changes the revision after an external edit`; `apps/server/tests/http/authentication.test.ts` — `R3-S1 returns exact source metadata only for an authenticated issued resource`; `apps/web/src/App.test.tsx` — `R2-S1 presents a deterministic accessible tree with selection and collapse` | Package, real HTTP, and browser-component evidence prove selection returns byte-preserved source, generic YAML state, display path, and content revision only through an authenticated opaque resource; the browser presents source and properties and pushes no host path into history. | Passing 2026-07-18. |
| S1/R1-S1, S1/R3-S1 | `packages/contracts/src/index.test.ts`; `apps/web/src/api.test.ts`; `apps/web/src/App.test.tsx` — malformed workspace and note response cases | Runtime-contract and browser evidence proves malformed successful workspace/note payloads cannot become browser authority and recover within the owning surface. | Passing 2026-07-19. |
| S1/R3-S2 | `packages/workspace/src/index.test.ts` — `rejects unknown and stale resource identities without guessing a path`; `fails closed when the opened root is replaced`; `rejects an issued note replaced by a symlink`; `apps/server/tests/http/authentication.test.ts` — `R3-S2 rejects an unknown resource without exposing or guessing a path`; `apps/web/src/App.test.tsx` — `R3-S2 restores valid reload and Back navigation through the note API`, `R3-S2 fails closed for an invalid history resource and retains the shell`, `returns a note-read 401 to the expired-session login state` | Unknown and stale resources fail without path guessing; reload and history restoration repeat the authenticated API read; invalid route state is removed while the shell remains; an expired read returns to login. | Passing 2026-07-18. |
| S1/R4-S1 | `apps/web/src/App.test.tsx` — `R2-S1 presents a deterministic accessible tree with selection and collapse`; source inspection of `apps/web/src/App.tsx` `Workbench` and `apps/web/src/styles.css` `.workbench` | The workbench renders persistent semantic navigation, document, and context regions with a bounded centered document measure at desktop widths. | Partial; manual viewport confirmation remains pending. |
| S1/R4-S2 | `apps/web/src/App.test.tsx` — `R4-S2 opens keyboard-accessible narrow-layout drawers and closes them with Escape`; source inspection of `apps/web/src/styles.css` narrow breakpoint | Files, Search, Context, and Settings use native buttons and modal drawer semantics; Files receives focus on open and Escape dismisses it, while narrow CSS makes the document primary and prevents page-level horizontal overflow. | Partial; manual touch and narrow-viewport confirmation remains pending. |
| S1/R2-S1, S1/R4-S1, S1/R4-S2 | `apps/web/src/App.test.tsx` — roving tree keys, focus-contained/restoring drawer, pane controls, and desktop Files/Search navigation; `apps/web/src/App.stories.tsx` — accepted tree, workbench, search, and recovery previews | Component and Storybook browser evidence proves Arrow/Home/End tree navigation, modal focus containment/restoration, persistent desktop Files/Search, intermediate-width containment, narrow touch/safe-area composition, and configured accessibility checks across the accepted state matrix. | Passing 2026-07-19; manual visual confirmation remains pending. |
| S1/R1, S1/R2, S1/R3, S1/R4 | `tests/e2e/foundation.spec.ts` — desktop and 390x844 workspace path | Deterministic real-browser evidence proves authenticated browse/read, reload reconnect, opaque selection, nested Files access, narrow navigation, and page overflow containment over a disposable workspace. | Passing 2026-07-18. |
| S1/R1, S1/R3, S1/R4 | `playwright.config.ts` production web server plus `tests/e2e/foundation.spec.ts` | `pnpm build && pnpm start` serves the browser and API from one origin; direct client-side history reload remains in the SPA while unknown `/api/**` paths are not converted to HTML. | Passing 2026-07-18. |
| S1/R2, S1/R4 | `apps/web/src/App.stories.tsx` — loading, login, empty, unavailable, desktop, and narrow workbench states | Storybook browser evidence renders the required workbench states and runs configured accessibility checks. | Passing 2026-07-18. |

#### Verification Gaps

- `S1/R4-S1`, `S1/R4-S2`: Automated semantic and interaction coverage passes, but desktop and narrow visual composition, touch comfort, and page overflow still need manual browser confirmation.

#### Story Notes

- Reuse targets include Dashboard's Markdown tree and YAML parsing tests plus Coordinator's manifest locators, bounded source rules, and reconnect behavior.

### Story S2: Edit And Rename A Note Safely

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-19
Last verified: 2026-07-19

As a workspace owner, I want a first-class Markdown editor with safe autosave and rename, so that I can change canonical notes without silent source loss or stale overwrites.

#### Requirements And Scenarios

##### Requirement R1: Source-Preserving Markdown Editor

The system SHALL provide Source and source-preserving Rendered modes over one exact CodeMirror document while keeping unsupported syntax recoverable as literal source.

###### Scenario R1-S1: Mode Round Trip Preserves Exact Source

- WHEN the owner switches between Source and Rendered modes without editing
- THEN the exact source remains byte-for-byte unchanged
- AND YAML frontmatter, wiki syntax, embeds, code, tables, and task markers remain inspectable.

###### Scenario R1-S2: Supported Markdown Renders In Place

- WHEN supported headings, emphasis, lists, tasks, tables, and complete note wikilinks are visible in Rendered mode
- THEN they receive readable source-backed presentation
- AND the active line or selection reveals exact syntax for editing and assistive access.

###### Scenario R1-S3: Unsupported Or Large Syntax Remains Recoverable

- WHEN syntax is unsupported, malformed, embedded, or beyond a bounded presentation budget
- THEN it remains literal and editable
- AND the document remains responsive enough to switch to Source mode.

##### Requirement R2: Conflict-Safe Autosave

The system SHALL save human-authored note changes through one version-bound, single-flight flow that retains newer drafts and pauses on failure or conflict.

###### Scenario R2-S1: Latest Eligible Draft Autosaves

- WHEN the authenticated owner edits an eligible note and the debounce expires
- THEN the client submits the opened resource identity, expected revision, and latest source
- AND a successful atomic save returns the new revision without changing the selected resource.

###### Scenario R2-S2: Editing During A Save Queues The Newer Draft

- WHEN the owner edits again while a save is in flight
- THEN at most one write remains active for that resource
- AND the newest eligible draft is sent after the active save succeeds.

###### Scenario R2-S3: External Edit Produces A Recoverable Conflict

- WHEN canonical source changes after the browser's expected revision
- THEN GraphiteMD rejects the stale save without overwriting canonical source
- AND retains the local draft for explicit reload, comparison, or retry decisions.

###### Scenario R2-S4: Source Transition Protects Pending Work

- WHEN navigation, reload, logout, or rename would leave a dirty or in-flight source
- THEN GraphiteMD flushes safely or asks the owner to keep or discard the draft
- AND late responses cannot attach to another resource.

##### Requirement R3: Safe Selected-Note Rename

The system SHALL rename the selected Markdown file within its current folder only after validating the filename, source revision, root identity, and collision state.

###### Scenario R3-S1: Valid Rename Reconciles The Workbench

- WHEN the owner submits a valid unused Markdown filename for the current revision
- THEN the service performs a no-overwrite rename
- AND the tree, selected resource, browser history, and search projection reconcile to the new identity.

###### Scenario R3-S2: Invalid Collision Or Stale Rename Fails Recoverably

- WHEN the proposed name is invalid, reserved, colliding, or based on a stale revision
- THEN no source entry is overwritten
- AND the owner retains the current note and draft with a specific recoverable error.

###### Scenario R3-S3: Indeterminate Native Outcome Requires Reconciliation

- WHEN the transport or filesystem outcome becomes uncertain after rename may have committed
- THEN further writes to the source are blocked
- AND the service reconciles one authoritative source identity before editing resumes.

##### Requirement R4: Confined Human Writes

The system SHALL confine every direct owner write to an authenticated, authorized workspace resource and preserve file mode and exact source outside the intended edit.

###### Scenario R4-S1: Traversal Or Symlink Escape Is Rejected

- WHEN a write or rename attempts lexical traversal, symlink escape, replaced-root access, or internal `.graphite/` note access
- THEN the operation fails before mutation
- AND no outside file is read or changed.

###### Scenario R4-S2: Human Editing Does Not Use Agent Grants

- WHEN the authenticated owner edits through the first-class editor
- THEN the normal human write path applies directly with revision protection
- AND proposal or autonomous-agent authority is not required or implied.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S2/R1 | `apps/web/src/MarkdownEditor.tsx#MarkdownEditor` | primary | One CodeMirror document, Source/Rendered controls, source-backed in-place presentation, active-line syntax reveal, bounded literal fallback, and preservation of untouched mixed line endings. |
| S2/R1-S2, S2/R1-S3 | `apps/web/src/markdownPresentation.ts#markdownPresentationRanges` | presentation | Exact-source projection ranges for supported headings, emphasis, lists, tasks, validated table rows, and complete wikilinks while malformed, embedded, plugin-owned, fenced, or active-line syntax stays literal. |
| S2/R1, S2/R2, S2/R3 | `packages/contracts/src/index.ts`; `apps/web/src/api.ts#requestJson` | support | TypeBox response schemas and one validating browser adapter reject malformed successful note, workspace, rename, search, plugin, and owner payloads before they become browser authority. |
| S2/R2 | `apps/web/src/autosave.ts#AutosaveCoordinator` | primary | Version-bound debounce, single-flight queuing, conflict/error pause, retained drafts, transition guards, and late-response epochs. |
| S2/R2, S2/R4 | `packages/workspace/src/index.ts#saveNote` | primary | Confined revision comparison and atomic same-directory exact-source replacement while preserving file mode. |
| S2/R3 | `packages/workspace/src/index.ts#ConfiguredWorkspaceAuthority.renameNote` | primary | Current-folder filename validation, collision-safe link/unlink rename, revision protection, durable pre-commit operation receipts, write blocking under stale identity, and restart-safe revision-matched reconciliation on retry. |
| S2/R2, S2/R3 | `apps/server/start/routes.ts#mutationErrorResponse` | adapter | Authenticated XSRF-protected direct-owner save and rename routes with normalized recoverable errors. |
| S2/R1, S2/R2, S2/R3 | `apps/web/src/App.tsx#Workbench` | presentation | Editor/autosave binding, save status, guarded note transitions and unload, rename control, tree selection, and opaque history reconciliation. |
| S2/R2, S2/R3 | `apps/web/src/App.tsx#bindAutosave` | presentation | Reusable resource-bound save authority after open and rename, recoverable retry/conflict reload controls, and displayed-resource URL restoration when a guarded history transition is cancelled. |

#### Implementation Gaps

None.
#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S2/R1-S1, S2/R1-S3 | `apps/web/src/MarkdownEditor.test.tsx` — mode round trip and literal over-budget/unsupported cases; `apps/web/src/markdownPresentation.test.ts` — malformed/plugin/embedded literal fallback | Mode changes do not emit edits; exact source remains parent-owned, untouched mixed line endings survive an edited region, and unsupported, malformed, embedded, plugin-owned, or large input remains literal with Source mode reachable. | Passing 2026-07-18. |
| S2/R1-S2 | `apps/web/src/MarkdownEditor.test.tsx` — rendered DOM presentation and accessible exact-source labels; `apps/web/src/markdownPresentation.test.ts` — supported source slices and active-line exclusion | Supported headings, emphasis, lists, tasks, tables, and complete wikilinks project readably from exact source; hidden widgets expose source to assistive technology and active/selected lines retain literal editable syntax. | Passing 2026-07-18. |
| S2/R2-S1, S2/R2-S2, S2/R2-S3, S2/R2-S4 | `apps/web/src/autosave.test.ts` — debounce, single-flight queue, conflict retention, and late-response/transition cases | The newest eligible draft is revision-bound, only one request is active, conflicts retain and pause drafts, and old responses cannot bind to a new resource. | Passing 2026-07-18. |
| S2/R2-S1, S2/R2-S3 | `apps/web/src/App.test.tsx` — wrong-resource/wrong-source save response and retry cases | Browser integration evidence proves a structurally valid save response must still match the submitted resource and exact source before its revision can acknowledge the draft; mismatches remain recoverable save failures. | Passing 2026-07-19. |
| S2/R2-S1, S2/R2-S3, S2/R4-S1 | `packages/workspace/src/index.test.ts` — exact save/mode, stale save, and symlink replacement cases | Exact mixed-line-ending saves preserve mode; stale revisions and unsafe resource replacement fail without canonical or outside overwrite. | Passing 2026-07-18. |
| S2/R3-S1, S2/R3-S2, S2/R4-S1 | `packages/workspace/src/index.test.ts` — reconciled rename, invalid/collision/stale, root-replacement, and symlink-escape cases; `apps/server/tests/http/authentication.test.ts` — authenticated rename route | A valid unused current-folder name yields one new opaque identity and inventory; invalid, colliding, stale, replaced-root, and symlink-redirected requests preserve canonical and outside entries and return recoverable errors. | Passing 2026-07-18. |
| S2/R3-S3 | `packages/workspace/src/index.test.ts` — committed-rename interruption, retry, and post-rename-edit retry; `apps/server/tests/http/authentication.test.ts` — authenticated committed-rename retry | After the source identity disappears, writes through it fail; retry recognizes only the durable committed intent, rereads the confined target, returns its current authoritative source/revision after later edits, and permits writes only through the new identity. | Passing 2026-07-19. |
| S2/R3-S3 | `packages/workspace/src/index.test.ts` — committed and prepared rename recovery after service restart | Focused process-boundary evidence proves durable receipts reconcile both link-before-unlink and committed-unlink interruption states through a new authority instance. | Passing 2026-07-18. |
| S2/R4-S1 | `packages/workspace/src/index.test.ts` — parent swapped immediately before save commit; `apps/server/tests/plugins/plugin_runtime_service.test.ts` — namespace parent swapped immediately before atomic commit | Deterministic confinement evidence proves retained ancestor device/inode identity is revalidated at the precommit boundary and redirected writes fail closed. | Passing with documented platform limit 2026-07-18. |
| S2/R4-S2 | `apps/server/tests/http/authentication.test.ts` — authenticated exact owner save route | The ordinary owner session and XSRF proof directly authorize revision-protected writes without any agent grant. | Passing 2026-07-18. |
| S2/R1, S2/R2, S2/R3, S2/R4 | `tests/e2e/foundation.spec.ts` — edit/conflict/recovery/rename path | Deterministic real-browser evidence proves rendered/source editing, autosave, external-edit conflict recovery, rename, post-rename reload, and continued service-owned access. | Passing 2026-07-18. |
| S2/R1 | `apps/web/src/App.stories.tsx` — populated editor preview; `apps/web/src/MarkdownEditor.stories.tsx` — active syntax, wide table overflow, and read-only note states | Storybook browser evidence renders the source-backed editor in the complete workbench plus accepted editor edge states with interaction and accessibility checks. | Passing 2026-07-19. |
| S2/R2-S3, S2/R2-S4, S2/R3-S1 | `apps/web/src/App.test.tsx` — save recovery, guarded popstate, and post-rename edit cases | Retry and explicit conflict discard/reload are reachable, cancelled history restores the displayed resource URL, and renamed resources remain saveable while inventory and history reconcile. | Passing 2026-07-18. |

#### Verification Gaps

- `S2/R2-S4`: Navigation and late-response state-machine evidence passes; a browser-level dirty-navigation confirmation remains pending.
- `S2/R3-S1`: Focused package, component, and E2E rename/reload/retry coverage passes; manual browser confirmation remains pending.
- `S2/R4-S1`: Save and rename now cover resource symlink replacement and replaced-root denial; explicit `.graphite/` mutation remains structurally unreachable through issued opaque resources rather than separately exercised through an HTTP mutation case.

#### Story Notes

- Use the newer Coordinator editor/autosave/artifact implementation as the primary transplant and carry forward Dashboard's general-note, root-switch, mixed-line-ending, and indexed-rename regression cases.

### Story S3: Search The Workspace Locally

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-19
Last verified: 2026-07-19

As a workspace owner, I want fast local search across my Markdown, so that I can find and open notes without exposing queries or content to an external service.

#### Requirements And Scenarios

##### Requirement R1: Baseline Search Experience

The system SHALL search eligible note titles, display paths, YAML frontmatter text, and Markdown bodies for the active workspace and return bounded local snippets.

###### Scenario R1-S1: Query Returns Matching Notes

- WHEN the owner enters a non-empty supported query
- THEN GraphiteMD returns matching notes from the active workspace with title, display path, and a bounded snippet when available
- AND selecting a result uses the existing guarded note transition.

###### Scenario R1-S2: Empty And No-Result States Are Recoverable

- WHEN the query is empty or has no matches
- THEN GraphiteMD shows the normal tree or an honest no-results state
- AND the selected note remains unchanged.

###### Scenario R1-S3: Search Failure Preserves Workspace State

- WHEN the derived index cannot answer a query
- THEN GraphiteMD shows a recoverable error and rebuild action
- AND does not change canonical Markdown or discard the selected draft.

##### Requirement R2: Rebuildable Search Projection

The system SHALL treat the local SQLite catalog and full-text index as disposable projections rebuildable from canonical workspace files.

###### Scenario R2-S1: Deleted Index Rebuilds

- WHEN the search database is deleted and the service rebuilds it
- THEN equivalent eligible Markdown becomes searchable again
- AND no canonical note or workspace configuration is lost.

###### Scenario R2-S2: Source Reconciliation Removes Stale Results

- WHEN eligible Markdown is created, edited, renamed, moved, or deleted outside GraphiteMD
- THEN startup, watcher hints, periodic reconciliation, or explicit rebuild converges the index
- AND stale paths stop appearing.

###### Scenario R2-S3: Internal State Is Never Indexed As Notes

- WHEN `.graphite/` contains configuration, plugin state, caches, or later AI records
- THEN baseline note search excludes that internal directory by default
- AND the index cannot become an alternate path for leaking excluded content.

##### Requirement R3: Local Search Boundary

The system SHALL answer baseline search in the authoritative service without sending queries, snippets, or note bodies to external providers.

###### Scenario R3-S1: Search Remains On The Host

- WHEN the owner performs baseline search
- THEN only the GraphiteMD service and its local derived index process the query
- AND no AI provider or external search service receives it.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S3/R1 | `apps/server/app/search/local_search_service.ts#LocalSearchService.search` | primary | Unicode-safe prefix query normalization, title/path/frontmatter/body FTS, deterministic ranking, bounded result count, opaque identities, and bounded snippets. |
| S3/R1 | `apps/server/start/routes.ts#search` | adapter | Authenticated path-free search and rebuild responses with normalized recoverable failure. |
| S3/R1 | `apps/web/src/App.tsx#SearchPanel` | presentation | Search input, loading/no-result/error/rebuild states, and result selection through the existing guarded note transition without disturbing the selected draft on search failure. |
| S3/R2 | `apps/server/app/search/local_search_service.ts#LocalSearchService.rebuild` | persistence | Atomic disposable `.graphite/cache/search.sqlite` FTS rebuild from current confined Markdown, retaining and revalidating canonical cache-directory device/inode identity immediately before commit while preserving canonical configured-root aliases. |
| S3/R2 | `packages/workspace/src/index.ts#ConfiguredWorkspaceAuthority.refresh` | primary | Re-inventories canonical sources while retaining the active workspace identity and the inventory's exclusion/confinement policy. |
| S3/R3 | `apps/server/app/search/local_search_service.ts#LocalSearchService` | primary | Host-process-only `better-sqlite3` implementation with no provider or external-search interface. |

#### Implementation Gaps

None.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S3/R1-S1 | `apps/server/app/search/local_search_service.test.ts` — `searches title, path, frontmatter, and body with opaque bounded results`; `apps/server/tests/http/authentication.test.ts` — `protects host-local search and returns opaque results`; `apps/web/src/App.test.tsx` — `searches locally and opens an opaque result through the guarded note transition` | Local FTS covers every baseline field, returns bounded path-safe results only to an authenticated owner, and result selection reuses guarded opaque-resource note navigation. | Passing 2026-07-18. |
| S3/R1-S2 | `apps/server/app/search/local_search_service.test.ts` — `returns empty results for empty, punctuation-only, and unmatched queries`; `apps/web/src/App.test.tsx` — honest no-result, stale-result clearing, rebuild progress/success, and recoverable failure cases | Empty and unsupported queries do not reach FTS; each submitted query owns its visible state, stale results clear during loading/failure, rebuild progress/completion is announced, and the active document remains intact. | Passing 2026-07-19. |
| S3/R1-S3 | `apps/web/src/App.test.tsx` — `show honest no-result and recoverable failure states`; source inspection of `apps/server/start/routes.ts` — `GET /api/v1/search` | A failed search becomes a recoverable error with an explicit rebuild action while workbench selection/draft ownership remains outside the search component. | Partial; deterministic filesystem/database fault injection and manual draft confirmation remain. |
| S3/R2-S1 | `apps/server/app/search/local_search_service.test.ts` — `rebuilds an equivalent disposable index after deletion`; `apps/server/tests/http/authentication.test.ts` — `requires XSRF proof for an explicit rebuild` | Deleting the derived database loses no canonical content and the authenticated, request-protected rebuild restores equivalent results. | Passing 2026-07-18. |
| S3/R2-S2 | `apps/server/app/search/local_search_service.test.ts` — `reconciles external create, edit, rename, and delete before answering`; `apps/web/src/App.test.tsx` — `opens a server-authorized external search result and safely adds it to inventory` | Search rebuilds from refreshed confined sources; the browser opens the returned opaque identity through note authority and reconciles its tree only after a valid note response. | Passing 2026-07-18. |
| S3/R2-S3 | `apps/server/app/search/local_search_service.test.ts` — `.graphite` exclusion and `refuses a cache path redirected through a symbolic link` | Internal `.graphite/` Markdown never enters the inventory or FTS projection, and a symlinked internal/cache component fails closed without creating an index outside the workspace. | Passing 2026-07-18. |
| S3/R2-S2, S3/R2-S3 | `apps/server/tests/search/local_search_service.test.ts` — precommit replacement and canonical-root-alias cases | Focused persistence evidence proves a cache directory replaced after indexing cannot receive the final database, while an authority-accepted canonical symlink alias remains usable. | Passing 2026-07-19. |
| S3/R3-S1 | `apps/server/tests/http/authentication.test.ts` — `protects host-local search and returns opaque results`; source inspection of `apps/server/app/search/local_search_service.ts#LocalSearchService` and dependency manifests | The authenticated service invokes an in-process local SQLite implementation; the search slice has no external provider dependency or outbound search adapter. | Partial; automated network egress isolation is not configured. |
| S3/R1, S3/R2 | `tests/e2e/foundation.spec.ts` — local search and external reconciliation path | Deterministic real-browser evidence proves local search selects an opaque result, rebuild/reconciliation reflects host changes, and the active workbench remains usable on desktop and narrow layouts. | Passing 2026-07-18. |
| S3/R1 | `apps/web/src/App.stories.tsx` — idle, loading, results, no-results, failure, long-path, and mobile search previews | Storybook browser evidence renders the complete accepted search state matrix with configured interaction and accessibility checks. | Passing 2026-07-19. |
| S3/R1 | `packages/contracts/src/index.test.ts`; `apps/web/src/api.test.ts`; `apps/web/src/App.test.tsx` — malformed search response cases | Runtime-contract and browser-component evidence proves malformed successful search responses cannot enter application state and recover within the owning workbench surface. | Passing 2026-07-19. |

#### Verification Gaps

- `S3/R1-S3`: Add database/open failure injection and manually confirm an unsaved draft stays intact through failure and rebuild.
- `S3/R3-S1`: No automated network-egress isolation proof exists; implementation and dependency inspection show the baseline path is strictly in-process SQLite.
- Search result composition, long snippets/paths, keyboard use, and narrow-browser behavior still need manual browser confirmation.

#### Story Notes

- Adapt Dashboard's SQLite FTS schema, reconciliation, query normalization, snippets, and tests to the GraphiteMD service and `.graphite/cache/` namespace.

## Cross-Story Concerns

- Resource locators, revision tokens, inventory generation, save/rename results, and search results must use one shared runtime-validated contract.
- The browser may display workspace-relative paths but must never receive unrestricted absolute host paths.
- Search and inventory exclusions must be enforced server-side and shared with later Assistant retrieval.
- Filesystem watchers are hints; deterministic reconciliation remains authoritative.

## Open Decisions

- None block this foundation slice. Full lifecycle operations, link intelligence, property editing, and task toggles are explicit follow-up candidates.

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

- GraphiteMD reuses spike behavior and tests deliberately but does not preserve Dashboard or Coordinator Story IDs as canonical product truth.
