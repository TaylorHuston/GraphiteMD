# AnthraciteMD

AnthraciteMD is being built as a self-hostable, document-native AI workbench around user-controlled Markdown workspaces. Its current foundation uses a persistent service for filesystem authority while responsive browser clients provide editing, search, navigation, and read-only workspace-grounded Assistant questions without copying the workspace onto every device. Proposal review remains a planned product capability.

The product is designed around four durable promises:

- Markdown and inspectable local files remain authoritative.
- The editor remains useful without an AI provider.
- AI reads and actions pass through visible, bounded capabilities.
- A minimal core can grow through capability-mediated plugins. Bundled plugins are trusted repository-owned code whose source and dependency boundaries prevent accidental direct privilege bypass; untrusted community-code containment remains deferred.

## Repository Status

The foundation monorepo is active. AdonisJS owns the service boundary, React/Vite is the browser adapter, and framework-neutral packages own contracts, domain rules, workspace operations, and plugin interfaces.

## Current Foundation Capabilities

- Single-owner setup, authenticated browser sessions, password change, and host-local recovery.
- Confined Markdown inventory, exact source reading, source-preserving editing, conflict-safe autosave, and collision-safe rename.
- Host-local full-text search backed by a rebuildable SQLite projection.
- Responsive browser workbench with opaque resource navigation.
- Bundled plugin inventory, enablement, capability mediation, and inspectable namespaced state, demonstrated by System Status.
- A bundled Codex Assistant Context contribution for read-only, workspace-grounded questions with visible service-derived sources after connection.

Assistant writes, proposal/grant workflows, community plugins, arbitrary plugin isolation, offline sync, and a dedicated mobile app remain outside this foundation slice.

## Local Development

Requires Node.js 24 or newer and pnpm 11.5.2.

```bash
pnpm install
export ANTHRACITEMD_WORKSPACE_ROOT="/absolute/path/to/a/test-workspace"
# Optional: defaults to ~/.anthracitemd; any override must be outside the workspace.
export ANTHRACITEMD_STATE_DIR="/absolute/path/to/machine-local-state"
export ANTHRACITEMD_ALLOWED_ORIGINS="http://127.0.0.1:5173"
export APP_KEY="replace-with-a-persisted-random-secret-of-at-least-32-characters"
pnpm --filter @anthracitemd/server exec node ace owner:setup
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build-storybook
pnpm test:storybook
pnpm test:e2e
pnpm start
```

`pnpm dev` runs the service on `http://127.0.0.1:3333` and the web client on `http://127.0.0.1:5173`. The web development server proxies `/api` to the service. Use a disposable Markdown directory for development and tests.

`pnpm build` compiles the web client, stages it into the AdonisJS public tree, and includes that tree in the deployable server build. `pnpm start` then serves the browser application, hashed assets, SPA history fallback, and `/api/v1` from one origin. The fallback never handles `/api/**`; unknown API routes remain JSON/HTTP 404 responses. `pnpm test:e2e` builds and exercises this same production server path rather than the Vite development proxy.

`ANTHRACITEMD_WORKSPACE_ROOT` is the canonical Markdown workspace. AnthraciteMD provisions `.anthracitemd/workspace.json` for stable workspace identity, preserves an existing `.anthracitemd/.gitignore`, and otherwise ignores only `/cache/` and `/operations/` by default. Configuration, normalized conversations, and plugin state remain inspectable beneath `.anthracitemd/`; the search database under `.anthracitemd/cache/` is disposable. Prepared rename receipts are cleared after a known rollback, while committed receipts under `.anthracitemd/operations/` are retained indefinitely in this foundation so old-resource retries remain idempotent. Existing safe `.graphitemd/` or `.graphite/` state atomically migrates to `.anthracitemd/`; a conflict or symlinked state path stops startup without merging or deleting either directory. `ANTHRACITEMD_STATE_DIR` defaults to `~/.anthracitemd` for machine-local security/session/provider state. An explicit override must be absolute and outside the configured workspace; it is never workspace content or a Git-tracked file. `ANTHRACITEMD_ALLOWED_ORIGINS` is a comma-separated exact allowlist for credentialed browser origins. `APP_KEY` is mandatory outside tests: generate a strong random value, store it with the host's secrets, and reuse the same value across restarts. Never commit it or place it inside the workspace.

Back up Markdown, `.anthracitemd/workspace.json`, `.anthracitemd/conversations/`, `.anthracitemd/plugins.json`, and `.anthracitemd/plugins/` together. A full-filesystem backup may also retain ignored operation receipts; `.anthracitemd/cache/` can be rebuilt. Back up `~/.anthracitemd` (or `ANTHRACITEMD_STATE_DIR`) and `APP_KEY` separately using host-secret protections, because workspace files alone cannot restore owner access. Stop the service or use a filesystem snapshot so the workspace and inspectable state are captured consistently.

Storybook owns deterministic previews for authentication, loading, empty, error, editor, search, Settings, and plugin states. `pnpm test:storybook` exercises their interaction and accessibility checks in headless Chromium. `pnpm test:e2e` creates disposable workspace and security roots under the operating-system temporary directory, starts the real Adonis/Vite path on dedicated loopback ports, and removes the fixture after desktop and narrow-browser acceptance. It never reads or mutates a real workspace.

For host-local credential recovery, stop competing maintenance operations and run:

```bash
pnpm --filter @anthracitemd/server exec node ace owner:reset
```

## Self-Hosting Boundary

The current target is a technically capable single owner on a trusted private network. Build the browser and service with `pnpm build`, configure the four environment variables above for the deployment origin, and run `pnpm start`. Set `ANTHRACITEMD_ALLOWED_ORIGINS` to the exact public HTTPS origin seen by the browser. A reverse proxy must preserve the original host/protocol information and forward cookies without rewriting their security attributes. Put TLS and private-network access controls in front of the service when traffic leaves loopback. Public Internet hardening, hosted tenancy, automated deployment, and managed backup automation are not delivered by this Change.

## Packages

- `apps/server`: authoritative AdonisJS service and versioned HTTP adapters.
- `apps/web`: responsive React/Vite browser client.
- `packages/contracts`: runtime-validated public contracts and opaque identities.
- `packages/domain`: framework-neutral application rules.
- `packages/workspace`: server-owned Markdown workspace interfaces.
- `packages/plugin-sdk`: manifest and lifecycle contracts for every plugin.
- `packages/plugin-testkit`: headless plugin conformance helpers.
- `plugins/system-status`: bundled plugin proving the production SDK boundary.
- `plugins/assistant`: bundled grounded-answer policy and Context contribution; it receives no raw filesystem, credential, process, shell, or network access.

## Architecture Decisions

- [Service-first web architecture](docs/adrs/2026-07-18-service-first-web-architecture.md)
- [Capability-mediated plugin platform](docs/adrs/2026-07-18-capability-mediated-plugin-platform.md)
- [Filesystem-canonical workspace state](docs/adrs/2026-07-18-filesystem-canonical-workspace-state.md)
- [Proposal-first agent authority](docs/adrs/2026-07-18-proposal-first-agent-authority.md)
- [Pi-backed Assistant runtime](docs/adrs/2026-07-19-pi-backed-assistant-runtime.md)

Epics and Stories are authoritative for implemented behavior and explicit remaining gaps. ADRs explain the cross-cutting technical constraints future implementation must respect.
