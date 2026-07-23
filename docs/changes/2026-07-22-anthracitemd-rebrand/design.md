# Design: AnthraciteMD Rebrand

## Context

The former identity appears in public copy, package scopes, SDK types, environment variables, browser/session identifiers, workspace and machine-local state, SDD topology, repository topology, and current documentation. Existing installations may contain valuable owner credentials, provider authorization, conversations, plugin state, workspace identity, and operation receipts under GraphiteMD paths.

## Goals / Non-Goals

Goals:

- Make AnthraciteMD and `AMD-*` canonical across maintained current truth.
- Preserve existing workspace, owner, provider, and plugin data through confinement-checked migration.
- Keep legacy environment configuration usable with deterministic canonical precedence.
- Rename GitHub, local checkout, private planning topology, and SDD identity only after the application candidate is committed and verified.

Non-goals:

- Rewriting immutable Git history or altering contemporaneous commands, hashes, URLs, and names in closed Changes and verification reports.
- Preserving active browser sessions across the session-cookie and payload-key rename; owners will sign in again.

## Planning Update

- Discovery classification: `in-scope refinement` plus `technical constraint`.
- User decision: “Rebrand everything.”
- Current identity: AnthraciteMD, package scope `@anthracitemd`, environment prefix `ANTHRACITEMD_`, state directory `.anthracitemd`, Epic prefix `AMD`.
- Legacy compatibility: `.graphitemd`, `.graphite`, and `GRAPHITEMD_*` are accepted only at migration/configuration boundaries.
- Historical evidence retains former identifiers with provenance rather than destructive rewriting.
- No open product or architecture question blocks implementation.

## Epic Changes

Rename the four canonical Epic directories and IDs while preserving their Stories, Requirements, Scenarios, implementation maps, and evidence semantics:

- `GMD-001` -> `AMD-001` Secure Workspace Access
- `GMD-002` -> `AMD-002` Markdown Workbench
- `GMD-003` -> `AMD-003` Bundled Plugin Platform
- `GMD-004` -> `AMD-004` Workspace-Grounded Assistant

Current product prose, cross-links, state paths, and Story references become AnthraciteMD/AMD. Timestamped verification reports move with their Epic directories but retain contemporaneous evidence strings.

## Observable Requirements And Scenarios

### R1: Canonical identity

The system SHALL present and publish AnthraciteMD identifiers across UI, packages, SDK contracts, runtime metadata, configuration examples, and current documentation.

- R1-S1: WHEN a fresh build, test, or browser surface is inspected, THEN maintained current output contains AnthraciteMD identifiers and no former GraphiteMD identifier outside a declared compatibility or historical boundary.
- R1-S2: WHEN package and production-condition resolution runs, THEN every workspace import resolves through `@anthracitemd/*` and `anthracitemd-production`.

### R2: Configuration compatibility

The system SHALL prefer `ANTHRACITEMD_*` configuration and accept corresponding `GRAPHITEMD_*` values only as legacy fallback.

- R2-S1: WHEN only a canonical variable is set, THEN its value is used.
- R2-S2: WHEN only its legacy counterpart is set, THEN the legacy value is used.
- R2-S3: WHEN both are set, THEN the canonical value wins; an invalid canonical value is reported rather than silently falling back.

### R3: Persisted-state migration

The system SHALL migrate safe legacy state to canonical AnthraciteMD locations without merging, deleting conflicts, or traversing symlinks.

- R3-S1: WHEN exactly one safe legacy workspace directory exists and `.anthracitemd` does not, THEN it is atomically renamed and all workspace identity, conversations, plugin state, receipts, and cache remain available.
- R3-S2: WHEN canonical and legacy directories coexist, multiple legacy directories coexist, or any relevant path is unsafe, THEN startup stops without merging or deleting state.
- R3-S3: WHEN the implicit machine-local default is legacy `~/.graphitemd`, THEN it migrates to `~/.anthracitemd`; explicit state-directory overrides remain exact operator-owned paths.

### R4: Authentication transition

The system SHALL preserve owner credentials and provider state while deliberately invalidating former browser sessions during the session identity rename.

- R4-S1: WHEN migrated security state is opened, THEN trigger/session schema uses AnthraciteMD keys and legacy sessions cannot authenticate.
- R4-S2: WHEN the owner signs in again, THEN the new AnthraciteMD cookie and revocation behavior work normally.

### R5: Topology transition

The project SHALL finish with AnthraciteMD repository, local directory, Space/repository ID, private planning directory, Epic IDs, and origin URL.

- R5-S1: WHEN the committed application candidate is verified, THEN topology is renamed in a coordinated final phase and `sdd context`, Git remotes, links, and validation resolve from the new location.
- R5-S2: WHEN historical artifacts are inspected, THEN their original evidence remains intact and a former-to-current identity mapping prevents ambiguity.

## Technical Options

1. Compatibility-preserving rename: explicit canonical precedence, safe atomic migrations, intentional session invalidation, and coordinated topology cutover. Higher implementation cost, lowest data-loss and operator risk.
2. Breaking rename: replace identifiers and require manual relocation/reconfiguration. Simpler, but risks stranded credentials and workspace state.

Selected: option 1.

## Selected Approach

Apply the compatibility-preserving rename in verified Requirement phases. Canonicalize packages and visible identity first; centralize configuration precedence; generalize the existing confined workspace migration and add implicit machine-state migration; deliberately rotate session identity while preserving owner/provider data; then reconcile current documentation and perform the coordinated GitHub, local-checkout, private-planning, and SDD topology cutover. Historical evidence remains verbatim with a concise former-name mapping.

## Experience Design

- Applicability: required, with settled direction.
- Preserve all layout and interaction behavior; replace the brand name and `G` mark with AnthraciteMD and `A`.
- Existing application components remain owners. Verify sign-in and populated workbench at desktop and narrow mobile widths, including accessible names and clean console/network behavior.

## Client And API Boundary

- Current clients: responsive browser plus host CLI commands.
- HTTP route shapes and domain behavior remain unchanged.
- Typed package and SDK names change to AnthraciteMD; no compatibility alias is retained for private workspace packages.
- Runtime configuration compatibility is server-owned and does not leak legacy names into browser APIs.

## ADRs

- No new ADR. Existing architecture decisions are unchanged; their current product/path terminology will be reconciled.

## Implementation Constraints

- Never merge or delete conflicting state directories.
- Never follow symlinked legacy or destination state.
- Canonical environment values win, including invalid values that must fail visibly.
- Regenerate the lockfile after package-scope changes.
- Keep Playwright temp-root creation and teardown sentinels identical.
- Perform GitHub/local/private-topology rename last, after commits and verification; this explicit user request authorizes the rename but not merge, deployment, publication, or branch deletion.

## Verification Strategy

- Focused tests: environment precedence; workspace and machine-state migration happy/conflict/symlink cases; auth/session invalidation; package/SDK contracts; UI accessible copy.
- Broad gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, Storybook, E2E, audit, scoped SDD validation, and stale-identifier inventory.
- Rendered evidence: desktop and mobile sign-in/workbench inspection with console/network review.
- Topology evidence: GitHub repository query, origin URL, `sdd context`, and scoped validation from the renamed checkout.

## Risks / Trade-Offs

- Existing browsers must sign in again; this is deliberate and documented.
- Legacy environment support extends the old name at a narrow compatibility boundary.
- Renaming repository and SDD topology changes links and paths; historical evidence remains intentionally immutable.
