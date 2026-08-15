# Video Factory Roadmap

The roadmap is ordered by dependency. Workstreams marked parallel may be implemented independently once the architecture contract is stable.

## Phase 0 — Foundation

- [x] Bootstrap Remotion project.
- [x] Establish Node/dependency/version policy.
- [x] Establish CI quality gates.
- [x] Define architecture contract.
- [ ] Define domain schemas and runtime validation.
- [ ] Define project manifest format.

## Phase 1 — Core domain

**WS1 — Domain model**

- `ContentRequest`
- `ContentPlan`
- `VideoPlan`
- `ScenePlan`
- `AssetRequest`
- `AssetManifest`
- `CaptionTrack`
- `ProjectManifest`
- runtime validation and serialization tests

**WS2 — Template/style registry**

- template discovery/registration
- style discovery/registration
- capability metadata
- deterministic defaults

These two workstreams should land before provider integrations.

## Phase 2 — Media generation

**WS3 — Asset/cache pipeline**

- project workspace
- content-addressed/deterministic asset identity
- cache lookup
- atomic writes
- manifest persistence
- retry/resume behavior

**WS4 — Google AI image provider**

- provider interface
- API client
- prompt contract
- generated image normalization
- error classification
- tests with mocked transport

**WS5 — Google AI TTS provider**

- provider interface
- Vietnamese voice configuration
- audio output normalization
- timing metadata contract
- error classification
- tests with mocked transport

WS3 can proceed in parallel with WS4/WS5 after domain contracts exist.

## Phase 3 — Video intelligence

**WS6 — Caption engine**

- segment/word timing model
- Vietnamese-safe text processing
- line breaking
- karaoke/word highlight
- sentence captions
- multiple caption styles
- deterministic frame mapping

**WS7 — Content/URL ingestion**

- topic input
- article URL extraction
- normalized article metadata
- source text sanitization
- provider-independent content request

**WS8 — Script/scene planner**

- topic/article → structured script
- scene durations
- visual prompts
- narration text
- validation against template capabilities

## Phase 4 — Presentation system

**WS9 — Vietnamese typography system**

- repository-managed fonts
- font loading
- fallback policy
- diacritic fixture tests
- long-line wrapping tests
- font regression render fixture

**WS10 — Template library**

Initial templates:

- News
- Documentary
- Education
- Storytelling
- Social Short

**WS11 — Style library**

Initial styles:

- Clean
- Modern
- Cinematic
- Bold
- Minimal

Templates and styles must remain composable.

## Phase 5 — User workflow

**WS12 — CLI**

Example target commands:

```bash
npm run generate -- --topic "..."
npm run generate -- --url "https://..."
npm run render -- --project "..."
```

Interactive mode must also be supported. Normal users should not need to edit source code.

**WS13 — Render pipeline**

- render from immutable project snapshot
- composition selection
- output naming
- resumable generation vs render separation
- render smoke fixtures

## Phase 6 — Product hardening

**WS14 — Test matrix**

- domain tests
- provider contract tests
- template/style compatibility tests
- caption timing tests
- Vietnamese typography render tests
- CLI integration tests
- render smoke tests

**WS15 — Documentation / DX**

- zero-to-first-video guide
- provider configuration
- template/style catalog
- troubleshooting
- contributor guide
- architecture docs

## Dependency rule

Do not start large implementation work before its upstream contract is defined. Do not couple provider SDK details into domain types. Do not let rendering trigger generation.
