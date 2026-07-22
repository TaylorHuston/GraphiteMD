# ADR: Service-First Web Architecture

- Status: Accepted
- Date: 2026-07-18
- Related Change: [Foundation Workspace Slice](../changes/closed/2026-07-18-foundation-workspace-slice/proposal.md)
- Related Epics / Stories: [GMD-001 Secure Workspace Access](../epics/gmd-001-secure-workspace-access/epic.md), [GMD-002 Markdown Workbench](../epics/gmd-002-markdown-workbench/epic.md), [GMD-003 Bundled Plugin Platform](../epics/gmd-003-bundled-plugin-platform/epic.md)
- Supersedes: None in this repository.
- Superseded by:

## Context

GraphiteMD must work against files on a user's trusted machine or server while remaining accessible from personal computers, work devices, and mobile browsers without synchronizing the underlying workspace to every client. It also needs persistent indexing, agent runs, plugin capabilities, authentication, and future non-browser clients.

The earlier Markdown-editor spike proves useful editor and filesystem behavior, while the development-workbench spike proves a persistent service, contract, and adapter boundary. Neither spike should become the canonical implementation or constrain the new product's history.

## Decision

GraphiteMD SHALL use a service-first TypeScript architecture in a new pnpm monorepo:

- an independently deployable AdonisJS service is the authoritative application and security boundary;
- a React/Vite web client consumes runtime-validated shared contracts;
- durable domain and application behavior remain independent of AdonisJS, React, HTTP request objects, and persistence libraries;
- HTTP APIs and streaming event contracts expose capabilities to the web client and plausible future native, CLI, or integration clients;
- the initial product is self-hosted and accessed over a user-managed private network;
- responsive desktop and mobile browsers are the initial clients;
- Electron and dedicated native mobile applications are deferred wrappers over the same service rather than architectural authorities.

The first serious version SHALL include built-in single-user authentication, secure cookie sessions, CSRF/origin protection, in-app password change, and host-local password reset with session invalidation.

## Options Considered

### Option 1: Persistent Service Plus Independent Web Client

- Summary: Use AdonisJS as the long-lived authority and React/Vite as a separate browser adapter.
- Pros: Supports no-sync remote access, durable agent work, alternate clients, explicit contracts, and server-side authorization.
- Cons: Requires more initial scaffolding, contract design, and deployment coordination than a single-process desktop app.

### Option 2: Electron-First Desktop Application

- Summary: Package the service and UI around a local Electron authority.
- Pros: Familiar desktop installation, direct local integration, and simpler localhost assumptions.
- Cons: Does not solve server-hosted multi-device access and risks coupling plugins and authority to Electron or Node APIs.

### Option 3: Single Web-Framework Monolith

- Summary: Put UI routes, server behavior, and background work into one integrated web framework application.
- Pros: Smaller initial repository surface and one development/build pipeline.
- Cons: Makes persistent agent and filesystem authority less explicit and increases the chance that future clients depend on framework entry points.

### Option 4: Rework One Existing Spike In Place

- Summary: Turn the editor or development-workbench spike into GraphiteMD.
- Pros: Reuses more scaffolding and Git history immediately.
- Cons: Carries obsolete product assumptions, topology, and module boundaries into the new canonical product.

## Consequences

- Positive: Clients do not need direct filesystem access or local copies of private workspaces.
- Positive: Authentication, authorization, revisions, plugins, agents, and persistence share one authoritative boundary.
- Positive: Desktop, mobile, CLI, and integration clients can reuse the same application contracts.
- Negative: Initial bootstrap and self-hosting are more involved than an Electron-only or framework-monolith approach.
- Negative: Offline clients are not an initial product capability.
- Follow-up: The foundation Change must establish package boundaries, contracts, local development commands, authentication, and a deployable service/client walking skeleton.

## Validation

- Run the service on a different machine from the browser and edit a test workspace without copying its files to the client.
- Verify desktop and mobile browser clients use the same versioned contracts and server-side authorization.
- Verify authentication, password change, host-local reset, session invalidation, and CSRF/origin protections.
- Verify domain and application tests run without AdonisJS, React, a browser, or a live database.
- Verify closing and reconnecting the browser does not terminate service-owned indexing or agent work.

## Reconsider When

- AdonisJS materially obstructs packaging, startup, streaming, or operational reliability.
- Offline-first editing becomes a core product promise.
- Multi-user hosting requires materially different service or tenancy boundaries.
- A native client requires capabilities that cannot be expressed through the shared application contracts.
