# ADR-001: Video Factory architectural boundaries

Status: Accepted for implementation

## Context

The project is evolving from a single Remotion template into a reusable local-first AI Video Factory with multiple content types, templates, styles, AI providers, captions, deterministic Vietnamese typography, resumable generation, and reproducible rendering.

The primary risk is allowing provider calls, mutable project state, or template-specific assumptions to leak into Remotion rendering.

## Decisions

### 1. Runtime composition uses Timeline/Track/Clip

Authoring may use scenes, but the renderer consumes a compiled timeline composed of typed tracks and clips.

The obsolete scene-centric draft is quarantined and is not an active domain dependency. The real Timeline/Track/Clip contracts are implemented only by their designated workstreams.

### 2. Template and Style are independent

Templates define structural composition and constraints. Styles define presentation tokens and motion language. Neither owns content ingestion or AI provider logic.

When presentation fields conflict, deterministic field-level precedence is:

```text
Content/Clip explicit override
  > Template locked styleOverrides
  > Style tokens
  > Template defaults
```

`RenderProfile` is orthogonal and owns output mechanics rather than design tokens. A content/clip override cannot override a template-locked field.

### 3. RenderSnapshot is the renderer boundary

All network access, AI generation, asset resolution, and mutable pipeline state stop before `RenderSnapshot`. Remotion receives only a complete immutable snapshot and static composition code.

A Timeline may contain unresolved asset references during authoring/compilation, but snapshot resolution MUST fail if required inputs remain unresolved.

### 4. Providers are capability-based

Google is the first provider, not the domain abstraction. Image, text, speech, and alignment capabilities are independently replaceable.

### 5. Project state is ledger-backed

An append-only StageRun history is authoritative for execution state. Materialized project/timeline files are views that can be rebuilt. Assets are self-describing through metadata records and dependency lineage.

### 6. Captions are timing-independent from style

Timing comes from provider word timings when available or a dedicated alignment capability. Caption styling is applied only during composition.

If required alignment is unavailable or fails, the `captionAlign` StageRun fails explicitly and remains retryable. Proportional or silently degraded timing is not production behavior.

### 7. Vietnamese typography is deterministic

Fonts required by shipped styles are bundled and explicitly loaded. Silent dependency on arbitrary system fonts is not allowed. Missing required glyph coverage must be detected before render.

### 8. Multi-template rendering is first-class

One content plan may produce multiple snapshots for different template/style/render-profile combinations. Upstream generated assets are reused when their lineage remains valid.

### 9. Renderer/provider isolation is machine-enforced

Renderer modules must not import provider clients, CLI modules, secret/config-loading modules, or mutable pipeline state. This boundary is enforced by a static dependency-graph rule in CI rather than relying only on code-review convention.

The implementation may use `dependency-cruiser` or an equivalent ESLint import-boundary rule, subject to the WS6 implementation choice.

## Consequences

Positive:
- renders are reproducible
- AI/network failures do not corrupt rendering
- expensive generated assets can be reused
- templates and styles can grow independently
- providers can be replaced
- CI can render deterministic fixtures without credentials
- Vietnamese text behavior is controlled across machines
- architectural drift from the old scene-centric model is easier to detect

Costs:
- more explicit domain types
- a timeline compiler and snapshot resolver are required
- project state needs ledger/lineage handling
- the initial architecture is more structured than a simple Remotion demo
- renderer dependency boundaries require one explicit static CI check

## Rejected alternatives

### Provider calls from Remotion
Rejected because renders become nondeterministic and network-dependent.

### Scene-only runtime model
Rejected because complex multi-track timing, captions, music, overlays, and effects become difficult to compose cleanly.

### Keeping obsolete architecture documents as competing references
Rejected because discoverable stale architecture creates implementation drift. Git history preserves deleted documents.

### Keeping the old scene-centric domain draft active
Rejected because an importable `VideoPlan.scenes` model can become an accidental second source of truth. The draft is quarantined for historical shape reference only.

### System font fallback
Rejected because output can vary by host machine and Vietnamese glyph rendering can silently break.

### Proportional caption timing as production behavior
Rejected because word timing quality is inadequate and provider-independent synchronization is required.

### Silent degraded caption timing
Rejected because a visibly successful render can contain incorrect synchronization. Required alignment failure must be explicit and retryable.

### Separate CLI implementations for interactive and automation modes
Rejected because duplicated command paths drift. Both modes must resolve to the same command input model and execution pipeline.
