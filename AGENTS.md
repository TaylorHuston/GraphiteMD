# AnthraciteMD Agent Guide

## Purpose

This repository owns the canonical AnthraciteMD application. AnthraciteMD is a service-first, self-hostable Markdown and AI workbench whose browser clients use server-mediated capabilities over user-controlled workspace files.

## Operating Order

1. Inspect the current branch, worktree status, and relevant diff. Preserve unrelated changes.
2. Read `README.md`, applicable files under `docs/`, and the repository's real package scripts once they exist.
3. Run `sdd context . --json` and read the returned `workflowPath` before SDD work.
4. Before changing behavior, read the active `docs/changes/<change>/` artifacts and affected `docs/epics/**/epic.md` files.
5. Read the applicable ADRs before changing service/client authority, plugin capabilities, workspace persistence, or agent permissions.

Stop before implementation when no active or explicitly selected Planned Change owns the requested behavior, or when a proposed change conflicts with an accepted ADR or private Product Brief direction.

## Git And Mutation Policy

- `main` is the stable branch; `develop` is the integration branch once the initial repository history establishes it.
- Branch product or architecture work as `change/<short-slug>`, defects as `fix/<short-slug>`, and maintenance as `misc/<short-slug>`.
- Planning-only documentation may land on `develop`; documentation-only work on `main` requires explicit user authorization.
- Commits, pushes, merges, rebases, tags, releases, deployments, and branch deletion require explicit user authorization or a workflow that grants the exact operation.

## Current Repository Map

```text
.sdd/config.yaml  Portable SDD repository identity and artifact locations.
docs/adrs/        Accepted cross-cutting architecture decisions.
```

The application is a pnpm monorepo with `apps/server`, `apps/web`, framework-neutral packages under `packages/`, and bundled plugins under `plugins/`. See `README.md` for current commands and runtime configuration.

## Invariants

- The persistent service is authoritative; browser and future native clients are adapters.
- Workspace files and inspectable workspace-local state are canonical. Databases and indexes are derived projections.
- Plugins use declared capabilities and the production SDK; bundled code receives no privileged bypass.
- Assistant reads honor workspace exclusions. Writes default to proposals, and autonomous work requires scoped grants.
- Keep credentials, password material, tokens, and encryption keys out of workspace content and Git.
- Keep private product planning out of this repository unless explicitly approved for publication.

## Commands

Use the root pnpm scripts documented in `README.md` for installation, development, lint, typecheck, tests, builds, and production startup. Run focused package tests before broad root gates.

## Completion Gate

- Run focused Requirement/Scenario checks before broad gates once implementation exists.
- Validate affected SDD artifacts and ADR alignment.
- Update Epic implementation and verification maps with concrete evidence.
- Report unavailable or non-meaningful checks explicitly.
