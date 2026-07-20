---
schema: sdd-epic-v2
id: GMD-003
status: draft
created: 2026-07-18
modified: 2026-07-19
last_verified: 2026-07-19
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
| S1 | implemented | partial | Inspect, control, and trust bundled plugins. | 2026-07-19 | The trusted first-party System Status scope is implemented through the SDK, broker, workspace-bound persistence, validated controls, cold-start recovery, and inventory-mediated contributions; malicious containment remains deferred. |

## Stories

### Story S1: Inspect Control And Trust Bundled Plugins

Implementation: implemented
Verification: partial
Created: 2026-07-18
Modified: 2026-07-19
Last verified: 2026-07-19

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
| S1/R2 | `apps/server/app/plugins/plugin_runtime_service.ts#PluginEnablementStore` | primary | Serializes enablement mutations, binds reads and atomic pre-create/precommit writes to the workspace authority's accepted identity, and persists inspectable configuration through exclusive no-follow temporary files plus durability sync. |
| S1/R2 | `apps/server/start/routes.ts#pluginRuntime` | support | Exposes authenticated plugin inventory and control endpoints. |
| S1/R1, S1/R2 | `apps/web/src/SettingsPanel.tsx#SettingsPanel` | presentation | Presents manifest identity, status, declared permissions, active contributions, and accessible enable/disable controls while returning rejected sessions to sign-in. |
| S1/R1, S1/R2 | `apps/web/src/App.tsx#Workbench` | presentation | Mounts System Status only from its active declared production inventory view and removes it after disablement. |
| S1/R1, S1/R2 | `packages/contracts/src/index.ts`; `apps/web/src/api.ts#requestJson` | support | Defines and validates the plugin inventory/control response boundary before plugin state or contributions enter the browser. |
| S1/R4 | `apps/server/app/plugins/plugin_runtime_service.ts#FilesystemPluginStateBackend` | primary | Binds state reads/transactions/recovery to accepted workspace identity, serializes writes, retains and revalidates namespace identity before commit/recovery mutation, rejects redirected or malformed namespace parents, syncs durability, and recovers only complete interrupted state. |
| S1/R3-S2, S1/R4-S3 | `apps/server/tests/plugins/bundled_import_boundary.test.ts#boundaryViolations` | support | Enforces the trusted first-party bundled-source and production-dependency boundary in the required test gate, including dynamic imports and direct process/network/module escape APIs; it is not malicious-code runtime containment. |

#### Implementation Gaps

None for the accepted bundled System Status scope. Broader resource providers belong to the deferred Assistant, Git, SDD, workflow, and community-plugin capabilities rather than this Story.

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| S1/R1-S1, S1/R1-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R1 manifest validation`, caret-boundary, duplicate, failed-activation, dependency-order, and cycle cases | Valid manifests activate; caret lower/upper bounds are enforced, and malformed, incompatible, duplicate, unresolved, cyclic, version-mismatched, or failed dependencies fail closed without contributions. | passing 2026-07-19 |
| S1/R2-S1, S1/R2-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R2 plugin lifecycle` | Injected persisted disablement is applied before activation; dependencies activate first; disabling a dependency tears down active dependents first and removes all contributions. | passing (headless) 2026-07-19 |
| S1/R3-S1, S1/R3-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R3 capability mediation` | Declared opaque operations succeed; undeclared and raw-path operations receive normalized denials. | passing |
| S1/R4-S1, S1/R4-S2 | `packages/plugin-sdk/src/index.test.ts` — `GMD-003/S1 R4 namespaced state` | Plugin-bound namespaces, versioned transactional backend calls, isolation, and recovery status contract. | passing (backend contract) |
| S1/R4-S3 | `plugins/system-status/src/index.test.ts` — shared `runPluginConformance` assertion | The real System Status plugin passes production SDK lifecycle, denial, state, recovery, and headless contract checks. | passing |
| S1/R1-S1, S1/R2-S1 | `apps/server/tests/http/authentication.test.ts` — `GMD-003/S1 production plugin host` | The authenticated production API lists System Status through its real manifest and disables it while removing contributions and writing inspectable configuration. | passing |
| S1/R1-S1, S1/R2-S1 | `apps/web/src/SettingsPanel.test.tsx` — browser inventory and enablement cases | Browser-component evidence presents plugin identity, status, declared permissions, active contribution status, and enable/disable controls; a disabled response removes contributions and a rejected session returns to sign-in. | passing |
| S1/R1-S1, S1/R2-S1 | `apps/web/src/App.test.tsx` — System Status contribution lifecycle | The workbench mounts the declared active view from production inventory and removes it after owner disablement without a bundled-code bypass. | passing |
| S1/R2-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — `GMD-003/S1 R2 inspectable enablement` | Restarted production hosts apply persisted disablement before bundled activation and malformed configuration fails closed. | passing |
| S1/R2-S1, S1/R2-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — `serializes concurrent enablement updates without losing either setting` | Concurrent in-process configuration mutations serialize and preserve both settings in the inspectable document. | passing 2026-07-18 |
| S1/R2-S1, S1/R2-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — replacement workspace identity denial | Focused persistence evidence proves plugin enablement cannot create or update configuration after the configured root identity changes. | passing 2026-07-19 |
| S1/R1-S1, S1/R2-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — cold start and unavailable-then-retry cases | A valid configured workspace starts the plugin runtime without route-order coupling; a failed unopened start may retry after the workspace appears, while an already accepted identity is never silently reopened after replacement. | passing 2026-07-19 |
| S1/R3-S1, S1/R4-S1, S1/R4-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — production host and atomic state cases | System Status activates through the real workspace-aware provider; state commits in its namespace, rejects traversal/symlinks, recovers complete temporary writes, and reports invalid partial JSON as failed. | passing |
| S1/R4-S1, S1/R4-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — `denies a namespace parent swapped immediately before atomic commit` | Deterministic filesystem evidence proves a swapped namespace ancestor is detected at the precommit boundary and no state is redirected outside the workspace. | passing with documented platform limit 2026-07-18 |
| S1/R4-S1, S1/R4-S2 | `apps/server/tests/plugins/plugin_runtime_service.test.ts` — recovery parent swap and malformed namespace cases | Recovery retains namespace identity before mutation, rejects a precommit replacement without redirected cleanup, and never reports a malformed namespace parent as clean. | passing 2026-07-19 |
| S1/R3-S2 | `apps/server/tests/plugins/bundled_import_boundary.test.ts` — adversarial AST, all-source, and production dependency/export boundary cases | Every repository-owned bundled production source and dependency graph is limited to the capability SDK; dynamic import, import-equals, process/global/network/module/eval escape forms fail the required server gate. | passing 2026-07-19 |
| S1/R1, S1/R2 | `tests/e2e/foundation.spec.ts` — desktop plugin lifecycle | Deterministic real-browser evidence proves the owner sees System Status, disables it with contribution removal and persisted state, then re-enables it without losing the workbench. | passing 2026-07-18 |
| S1/R1, S1/R2 | `apps/web/src/App.stories.tsx` — plugin active and disabled preview states | Storybook browser evidence renders both contribution states and runs configured accessibility checks. | passing 2026-07-18 |
| S1/R1, S1/R2 | `apps/web/src/App.stories.tsx` — plugin activation failure and incompatible preview states; `apps/web/src/SettingsPanel.test.tsx` — malformed inventory/control response cases | Browser evidence presents incompatible and failed activation states honestly, withholds invalid controls, and recovers from malformed successful plugin responses without trusting them. | passing 2026-07-19 |

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
