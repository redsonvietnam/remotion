import {deterministicId, hashValue, stableJson} from '../foundation/ids';
import type {AssetId} from '../foundation/types';
import type {ClipId, ClipReference, Timeline, TimelineClip, TimelineDraft, TimelineTrack, TrackId} from './types';

const asTimelineId = (value: string) => value as Timeline['id'];
const asTrackId = (value: string) => value as TrackId;
const asClipId = (value: string) => value as ClipId;
const asAssetId = (value: string) => value as AssetId;

const clipIdentityInput = (clip: Omit<TimelineClip, 'id'>) => ({
  role: clip.role,
  startFrame: clip.startFrame,
  durationFrames: clip.durationFrames,
  reference: clip.reference,
});

const sortClips = <T extends {startFrame: number; reference: ClipReference; role: string; durationFrames: number}>(clips: readonly T[]): T[] =>
  [...clips].sort((a, b) => a.startFrame - b.startFrame || stableJson(clipIdentityInput(a as Omit<TimelineClip, 'id'>)).localeCompare(stableJson(clipIdentityInput(b as Omit<TimelineClip, 'id'>))));

const trackIdentityInput = (track: Omit<TimelineTrack, 'id'>) => ({
  kind: track.kind,
  order: track.order,
  allowOverlap: track.allowOverlap,
  clips: sortClips(track.clips).map(({id: _id, ...clip}) => clipIdentityInput(clip)),
});

export const createClip = (clip: Omit<TimelineClip, 'id'>): TimelineClip => ({
  ...clip,
  id: asClipId(deterministicId('clip', clipIdentityInput(clip))),
});

export const createTrack = (track: Omit<TimelineTrack, 'id'>): TimelineTrack => {
  const clips = sortClips(track.clips).map((clip) => createClip(clip));
  return {
    ...track,
    clips,
    id: asTrackId(deterministicId('track', trackIdentityInput({...track, clips}))),
  };
};

export const createTimeline = (draft: TimelineDraft): Timeline => {
  const tracks = [...draft.tracks]
    .sort((a, b) => a.order - b.order)
    .map((track) => createTrack(track));
  const identityInput = {
    schemaVersion: draft.schemaVersion,
    fps: draft.fps,
    durationFrames: draft.durationFrames,
    tracks: tracks.map(trackIdentityInput),
  };
  return {
    schemaVersion: 1,
    fps: draft.fps,
    durationFrames: draft.durationFrames,
    tracks,
    id: asTimelineId(deterministicId('timeline', identityInput)),
  };
};

export const normalizeTimeline = (timeline: Timeline): Timeline => {
  const tracks = [...timeline.tracks]
    .sort((a, b) => a.order - b.order)
    .map((track) => ({
      ...track,
      clips: sortClips(track.clips),
    }));
  const normalized = {...timeline, tracks};
  return createTimeline(normalized);
};

export const clipEndFrame = (clip: Pick<TimelineClip, 'startFrame' | 'durationFrames'>): number =>
  clip.startFrame + clip.durationFrames;

export const resolveAssetReference = (reference: ClipReference): AssetId | undefined =>
  reference.kind === 'asset' ? asAssetId(reference.assetId) : undefined;

export const timelineIdentityHash = (timeline: Timeline): string => hashValue({
  schemaVersion: timeline.schemaVersion,
  fps: timeline.fps,
  durationFrames: timeline.durationFrames,
  tracks: timeline.tracks.map(trackIdentityInput),
});

export const serializeTimeline = (timeline: Timeline): string => stableJson(timeline);
