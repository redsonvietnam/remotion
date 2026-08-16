import {describe, expect, it} from 'vitest';

import type {CaptionTrack} from '../captions/types';
import type {AssetId} from '../foundation/types';
import {buildTimeline, buildTimelineSegment} from './timeline-builder';
import type {TimelinePlanDraft, TimelineSegmentDraft} from './types';
import {isTimelinePlan, isTimelineSegment} from './validation';

const assetA = 'asset_aaaaaaaaaaaaaaaaaaaaaaaa' as AssetId;
const assetB = 'asset_bbbbbbbbbbbbbbbbbbbbbbbb' as AssetId;
const audio = 'asset_cccccccccccccccccccccccc' as AssetId;

const captionTrack: CaptionTrack = {
  language: 'vi',
  timings: [
    {text: 'Xin chào', startMs: 0, endMs: 1000},
    {text: 'Việt Nam', startMs: 1000, endMs: 2000},
  ],
};

const segment = (overrides: Partial<TimelineSegmentDraft> = {}): TimelineSegmentDraft => ({
  schemaVersion: 1,
  startMs: 0,
  endMs: 2000,
  assetIds: [assetA],
  ...overrides,
});

const draft = (): TimelinePlanDraft => ({
  schemaVersion: 1,
  segments: [
    segment({audioAssetId: audio, captionTrack}),
    segment({startMs: 2000, endMs: 4000, assetIds: [assetB]}),
  ],
});

describe('WS10 deterministic timeline domain integration', () => {
  it('produces identical output for identical input', () => {
    expect(buildTimeline(draft())).toEqual(buildTimeline(draft()));
  });

  it('normalizes segment ordering deterministically regardless of input order', () => {
    const [first, second] = draft().segments;
    const shuffled = buildTimeline({schemaVersion: 1, segments: [second, first]});
    expect(shuffled).toEqual(buildTimeline(draft()));
  });

  it('accepts a valid timeline plan', () => {
    expect(isTimelinePlan(buildTimeline(draft()))).toBe(true);
  });

  it('derives a deterministic duration from segment endMs', () => {
    expect(buildTimeline(draft()).durationMs).toBe(4000);
  });

  it('produces deterministic segment and timeline ids', () => {
    const timeline = buildTimeline(draft());
    expect(timeline.id).toMatch(/^timelinePlan_[a-f0-9]{24}$/);
    timeline.segments.forEach((segment) => {
      expect(segment.id).toMatch(/^segment_[a-f0-9]{24}$/);
    });
  });

  it('preserves asset references', () => {
    const timeline = buildTimeline(draft());
    expect(timeline.segments[0].assetIds).toEqual([assetA]);
    expect(timeline.segments[0].audioAssetId).toBe(audio);
    expect(timeline.segments[0].captionTrack).toEqual(captionTrack);
    expect(timeline.segments[1].assetIds).toEqual([assetB]);
    expect(timeline.segments[1].audioAssetId).toBeUndefined();
  });

  it('rejects overlapping segments', () => {
    const invalid = buildTimeline({
      schemaVersion: 1,
      segments: [segment(), segment({startMs: 500, endMs: 1200})],
    });
    expect(isTimelinePlan(invalid)).toBe(false);
  });

  it('rejects caption timings outside the owning segment', () => {
    const invalid = buildTimeline({
      schemaVersion: 1,
      segments: [
        segment({
          captionTrack: {
            language: 'vi',
            timings: [{text: 'Xin chào', startMs: 0, endMs: 3000}],
          },
        }),
      ],
    });
    expect(isTimelinePlan(invalid)).toBe(false);
  });

  it('rejects negative timestamps', () => {
    expect(isTimelineSegment(buildTimelineSegment(segment({startMs: -1})))).toBe(false);
  });

  it('rejects endMs that do not exceed startMs', () => {
    expect(isTimelineSegment(buildTimelineSegment(segment({startMs: 1000, endMs: 1000})))).toBe(false);
    expect(isTimelineSegment(buildTimelineSegment(segment({startMs: 1000, endMs: 500})))).toBe(false);
  });

  it('rejects invalid asset references', () => {
    const badAsset = 'not-an-asset-id' as AssetId;
    expect(isTimelineSegment(buildTimelineSegment(segment({assetIds: [badAsset]})))).toBe(false);
    expect(isTimelineSegment(buildTimelineSegment(segment({audioAssetId: badAsset})))).toBe(false);
  });
});