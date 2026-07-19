---
schema: sdd-epic-v2
id: GMD-002
status: draft
created: 2026-07-18
modified: 2026-07-18
last_verified:
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
| S1 | partial | partial | Browse and read a server-hosted Markdown workspace. | 2026-07-18 | Service-owned workspace authority package implemented; inventory, HTTP/auth adapter, reads, and UI remain. |
| S2 | not implemented | unverified | Edit and rename a note with source and revision safety. |  | Foundation Change. |
| S3 | not implemented | unverified | Search the workspace through a rebuildable local index. |  | Foundation Change. |

## Stories

### Story S1: Browse And Read Workspace Notes

Implementation: partial
Verification: partial
Created: 2026-07-18
Modified: 2026-07-18
Last verified: 2026-07-18

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
| S1/R1 | `packages/workspace/src/index.ts` — `ConfiguredWorkspaceAuthority` | primary | Host-configured root validation, opaque service-owned identity, root-identity revalidation, authority clearing, and reconnect snapshots. |
| S1/R2 | Not implemented yet. | primary | Safe inventory and tree contract. |
| S1/R3 | Not implemented yet. | primary | Resource read and navigation contract. |
| S1/R4 | Not implemented yet. | presentation | Responsive and accessible workbench composition. |

#### Implementation Gaps

- `S1/R1-S1`: The authenticated Adonis adapter and confined Markdown inventory remain pending on `GMD-001` authentication and `S1/R2`; the package currently returns an honest empty inventory projection.
- `S1/R2`: GraphiteMD note inventory and tree do not exist yet.
- `S1/R3`: GraphiteMD note reads and resource history do not exist yet.
- `S1/R4`: GraphiteMD responsive workbench does not exist yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1 | `packages/workspace/src/index.test.ts` — `opens the configured directory without exposing its host path` | The public service authority opens a readable configured directory, returns an opaque identity and inventory projection, and serializes no absolute host path. | Partial; authenticated HTTP delivery awaits `GMD-001`. |
| S1/R1-S2 | `packages/workspace/src/index.test.ts` — `clears authority when the configured root changes identity`; `fails closed for missing, non-directory, and unreadable roots` | Missing, unreadable, non-directory, and replaced roots fail closed without retaining the opened identity. | Passing 2026-07-18. |
| S1/R1-S3 | `packages/workspace/src/index.test.ts` — `reconnects to the service-owned workspace identity` | Repeated client-facing current-state reads return the same service-owned snapshot without client filesystem state. | Passing 2026-07-18. |

#### Verification Gaps

- `S1/R1-S1`: Authenticated Adonis route proof remains pending on `GMD-001`; real inventory behavior is owned by `S1/R2`.
- `S1/R2-S1`, `S1/R2-S2`, `S1/R2-S3`: Not verified yet.
- `S1/R3-S1`, `S1/R3-S2`: Not verified yet.
- `S1/R4-S1`, `S1/R4-S2`: Not verified yet.

#### Story Notes

- Reuse targets include Dashboard's Markdown tree and YAML parsing tests plus Coordinator's manifest locators, bounded source rules, and reconnect behavior.

### Story S2: Edit And Rename A Note Safely

Implementation: not implemented
Verification: unverified
Created: 2026-07-18
Modified: 2026-07-18
Last verified:

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
| S2/R1 | Not implemented yet. | primary | Source-preserving editor and presentation modes. |
| S2/R2 | Not implemented yet. | primary | Autosave state machine and revision-bound save. |
| S2/R3 | Not implemented yet. | primary | Safe rename and reconciliation. |
| S2/R4 | Not implemented yet. | primary | Authenticated resource confinement and direct-owner authority. |

#### Implementation Gaps

- `S2/R1`: GraphiteMD editor integration does not exist yet.
- `S2/R2`: GraphiteMD save flow does not exist yet.
- `S2/R3`: GraphiteMD rename flow does not exist yet.
- `S2/R4`: GraphiteMD human-write authorization does not exist yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|

#### Verification Gaps

- `S2/R1-S1`, `S2/R1-S2`, `S2/R1-S3`: Not verified yet.
- `S2/R2-S1`, `S2/R2-S2`, `S2/R2-S3`, `S2/R2-S4`: Not verified yet.
- `S2/R3-S1`, `S2/R3-S2`, `S2/R3-S3`: Not verified yet.
- `S2/R4-S1`, `S2/R4-S2`: Not verified yet.

#### Story Notes

- Use the newer Coordinator editor/autosave/artifact implementation as the primary transplant and carry forward Dashboard's general-note, root-switch, mixed-line-ending, and indexed-rename regression cases.

### Story S3: Search The Workspace Locally

Implementation: not implemented
Verification: unverified
Created: 2026-07-18
Modified: 2026-07-18
Last verified:

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
| S3/R1 | Not implemented yet. | primary | Query normalization, result contract, and UI flow. |
| S3/R2 | Not implemented yet. | persistence | Rebuildable catalog, FTS index, and reconciliation. |
| S3/R3 | Not implemented yet. | primary | Host-local search authority. |

#### Implementation Gaps

- `S3/R1`: GraphiteMD search experience does not exist yet.
- `S3/R2`: GraphiteMD search projection does not exist yet.
- `S3/R3`: GraphiteMD local-only search boundary does not exist yet.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|

#### Verification Gaps

- `S3/R1-S1`, `S3/R1-S2`, `S3/R1-S3`: Not verified yet.
- `S3/R2-S1`, `S3/R2-S2`, `S3/R2-S3`: Not verified yet.
- `S3/R3-S1`: Not verified yet.

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
