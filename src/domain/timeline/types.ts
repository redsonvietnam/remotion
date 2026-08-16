import type {AssetId} from '../foundation/types';
import type {CaptionTrack} from '../captions/types';

export type TimelineId = string & {readonly __brand: 'TimelineId'};
export type TrackId = string & {readonly __brand: 'TrackId'};
export type ClipId = string & {readonly __brand: 'ClipId'};
export type TimelinePlanId = string & {readonly __brand: 'TimelinePlanId'};
export type TimelineSegmentId = string & {readonly __brand: 'TimelineSegmentId'};

export type TrackKind = 'visual' | 'narration' | 'music' | 'sfx' | 'captions' | 'effects' | 'text';
export type ClipRole = 'visual' | 'audio' | 'text';

export type ClipReference =
  | {readonly kind: 'asset'; readonly assetId: AssetId}
  | {readonly kind: 'content'; readonly identity: string}
  | {readonly kind: 'renderData'; readonly identity: string};

export type TimelineClip = {
  readonly schemaVersion: 1;
  readonly id: ClipId;
  readonly role: ClipRole;
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly reference: ClipReference;
};

export type TimelineTrack = {
  readonly schemaVersion: 1;
  readonly id: TrackId;
  readonly kind: TrackKind;
  readonly order: number;
  readonly clips: readonly TimelineClip[];
  readonly allowOverlap: boolean;
};

export type Timeline = {
  readonly schemaVersion: 1;
  readonly id: TimelineId;
  readonly fps: number;
  readonly durationFrames: number;
  readonly tracks: readonly TimelineTrack[];
};

export type TimelineDraft = Omit<Timeline, 'id' | 'tracks'> & {
  readonly tracks: readonly (Omit<TimelineTrack, 'id' | 'clips'> & {
    readonly id?: TrackId;
    readonly clips: readonly Omit<TimelineClip, 'id'>[];
  })[];
};

export type TimelineSegment = {
  readonly schemaVersion: 1;
  readonly id: TimelineSegmentId;
  readonly startMs: number;
  readonly endMs: number;
  readonly assetIds: readonly AssetId[];
  readonly audioAssetId?: AssetId;
  readonly captionTrack?: CaptionTrack;
};

export type TimelineSegmentDraft = Omit<TimelineSegment, 'id'>;

export type TimelinePlan = {
  readonly schemaVersion: 1;
  readonly id: TimelinePlanId;
  readonly durationMs: number;
  readonly segments: readonly TimelineSegment[];
};

export type TimelinePlanDraft = {
  readonly schemaVersion: 1;
  readonly segments: readonly TimelineSegmentDraft[];
};

export type TimelineValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type TimelineValidationResult =
  | {readonly valid: true}
  | {readonly valid: false; readonly issues: readonly TimelineValidationIssue[]};
