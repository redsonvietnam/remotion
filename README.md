# Remotion Video Template

A reusable, production-oriented starting point for vertical short-form videos built with Remotion.

## What this template gives you

- **1080×1920 / 30 FPS** vertical composition.
- Data-driven scenes: edit content in `src/data/default-video.ts` instead of rewriting the composition.
- Reusable animation primitives driven by Remotion's frame timeline.
- Intro → content scenes → outro structure.
- Optional local image assets from `public/assets/`.
- TypeScript, ESLint, Prettier, Vitest, and GitHub Actions from the first commit.
- Exact Remotion package versions to keep the toolchain aligned.

## Requirements

- Node.js 22+
- npm

## Development

```bash
npm install
npm run dev
```

Open the URL printed by Remotion Studio and select `MainVideo`.

## Create a new video

For the normal workflow, change only the content layer first:

```text
src/data/default-video.ts
```

Each scene has:

```ts
{
  id: 'unique-id',
  title: 'Scene title',
  body: 'Optional supporting copy',
  durationInSeconds: 5,
  image: 'assets/example.jpg',
}
```

Add local media under:

```text
public/assets/
```

Then reference it with the relative path used by `image`.

The visual system stays in `src/components/` and `src/compositions/` so content changes do not require layout rewrites.

## Quality gates

Run the same checks locally that CI runs:

```bash
npm run ci
```

Individual commands:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## Render

Rendering is intentionally not part of the default CI gate. Render explicitly when you need an MP4:

```bash
npm run render
```

The output is written to `out/video.mp4`.

## Project structure

```text
src/
├── components/          # Reusable visual primitives
├── compositions/       # Video compositions / scene orchestration
├── data/                # Content that drives a video
├── lib/                 # Pure timeline and domain utilities
├── Root.tsx             # Composition registration
├── types.ts             # Shared domain types
└── index.ts             # Remotion entry point
public/
└── assets/              # Images, video, audio, fonts, etc.
```

## Engineering rules

1. Keep video content separate from rendering logic.
2. Keep animation frame-driven; do not depend on CSS `transition` or `animation` for rendered motion.
3. Keep Remotion and `@remotion/*` versions aligned.
4. Prefer exact dependency versions for the video toolchain.
5. Add a regression test for new pure timeline/business logic.
6. Do not commit generated renders, `node_modules`, or local secrets.

## Remotion

This project follows current Remotion project conventions. Before upgrading, check the official Remotion documentation and release notes, then upgrade all `remotion` and `@remotion/*` packages together.

Remotion has its own licensing terms. Review the official license before using this template commercially.
