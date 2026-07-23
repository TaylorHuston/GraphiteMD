# Architecture Decision Records

ADRs explain durable technical choices for AnthraciteMD. Epics and Stories remain authoritative for accepted implemented behavior.

## Current Records

| ADR | Status | Decision |
|---|---|---|
| [Service-first web architecture](2026-07-18-service-first-web-architecture.md) | Accepted | Use a persistent AdonisJS service, React/Vite web client, shared TypeScript contracts, and a pnpm monorepo; desktop and native wrappers remain optional clients. |
| [Capability-mediated plugin platform](2026-07-18-capability-mediated-plugin-platform.md) | Accepted | Bundled and future plugins use one production SDK and capability broker without privileged access to raw process, storage, or credential boundaries. |
| [Filesystem-canonical workspace state](2026-07-18-filesystem-canonical-workspace-state.md) | Accepted | Keep notes and durable AI/plugin state as inspectable workspace files; databases remain disposable projections. |
| [Proposal-first agent authority](2026-07-18-proposal-first-agent-authority.md) | Accepted | Assistant writes default to reviewable proposals; autonomous action requires an explicit, bounded, run-scoped grant. |
| [Pi-backed Assistant runtime and Codex credential boundary](2026-07-19-pi-backed-assistant-runtime.md) | Accepted | Run Pi behind service-owned model/auth capabilities, keep Codex credentials machine-local, and give the bundled Assistant only brokered read-only workspace tools. |

## Status Values

- Proposed
- Accepted
- Superseded
- Rejected

When superseding a decision, keep the old ADR and link it to its replacement.
