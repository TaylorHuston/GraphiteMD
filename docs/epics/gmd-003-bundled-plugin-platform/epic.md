---
schema: sdd-epic-v2
id: GMD-003
status: draft
created: 2026-07-18
modified: 2026-07-22
last_verified: 2026-07-22
stories:
  - S1
---

# GMD-003 Bundled Plugin Platform

## Product Context

- PRD: Private GraphiteMD Product Brief / PRD resolved through SDD workspace topology.
- Related Epics: [GMD-001 Secure Workspace Access](../gmd-001-secure-workspace-access/epic.md), [GMD-002 Markdown Workbench](../gmd-002-markdown-workbench/epic.md)
- Related ADR: [Capability-Mediated Plugin Platform](../../adrs/2026-07-18-capability-mediated-plugin-platform.md)

GraphiteMD needs a minimal dependable kernel that can grow into structured knowledge, workflows, Git, SDD, evidence, and developer-agent use cases. Bundled extensions must prove the real SDK and capability boundary from the beginning rather than receiving internal shortcuts that future plugins cannot use.

## Outcome

The workspace owner will be able to inspect and control bundled plugins while GraphiteMD validates their compatibility, confines their capabilities and state, removes their contributions when disabled, and proves lifecycle behavior through shared headless conformance plus production-runtime recovery verification.

## Current Scope

- Bundled first-party service and web plugin manifests.
- Plugin inventory, enable/disable control, lifecycle state, compatibility reporting, and contribution registration.
- Broker-mediated permissions for workspace resources, plugin state, commands, views, and events.
- Inspectable namespaced durable plugin state under `.graphitemd/plugins/<plugin-id>/`.
- System Status and Assistant manifests exercising the production SDK, including persisted enablement and state-recovery conformance.

## Deferred Scope

- Arbitrary plugin installation, community code, signing, distribution, marketplace, and compatibility promises.
- Process/container isolation for service plugins and sandboxed community UI.
- Dynamic dependency resolution, remote packages, hot code reload, and third-party migrations.
- Assistant-specific product behavior, Git, SDD, workflow, evidence, and developer-agent capabilities; Assistant's shared bundled-platform conformance remains current scope.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|
| `community-plugin-installation` | deferred | As an owner, I want to install a third-party plugin safely, so that I can extend GraphiteMD beyond bundled capabilities. | Package trust, isolation, signing, compatibility, permission review, and recovery are proven. |
| `plugin-dependency-management` | deferred | As a plugin author, I want declared dependencies and compatibility resolution, so that composed extensions fail predictably. | Deterministic resolution and user-visible failure states exist. |

## Story Index

| Story | Implementation | Verification | Capability | Last Verified | Notes |
|---|---|---|---|---|---|
| S1 | implemented | partial | Inspect, control, and trust bundled plugins. | 2026-07-22 | System Status and Assistant share the SDK, workspace-bound persistence, validated controls, lifecycle recovery, and inventory-mediated contributions; malicious containment and the R4-S2 platform limits remain deferred. |

## Stories

### Story S1: Inspect Control And Trust Bundled Plugins

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-22
Last verified: 2026-07-22

As a workspace owner, I want bundled plugins to be visible, controllable, and capability-limited, so that extensions can add value without becoming invisible unrestricted application code.

#### Requirements And Scenarios

##### Requirement R1: Validated Plugin Inventory

The system SHALL load bundled plugins only through versioned manifests declaring identity, compatibility, permissions, dependencies, state schema, and service or web contributions.

###### Scenario R1-S1: Compatible Plugin Is Listed

- WHEN a bundled plugin has a valid compatible manifest
- THEN GraphiteMD lists its identity, version, status, requested permissions, and contributions
- AND activates it only through the production plugin host.

###### Scenario R1-S2: Invalid Or Incompatible Plugin Fails Closed

- WHEN a manifest is invalid, duplicated, incompatible, or has an unresolved dependency
- THEN the plugin contributes no commands, views, tools, routes, events, or background work
- AND the owner sees a specific recoverable status without losing the rest of the workbench.

##### Requirement R2: Owner-Controlled Enablement

The system SHALL let the owner enable or disable a bundled plugin and persist the setting in inspectable workspace configuration.

###### Scenario R2-S1: Disable Removes Contributions

- WHEN the owner disables an active bundled plugin
- THEN its commands, views, tools, event subscriptions, routes, and background work are removed or stopped
- AND the rest of the workbench remains usable.

###### Scenario R2-S2: Restart Preserves The Setting

- WHEN the service restarts after a plugin enablement change
- THEN the plugin resumes in the configured state
- AND disabled code does not briefly activate before configuration is applied.

##### Requirement R3: Capability-Mediated Access

The system SHALL enforce supported plugin operations through declared broker capabilities over opaque workspace and resource identities. Bundled plugins remain trusted repository-owned code subject to source/dependency checks; arbitrary malicious-code containment is deferred.

###### Scenario R3-S1: Declared Capability Succeeds Within Scope

- WHEN an enabled plugin requests an allowed operation for an authorized resource
- THEN the broker performs the operation under the current user and workspace authority
- AND returns a runtime-validated result without exposing raw credentials or unrestricted paths.

###### Scenario R3-S2: Undeclared Or Out-Of-Scope Capability Is Denied

- WHEN a trusted bundled plugin requests an undeclared permission, excluded resource, raw path, or unavailable broker operation
- THEN the broker denies the supported operation with a normalized failure
- AND no protected resource or secret is exposed through GraphiteMD capabilities.

##### Requirement R4: Namespaced Inspectable State And Recovery

The system SHALL confine durable plugin state to its documented `.graphitemd/plugins/<plugin-id>/` namespace and run lifecycle and recovery checks against every bundled plugin.

###### Scenario R4-S1: Plugin State Is Isolated

- WHEN a plugin reads or writes durable state
- THEN it can access only its versioned namespace through the state capability
- AND another plugin's namespace and kernel configuration remain unavailable.

###### Scenario R4-S2: Restart Or Partial Operation Recovers Predictably

- WHEN the service restarts or a plugin operation is interrupted
- THEN the plugin host either resumes from valid durable state or reports a recoverable failure
- AND does not silently treat a partial result as complete.

###### Scenario R4-S3: Bundled Plugin Passes Conformance

- WHEN a bundled plugin is accepted for release
- THEN shared headless conformance plus production-runtime recovery tests prove manifest validation, enable/disable behavior, permission denial, state isolation, contribution removal, and persisted restart recovery
- AND bundled status grants no test or runtime bypass.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S1/R1 | `packages/plugin-sdk/src/index.ts#validatePluginManifest` | primary | Validates compatible manifests. |
| S1/R2 | `apps/server/app/plugins/plugin_runtime_service.ts#PluginRuntimeService` | primary | Governs persisted enablement and contributions. |
| S1/R3 | `packages/plugin-sdk/src/index.ts#createCapabilityBroker` | primary | Governs declared broker operations. |
| S1/R4 | `apps/server/app/plugins/plugin_runtime_service.ts#FilesystemPluginStateBackend` | primary | Governs confined state and recovery. |

#### Implementation Gaps

None for the accepted bundled System Status scope. Broader resource providers belong to the deferred Assistant, Git, SDD, workflow, and community-plugin capabilities rather than this Story.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1 | `packages/plugin-sdk/src/index.test.ts#accepts a complete compatible versioned manifest` | Compatible manifest loading. | passing |
| S1/R1-S2 | `packages/plugin-sdk/src/index.test.ts#rejects incompatible and malformed manifests with recoverable codes` | Fail-closed manifests. | passing |
| S1/R2-S1 | `apps/server/tests/http/authentication.test.ts#lists and controls the bundled plugin through authenticated endpoints and persists the setting` | Authenticated enablement control. | passing |
| S1/R2-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts#persists disablement before a restarted production host loads bundled code` | Restart persistence. | passing |
| S1/R3-S1 | `packages/plugin-sdk/src/index.test.ts#permits declared opaque operations and normalizes undeclared or raw-path denial` | Declared broker access. | passing |
| S1/R3-S2 | `apps/server/tests/plugins/bundled_import_boundary.test.ts#allows every production bundled plugin source to use only the capability SDK` | Trusted-source dependency boundary. | passing |
| S1/R4-S1 | `apps/server/tests/plugins/plugin_runtime_service.test.ts#commits inspectable versioned state only inside the plugin namespace` | State isolation. | passing |
| S1/R4-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts#recovers a complete interrupted write without treating invalid partial JSON as complete` | Recoverable state. | passing |
| S1/R4-S3 | `apps/server/tests/plugins/plugin_runtime_service.test.ts#GMD-003/S1 R4-S3 applies persisted enablement before every bundled plugin activates after restart` | Per-bundle production recovery. | passing |

#### Verification Gaps

- `S1/R4-S2`: Deterministic namespace replacement and malformed-state fault injection passes; process-kill durability and the documented residual pathname race remain unverified platform limits.

#### Story Notes

- Seed manifest enablement from Dashboard's Core Plugin registry and capability mediation from Coordinator's runtime-neutral tool contracts and `RepositoryCapabilityHost`; neither source is copied as the final public SDK unchanged.
- The System Status plugin is intentionally small but user-useful: it reports service and workspace availability plus the current Markdown note count through a declared read-only capability and proves real service/web contributions.
- Bundled service plugins are trusted repository-owned first-party code. The source/dependency gate prevents accidental direct privilege bypass, while broker checks remain runtime authority for supported operations. This foundation does not claim containment of deliberately malicious code; community plugins still require the deferred process/container boundary.

## Cross-Story Concerns

- Plugin enablement is configuration, not permission escalation; every operation is rechecked by the broker.
- Plugin UI must communicate denied or unavailable capabilities without assuming service authority.
- Kernel and plugin contracts must remain runtime-neutral and usable in headless conformance tests.

## Open Decisions

- None block bundled-plugin support. Community packaging and isolation remain explicitly deferred.

## Completion Criteria

This Epic is healthy when:

- Embedded Stories cover the current scope.
- Requirements and Scenarios describe implemented behavior or intentional gaps.
- Story implementation and verification state match the Story Index and their respective gap sections.
- `Implemented By` maps every implemented Requirement to a concrete repository-relative location and stable code anchor.
- `Implementation Gaps` names accepted behavior that does not exist yet.
- `Verified By` maps concrete evidence to Requirements/Scenarios; automated evidence names existing repository-relative test paths.
- `Verification Gaps` are real, current, and explicit.
- Related changes, docs, indexes, reviews, and release communication do not contradict this Epic.

## Notes

- Community support expands this architecture later; it does not replace it with a second plugin model.
