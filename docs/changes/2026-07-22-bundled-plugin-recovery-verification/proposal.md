# Proposal: Bundled Plugin Recovery Verification

## Why

GMD-003 claims every bundled plugin passes restart and interrupted-state recovery conformance, but the current in-memory conformance harness does not prove that for Assistant.

## What Changes

Add deterministic persisted enablement, restart, and interrupted-state recovery proof for every bundled plugin, then reconcile GMD-003/S1/R4-S3 evidence with that proof.

## Target Repositories

- This repository (role: canonical-app).

## Epic Actions

### New Epic Directories

- `docs/epics/gmd-003-bundled-plugin-platform/`

### Existing Epic Directory Updates

- None proposed.

## Epic Story Changes

- Modify `GMD-003/S1/R4-S3` verification only; behavior scope and Story identity stay stable.
- If a Story moves between Epics, name the source Epic, destination Epic, old full Story reference, new full Story reference, and affected Requirements/Scenarios.

## Scope Decisions

- Confirmed: no user-facing feature or UI change; prove the accepted bundled-plugin lifecycle promise.
- Deferred: community-plugin isolation and process-kill durability remain deferred.
- Assumptions: the production runtime can be exercised against disposable workspace state without live provider credentials.
- User decisions that shaped the Story/Requirement split: audit finding stays scoped to GMD-003/S1/R4-S3.

## Change Folder

- Planned location: promoted; private draft removed
- Active location: `docs/changes/2026-07-22-bundled-plugin-recovery-verification/`
- Closed location: `docs/changes/closed/2026-07-22-bundled-plugin-recovery-verification/`

## Impact

- Product: confidence that bundled lifecycle claims are truthful.
- Code: plugin testkit and/or runtime test seam only if needed for deterministic recovery proof.
- Tests: focused persisted Assistant/System Status restart and interrupted-state cases.
- Docs: GMD-003 maps and verification gap.
- ADRs: no new decision expected; remains within the accepted plugin-platform ADR.

## Release Communication Impact

- Required: no
- Record / section: not applicable
- Public summary: none

## Open Questions

- None identified yet.
