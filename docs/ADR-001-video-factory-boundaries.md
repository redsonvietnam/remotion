# ADR-001: Video Factory architectural boundaries

Status: Accepted for implementation

## Context

The project is evolving from a single Remotion template into a reusable local-first AI Video Factory with multiple content types, templates, styles, AI providers, captions, deterministic Vietnamese typography, resumable generation, and reproducible rendering.

The primary risk is allowing provider calls, mutable project state, or template-specific assumptions to leak into Remotion rendering.

## Decisions

### 1. Runtime composition uses Timeline/Track/Clip

Authoring may use scenes, but the renderer consumes a compiled timeline composed of typed tracks and clips.

### 2. Template and Style are independent

Templates define structural composition and constraints. Styles define presentation tokens and motion language. Neither owns content ingestion or AI provider logic.

### 3. RenderSnapshot is the renderer boundary

All network access, AI generation, asset resolution, and mutable pipeline state stop before `RenderSnapshot`. Remotion receives only a complete immutable snapshot and static composition code.

### 4. Providers are capability-based

Google is the first provider, not the domain abstraction. Image, text, speech, and alignment capabilities are independently replaceable.

### 5. Project state is ledger-backed

An append-only StageRun history is authoritative for execution state. Materialized project/timeline files are views that can be rebuilt. Assets are self-describing through metadata records.

### 6. Captions are timing-independent from style

Timing comes from provider word timings when available or a dedicated alignment capability. Caption styling is applied only during composition.

### 7. Vietnamese typography is deterministic

Fonts required by shipped styles are bundled and explicitly loaded. Silent dependency on arbitrary system fonts is not allowed. Missing required glyph coverage must be detected before render.

### 8. Multi-template rendering is first-class

One content plan may produce multiple snapshots for different template/style/render-profile combinations. Upstream generated assets are reused when their lineage remains valid.

## Consequences

Positive:
- renders are reproducible
- AI/network failures do not corrupt rendering
- expensive generated assets can be reused
- templates and styles can grow independently
- providers can be replaced
- CI can render deterministic fixtures without credentials
- Vietnamese text behavior is controlled across machines

Costs:
- more explicit domain types
- a timeline compiler and snapshot resolver are required
- project state needs ledger/lineage handling
- the initial architecture is more structured than a simple Remotion demo

## Rejected alternatives

### Provider calls from Remotion
Rejected because renders become nondeterministic and network-dependent.

### Scene-only runtime model
Rejected because complex multi-track timing, captions, music, overlays, and effects become difficult to compose cleanly.

### System font fallback
Rejected because output can vary by host machine and Vietnamese glyph rendering can silently break.

### Proportional caption timing as production behavior
Rejected because word timing quality is inadequate and provider-independent synchronization is required.

### Separate CLI implementations for interactive and automation modes
Rejected because duplicated command paths drift. Both modes must resolve to the same command input model and execution pipeline.
