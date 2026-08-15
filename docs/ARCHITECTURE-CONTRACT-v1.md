# Video Factory — Architecture Contract v1

Status: Proposed implementation contract

This document converts the reviewed architecture proposal into the engineering contract for the Video Factory. It deliberately separates source-derived decisions from implementation details that remain open.

## 1. Product boundary

The repository is a local-first AI Video Factory built on Remotion. It is not a single video template.

The system must support multiple content inputs, templates, visual styles, voices, caption styles, AI-generated assets, persisted projects, resumable generation, deterministic rendering, and future provider implementations.

Primary user journey:

`topic / article URL / existing script -> content plan -> timeline -> assets -> render snapshot -> Remotion -> MP4`

A normal machine setup is expected to be `git clone`, `npm install`, configure provider secrets, then use the CLI. Dependencies are installed from the lockfile and are not committed.

## 2. Architectural invariants

1. Rendering is deterministic and network-free.
2. Remotion receives a fully resolved immutable `RenderSnapshot`.
3. Renderer code has no dependency on AI/provider modules.
4. External generation happens before snapshot resolution.
5. Content, presentation, generation, and rendering are separate concerns.
6. Runtime media composition is based on `Timeline -> Track -> Clip`; authoring-level scenes may compile into tracks.
7. Template and Style are independent and composable.
8. AI integrations are capability-based, not Google-specific.
9. Generated assets are persisted and cacheable.
10. Pipeline state is recoverable; a failed stage can be retried without unnecessarily regenerating successful dependencies.
11. Secrets never enter project manifests, snapshots, Remotion props, logs, or generated bundles.
12. Vietnamese typography is deterministic: bundled, explicitly loaded fonts are required; implicit system-font fallback is not part of the rendering contract.

## 3. Canonical pipeline

```text
InputSource
  -> ExtractedContent / ExistingScript
  -> NormalizedContent
  -> ContentPlan
  -> TimelineCompiler
  -> AssetRequests
  -> AssetResolution / Generation
  -> ResolvedTimeline
  -> RenderSnapshotResolver
  -> RenderSnapshot
  -> Remotion Composition
  -> MP4
```

Caption alignment is a separate capability/stage between speech synthesis and the final caption track when provider word timings are unavailable.

## 4. Domain model

The minimum conceptual entities are:

- `ContentSource`
- `NormalizedContent`
- `ContentPlan`
- `ScenePlan` (authoring/content concept only)
- `Timeline`
- `Track`
- `Clip`
- `AssetRequest`
- `AssetRecord`
- `CaptionTrack`
- `TemplateDefinition`
- `StyleDefinition`
- `RenderProfile`
- `RenderSnapshot`
- `StageRun`
- `Project`

`ScenePlan` MUST NOT become the renderer's fundamental runtime primitive.

## 5. Timeline contract

A `Timeline` is the canonical runtime representation of a video plan. It contains typed tracks and timed clips.

Typical tracks include:

- visual
- narration
- music
- captions
- effects
- text/overlay where required by the template

Each clip must resolve to a deterministic time interval and a local/resolved asset or pure render data.

Music and SFX are part of the domain model even if their generation providers are implemented later.

## 6. Template contract

A template defines presentation structure and constraints, not content acquisition or AI generation.

A template may declare:

- composition structure
- supported render profiles
- accepted track/clip types
- scene-to-track compilation rules
- timing constraints
- default caption style
- typography requirements
- transition/effect capabilities
- optional voice-profile hints

Adding a template must not require changing the core generation pipeline.

The same `ContentPlan` must be capable of being rendered through multiple template/style combinations.

## 7. Style contract

A style is a presentation token set and motion language that can be applied to a compatible template.

A style may define:

- color tokens
- typography tokens
- spacing
- caption appearance
- transitions
- animation/motion language
- visual hierarchy

A style must not perform article extraction, script generation, TTS, or image generation.

Changing only a style should invalidate neither upstream content nor generated assets; it should require snapshot resolution/rendering only unless a template-specific constraint proves otherwise.

## 8. AI capability contract

Providers are selected by capability. At minimum, design for:

- `TextGenerationCapability`
- `ImageGenerationCapability`
- `SpeechSynthesisCapability`
- `CaptionAlignmentCapability`

Google AI Studio is the first implementation provider, but no domain or renderer type may depend on Google-specific concepts.

Provider results must include enough metadata for provenance, caching, and reproducibility without persisting secrets.

## 9. Image generation

Image generation requests must be explicit, persistable, and cacheable.

An asset cache key should be based on normalized generation inputs and relevant provider/model/parameter identity. The exact canonicalization algorithm is an implementation task, but it must prevent accidental reuse across materially different requests.

The asset record must preserve provenance such as provider, model, normalized request parameters, content hash, dimensions, and local path.

A failed render must not force successful image generation to run again.

## 10. Speech synthesis

TTS is represented as a capability, not a template concern.

Speech results must preserve:

- local audio path
- provider/model identity
- voice identity
- language
- synthesis parameters
- duration
- optional provider word timings

Vietnamese is a first-class supported language.

## 11. Caption timing

Caption timing and caption appearance are separate concerns.

Primary timing strategy:

1. Use provider word timings when available as an optimization.
2. Otherwise use a dedicated `CaptionAlignmentCapability` over `(audio, normalized transcript, language)`.
3. Proportional duration/word-count splitting is not an acceptable shipped timing strategy; it may exist only as an explicitly marked fixture/dev fallback.

`CaptionTrack` contains timing/text data. `CaptionStyleSpec` controls typography and animation at render time.

Vietnamese normalization, punctuation handling, mixed Vietnamese/English, numbers, abbreviations, and line wrapping must be handled by pure/testable text-normalization/layout logic before rendering.

## 12. Vietnamese typography contract

System fonts are not a rendering dependency.

Fonts used by shipped templates/styles must be bundled, licensed appropriately, and explicitly loaded before frame rendering.

The exact primary font family is intentionally not frozen by this contract. WS2 must evaluate candidates such as Be Vietnam Pro and Noto Sans against:

- Vietnamese Unicode coverage, including combining marks
- available weights
- license
- headless Chromium/Remotion fidelity
- metrics and wrapping

Fallbacks must also be bundled and declared. If required glyphs cannot be resolved from controlled fonts, validation should fail before rendering rather than silently falling back to an arbitrary system font.

Typography fixtures must cover the Vietnamese character matrix plus mixed content such as `Việt Nam`, `AI`, `57`, `TP.HCM`, `Đắk Nông`, and `Nghị quyết 57`.

## 13. Project persistence

A project is persisted locally and must be self-describing without requiring a database.

Recommended structure:

```text
projects/<project-id>/
  project.json
  ledger/
  content/
    plan.json
  timeline/
    timeline.json
  assets/
    <asset-id>.<ext>
    <asset-id>.meta.json
  snapshots/
    <snapshot-id>/
      snapshot.json
      manifest.json
  renders/
  logs/
```

The append-only `StageRun` ledger is the authoritative execution history/state machine. Materialized project/timeline views may be rebuilt from authoritative records and asset state.

Every render points to a specific immutable snapshot.

## 14. Cache and invalidation

The system must track dependency relationships rather than using directory presence as a success signal.

Required policies:

| Change | Required effect |
|---|---|
| Content/script changes | Invalidate dependent scene intents, image prompts, narration/TTS, and captions |
| Style-only change | Re-resolve snapshot and render; do not regenerate upstream assets |
| Caption-style-only change | Render only |
| Template change | Recompile timeline; reuse unaffected assets; resolve a new snapshot |
| Provider/model/generation-parameter change | Invalidate affected generated asset lineage |
| Explicit force-regenerate | Bypass matching cache for the requested scope |

The exact hash/lineage implementation is an implementation detail but must be deterministic and testable.

## 15. RenderSnapshot

`RenderSnapshot` is the hard boundary between generation and rendering.

A snapshot must be complete: unresolved clips or missing assets cause snapshot resolution to fail loudly.

Snapshots are immutable and content-addressable/deduplicated where possible.

The Remotion composition's dynamic input is a `RenderSnapshot`, plus static template code/configuration. Renderer code must not receive project IDs, provider clients, API keys, or mutable pipeline state.

The renderer must have zero runtime network dependency.

## 16. Render profiles

The initial profile is:

- 1080x1920
- 30 FPS
- vertical short-form

The architecture must support future profiles such as 1920x1080 and 1080x1080 without rewriting the timeline/domain model.

`RenderProfile` is part of snapshot identity because resolution, FPS, codec/container, and related output parameters can affect rendering.

## 17. Multi-template rendering

One content project must be able to produce multiple independent snapshots:

```text
ContentPlan
  -> Template A + Style A + RenderProfile A -> Snapshot A
  -> Template A + Style B + RenderProfile A -> Snapshot B
  -> Template B + Style C + RenderProfile A -> Snapshot C
```

This is a deliberate product capability, not a future architectural rewrite.

## 18. CLI contract

Use one CLI command surface, conceptually `video`, for both interactive and automation workflows.

Minimum commands:

```text
video generate --topic "..." --template news --style cinematic
video generate --url "https://..." --template news
video generate                 # interactive wizard
video status <project-id>
video render <project-id> [--snapshot <id>]
video projects list
video templates list
video styles list
video gc
```

The interactive wizard and flag-driven mode must map to the same command input model and execution path.

## 19. Configuration

Configuration precedence is:

`CLI flags > project config > user config > environment variables > defaults`

Secrets are restricted to environment variables and/or a git-ignored `.env` file.

Secrets must never be persisted in `project.json`, timeline data, snapshots, logs, Remotion props, or bundles.

Provider selection is configuration data resolved through a provider registry.

## 20. Security contract

- Accept `https` URLs by default; enforce timeout, size limits, and redirect limits.
- Treat scraped article content as untrusted data and defend against prompt injection when constructing AI requests.
- Resolve project/asset paths through one traversal-safe path boundary.
- Do not expose provider secrets to Remotion.
- Redact secrets at logging boundaries.
- Never embed secrets in generated manifests or output metadata.

## 21. Testing contract

CI must not require live AI APIs.

Provider implementations must be tested against deterministic fake capabilities.

Checked-in fixture projects should be resolved at the `RenderSnapshot` layer with local dummy assets so Remotion/render tests can run without invoking content generation or external providers.

Required test families:

- domain/contract tests
- unit tests
- cache/lineage tests
- pipeline state/recovery tests
- caption timing/alignment tests
- Vietnamese normalization/layout tests
- typography render fixtures
- template/style compatibility tests
- provider adapter tests with fakes
- render smoke tests
- end-to-end fixture tests

## 22. CI quality gates

Fast PR validation should include:

- typecheck
- lint
- formatting check
- unit/contract tests
- deterministic fixture tests
- Remotion bundle

A render smoke test may be included if runtime remains acceptable. Expensive/live-provider validation is not part of the normal PR gate.

## 23. Repository boundary

The repository contains all source code, contracts, templates, styles, tests, scripts, configuration examples, and legally distributable bundled fonts/assets required to reconstruct the application after `npm install`.

Do not commit:

- `node_modules`
- secrets
- generated render outputs
- disposable caches
- large generated AI media unless explicitly designated as a small test fixture

## 24. Implementation sequence

The architecture review recommends this dependency-aware sequence:

### Phase 1 — Foundation
- domain types and runtime schemas
- project/ledger model
- configuration
- path/security boundary
- provider capability contracts
- deterministic IDs/hashing

### Phase 2 — Deterministic media foundation
- asset record/store
- cache/lineage
- Vietnamese font loading and validation
- caption text normalization
- fixture infrastructure

### Phase 3 — Timeline/render barriers
- Track/Clip timeline model
- Timeline compiler
- template registry
- style registry
- RenderSnapshot resolver
- renderer boundary enforcement

### Phase 4 — Real content/media capabilities
- fake text/image/TTS providers first
- Google image provider
- Google TTS provider
- caption alignment capability
- article/URL ingestion
- content/script pipeline

### Phase 5 — User experience
- unified CLI
- interactive wizard
- project status/recovery
- render commands
- template/style discovery

### Phase 6 — Production hardening
- render smoke tests
- typography visual fixtures
- recovery/invalidation matrix
- documentation
- performance and operational cleanup

Workstreams may proceed in parallel only when their dependency contracts are frozen.

## 25. Decisions intentionally left open

The following must be decided during implementation/research, not guessed now:

- exact Vietnamese primary/fallback fonts and licensing
- exact forced-alignment implementation/provider
- exact Google AI model choices and API adapter details
- exact article extraction library/strategy
- exact CAS/cache hash algorithm
- exact schema validation library
- exact CLI prompt library
- exact music/SFX provider

These choices must not leak into the core domain contracts.

## 26. Architecture acceptance criteria

Architecture v1 is considered implemented only when:

1. A fixture `ContentPlan` can compile into a deterministic Timeline.
2. A Timeline can resolve into a complete immutable RenderSnapshot without network access.
3. Remotion can render that snapshot to MP4 without any provider/API dependency.
4. A style change creates a new snapshot without regenerating upstream assets.
5. A template change can compile a separate snapshot while reusing unaffected assets.
6. A failed stage is represented explicitly and can be retried.
7. Cached assets are reused deterministically.
8. Vietnamese typography validation fails before render when controlled glyph requirements are not satisfied.
9. Caption timing data is independent of caption visual style.
10. No secret is present in persisted project state or renderer input.
11. CI can exercise the complete fixture render path without live AI credentials.

## 27. Source and review note

This contract incorporates the reviewed Claude architecture proposal, while explicitly resolving the following project decisions:

- multi-template/multi-style rendering is first-class
- music/SFX are represented in the domain even if generation providers are deferred
- font fallback is controlled/bundled rather than implicitly system-resolved
- the ledger remains authoritative for pipeline state

Implementation should not silently weaken these invariants. Any architectural change must be recorded as an ADR before dependent work proceeds.
