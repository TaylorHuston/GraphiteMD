# ADR: Proposal-First Agent Authority

- Status: Accepted
- Date: 2026-07-18
- Related Change: [Foundation Workspace Slice](../changes/2026-07-18-foundation-workspace-slice/proposal.md) (architectural constraint; agent behavior is deferred)
- Related Epics / Stories: None implemented yet; the foundation Change establishes capability boundaries but explicitly defers Assistant proposals, grants, and autonomous runs.
- Supersedes: None in this repository.
- Superseded by:

## Context

GraphiteMD treats AI interaction as a first-class product capability. The bundled Assistant needs enough workspace context to answer useful questions and maintain documents, but direct default write or tool authority would undermine user trust in canonical files. The product also needs a path to purposeful autonomous work without globally enabling unattended agents.

Workspace content may be sent to external model providers, so read scope and exclusions are security boundaries rather than prompt suggestions. Agent tools may later include Git, SDD, web, email, calendar, shell, or other consequential systems supplied by plugins.

## Decision

Each Assistant conversation SHALL be bound to one workspace. The Assistant MAY search and read that workspace's note corpus by default, subject to explicit folder and mount exclusions. Exclusions SHALL be enforced by the capability broker across search, retrieval, context assembly, and direct reads. Retrieval SHALL be bounded to relevant context, and the UI SHALL expose the sources used; full read authority does not imply sending the entire workspace to a model.

Agent-authored writes SHALL default to reviewable proposals. A proposal must preserve provenance, target revisions, conflicts, and a user-visible diff or equivalent review surface before canonical files change.

Direct autonomous action SHALL require an explicit one-run grant containing:

- the requested outcome;
- accessible workspaces, mounts, folders, resources, and repositories;
- allowed tools and operations;
- whether writes require review or may be applied directly;
- automatic expiration when the run ends;
- visible live activity and an immediate stop control;
- a durable inspectable record under `.graphite/`.

Destructive actions and externally consequential operations SHALL require separate confirmation rather than being implied by a general grant. Edited Markdown or grant-record files SHALL NOT confer authority by themselves; the capability broker must validate the active grant.

The kernel SHALL own runtime-neutral conversation, run, streaming, context, tool-request, approval, proposal, provenance, and grant primitives. The bundled Assistant plugin SHALL own the replaceable agent loop, provider adapters, context strategy, tool selection, compaction, and conversation-memory behavior. External tools, channels, and schedules SHALL arrive through plugins.

Standing grants, schedules, triggers, and background agents are deferred from the first serious version, though contracts should not preclude them.

## Options Considered

### Option 1: Proposal Default With Explicit One-Run Grants

- Summary: Separate ordinary assistance from bounded autonomous execution.
- Pros: Preserves user control, supports useful automation, exposes scope, and produces durable evidence.
- Cons: Adds approval friction, grant UX, revision handling, and broker complexity.

### Option 2: Unrestricted Direct Writes After Provider Setup

- Summary: Treat enabling an Assistant or model as permission to edit the workspace.
- Pros: Fast and fluid automation with minimal approval UI.
- Cons: Conflates model access with write authority and makes mistakes or prompt injection directly destructive.

### Option 3: Read-Only Assistant With No Autonomous Mode

- Summary: Allow questions and suggested text but never agent-applied operations.
- Pros: Smallest security surface and simplest trust model.
- Cons: Prevents the broader agent-workbench value and forces users to execute every accepted action manually.

### Option 4: Inclusion-Only Read Access

- Summary: Require users to explicitly authorize every folder or source the Assistant may read.
- Pros: Strong minimization and explicit consent for each content area.
- Cons: Makes ordinary workspace assistance incomplete and creates continual permission maintenance.

### Option 5: Standing Autonomous Grants In The First Version

- Summary: Support recurring, scheduled, or event-triggered agents immediately.
- Pros: Delivers the strongest automation value early.
- Cons: Multiplies authority, lifecycle, observability, recovery, and emergency-stop risks before one-run grants are proven.

## Consequences

- Positive: Users can understand what the Assistant read, what it proposes, and what authority a run holds.
- Positive: Exclusions, revisions, and grants are enforceable application boundaries rather than prompt conventions.
- Positive: The product can evolve toward broader agents without making unattended mutation the default.
- Negative: Proposal review and scoped grants add friction compared with direct agent editing.
- Negative: Every plugin tool must integrate with grant, consequence, provenance, and denial semantics.
- Follow-up: The foundation and Assistant Changes must define normalized proposal, approval, grant, event, conflict, stop, and evidence contracts before enabling direct writes.

## Validation

- Prove excluded folders and mounts cannot appear in Assistant search, reads, context, logs, or provider requests.
- Prove ordinary Assistant runs cannot mutate canonical files without an accepted proposal or valid grant.
- Prove grants fail closed outside their workspace, resource, tool, operation, and lifetime scope.
- Prove destructive and external actions request separate confirmation.
- Prove stop and expiration prevent new actions and leave an inspectable terminal record.
- Prove stale revisions produce reviewable conflicts rather than silent overwrites.
- Prove grant-record file edits do not create or broaden enforceable authority.

## Reconsider When

- One-run grants have sufficient evidence to justify standing or scheduled autonomy.
- Multi-user operation requires actor-specific roles, approvals, and audit semantics.
- Local-only models or isolated runtimes materially change content-disclosure risk.
- Proposal friction prevents common safe workflows and can be reduced without weakening authority boundaries.
