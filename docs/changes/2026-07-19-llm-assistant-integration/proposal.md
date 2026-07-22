# Proposal: LLM Assistant Integration

## Why

GraphiteMD is intended to be a document-native AI workbench, but the current application cannot authenticate with an LLM provider or answer a question from workspace notes. The first Assistant Change should prove the complete trust boundary: the owner can connect an OpenAI Codex subscription, ask about any eligible Markdown note, and see which notes GraphiteMD actually supplied to the model.

## What Changes

- Add the bundled, read-only Assistant as GraphiteMD's first AI-backed capability.
- Use Pi as the replaceable embedded agent/runtime core and OpenAI Codex OAuth as the only provider onboarding path in this Change.
- Let the authenticated owner ask a question from the existing Context surface.
- Give the Assistant only brokered workspace search and read tools over eligible opaque note resources.
- Deliver the Assistant's prompt, retrieval strategy, tool selection, and Context presentation through the bundled Assistant plugin, while the service continues to own credential storage, provider lifecycle, resource enforcement, provenance, and durable records.
- Show source references derived from successful tool reads and preserve an inspectable workspace-local conversation record.
- Establish `.graphitemd/` as the workspace-local GraphiteMD vault, including a safe migration from the legacy `.graphite/` namespace; keep password, session, OAuth, and runtime-secret state in a separate machine-local GraphiteMD vault.
- Keep ordinary Markdown browsing, editing, search, and plugin behavior fully usable when Codex is disconnected or unavailable.

## Target Repositories

- This repository (role: canonical-app).

## Epic Actions

### New Epic Directories

- `docs/epics/gmd-004-llm-assistant/` — create `GMD-004 Workspace-Grounded Assistant` with `GMD-004/S1 Connect OpenAI Codex` and `GMD-004/S2 Ask The Workspace Through Codex`.

### Existing Epic Directory Updates

- None. `GMD-003` continues to own the general bundled-plugin platform; `GMD-004` owns Assistant behavior exercised through that platform.

## Epic Story Changes

- Add `GMD-004/S1` covering owner-controlled Codex OAuth and protected credential lifecycle.
- Add `GMD-004/S2` covering read-only workspace-grounded questions, service-derived source provenance, inspectable conversation state, and the responsive Context experience.
- No Story moves, replacements, or removals.

## Scope Decisions

- Confirmed:
  - The first proof is one usable read-only vertical slice, not provider plumbing by itself.
  - OpenAI Codex subscription OAuth is the only provider onboarding path.
  - The owner can ask about any Markdown note that the existing workspace authority considers eligible.
  - Answers expose source references that prove which workspace notes were actually read.
  - Pi has no built-in filesystem, shell, write, extension, skill, prompt-template, theme, or automatic context-file authority.
  - Durable conversation, workspace configuration, plugin configuration, and other inspectable workspace-local state are canonical beneath `<workspace>/.graphitemd/`.
  - Password, session, OAuth, encryption, and Pi runtime-secret state are machine-local beneath `~/.graphitemd/` by default (or an explicitly configured, non-workspace `GRAPHITEMD_STATE_DIR`).
  - Existing `.graphite/` workspace state migrates to `.graphitemd/` without data loss; ambiguous or unsafe layouts fail closed with a recovery message rather than merging state.
  - The Assistant uses the existing desktop Context panel and narrow-screen Context drawer; provider setup uses Settings.
  - The bundled Assistant, not a core question route, owns the replaceable prompt, retrieval strategy, tool selection, and Context contribution. The service validates and executes only declared brokered model and workspace operations.
- Deferred:
  - Document proposals, direct writes, autonomous grants, destructive or external tools, developer agents, background work, and schedules.
  - Providers other than Codex, API-key onboarding, model selection UI, custom system prompts, named agents, memory, compaction UX, and multi-agent delegation.
  - Conversation library/navigation, cross-device conversation resume, attachments, image input, voice, and polished citation navigation.
  - User-configurable Assistant-only folder or mount exclusions. This slice still enforces the existing eligible-resource boundary, including `.graphitemd/`, configured inventory exclusions when present, symlinks, unsupported files, and size limits.
- Assumptions:
  - The implementation will adopt the current Pi `0.80.x` SDK behind a GraphiteMD-owned adapter; the package lockfile will pin the exact resolved version.
  - The existing local search and opaque note-read authority are the only workspace context sources needed for this proof.
  - A model answer is not proof of grounding unless GraphiteMD can associate it with successful brokered read events.
- User decisions that shaped the Story/Requirement split:
  - The user confirmed a usable Assistant vertical slice, then narrowed the acceptance proof to Codex authentication plus asking about any note in the vault. Planning validation led to two Stories so provider onboarding and note Q&A each remain one primary user path.
  - The user selected an Obsidian-like atomic workspace boundary: workspace-canonical state belongs in `<workspace>/.graphitemd/`, while machine-specific secrets remain outside the workspace. This replan adds the namespace migration and default machine-state resolution to the existing vertical slice.

## Change Folder

- Planned location: promoted; private draft removed
- Active location: `docs/changes/2026-07-19-llm-assistant-integration/`
- Closed location: `docs/changes/closed/2026-07-19-llm-assistant-integration/`

## Impact

- Product: Introduces the first usable workspace-grounded Assistant without weakening normal non-AI editing.
- Code: Adds runtime-neutral Assistant contracts, a service-owned Pi/Codex and workspace-enforcement boundary, a brokered bundled Assistant policy/presentation contribution, conversation persistence, authenticated HTTP routes, responsive web UI, and a safe `.graphite/` to `.graphitemd/` workspace-state migration with a machine-local state default.
- Tests: Adds deterministic provider/OAuth doubles, package/service/contract/component coverage, production-browser E2E, a live Codex playtest, and direct rendered UI inspection.
- Docs: Updates the new Epic, README runtime/security/backup and migration guidance, plugin and Assistant boundaries, and user-visible changelog.
- ADRs: Revises the Proposed Pi-backed Assistant ADR to record the workspace-vault/machine-vault split and migration, and links the existing agent-authority ADR to read-only Q&A in `GMD-004/S2`.

## Release Communication Impact

- Required: yes
- Record / section: `CHANGELOG.md` / `Unreleased` / `Added`, plus README setup and security guidance.
- Public summary: Owners can connect a Codex subscription and ask the read-only Assistant questions grounded in eligible workspace notes, with visible source evidence.

## Open Questions

- None block planning. Model-default selection remains a documented implementation setting validated against Pi's current Codex model registry rather than a user-facing choice in this Change.
- Replan classification (2026-07-20): **technical constraint / Epic ownership reconciliation**. Current core question orchestration is implementation drift, not a product-scope change; the accepted brokered bundled-Assistant direction remains in force.
