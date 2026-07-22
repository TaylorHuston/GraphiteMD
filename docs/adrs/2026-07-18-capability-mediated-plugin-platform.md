# ADR: Capability-Mediated Plugin Platform

- Status: Accepted
- Date: 2026-07-18
- Related Change: [Foundation Workspace Slice](../changes/2026-07-18-foundation-workspace-slice/proposal.md)
- Related Epics / Stories: [GMD-003/S1 Bundled Plugin Platform](../epics/gmd-003-bundled-plugin-platform/epic.md#story-s1-inspect-control-and-trust-bundled-plugins)
- Supersedes: None in this repository.
- Superseded by:

## Context

GraphiteMD should be useful as a focused Markdown and AI workbench while supporting substantial extension into structured knowledge, task workflows, Git, SDD, evidence, and developer-agent use cases. Those extensions need access to privileged service and UI behavior without becoming unrestricted Node modules that bypass workspace, credential, or agent authority.

The first serious version will ship bundled plugins only, but treating first-party code as privileged internal modules would leave the intended extension boundary unproven and force community plugins into a second architecture later.

## Decision

GraphiteMD SHALL provide one production plugin SDK and capability broker used by bundled and future plugins.

The kernel SHALL own workspace and resource identities, revisions, safe file operations, baseline search, foundational Markdown/link/property/task behavior, plugin lifecycle, commands and views, permissions, events, namespaced state, and runtime-neutral AI interaction primitives.

Plugins SHALL:

- declare identity, version, compatibility, dependencies, permissions, capabilities, and contributions in a manifest;
- receive opaque workspace, mount, resource, and revision identities rather than unrestricted absolute paths;
- use broker-mediated operations for files, credentials, Git, processes, models, and external systems;
- store inspectable durable state under `.graphitemd/plugins/<plugin-id>/` and use only namespaced derived projections;
- register commands, views, events, tools, and settings through SDK contracts;
- behave predictably when capabilities are denied or unavailable.

Bundled plugins SHALL pass the same conformance suite expected of the platform: manifest validation, enable/disable/restart/upgrade lifecycle, permission denial, restart and partial-operation recovery, state namespace isolation, and headless contract tests. Bundled status SHALL NOT grant raw SQLite, credential, filesystem, Git-process, shell, or unrestricted Node authority.

For repository-owned bundled plugins, package exports, dependency constraints, AST-based forbidden-source checks, and review SHALL enforce that boundary against accidental bypass, while the capability broker remains authoritative for supported runtime operations. This trusted first-party model is not containment for deliberately malicious code.

Arbitrary third-party installation, signing, distribution, compatibility guarantees, and untrusted-code isolation are deferred. Future community service plugins will require process or container isolation, and community UI will require sandboxed contribution boundaries.

## Options Considered

### Option 1: One Capability-Mediated SDK For Bundled And Future Plugins

- Summary: Exercise the real extension boundary from the first bundled plugin.
- Pros: Prevents first-party bypasses, makes permissions testable, and lets later community support extend an existing architecture.
- Cons: Adds manifest, lifecycle, broker, and contract work before third-party installation exists.

### Option 2: Internal Modules First, Public SDK Later

- Summary: Build bundled features with direct imports and extract an SDK after patterns stabilize.
- Pros: Faster initial implementation and easier refactoring.
- Cons: Encourages hidden privileges and makes the eventual public boundary an expensive second architecture.

### Option 3: Obsidian-Style In-Process Plugins With Broad Host Access

- Summary: Let plugins execute with the full application process and filesystem authority.
- Pros: Maximum flexibility and low mediation overhead.
- Cons: Incompatible with server hosting, user trust, credential isolation, agent grants, and future community safety.

### Option 4: One Monolithic Development Plugin

- Summary: Package SDD, Git, workflow, evidence, and developer agents together.
- Pros: Simple installation and one integration surface.
- Cons: Recreates Coordinator as a profile boundary and prevents users from composing only the capabilities they need.

## Consequences

- Positive: Kernel authority remains small, inspectable, and enforceable.
- Positive: First-party plugins continuously test the same extension contracts future plugins will use.
- Positive: Development capabilities can be installed and evolved independently.
- Negative: SDK compatibility, manifests, migrations, and lifecycle behavior become product responsibilities early.
- Negative: Capability mediation adds implementation and testing overhead compared with direct internal calls.
- Follow-up: The foundation Change must define the minimum manifest, capability vocabulary, state namespace, contribution contracts, and conformance harness before migrating spike behavior.

## Validation

- Run the shared conformance suite against the bundled Assistant and every additional first-party plugin.
- Prove disabled plugins contribute no commands, views, tools, routes, events, or background work.
- Prove undeclared or denied capabilities fail closed without exposing raw paths or credentials.
- Prove plugin state remains isolated and survives supported restart and upgrade paths.
- Prove the service can run headlessly with plugin contracts tested without the full browser UI.

## Reconsider When

- The SDK imposes more coupling or migration cost than the plugin separation prevents.
- A required capability cannot be expressed safely through brokered contracts.
- Community installation becomes current scope and requires a stronger packaging, signing, or isolation boundary.
- Multiple UI clients require a different contribution model.
