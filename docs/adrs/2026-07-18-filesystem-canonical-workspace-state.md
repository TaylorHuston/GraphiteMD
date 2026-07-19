# ADR: Filesystem-Canonical Workspace State

- Status: Accepted
- Date: 2026-07-18
- Related Change: [Foundation Workspace Slice](../changes/2026-07-18-foundation-workspace-slice/proposal.md)
- Related Epics / Stories: [GMD-002 Markdown Workbench](../epics/gmd-002-markdown-workbench/epic.md), [GMD-003/S1 Bundled Plugin Platform](../epics/gmd-003-bundled-plugin-platform/epic.md#story-s1-inspect-control-and-trust-bundled-plugins)
- Supersedes: None in this repository.
- Superseded by:

## Context

GraphiteMD's trust and portability depend on users being able to inspect, move, back up, version, and edit the knowledge that grounds both the editor and the Assistant. Storing conversations, memories, agent sessions, proposals, approvals, and plugin state only in SQLite or a user-home application directory would recreate the opaque state boundary the product is intended to avoid.

The application still needs fast search, relations, caches, runtime coordination, authentication material, and process-local locks. Not every byte of operational state is meaningful or safe to place beside user content.

## Decision

The workspace filesystem SHALL be canonical for Markdown content and durable GraphiteMD state.

Each workspace SHALL contain a reserved internal dot-directory, provisionally `.graphite/`, analogous to Obsidian's `.obsidian/`. It SHALL store documented, inspectable files for workspace configuration, conversations, AI/work sessions, memories, run manifests and events, tool activity, proposals, approvals, grant records, and durable plugin state.

Human-oriented state SHOULD use Markdown. Structured records MAY use versioned JSON, JSONL, or similarly transparent formats. Durable knowledge promoted from a session SHALL become an ordinary Markdown note rather than remaining trapped in internal session state.

SQLite and other databases MAY provide search indexes, relations, cached summaries, and runtime projections, but they SHALL be disposable and rebuildable from canonical files. Every persisted record must identify its canonical source or be explicitly classified as ephemeral.

Credentials, password hashes, authentication sessions and tokens, encryption keys, process locks, and transient buffers SHALL remain outside workspace content. Rebuildable indexes and caches MAY be workspace-local or machine-local, but must be clearly disposable and ignored from version control by default.

Stable workspace and plugin configuration MAY be version-controlled. High-churn sessions, runs, indexes, and caches SHALL be ignored by default while remaining available to full-filesystem backup. A workspace MAY contain multiple independent Git repositories; Git behavior must preserve their boundaries rather than treating the workspace as one repository.

Inspectable grant files record intent and evidence but SHALL NOT authorize themselves. The capability broker must validate enforceable authority independently of user-editable document text.

## Options Considered

### Option 1: Canonical Workspace Files With Rebuildable Projections

- Summary: Keep durable state inside the workspace and use databases only as derived acceleration.
- Pros: Inspectable, portable, backup-friendly, versionable, and aligned with the document-native product promise.
- Cons: Requires schema versioning, file concurrency rules, reconciliation, compaction, and careful high-churn storage design.

### Option 2: SQLite As Canonical Application And AI State

- Summary: Store conversations, memory, runs, proposals, and plugin state primarily in a database.
- Pros: Strong transactions, efficient queries, and simpler high-volume event handling.
- Cons: Creates opaque exclusive truth, weakens portability, and makes database loss destructive.

### Option 3: Global User-Home Application State

- Summary: Keep durable application state under a machine-specific application directory.
- Pros: Keeps workspace trees clean and avoids accidental versioning of private session data.
- Cons: Separates context from its workspace, complicates migration and backup, and makes server moves less trustworthy.

### Option 4: Ordinary Notes For Every Kind Of State

- Summary: Represent all configuration, events, grants, and sessions as visible Markdown notes.
- Pros: Maximum human readability and one storage model.
- Cons: Pollutes normal search/navigation, poorly fits event streams and machine state, and risks treating editable text as executable authority.

## Consequences

- Positive: Users retain direct custody and inspection of durable knowledge and AI history.
- Positive: Deleting a derived database cannot destroy canonical notes, memories, sessions, proposals, or evidence.
- Positive: Workspaces can move between GraphiteMD installations with their durable context intact.
- Negative: File schema evolution, retention, compaction, concurrency, and partial-write recovery become first-class engineering concerns.
- Negative: Careless version-control defaults could create noise or expose sensitive conversations.
- Follow-up: The foundation Change must define the initial `.graphite/` layout, schema versions, atomic-write rules, retention behavior, backup guidance, and selective ignore defaults.

## Validation

- Move a workspace to a fresh installation and recover its configuration, memories, conversations, sessions, proposals, and plugin state without copying a database.
- Delete derived indexes and rebuild equivalent search and association results from canonical files.
- Simulate interrupted writes and prove recovery never silently replaces newer canonical state.
- Verify credentials, password material, tokens, and encryption keys never enter workspace files or logs.
- Verify nested Git repositories retain independent status and ignore behavior.

## Reconsider When

- File volume or event throughput makes transparent formats operationally unsafe or unusably slow.
- Multi-user collaboration requires transactions that cannot be represented safely with file revisions and append-only records.
- Encryption-at-rest requirements conflict with direct file inspectability.
- A durable state category cannot be reconstructed, migrated, or recovered without database authority.
