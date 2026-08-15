# Contributing

## Branches

Create a focused branch from `main` for each change:

```text
feature/<short-name>
fix/<short-name>
chore/<short-name>
```

## Before opening a PR

Run:

```bash
npm install
npm run ci
```

If the change affects the visual output, also preview it in Remotion Studio and describe the visual change in the PR.

## Scope

Keep changes focused. Prefer extending reusable components and content types over duplicating scene implementations.

## Commit messages

Use concise conventional-style messages such as:

```text
feat: add caption scene
fix: prevent scene overlap
chore: upgrade remotion
```

## Assets

Do not commit generated renders or secrets. Keep reusable source media in `public/assets/` only when it belongs to the template itself.
