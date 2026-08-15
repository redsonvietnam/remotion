# WS4 — Timeline / Track / Clip Runtime Model

WS4 establishes the canonical runtime composition:

`Timeline -> Track[] -> Clip[]`

## Timing

Runtime timing uses integer frames only. `fps` is stored on the Timeline and
`secondsToFrames()` is the explicit boundary for converting external seconds
to frames. Runtime clips never mix seconds, milliseconds, and frames.

Using integer frames avoids cumulative floating-point drift. The conversion
uses deterministic `Math.round(seconds * fps)`.

## Identity

Timeline, Track, and Clip IDs use the existing WS1 `deterministicId()` and
`stableJson()` primitives. No second hashing implementation, random UUID,
timestamp, machine path, or environment value participates in identity.

IDs are derived from semantic runtime content rather than construction time.

## References

A Clip can reference:

- an existing WS2 `AssetId`;
- an unresolved content identity;
- unresolved pure render-data identity.

Unresolved references are structurally valid. Snapshot resolution remains a
later boundary and is not implemented by WS4.

## Track overlap policy

Track ordering is explicit through the integer `order` field and is
normalized into ascending order.

The current WS4 runtime uses an explicit `allowOverlap` flag per track:

- `false`: clips may be adjacent or separated by gaps, but may not overlap;
- `true`: overlapping clips are valid.

This keeps overlap semantics explicit instead of silently applying one rule
to every track kind.

## Renderer boundary

The WS4 domain imports neither Remotion nor provider modules. Compilation
produces a renderer-neutral Timeline. Final snapshot/render resolution is a
later workstream.

## ScenePlan boundary

The quarantined legacy ScenePlan draft is not imported or used as the runtime
model. WS4 exposes Timeline/Track/Clip only as the runtime composition.
