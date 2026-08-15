import {deterministicId} from '../foundation/ids';
import {clipEndFrame, createTimeline} from './timeline';
import type {ClipReference, Timeline, TimelineClip, TimelineTrack} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);
const isNonNegativeInteger = (value: unknown): value is number => isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number => isInteger(value) && value > 0;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const timelineId = /^timeline_[a-f0-9]{24}$/;
const trackId = /^track_[a-f0-9]{24}$/;
const clipId = /^clip_[a-f0-9]{24}$/;
const assetId = /^asset_[a-f0-9]{24}$/;

const CLIP_KEYS = ['schemaVersion', 'id', 'role', 'startFrame', 'durationFrames', 'reference'] as const;
const TRACK_KEYS = ['schemaVersion', 'id', 'kind', 'order', 'clips', 'allowOverlap'] as const;
const TIMELINE_KEYS = ['schemaVersion', 'id', 'fps', 'durationFrames', 'tracks'] as const;

const isClipReference = (value: unknown): value is ClipReference => {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'asset') return hasExactKeys(value, ['kind', 'assetId']) && typeof value.assetId === 'string' && assetId.test(value.assetId);
  if (value.kind === 'content' || value.kind === 'renderData') {
    return hasExactKeys(value, ['kind', 'identity']) && isNonEmptyString(value.identity);
  }
  return false;
};

export const isTimelineClip = (value: unknown): value is TimelineClip => {
  if (!isRecord(value) || !hasExactKeys(value, CLIP_KEYS)) return false;
  if (value.schemaVersion !== 1 || typeof value.id !== 'string' || !clipId.test(value.id)) return false;
  if (value.role !== 'visual' && value.role !== 'audio' && value.role !== 'text') return false;
  if (!isNonNegativeInteger(value.startFrame) || !isPositiveInteger(value.durationFrames)) return false;
  return isClipReference(value.reference);
};

export const isTimelineTrack = (value: unknown): value is TimelineTrack => {
  if (!isRecord(value) || !hasExactKeys(value, TRACK_KEYS)) return false;
  if (value.schemaVersion !== 1 || typeof value.id !== 'string' || !trackId.test(value.id)) return false;
  if (!['visual', 'narration', 'music', 'sfx', 'captions', 'effects', 'text'].includes(String(value.kind))) return false;
  if (!isNonNegativeInteger(value.order) || typeof value.allowOverlap !== 'boolean' || !Array.isArray(value.clips)) return false;
  return value.clips.every(isTimelineClip);
};

export const isTimeline = (value: unknown): value is Timeline => {
  if (!isRecord(value) || !hasExactKeys(value, TIMELINE_KEYS)) return false;
  if (value.schemaVersion !== 1 || typeof value.id !== 'string' || !timelineId.test(value.id)) return false;
  if (!isPositiveInteger(value.fps) || !isPositiveInteger(value.durationFrames) || !Array.isArray(value.tracks)) return false;
  if (!value.tracks.every(isTimelineTrack)) return false;
  if (value.tracks.some((track) => track.order !== value.tracks.indexOf(track))) return false;
  const orders = new Set(value.tracks.map((track) => track.order));
  if (orders.size !== value.tracks.length) return false;
  if (value.tracks.some((track) => track.clips.some((clip) => clipEndFrame(clip) > value.durationFrames))) return false;
  if (value.tracks.some((track) => {
    if (track.allowOverlap) return false;
    const clips = [...track.clips].sort((a, b) => a.startFrame - b.startFrame || a.id.localeCompare(b.id));
    return clips.some((clip, index) => index > 0 && clip.startFrame < clipEndFrame(clips[index - 1]));
  })) return false;

  const expectedTracks = [...value.tracks].sort((a, b) => a.order - b.order).map(({id: _id, ...track}) => ({
    ...track,
    clips: track.clips.map(({id: _clipId, ...clip}) => clip),
  }));
  const expected = createTimeline({schemaVersion: 1, fps: value.fps, durationFrames: value.durationFrames, tracks: expectedTracks});
  return expected.id === value.id && expected.tracks.every((track, index) =>
    track.id === value.tracks[index].id &&
    track.clips.length === value.tracks[index].clips.length &&
    track.clips.every((clip, clipIndex) => clip.id === value.tracks[index].clips[clipIndex].id));
};

export const validateTimeline = (value: unknown): {readonly valid: true} | {readonly valid: false; readonly issues: readonly string[]} => {
  if (isTimeline(value)) return {valid: true};
  if (!isRecord(value)) return {valid: false, issues: ['timeline must be an object']};
  const issues: string[] = [];
  if (value.schemaVersion !== 1) issues.push('schemaVersion must be 1');
  if (!Array.isArray(value.tracks)) issues.push('tracks must be an array');
  if (!isPositiveInteger(value.fps)) issues.push('fps must be a positive integer');
  if (!isPositiveInteger(value.durationFrames)) issues.push('durationFrames must be a positive integer');
  if (typeof value.id !== 'string' || !timelineId.test(value.id)) issues.push('id is invalid');
  return {valid: false, issues};
};

export const deterministicTrackId = (track: Omit<TimelineTrack, 'id'>): string => deterministicId('track', track);
export const deterministicClipId = (clip: Omit<TimelineClip, 'id'>): string => deterministicId('clip', clip);
