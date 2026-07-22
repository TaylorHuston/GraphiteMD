# Design: Bundled Plugin Recovery Verification

## Context

`runPluginConformance` uses an in-memory backend. It cannot prove persisted enablement or interrupted-state recovery for Assistant, despite GMD-003/S1/R4-S3 claiming that it does. Production activation also needed an explicit recovery check: Assistant has no state read/write during activation, so passive state-adapter recovery was insufficient.

## Goals / Non-Goals

**Goals:**

- Add deterministic production-runtime proof for each current bundled plugin across persisted enablement, restart, and interrupted-state recovery.
- Update GMD-003/S1/R4-S3 only after exact evidence exists.

**Non-Goals:**

- Do not alter plugin capability, UI, provider, or workspace authority behavior.
- Do not claim process-kill durability beyond the existing explicit gap.

## Planning Interview / Story Refinement

- Scope boundary reviewed: GMD-003/S1/R4-S3 only; Assistant product behavior remains GMD-004.
- User decisions: recovery evidence must include every current bundled manifest, not only System Status.
- Assumptions: disposable workspace fixtures exercise the production host without a provider credential.
- Deferred scope: process-kill durability and the existing pathname-race limit remain R4-S2 gaps.
- Story boundaries challenged: no new Story; recovery is shared platform behavior.
- Requirements refined: a malformed temporary state must make only its plugin activation fail closed with no contributions.
- Scenario gaps considered: persisted explicit `true` and `false`, complete temporary state, and malformed temporary state for both bundle IDs.
- Open questions that block implementation: none.

## Epic Changes

### Update Epic: GMD-003 Bundled Plugin Platform

Use this section only when the change proposes edits to an existing Epic.

- Target Epic: `docs/epics/gmd-003-bundled-plugin-platform/epic.md`
- Change Type: verification and evidence reconciliation

#### Story Changes

- Added: focused R4-S3 runtime recovery proof.
- Modified: `PluginHost.enable`, `Verified By`, and `Verification Gaps` for R4-S3.
- Removed: no product behavior.

#### Supersedes / Reconciles

- Earlier evidence claim: shared in-memory conformance proves persisted recovery for every bundle.
- Reclassify R4-S3 from partial/gap to verified only when both Assistant and System Status proof is exact and passing.
- Closed or active Change artifacts likely to need status cleanup: none.
- Manual confirmation status updates expected: not applicable.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Use `assets/epic-template.md` as the canonical target shape for new or normalized Epic files.
- Epics and Stories are durable but revisable; Stories may be renamed, reordered, split, merged, or moved between Epics as the product matures.
- Treat Story moves as explicit Epic changes that name the source Epic, destination Epic, old full Story reference, new full Story reference, and affected Requirements/Scenarios.
- For new or normalized Epics, use Epic-scoped Story labels such as `S1`, `S2`, and `S3`. Full references include the Epic ID, such as `EPIC-ID/S1`.
- Preserve legacy app-wide Story IDs, such as `OD-010`, only when existing tests, reviews, generated indexes, commits, or migration history depend on them.
- Keep `S#` labels unique within each Epic. Before assigning a new label, scan the target Epic for existing labels.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.
- Do not use generic Scenarios such as "WHEN this Story's workflow is exercised"; name the real trigger, state, failure mode, or observable condition.

## Technical Options

Use this section for non-trivial changes. If only one path is reasonable, record why the choice is obvious.

### Option 1: Production Runtime Recovery Fixture

- Summary: exercise each bundled manifest through `PluginRuntimeService` with disposable workspace state across restart and recoverable interrupted state.
- User impact: no new surface; malformed persisted state is reported as the plugin's existing activation failure.
- Implementation complexity: small host activation guard plus focused real-filesystem tests.
- Reversibility: remove the guard and tests if the platform later adopts a different lifecycle contract.
- Client surfaces: existing plugin inventory receives the established `activation_failed` status.
- API / contract shape: no new public contract; uses `PluginStateBackend.recovery()`.
- Data / schema impact: none.
- Auth / security impact: preserves fail-closed state handling and prevents a malformed temporary state from activating code.
- Testability: disposable workspace fixture needs no provider credentials.
- Operational risk: failed recovery isolates one plugin rather than preventing unrelated bundled plugins from activating.
- Fit with project conventions: uses the production SDK and existing runtime state backend.

### Option 2: Expand The In-Memory Conformance Harness

- Summary: give testkit a durable backend abstraction and require each bundle to run it.
- Rejected: it would still require a durable backend model and would prove a test abstraction rather than the workspace-bound production state path.

## Selected Approach

Use the production-runtime fixture and make `PluginHost.enable` perform the production state-backend recovery before activation. A failed recovery becomes the existing isolated `activation_failed` inventory state, avoiding a whole-service outage or an in-memory-only claim. The test fixture stays disposable, local, and provider-free.

## Experience Design

Not applicable: this change alters host activation and focused server tests only; no browser-visible component or interaction changes.

## Client And API Boundary

- Not changed. Existing inventory status is reused; no HTTP, typed client contract, or browser state changes are required.

## Alternatives Considered

- Durable conformance-harness backend: rejected because it cannot replace a production workspace-path proof.

## Why This Approach

Recovery belongs at the host activation boundary, where every enabled plugin follows the same state contract. This closes the Assistant-specific hole without adding a special case or creating user-visible behavior.

## ADRs

- Required: no
- ADR path: not applicable
- Decision summary: uses the accepted capability-mediated platform's existing state-recovery contract.
- Reconsider when: community plugins introduce an isolated runtime or a different durable state contract.

## Implementation Constraints

- Keep failures plugin-local and use no live provider, account, or user workspace in tests.

## Verification Strategy

- Focused automated tests: exact cases collectively enumerate every bundled plugin for persisted explicit enablement, complete temporary-state recovery, and malformed-state isolation.
- Separate evidence types instead of treating all proof as interchangeable:
  - Focused automated tests: production runtime and SDK suites.
  - Broad supporting gates: root test, lint, and typecheck.
  - Deterministic E2E: not applicable; no browser behavior changes.
  - Live-provider or external-service playtests: not applicable; recovery is provider-free.
  - Manual UI confirmation: not applicable; no browser behavior changes.
  - Debug/log inspection: not required.

## Decisions

- Persisted enablement must apply before activation after restart; malformed/interrupted plugin state must fail or recover honestly without cross-plugin leakage.

## Risks / Trade-Offs

- Test fixture must not reuse a real workspace, owner state, or Codex credential.
