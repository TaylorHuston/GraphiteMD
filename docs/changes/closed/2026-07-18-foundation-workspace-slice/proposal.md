# Proposal: Foundation Workspace Slice

## Why

GraphiteMD has settled product direction and accepted architecture, but its new canonical repository contains no runnable application. The first Change must prove the smallest complete version of the product's distinctive premise: a user can authenticate to a persistent service, reach server-owned Markdown from another browser, edit and search it safely, and control an extension that uses the real capability boundary.

The Dashboard and Coordinator spikes already contain substantial verified behavior. The goal is not to reimplement that behavior from descriptions. The new repository should selectively transplant the strongest code, tests, fixtures, contracts, and operational patterns from both spikes, adapt them to GraphiteMD's accepted boundaries, and leave spike-specific product assumptions behind.

## What Changes

The canonical repository gains a runnable pnpm monorepo with an AdonisJS service, React/Vite client, shared contracts and domain packages, safe workspace access, single-owner authentication, a source-preserving Markdown workbench, rebuildable indexed search, and the first production plugin SDK/capability-host slice.

An authenticated owner will be able to:

- sign in from an authorized desktop or mobile browser and reconnect to the service-owned workspace;
- browse and open Markdown without copying the workspace to the client;
- edit and rename a note with source preservation, revision conflicts, and guarded autosave;
- search title, path, frontmatter text, and body content through a rebuildable local index;
- inspect, enable, and disable a small bundled System Status plugin that uses the same SDK and broker required of later bundled plugins;
- change the password in the app or reset it interactively on the host with existing sessions invalidated.

## Target Repositories

- This repository (role: canonical-app).

## Epic Actions

### New Epic Directories

- `docs/epics/gmd-001-secure-workspace-access/`
- `docs/epics/gmd-002-markdown-workbench/`
- `docs/epics/gmd-003-bundled-plugin-platform/`

### Existing Epic Directory Updates

- None. GraphiteMD has no earlier Epic truth to reconcile.

## Epic Story Changes

- Create `GMD-001/S1`: Establish And Authenticate The Owner Account.
- Create `GMD-001/S2`: Maintain And Recover Access.
- Create `GMD-002/S1`: Browse And Read Workspace Notes.
- Create `GMD-002/S2`: Edit And Rename A Note Safely.
- Create `GMD-002/S3`: Search The Workspace Locally.
- Create `GMD-003/S1`: Inspect Control And Trust Bundled Plugins.
- Dashboard `DASH-*` and Coordinator `CL-*` Story IDs remain reference evidence only. They are not moved or adopted as GraphiteMD identifiers because the new product owns different boundaries.

## Scope Decisions

- Confirmed: One host-configured workspace, one built-in owner account, private-network self-hosting, responsive browser clients, exact-source Markdown editing, baseline search, bundled plugins only, and no desktop wrapper.
- Confirmed: Reuse starts from the newer or safer implementation when spikes overlap. Coordinator supplies the application skeleton and newer safe editor/write path; Dashboard supplies general-vault behavior, FTS search, YAML parsing, and missing regression cases.
- Confirmed: Reuse includes tests and fixtures, not only source code. Existing scenario evidence is a migration checklist, while GraphiteMD receives new tests and Epic evidence under its own names.
- Confirmed: The browser may display workspace-relative paths but never receives unrestricted absolute host paths or filesystem authority.
- Confirmed: Human editor writes apply directly with authentication and revision safety. Proposal-first authority applies to agent-authored writes, which are not implemented in this Change.
- Deferred: Assistant conversation, provider onboarding, context retrieval, proposals, approvals, one-run grants, agent runs, and durable AI session records.
- Deferred: Note/folder create, move, recoverable delete, folder rename, backlinks, unresolved links, generic property editing, and interactive task toggles.
- Deferred: Community plugin installation/isolation, Git/SDD/workflow/developer plugins, multi-user hosting, managed hosting, native mobile, Electron, sync, and offline behavior.
- Assumption: Host-local interactive setup/reset is acceptable for the first technically capable self-hosting audience; browser-based email recovery is not needed.
- Assumption: Production deployments use HTTPS directly or through a documented trusted reverse proxy; loopback development has an explicit development-only cookie exception.
- User decisions that shaped the Story/Requirement split: search is kernel behavior; AI is core but its replaceable Assistant loop follows after the foundation; bundled plugins must use the production SDK; durable workspace state is inspectable under `.graphite/`; server-hosted browser access is primary; agent writes default to proposals.

## Change Folder

- Planned location: promoted; private draft removed
- Active location: None; implementation and review are complete.
- Closed location: `docs/changes/closed/2026-07-18-foundation-workspace-slice/`

## Impact

- Product: Establishes the first end-to-end GraphiteMD experience and the authority boundaries future Assistant and development plugins will reuse.
- Code: Introduces the application monorepo, service, web client, contracts/domain/workspace/plugin packages, one bundled plugin, fixtures, and production/development entry points.
- Tests: Ports and adapts focused spike tests, adds GraphiteMD auth and plugin-conformance coverage, and creates deterministic desktop/mobile E2E against disposable workspaces.
- Docs: Updates README, architecture, testing, security/deployment guidance, Epic implementation/evidence maps, and this Change ledger during implementation.
- ADRs: Applies all four accepted ADRs without changing their status.

## Release Communication Impact

- Required: Yes.
- Record / section: Create `CHANGELOG.md` with an Unreleased user-facing foundation entry and update README status/getting-started documentation.
- Public summary: GraphiteMD's first runnable foundation provides secure self-hosted Markdown access, editing, local search, and capability-limited bundled plugins.

## Open Questions

- None block promotion or implementation. Later Changes own Assistant behavior, complete note/folder lifecycle, link intelligence, and broader plugins.
