# ADR: Pi-Backed Assistant Runtime And Split Storage Boundary

- Status: Accepted
- Date: 2026-07-19
- Related change: `docs/changes/2026-07-19-llm-assistant-integration/`
- Related Epics / Stories: `docs/epics/gmd-004-llm-assistant/epic.md` (`GMD-004/S1`, `GMD-004/S2`)

## Context

GraphiteMD needs its first model-backed capability without coupling product contracts to one SDK or allowing a bundled plugin to bypass workspace, credential, and provider authority. Coordinator-Local proves that Pi can embed an agent session and drive OpenAI Codex OAuth, but GraphiteMD has a stricter production plugin boundary: plugins use brokered resources and must not receive raw credentials, host paths, or ambient process authority.

The decision must also preserve a useful non-AI workbench, keep provider secrets outside the workspace, and let future runtimes or providers replace Pi/Codex without rewriting browser and durable conversation contracts. The owner has selected an atomic, Obsidian-like workspace boundary: inspectable workspace state must travel with the workspace under `.graphitemd/`, while per-machine secrets must remain outside it.

## Decision

GraphiteMD SHALL adopt Pi `0.80.x` as the first replaceable embedded Assistant runtime behind a GraphiteMD-owned model/auth adapter and capability boundary.

- The service owns Pi lifecycle, provider status, OAuth-flow normalization, model resolution, session events, abort, and credential storage.
- OpenAI Codex OAuth is the only provider onboarding path in the first Assistant Change.
- Workspace-canonical GraphiteMD state lives beneath `<workspace>/.graphitemd/`: workspace identity/configuration, plugin configuration/state, normalized conversations, and other inspectable workspace-scoped data. Derived caches and operation receipts are excluded from normal workspace tracking as documented by its `.gitignore`.
- Provider credentials, owner password/session state, encryption keys, and Pi runtime scratch live beneath machine-local `~/.graphitemd/` by default with owner-only permissions. `GRAPHITEMD_STATE_DIR` remains a supported explicit override, but it must resolve outside the configured workspace and never under `.graphitemd/`.
- Existing valid `.graphite/` workspace state migrates to `.graphitemd/` before workspace services use it. Migration is an atomic rename only when the destination is absent and both paths are safe real directories; a destination conflict, symlink, or invalid layout fails closed with an actionable recovery message and never merges directories.
- The bundled Assistant plugin owns the Assistant prompt, retrieval strategy, tool policy, and presentation contribution, but invokes models and workspace resources only through production SDK capabilities. It never receives raw provider credentials or unrestricted Pi, filesystem, shell, process, or network authority.
- Pi automatic project resources, extensions, skills, prompt templates, themes, context-file discovery, and built-in tools are disabled. The first session receives only GraphiteMD-defined search and bounded-read tools backed by opaque workspace resources.
- Runtime-neutral contracts own provider status, normalized OAuth interaction, question/answer state, successful source provenance, errors, and durable conversation events. Pi-specific session records are not browser authority.
- The package manifest may use the compatible `0.80.x` range, while the pnpm lockfile pins the exact reviewed version. Upgrades require adapter characterization tests and security-boundary review.

This decision clarifies the existing plugin ADR: brokered model/auth capability remains service-owned even though Assistant policy and provider selection belong to the bundled Assistant capability.

## Options Considered

### Option 1: Service-Owned Pi Adapter With A Brokered Assistant Plugin

- Summary: Keep Pi and credentials behind server-owned runtime-neutral contracts; let the bundled Assistant use only declared model and workspace capabilities.
- Pros: Preserves credential and workspace boundaries, supports deterministic fakes, keeps browser contracts runtime-neutral, and permits later runtime/provider replacement.
- Cons: Requires new model/auth capability contracts and more adapter code than importing Pi directly in the plugin.

### Option 2: Import Pi Directly Inside The Bundled Assistant Plugin

- Summary: Let the Assistant plugin create Pi sessions, store authentication, and call the provider itself.
- Pros: Closest to Coordinator-Local and fastest initial integration.
- Cons: Gives the plugin ambient credential, filesystem, and provider-network behavior that the production capability broker cannot enforce; first-party status would become a privileged bypass.

### Option 3: Build The Assistant As A Monolithic Kernel Feature

- Summary: Put provider, retrieval, prompt, and UI behavior directly in the server and web applications.
- Pros: Smallest initial abstraction surface.
- Cons: Conflicts with the accepted bundled-plugin direction, couples the kernel to one Assistant policy, and leaves the production SDK unproven for the product's most important extension.

## Consequences

- Positive: Codex credentials, provider behavior, note context, and workspace state cross explicit auditable boundaries while workspace-local state remains portable and inspectable with its Markdown files.
- Positive: Pi can be upgraded or replaced without changing durable conversation, source, or browser contracts.
- Positive: The bundled Assistant proves real model and workspace capabilities through the same SDK intended for future plugins.
- Negative: The service must maintain an OAuth state machine, runtime adapter, normalized event model, and upgrade characterization suite.
- Negative: The service must maintain safe legacy namespace migration, a machine-state default, and clear backup/recovery guidance for the intentionally separate secret vault.
- Negative: Some Pi features remain intentionally unavailable until GraphiteMD can expose them through safe capabilities.
- Follow-up: A later provider/model Change may generalize onboarding and selection without weakening this credential boundary.

## Validation

- Prove unauthenticated clients and disabled plugins cannot start OAuth or model work.
- Prove `.graphite/` migrates without loss to `.graphitemd/`, and conflicting or unsafe legacy layouts fail closed without overwriting workspace data.
- Prove the default machine-local state directory and any override remain outside the workspace; Codex credentials, password/session state, and Pi scratch are absent from workspace files, browser responses/storage, conversation records, logs, and source evidence.
- Prove Pi sessions load no automatic workspace context and expose only the two brokered read-only tools.
- Prove `.graphitemd/`, excluded, symlinked, oversized, stale, unknown, and replaced-root resources cannot reach provider context.
- Prove deterministic runtime and OAuth doubles cover success, cancellation, failure, retry, abort, unavailable-model, and malformed-event behavior.
- Complete a separate live Codex playtest against a disposable uniquely identifiable Markdown note and inspect the resulting source provenance.

## Reconsider When

- Pi no longer exposes a stable programmatic session/OAuth boundary or its upgrade cost exceeds the adapter's value.
- A local model runtime materially changes content-disclosure and credential assumptions.
- Multiple providers require a user-facing provider/model registry rather than one Codex-specific onboarding flow.
- Community service plugins require process isolation that changes where the Assistant runtime can execute.
