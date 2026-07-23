# Changelog

All notable user-facing changes to AnthraciteMD will be documented here.

## 0.2.0 - 2026-07-22

### Added

- Added browser-based first-owner setup for fresh hosts, which creates and signs in the single owner without requiring a CLI command.

### Changed

- Rebranded the application, packages, workspace state, and repository as AnthraciteMD.
- Added automatic migration from legacy `.graphitemd` and `.graphite` workspace state, with conflict and symlink safety checks.
- Added `ANTHRACITEMD_*` configuration while retaining `GRAPHITEMD_*` as legacy fallback; existing owners sign in again after the session identity transition.

## 0.1.0 - 2026-07-22

### Added

- A responsive, self-hosted Markdown workbench for desktop and mobile browsers on private networks.
- Single-owner authentication with in-app password changes and host-local credential recovery.
- An explicit Settings logout flow that protects dirty or in-flight edits.
- Confined Markdown browsing, exact source editing, conflict-safe autosave, and safe note rename.
- Stable workspace and note identities so browser URLs and bookmarks survive service restarts.
- Local full-text search with a rebuildable workspace-local index.
- Bundled plugin inspection and enablement through a capability-mediated runtime.
- A System Status plugin showing service and workspace availability plus the current Markdown note count.
- A Codex Assistant in Context for read-only, workspace-grounded questions with visible note sources after connection.
