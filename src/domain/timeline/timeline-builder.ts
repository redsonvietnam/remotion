import {deterministicId, stableJson} from '../foundation/ids';
import type {
  TimelinePlan,
  TimelinePlanDraft,
  TimelinePlanId,
  TimelineSegment,
  TimelineSegmentDraft,
  TimelineSegmentId,
} from './types';

const asTimelinePlanId = (value: string): TimelinePlanId => value as TimelinePlanId;
const asSegmentId = (value: string): TimelineSegmentId => value as TimelineSegmentId;

const canonicalSegment = (draft: TimelineSegmentDraft): TimelineSegmentDraft => ({
  schemaVersion: 1,
  startMs: draft.startMs,
  endMs: draft.endMs,
  assetIds: [...draft.assetIds].sort(),
  ...(draft.audioAssetId === undefined ? {} : {audioAssetId: draft.audioAssetId}),
  ...(draft.captionTrack === undefined ? {} : {captionTrack: draft.captionTrack}),
});

export const buildTimelineSegment = (draft: TimelineSegmentDraft): TimelineSegment => ({
  ...canonicalSegment(draft),
  id: asSegmentId(deterministicId('segment', canonicalSegment(draft))),
});

export const buildTimeline = (draft: TimelinePlanDraft): TimelinePlan => {
  const segments = [...draft.segments]
    .sort((a, b) =>
      a.startMs - b.startMs ||
      stableJson(canonicalSegment(a)).localeCompare(stableJson(canonicalSegment(b))),
    )
    .map(buildTimelineSegment);
  const durationMs = segments.reduce((max, segment) => Math.max(max, segment.endMs), 0);
  const identityInput = {
    schemaVersion: 1,
    durationMs,
    segments: segments.map(canonicalSegment),
  };
  return {
    schemaVersion: 1,
    id: asTimelinePlanId(deterministicId('timelinePlan', identityInput)),
    durationMs,
    segments,
  };
};