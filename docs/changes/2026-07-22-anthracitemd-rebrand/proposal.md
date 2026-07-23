# Proposal: AnthraciteMD Rebrand

## Why

The product is adopting AnthraciteMD as its canonical identity. Leaving former GraphiteMD identifiers across public copy, packages, configuration, persisted state, repository topology, and SDD truth would create a split identity and make future operation and maintenance ambiguous.

## What Changes

Rename every canonical product and project identifier to AnthraciteMD while safely recognizing and migrating existing GraphiteMD configuration and state. Historical records remain historical but must clearly identify the former name rather than presenting it as current truth.

## Target Repositories

- This repository (role: canonical-app).

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Rename `GMD-001` through `GMD-004` and their directories to `AMD-001` through `AMD-004`, preserving Story semantics and evidence while updating current product identity.

## Epic Story Changes

- Preserve every existing Story boundary and local Requirement/Scenario number while changing full references from `GMD-*` to `AMD-*`.
- Reconcile current product-name, environment, state-path, package, and evidence-anchor wording in the four canonical Epics.
- Move timestamped verification reports with their renamed Epic directories but retain their contemporaneous commands, hashes, paths, and verdict evidence.

## Scope Decisions

- Confirmed: rebrand product, code, packages, configuration, persisted state, docs, SDD topology, repository, and local checkout.
- Deferred: rewriting Git history or mechanically rewriting closed Changes and timestamped verification evidence.
- Assumptions: legacy `.graphitemd`, `.graphite`, and `GRAPHITEMD_*` values remain accepted only at explicit migration/configuration boundaries; new output is AnthraciteMD-only.
- User decisions that shaped the Story/Requirement split: the user explicitly requested “Rebrand everything.”

## Change Folder

- Planned location: promoted; private draft removed
- Active location: `docs/changes/2026-07-22-anthracitemd-rebrand/`
- Closed location: `docs/changes/closed/2026-07-22-anthracitemd-rebrand/`

## Impact

- Product: AnthraciteMD is the only current product name.
- Code: package scopes, symbols, environment variables, paths, defaults, messages, and UI metadata change.
- Tests: rename fixtures and assert legacy-to-current migration and precedence.
- Docs: README, Epics, ADRs, Change records, and release communication are reconciled.
- ADRs: existing decisions retain their substance and adopt the new current identity.

## Release Communication Impact

- Required: yes
- Record / section: `CHANGELOG.md` unreleased/current release entry and README
- Public summary: GraphiteMD has been renamed AnthraciteMD with compatibility migration for existing local state and configuration.

## Open Questions

- None.

## Success Signals

- Fresh installations expose only AnthraciteMD current identity.
- Existing safe GraphiteMD workspace and implicit machine-local state migrate without data loss; conflicts and symlinks stop without mutation.
- Existing operators may retain legacy environment configuration, but canonical variables take precedence.
- Owners sign in again after migration and retain credentials plus provider state.
- Package resolution, full verification, rendered identity, SDD context, Git origin, repository name, and local/private topology all agree on AnthraciteMD.
