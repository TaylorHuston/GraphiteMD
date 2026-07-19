# GraphiteMD

GraphiteMD is a self-hostable, document-native AI workbench built around user-controlled Markdown workspaces. A persistent service owns filesystem and agent authority, while responsive browser clients provide editing, search, navigation, conversation, and proposal review without copying the workspace onto every device.

The product is designed around four durable promises:

- Markdown and inspectable local files remain authoritative.
- The editor remains useful without an AI provider.
- AI reads and actions pass through visible, bounded capabilities.
- A minimal core can grow through constrained plugins without granting extensions unrestricted process or filesystem access.

## Repository Status

The foundation monorepo is active. AdonisJS owns the service boundary, React/Vite is the browser adapter, and framework-neutral packages own contracts, domain rules, workspace operations, and plugin interfaces.

## Current Foundation Capabilities

- Single-owner setup, authenticated browser sessions, password change, and host-local recovery.
- Confined Markdown inventory, exact source reading, source-preserving editing, conflict-safe autosave, and collision-safe rename.
- Host-local full-text search backed by a rebuildable SQLite projection.
- Responsive browser workbench with opaque resource navigation.
- Bundled plugin inventory, enablement, capability mediation, and inspectable namespaced state, demonstrated by System Status.

AI interaction, proposal/grant workflows, community plugins, arbitrary plugin isolation, offline sync, and a dedicated mobile app remain outside this foundation slice.

## Local Development

Requires Node.js 24 or newer and pnpm 11.5.2.

```bash
pnpm install
export GRAPHITEMD_WORKSPACE_ROOT="/absolute/path/to/a/test-workspace"
export GRAPHITEMD_STATE_DIR="/absolute/path/to/machine-local-state"
export GRAPHITEMD_ALLOWED_ORIGINS="http://127.0.0.1:5173"
pnpm --filter @graphitemd/server exec node ace owner:setup
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm dev` runs the service on `http://127.0.0.1:3333` and the web client on `http://127.0.0.1:5173`. The web development server proxies `/api` to the service. Use a disposable Markdown directory for development and tests.

`GRAPHITEMD_WORKSPACE_ROOT` is the canonical Markdown workspace. GraphiteMD writes inspectable workspace configuration and plugin state beneath its `.graphite/` directory; the search database under `.graphite/cache/` is disposable. `GRAPHITEMD_STATE_DIR` is machine-local security/session state and must not be placed in the workspace or committed. `GRAPHITEMD_ALLOWED_ORIGINS` is a comma-separated exact allowlist for credentialed browser origins.

For host-local credential recovery, stop competing maintenance operations and run:

```bash
pnpm --filter @graphitemd/server exec node ace owner:reset
```

## Self-Hosting Boundary

The current target is a technically capable single owner on a trusted private network. Build the browser and service with `pnpm build`, configure the three environment variables above for the deployment origin, and run `pnpm start`. Put TLS and private-network access controls in front of the service when traffic leaves loopback. Public Internet hardening, hosted tenancy, automated deployment, and backup policy are not delivered by this Change.

## Packages

- `apps/server`: authoritative AdonisJS service and versioned HTTP adapters.
- `apps/web`: responsive React/Vite browser client.
- `packages/contracts`: runtime-validated public contracts and opaque identities.
- `packages/domain`: framework-neutral application rules.
- `packages/workspace`: server-owned Markdown workspace interfaces.
- `packages/plugin-sdk`: manifest and lifecycle contracts for every plugin.
- `packages/plugin-testkit`: headless plugin conformance helpers.
- `plugins/system-status`: bundled plugin proving the production SDK boundary.

## Architecture Decisions

- [Service-first web architecture](docs/adrs/2026-07-18-service-first-web-architecture.md)
- [Capability-mediated plugin platform](docs/adrs/2026-07-18-capability-mediated-plugin-platform.md)
- [Filesystem-canonical workspace state](docs/adrs/2026-07-18-filesystem-canonical-workspace-state.md)
- [Proposal-first agent authority](docs/adrs/2026-07-18-proposal-first-agent-authority.md)

Epics and Stories are authoritative for implemented behavior and explicit remaining gaps. ADRs explain the cross-cutting technical constraints future implementation must respect.
