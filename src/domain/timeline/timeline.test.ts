import {describe, expect, it} from 'vitest';
import type {AssetId} from '../foundation/types';
import {compileTimeline, secondsToFrames} from './compiler';
import {createTimeline} from './timeline';
import {isTimeline} from './validation';
import type {TimelineDraft} from './types';

const asset = 'asset_0123456789abcdef01234567' as AssetId;

const draft = (): TimelineDraft => ({
  schemaVersion: 1,
  fps: 30,
  durationFrames: 180,
  tracks: [
    {
      schemaVersion: 1,
      kind: 'visual',
      order: 0,
      allowOverlap: false,
      clips: [
        {schemaVersion: 1, role: 'visual', startFrame: 0, durationFrames: 60, reference: {kind: 'asset', assetId: asset}},
        {schemaVersion: 1, role: 'visual', startFrame: 60, durationFrames: 60, reference: {kind: 'content', identity: 'visual-intent-2'}},
      ],
    },
    {
      schemaVersion: 1,
      kind: 'music',
      order: 1,
      allowOverlap: true,
      clips: [{schemaVersion: 1, role: 'audio', startFrame: 0, durationFrames: 180, reference: {kind: 'asset', assetId: asset}}],
    },
  ],
});

describe('WS4 Timeline / Track / Clip', () => {
  it('constructs the canonical Timeline → Track[] → Clip[] runtime model', () => {
    const timeline = createTimeline(draft());
    expect(timeline.tracks).toHaveLength(2);
    expect(timeline.tracks[0].clips).toHaveLength(2);
    expect(isTimeline(timeline)).toBe(true);
  });

  it('produces deterministic identities across repeated construction', () => {
    expect(createTimeline(draft())).toEqual(createTimeline(draft()));
  });

  it('normalizes track and clip order deterministically', () => {
    const input = draft();
    const visual = input.tracks[0];
    const reversed = {...input, tracks: [...input.tracks].reverse().map((track) =>
      track.kind === 'visual' ? {...track, clips: [...visual.clips].reverse()} : track)};
    const timeline = compileTimeline(reversed);
    expect(timeline.tracks.map((track) => track.order)).toEqual([0, 1]);
    expect(timeline.tracks.map((track) => track.kind)).toEqual(['visual', 'music']);
    expect(timeline.tracks[0].clips.map((clip) => clip.startFrame)).toEqual([0, 60]);
  });

  it('uses integer frames as the runtime timing unit', () => {
    expect(secondsToFrames(2, 30)).toBe(60);
    expect(secondsToFrames(1.5, 30)).toBe(45);
    expect(() => secondsToFrames(-1, 30)).toThrow();
    expect(() => secondsToFrames(1, 0)).toThrow();
  });

  it('accepts unresolved content references', () => {
    const timeline = createTimeline(draft());
    expect(timeline.tracks[0].clips[1].reference).toEqual({kind: 'content', identity: 'visual-intent-2'});
    expect(isTimeline(timeline)).toBe(true);
  });

  it('rejects unexpected persisted fields at Timeline, Track, and Clip levels', () => {
    const timeline = createTimeline(draft());
    expect(isTimeline({...timeline, secret: 'nope'})).toBe(false);
    expect(isTimeline({...timeline, tracks: [{...timeline.tracks[0], extra: true}, timeline.tracks[1]]})).toBe(false);
    expect(isTimeline({...timeline, tracks: timeline.tracks.map((track, index) => index === 0
      ? {...track, clips: [{...track.clips[0], extra: true}, track.clips[1]]}
      : track)})).toBe(false);
  });

  it('rejects invalid IDs and required fields', () => {
    const timeline = createTimeline(draft());
    expect(isTimeline({...timeline, id: 'timeline_not-deterministic'})).toBe(false);
    expect(isTimeline({...timeline, tracks: timeline.tracks.map((track, index) => index === 0 ? {...track, order: 3} : track)})).toBe(false);
    expect(isTimeline({...timeline, tracks: timeline.tracks.map((track, index) => index === 0
      ? {...track, clips: [{...track.clips[0], startFrame: -1}, track.clips[1]]}
      : track)})).toBe(false);
  });

  it('rejects invalid clip timing and duration', () => {
    const timeline = createTimeline(draft());
    const invalid = {...timeline, tracks: timeline.tracks.map((track, trackIndex) => trackIndex === 0
      ? {...track, clips: [{...track.clips[0], durationFrames: 0}, track.clips[1]]}
      : track)};
    expect(isTimeline(invalid)).toBe(false);
  });

  it('rejects clips extending beyond the timeline duration', () => {
    const timeline = createTimeline(draft());
    const invalid = {...timeline, tracks: timeline.tracks.map((track, index) => index === 0
      ? {...track, clips: [{...track.clips[0], startFrame: 170, durationFrames: 20}, track.clips[1]]}
      : track)};
    expect(isTimeline(invalid)).toBe(false);
  });

  it('accepts adjacent clips and gaps', () => {
    expect(isTimeline(createTimeline(draft()))).toBe(true);
    const source = draft();
    const visual = source.tracks[0];
    const withGap = {...source, tracks: [{...visual, clips: [visual.clips[0], {...visual.clips[1], startFrame: 90}]}, source.tracks[1]]};
    expect(isTimeline(createTimeline(withGap))).toBe(true);
  });

  it('rejects overlaps on tracks that prohibit them', () => {
    const source = draft();
    const visual = source.tracks[0];
    const overlapping = {...source, tracks: [{...visual, clips: [visual.clips[0], {...visual.clips[1], startFrame: 30}]}, source.tracks[1]]};
    expect(isTimeline(createTimeline(overlapping))).toBe(false);
  });

  it('accepts overlaps on tracks explicitly allowing them', () => {
    const source = draft();
    const music = source.tracks[1];
    const overlapping = {...source, tracks: [{...source.tracks[0]}, {...music, clips: [music.clips[0], {...music.clips[0], startFrame: 30, durationFrames: 120}]}]};
    expect(isTimeline(createTimeline(overlapping))).toBe(true);
  });

  it('rejects malformed references but permits unresolved references', () => {
    const timeline = createTimeline(draft());
    const invalidAsset = {...timeline, tracks: timeline.tracks.map((track, index) => index === 0
      ? {...track, clips: [{...track.clips[0], reference: {kind: 'asset', assetId: 'not-an-asset-id'}}, track.clips[1]]}
      : track)};
    const invalidContent = {...timeline, tracks: timeline.tracks.map((track, index) => index === 0
      ? {...track, clips: [{...track.clips[0], reference: {kind: 'content', identity: ''}}, track.clips[1]]}
      : track)};
    expect(isTimeline(invalidAsset)).toBe(false);
    expect(isTimeline(invalidContent)).toBe(false);
  });
});
