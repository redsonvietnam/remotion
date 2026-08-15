import type {AssetRecord} from '../foundation/types';
import type {RenderProfile, ResolvedStyle, StyleDefinition, TemplateDefinition} from '../templates/types';
import type {Timeline, TimelineClip, TimelineTrack} from '../timeline/types';

export const RENDER_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export type RenderSnapshotId = string & {readonly __brand: 'RenderSnapshotId'};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | {[key: string]: JsonValue};

export type ResolvedClipReference =
  | {readonly kind: 'asset'; readonly asset: AssetRecord}
  | {readonly kind: 'content'; readonly identity: string; readonly data: JsonValue}
  | {readonly kind: 'renderData'; readonly identity: string; readonly data: JsonValue};

export type ResolvedTimelineClip = Omit<TimelineClip, 'reference'> & {
  readonly reference: ResolvedClipReference;
};

export type ResolvedTimelineTrack = Omit<TimelineTrack, 'clips'> & {
  readonly clips: readonly ResolvedTimelineClip[];
};

export type ResolvedTimeline = Omit<Timeline, 'tracks'> & {
  readonly tracks: readonly ResolvedTimelineTrack[];
};

export type RenderSnapshotManifest = {
  readonly schemaVersion: typeof RENDER_SNAPSHOT_SCHEMA_VERSION;
  readonly snapshotId: RenderSnapshotId;
  readonly timelineId: Timeline['id'];
  readonly templateId: string;
  readonly styleId: string;
  readonly renderProfile: RenderProfile;
  readonly assetIds: readonly string[];
  readonly assetContentHashes: readonly string[];
};

export type RenderSnapshot = {
  readonly schemaVersion: typeof RENDER_SNAPSHOT_SCHEMA_VERSION;
  readonly id: RenderSnapshotId;
  readonly timeline: ResolvedTimeline;
  readonly template: TemplateDefinition;
  readonly style: StyleDefinition;
  readonly resolvedStyle: ResolvedStyle;
  readonly renderProfile: RenderProfile;
  readonly assets: readonly AssetRecord[];
  readonly manifest: RenderSnapshotManifest;
};
