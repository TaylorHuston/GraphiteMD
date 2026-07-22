# Design: Bundled Plugin Recovery Verification

## Context

`runPluginConformance` uses an in-memory backend. It cannot prove persisted enablement or interrupted-state recovery for Assistant, despite GMD-003/S1/R4-S3 claiming that it does.

## Goals / Non-Goals

**Goals:**

- Add deterministic production-runtime proof for each current bundled plugin across persisted enablement, restart, and interrupted-state recovery.
- Update GMD-003/S1/R4-S3 only after exact evidence exists.

**Non-Goals:**

- Do not alter plugin capability, UI, provider, or workspace behavior.
- Do not claim process-kill durability beyond the existing explicit gap.

## Planning Interview / Story Refinement

- Scope boundary reviewed:
- User decisions:
- Assumptions:
- Deferred scope:
- Story boundaries challenged:
- Requirements refined:
- Scenario gaps considered:
- Open questions that block implementation:

## Epic Changes

### Update Epic: GMD-003 Bundled Plugin Platform

Use this section only when the change proposes edits to an existing Epic.

- Target Epic: `docs/epics/gmd-003-bundled-plugin-platform/epic.md`
- Change Type: verification and evidence reconciliation

#### Story Changes

- Added: focused R4-S3 recovery proof.
- Modified: `Verified By` and `Verification Gaps` for R4-S3.
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
- User impact:
- Implementation complexity:
- Reversibility:
- Client surfaces:
- API / contract shape:
- Frontend/backend boundary:
- Data / schema impact:
- Auth / security impact:
- Testability:
- Operational risk:
- Fit with project conventions:

### Option 2: Expand The In-Memory Conformance Harness

- Summary: give testkit a durable backend abstraction and require each bundle to run it.
- User impact:
- Implementation complexity:
- Reversibility:
- Client surfaces:
- API / contract shape:
- Frontend/backend boundary:
- Data / schema impact:
- Auth / security impact:
- Testability:
- Operational risk:
- Fit with project conventions:

## Selected Approach

Prefer the production-runtime fixture: it proves the persisted behavior GMD-003 claims, without treating an in-memory simulation as operational recovery proof. The test fixture stays disposable, local, and provider-free.

## Experience Design

Use this section only when the Change has material UI or interaction design. Remove it when it does not apply; use `/sdd-design` when the direction needs user-guided convergence.

- Applicability: not required
- Confirmed direction:
- User confirmation:
- Reference artifacts:

### User Flow And Information Architecture

### Responsive Composition

### Component And State Contract

#### Component Strategy

Record only materially affected components or patterns. Use `existing application component`, `adopted reference`, `application-specific`, `reference candidate`, or `deliberate divergence`. A reference candidate does not create a cross-repository dependency unless this Change explicitly says so.

`Required Preview States` names the states that need evidence, not a required tool. Evidence may come from component previews, rendered routes or fixtures, browser checks, or a manual walkthrough.

| Component Or Pattern | Strategy | Initial Owner Or Reference | Required Preview States | Follow-Up |
|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD |

### Accessibility And Interaction

### Visual Direction

### Open Design Questions

## Client And API Boundary

- Current clients:
- Plausible future clients:
- Reusable product capabilities:
- API or typed contract:
- OpenAPI plan, if HTTP-facing:
- Backend platform exposed directly to clients?:
- Client-specific presentation or local state:
- Rationale:

## Alternatives Considered

- Option:
  - Why not:

## Why This Approach

Explain why the chosen approach is the right fit for this change.

## ADRs

- Required: no
- ADR path: `docs/adrs/yyyy-mm-dd-decision-title.md` or not applicable
- Decision summary:
- Reconsider when:

## Implementation Constraints

- None identified yet.

## Verification Strategy

- Focused automated tests: one exact persisted enablement/restart/recovery case per bundled plugin.
- Separate evidence types instead of treating all proof as interchangeable:
  - Focused automated tests:
  - Broad supporting gates:
  - Deterministic E2E:
  - Live-provider or external-service playtests:
  - Manual UI confirmation:
  - Debug/log inspection:

## Decisions

- Persisted enablement must apply before activation after restart; malformed/interrupted plugin state must fail or recover honestly without cross-plugin leakage.

## Risks / Trade-Offs

- Test fixture must not reuse a real workspace, owner state, or Codex credential.
