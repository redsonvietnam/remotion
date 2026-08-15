# Video Factory — Implementation Plan v1

This plan is dependency-driven from `ARCHITECTURE-CONTRACT-v1.md`.

## WS1 — Foundation

Deliver:
- domain models and runtime schemas
- project identity
- deterministic IDs/hashing primitives
- project paths/security boundary
- configuration precedence
- StageRun ledger primitives
- capability/provider contracts

Acceptance:
- contracts compile
- invalid persisted state is rejected
- no secret fields exist in persisted domain models
- the obsolete scene-centric draft is not imported by active implementation

## WS2 — Asset Store + Lineage

Deliver:
- AssetRecord
- local asset storage
- metadata files
- deterministic cache keys
- lineage/dependency representation
- cache hit/miss/invalidation tests

Acceptance:
- identical resolved generation requests reuse assets
- changed dependencies invalidate only affected assets
- force regeneration bypasses matching cache
- material generation parameters and provider/model identity are required provenance

## WS3 — Vietnamese Typography + Text Layout

Deliver:
- controlled bundled font loading
- font metadata/registration
- glyph coverage validator
- CaptionTextNormalizer
- deterministic line wrapping/layout helpers
- typography fixtures

Acceptance:
- Vietnamese fixture matrix passes in Remotion render environment
- missing glyph requirements fail before rendering
- no implicit system-font dependency exists in shipped rendering path
- text normalization/layout is deterministic and independently testable

## WS4 — Timeline + Compiler

Deliver:
- Timeline
- Track
- Clip
- authoring ScenePlan -> timeline compilation
- deterministic frame/timing rules
- music/SFX track types

Acceptance:
- identical ContentPlan + configuration produces identical Timeline
- unresolved asset references are allowed before resolution
- overlapping/invalid clip constraints are rejected
- Timeline/Track/Clip is independent of the quarantined legacy draft

## WS5 — Template + Style Registry

Dependencies:
- WS3 typography contracts
- WS4 timeline contracts
- WS1 foundation

Deliver:
- TemplateDefinition
- StyleDefinition
- registry/discovery
- compatibility validation
- deterministic template/style precedence
- initial fixture templates/styles

Acceptance:
- a content plan can resolve to multiple template/style combinations without changing upstream content
- precedence is deterministic: Content/Clip override > Template locked styleOverrides > Style tokens > Template defaults
- RenderProfile remains orthogonal to design-token precedence

## WS6 — Render Snapshot + Renderer Boundary

Dependencies:
- WS2 asset/lineage
- WS3 typography
- WS4 timeline
- WS5 template/style
- WS1 foundation

Deliver:
- snapshot resolver
- immutable snapshot manifest
- snapshot identity/deduplication
- Remotion composition input boundary
- static/local-only renderer enforcement
- machine-checkable renderer dependency boundary

Acceptance:
- unresolved assets prevent snapshot creation
- snapshot render requires no provider/network dependency
- fixture snapshot renders to MP4
- CI statically rejects renderer imports of provider/CLI/secret/config/mutable pipeline modules

## WS7 — Fake Providers

Deliver deterministic fake implementations for:
- text generation
- image generation
- TTS
- caption alignment

Acceptance:
- complete generation pipeline runs in CI without external credentials
- caption alignment failure is represented as a retryable StageRun failure

## WS8 — Google AI Providers

Dependencies:
- WS7 capability/fake-provider contracts

Deliver:
- Google image adapter
- Google text adapter if used for script generation
- Google TTS adapter
- provider configuration
- secret redaction

Acceptance:
- live provider calls are isolated behind capability contracts
- provider failures map to explicit StageRun failures

## WS9 — Caption Alignment

Dependencies:
- WS1 foundation
- WS3 Vietnamese text normalization
- WS7 fake capability contract
- WS8 when using a live provider/alignment implementation

Deliver:
- CaptionAlignmentCapability
- Vietnamese-capable forced-alignment implementation evaluation
- provider-word-timing optimization
- CaptionTrack generation

Acceptance:
- captions are timing data independent of visual style
- production path never uses proportional/degraded word timing
- required alignment failure produces a retryable `captionAlign` StageRun failure

## WS10 — Content / URL Ingestion

Deliver:
- topic source
- existing script source
- article URL source
- extraction boundary
- normalization
- prompt-injection-safe content handling

Acceptance:
- extracted content is normalized before script generation
- URL failures are recoverable and observable

## WS11 — Content / Script Pipeline

Dependencies:
- WS1 foundation
- WS4 timeline contract
- WS7 fake text provider
- WS10 ingestion where URL/topic extraction is used

Deliver:
- ContentPlan generation
- scene intents
- narration
- visual intents/image prompts
- duration estimation

Acceptance:
- provider-independent structured ContentPlan is produced
- authoring scene intents do not become the renderer runtime model

## WS12 — CLI

Deliver:
- `video` command
- interactive wizard
- non-interactive flags
- project status
- render
- template/style discovery
- garbage collection

Acceptance:
- interactive and automation paths share one command model

## WS13 — Production Templates + Styles

Deliver initial useful combinations, for example:
- News
- Documentary
- Education
- Social Short
- Cinematic / Modern / Minimal / Bold styles

Exact catalog is product-driven and can expand without core changes.

Acceptance:
- adding a template/style does not modify provider or pipeline contracts

## WS14 — Test + Fixture Suite

Deliver:
- domain tests
- pipeline recovery tests
- cache tests
- typography render fixtures
- caption fixtures
- template/style compatibility fixtures
- full local fixture render
- renderer dependency-boundary tests

Acceptance:
- CI can execute complete fixture pipeline without live AI

## WS15 — Documentation + DX

Deliver:
- installation
- API key configuration
- first video walkthrough
- topic workflow
- URL workflow
- template/style catalog
- troubleshooting
- provider development guide
- template development guide

Acceptance:
- a clean clone can reach a deterministic fixture render using documented commands

## Dependency graph

```text
                         ┌── WS2 Asset/Lineage ─────────────┐
                         │                                   │
                         ├── WS3 Typography ────────┐       │
                         │                           │       │
WS1 Foundation ──────────┼── WS4 Timeline ──────────┼── WS5 Template/Style
                         │                           │       │
                         └── WS7 Fake Providers     │       │
                                                     └───────┼── WS6 RenderSnapshot
                                                             │
WS7 + WS4 + WS10 ──────────────── WS11 Content Pipeline ────┘

WS7 + WS8 + WS9 ──────────────── full generation capabilities

WS6 + WS7 ────────────────────── WS14 Fixture/Render tests

WS11 + WS5 + WS6 ─────────────── WS12 CLI

WS5 + WS8 + WS9 + WS10 + WS11 + WS12 ── WS13 Production catalog

WS1-WS14 ─────────────────────── WS15 Documentation/DX
```

### Parallelization rule

Workstreams may run in parallel only when their explicit dependencies are satisfied and their scopes do not create an unowned shared-file conflict. R1 owns the dependency/scope decision; C1/C2 do not self-assign parallel work.

## Delivery rule

Do not start a dependent workstream until the contract it consumes is stable enough to test. Architectural changes after a dependent workstream begins require an ADR update and targeted regression coverage.
