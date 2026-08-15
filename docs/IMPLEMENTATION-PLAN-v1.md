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
- overlapping/invalid clip constraints are rejected

## WS5 — Template + Style Registry

Deliver:
- TemplateDefinition
- StyleDefinition
- registry/discovery
- compatibility validation
- initial fixture templates/styles

Acceptance:
- a content plan can resolve to multiple template/style combinations without changing upstream content

## WS6 — Render Snapshot + Renderer Boundary

Deliver:
- snapshot resolver
- immutable snapshot manifest
- snapshot identity/deduplication
- Remotion composition input boundary
- static/local-only renderer enforcement

Acceptance:
- unresolved assets prevent snapshot creation
- snapshot render requires no provider/network dependency
- fixture snapshot renders to MP4

## WS7 — Fake Providers

Deliver deterministic fake implementations for:
- text generation
- image generation
- TTS
- optional caption alignment

Acceptance:
- complete generation pipeline runs in CI without external credentials

## WS8 — Google AI Providers

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

Deliver:
- CaptionAlignmentCapability
- Vietnamese-capable forced-alignment implementation evaluation
- provider-word-timing optimization
- CaptionTrack generation

Acceptance:
- captions are timing data independent of visual style
- production path never uses proportional word timing

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

Deliver:
- ContentPlan generation
- scene intents
- narration
- visual intents/image prompts
- duration estimation

Acceptance:
- provider-independent structured ContentPlan is produced

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
WS1 Foundation
  ├── WS2 Asset/Lineage
  ├── WS3 Typography
  ├── WS7 Fake Providers
  └── WS4 Timeline
          └── WS5 Template/Style
                  └── WS6 RenderSnapshot/Renderer

WS7 Fake Providers + WS4 Timeline
          └── WS11 Content Pipeline

WS7 + WS8 + WS9
          └── full generation pipeline

WS10 URL Ingestion
          └── WS11 Content Pipeline

WS6 + WS7
          └── WS14 Fixture/Render tests

WS11 + WS5 + WS6
          └── WS12 CLI

WS5 + WS8 + WS9 + WS10 + WS11 + WS12
          └── WS13 Production catalog

WS1-WS14
          └── WS15 Documentation/DX
```

## Delivery rule

Do not start a dependent workstream until the contract it consumes is stable enough to test. Architectural changes after a dependent workstream begins require an ADR update and targeted regression coverage.
