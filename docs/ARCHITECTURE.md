# Video Factory Architecture

Status: Architecture contract v1

## Goal

`remotion` is a reusable video-generation framework, not a single video template. A clean checkout must be sufficient to reproduce the application after `npm install` and environment configuration.

The primary user workflow is:

1. Install dependencies.
2. Configure provider keys.
3. Provide a topic, article URL, or existing script.
4. Choose a template/style or use defaults.
5. Generate/reuse script, media, voice, captions, and project metadata.
6. Preview or render the final video.

## Core boundaries

### Input layer

Supported inputs:

- `topic`: user-supplied subject.
- `url`: article/news URL.
- `script`: existing structured or plain script.

Inputs are normalized into a provider-independent `ContentRequest`.

### Content layer

Transforms normalized input into a deterministic `VideoPlan` containing scenes, narration text, visual prompts, timing intent, and metadata. Content generation must not import Remotion components.

### AI provider layer

Providers are interfaces, not application logic. Google AI Studio is the first implementation and must cover image generation and text-to-speech behind provider interfaces. Provider credentials are loaded from environment/configuration and never committed.

Future providers can be added without changing templates or compositions.

### Asset layer

Every generated asset belongs to a project and has a stable manifest entry. Assets are cached by deterministic identity (provider, model, input hash, relevant options). A failed render must not require regenerating successful assets.

Generated media is local runtime data and is ignored by git.

### Template layer

A template defines composition structure and scene semantics. Multiple templates are first-class:

- news
- documentary
- education
- storytelling
- social/short-form

A template must consume domain data rather than call AI providers directly.

### Style layer

Styles are independent of topic and content. A style controls design tokens, typography, motion language, caption treatment, spacing, and media treatment. A template and style must be composable.

### Typography layer

Vietnamese rendering is deterministic. Production typography must use repository-managed/local font assets or another explicitly pinned font mechanism. System-font availability is never assumed. Tests must cover Vietnamese diacritics and long text wrapping.

### Caption layer

Captions are a timed domain artifact, not an afterthought. TTS output must be converted to word/segment timing where supported. Caption renderers consume timing data and can provide multiple styles (sentence, word-by-word, karaoke, news, minimal).

All rendered motion remains frame-driven for deterministic Remotion output.

### Render layer

Remotion compositions consume a complete immutable project/plan snapshot. Rendering should not perform network generation. This keeps rendering reproducible and makes retries cheap.

## Project persistence

A generated project is persisted conceptually as:

```text
projects/<project-id>/
  project.json
  plan.json
  assets/
  audio/
  images/
  captions/
  output/
```

Only source code and small deterministic fixtures belong in git. Generated project data is runtime output and is ignored.

## Domain flow

```text
ContentRequest
  -> ContentPlan
  -> VideoPlan
  -> AssetRequests
  -> GeneratedAssetManifest
  -> TimedCaptions
  -> RenderSnapshot
  -> Remotion
  -> MP4
```

No lower layer may import a higher layer. In particular:

- AI providers do not import templates.
- Templates do not import CLI code.
- Domain logic does not import React/Remotion.
- Rendering does not make AI/network calls.

## Configuration

Configuration is validated at startup. `.env.example` documents supported environment variables. Secrets remain in `.env` and are never written into project manifests, logs, or generated source files.

The first provider key is:

```text
GOOGLE_AI_API_KEY
```

The exact Google models/options are provider configuration, not hard-coded into template definitions.

## Quality contract

Every workstream must add tests for its pure/domain behavior before integration. CI must include typecheck, lint, formatting, tests, and bundle validation. Render smoke tests use small checked-in fixtures and do not require paid provider calls.

## Non-goals

- Committing `node_modules`.
- Committing generated videos/audio/images.
- Making a specific social network the architecture boundary.
- Locking the framework to one AI vendor.
- Requiring a developer to edit React code for normal video creation.
