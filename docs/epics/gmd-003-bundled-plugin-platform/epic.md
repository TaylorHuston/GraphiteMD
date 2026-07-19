---
schema: sdd-epic-v2
id: GMD-003
status: draft
created: 2026-07-18
modified: 2026-07-18
last_verified:
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

The workspace owner will be able to inspect and control bundled plugins while GraphiteMD validates their compatibility, confines their capabilities and state, removes their contributions when disabled, and proves lifecycle behavior through one shared conformance suite.

## Current Scope

- Bundled first-party service and web plugin manifests.
- Plugin inventory, enable/disable control, lifecycle state, compatibility reporting, and contribution registration.
- Broker-mediated permissions for workspace resources, plugin state, commands, views, and events.
- Inspectable namespaced durable plugin state under `.graphite/plugins/<plugin-id>/`.
- A small useful bundled System Status plugin plus test-only conformance fixtures exercising the production SDK.

## Deferred Scope

- Arbitrary plugin installation, community code, signing, distribution, marketplace, and compatibility promises.
- Process/container isolation for service plugins and sandboxed community UI.
- Dynamic dependency resolution, remote packages, hot code reload, and third-party migrations.
- Assistant, Git, SDD, workflow, evidence, and developer-agent plugin behavior; those capabilities receive later Epics and Changes.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|
| `community-plugin-installation` | deferred | As an owner, I want to install a third-party plugin safely, so that I can extend GraphiteMD beyond bundled capabilities. | Package trust, isolation, signing, compatibility, permission review, and recovery are proven. |
| `plugin-dependency-management` | deferred | As a plugin author, I want declared dependencies and compatibility resolution, so that composed extensions fail predictably. | Deterministic resolution and user-visible failure states exist. |

## Story Index

| Story | Implementation | Verification | Capability | Last Verified | Notes |
|---|---|---|---|---|---|
| S1 | partial | partial | Inspect, control, and trust bundled plugins. | 2026-07-18 | Production service host, inspectable persistence, filesystem recovery, authenticated service and browser control, and contribution status visibility are implemented; contribution mounting remains. |

## Stories

### Story S1: Inspect Control And Trust Bundled Plugins

Implementation: partial
Verification: partial
Created: 2026-07-18
Modified: 2026-07-18
Last verified: 2026-07-18

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

The system SHALL grant a plugin only declared broker capabilities over opaque workspace and resource identities and SHALL deny direct raw filesystem, SQLite, credential, Git-process, shell, or unrestricted Node authority.

###### Scenario R3-S1: Declared Capability Succeeds Within Scope

- WHEN an enabled plugin requests an allowed operation for an authorized resource
- THEN the broker performs the operation under the current user and workspace authority
- AND returns a runtime-validated result without exposing raw credentials or unrestricted paths.

###### Scenario R3-S2: Undeclared Or Out-Of-Scope Capability Is Denied

- WHEN a plugin requests an undeclared permission, excluded resource, raw path, or unavailable operation
- THEN the request fails closed with a normalized denial
- AND no protected resource or secret is accessed.

##### Requirement R4: Namespaced Inspectable State And Recovery

The system SHALL confine durable plugin state to its documented `.graphite/plugins/<plugin-id>/` namespace and run lifecycle and recovery checks against every bundled plugin.

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
- THEN the shared conformance suite proves manifest validation, enable/disable/restart behavior, permission denial, state isolation, contribution removal, and headless contracts
- AND bundled status grants no test or runtime bypass.

#### Implemented By

| Requirement / Scenario | Location / Anchor | Kind | Responsibility |
|---|---|---|---|
| S1/R1 | `packages/plugin-sdk/src/index.ts#validatePluginManifest` | primary | Runtime manifest validation, compatibility/dependency checks, fail-closed inventory, and contribution registration through `PluginHost.load`. |
| S1/R2 | `packages/plugin-sdk/src/index.ts#PluginHost` | primary | Applies injected persisted enablement before activation and tears down registered contributions. |
| S1/R3 | `packages/plugin-sdk/src/index.ts#createCapabilityBroker` | primary | Declared opaque operations and normalized fail-closed denial. |
| S1/R4 | `packages/plugin-sdk/src/index.ts#createPluginStateAdapter` | primary | Plugin-bound versioned state contract, transactional backend boundary, and recovery status. |
| S1/R4-S3 | `packages/plugin-testkit/src/index.ts#runPluginConformance` | primary | Shared headless conformance contract used for every bundled plugin. |
| S1/R4-S3 | `plugins/system-status/src/index.ts#systemStatusPlugin` | support | Real bundled plugin using the production manifest, broker, state, and contribution contracts. |
| S1/R1, S1/R2, S1/R3 | `apps/server/app/plugins/plugin_runtime_service.ts#PluginRuntimeService` | primary | Loads System Status through the production host, applies persisted enablement before activation, and supplies a current-workspace status capability without raw path exposure. |
| S1/R2 | `apps/server/app/plugins/plugin_runtime_service.ts#PluginEnablementStore` | primary | Atomically persists inspectable workspace enablement. |
| S1/R2 | `apps/server/start/routes.ts#pluginRuntime` | support | Exposes authenticated inventory and control endpoints. |
| S1/R1, S1/R2 | `apps/web/src/SettingsPanel.tsx#SettingsPanel` | presentation | Presents manifest identity, status, declared permissions, active contributions, and accessible enable/disable controls while returning rejected sessions to sign-in. |
| S1/R4 | `apps/server/app/plugins/plugin_runtime_service.ts#FilesystemPluginStateBackend` | primary | Atomically commits versioned state under the plugin namespace, rejects symlink redirection, and recovers complete interrupted writes without accepting invalid partial JSON. |

#### Implementation Gaps

- `S1/R1-S1`: Browser inventory presentation exists, but plugin web contribution mounting into the workbench remains unimplemented.
- `S1/R3`: The production provider implements the System Status plugin's current-workspace status operation. Broader resource-scoped providers, an architectural forbidden-import gate, and current-user propagation beyond the owner-only service remain unimplemented.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1, S1/R1-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R1 manifest validation`, lifecycle invalid/dependency tests | Valid manifests activate; malformed, incompatible, duplicate, and unresolved/version-mismatched dependencies fail closed without contributions. | passing |
| S1/R2-S1, S1/R2-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R2 plugin lifecycle` | Injected persisted disablement is applied before activation and disable disposes runtime work and removes contributions. | passing (headless) |
| S1/R3-S1, S1/R3-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R3 capability mediation` | Declared opaque operations succeed; undeclared and raw-path operations receive normalized denials. | passing |
| S1/R4-S1, S1/R4-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R4 namespaced state` | Plugin-bound namespaces, versioned transactional backend calls, isolation, and recovery status contract. | passing (backend contract) |
| S1/R4-S3 | `plugins/system-status/src/index.test.ts` — shared `runPluginConformance` assertion | The real System Status plugin passes production SDK lifecycle, denial, state, recovery, and headless contract checks. | passing |
| S1/R1-S1, S1/R2-S1 | `apps/server/tests/http/authentication.test.ts` — `GMD-003/S1 production plugin host` | The authenticated production API lists System Status through its real manifest and disables it while removing contributions and writing inspectable configuration. | passing |
| S1/R1-S1, S1/R2-S1 | `apps/web/src/SettingsPanel.test.tsx` — browser inventory and enablement cases | Browser-component evidence presents plugin identity, status, declared permissions, active contribution status, and enable/disable controls; a disabled response removes contributions and a rejected session returns to sign-in. | passing |
| S1/R2-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — `GMD-003/S1 R2 inspectable enablement` | Restarted production hosts apply persisted disablement before bundled activation and malformed configuration fails closed. | passing |
| S1/R3-S1, S1/R4-S1, S1/R4-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — production host and atomic state cases | System Status activates through the real workspace-aware provider; state commits in its namespace, rejects traversal/symlinks, recovers complete temporary writes, and reports invalid partial JSON as failed. | passing |

#### Verification Gaps

- `S1/R1-S1`: Browser inventory visibility, controls, and contribution status are verified; contribution mounting is neither implemented nor verified.
- `S1/R3-S1`, `S1/R3-S2`: Real workspace-aware status capability and broker denial are verified, but broader excluded-resource providers and a static forbidden-import boundary are not.
- `S1/R4-S2`: Recovery is verified with complete and malformed interrupted state files; process-kill durability and filesystem fault injection are not yet verified.

#### Story Notes

- Seed manifest enablement from Dashboard's Core Plugin registry and capability mediation from Coordinator's runtime-neutral tool contracts and `RepositoryCapabilityHost`; neither source is copied as the final public SDK unchanged.
- The System Status plugin is intentionally small but user-useful: it reports service, workspace, index, and plugin health through declared read-only capabilities and proves real service/web contributions.

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
