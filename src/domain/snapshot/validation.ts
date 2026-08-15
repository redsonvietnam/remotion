import {stableJson} from '../foundation/ids';
import type {AssetId, AssetRecord} from '../foundation/types';
import {isAssetRecord} from '../foundation/validation';
import {isStyleDefinition, isStyleTokens, isTemplateDefinition} from '../templates/validation';
import type {RenderProfile} from '../templates/types';
import {isTimeline} from '../timeline/validation';
import type {ClipReference, Timeline} from '../timeline/types';
import {snapshotIdentity} from './identity';
import type {JsonValue, RenderSnapshot, ResolvedClipReference, ResolvedTimeline, ResolvedTimelineClip} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0;
const SECRET_KEY = /(?:api[_-]?key|access[_-]?token|auth(?:orization)?|bearer|credential|password|secret|private[_-]?key)/i;
const containsSecretKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, entry]) => SECRET_KEY.test(key) || containsSecretKey(entry));
};

export const isProjectRelativeAssetPath = (value: unknown): value is string => {
  if (!nonEmptyString(value) || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false;
  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
};

export const isRenderProfile = (value: unknown): value is RenderProfile =>
  isRecord(value) && hasExactKeys(value, ['resolution', 'fps', 'codec', 'container']) && isRecord(value.resolution) &&
  hasExactKeys(value.resolution, ['width', 'height']) && positiveInteger(value.resolution.width) && positiveInteger(value.resolution.height) &&
  positiveInteger(value.fps) && nonEmptyString(value.codec) && nonEmptyString(value.container);

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
};

const isResolvedClipReference = (value: unknown, assets: ReadonlyMap<string, AssetRecord>): value is ResolvedClipReference => {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'asset') {
    if (!hasExactKeys(value, ['kind', 'asset']) || !isAssetRecord(value.asset)) return false;
    const canonical = assets.get(value.asset.id);
    return canonical !== undefined && canonical.contentHash === value.asset.contentHash && canonical.localPath === value.asset.localPath;
  }
  return (value.kind === 'content' || value.kind === 'renderData') && hasExactKeys(value, ['kind', 'identity', 'data']) && nonEmptyString(value.identity) && isJsonValue(value.data);
};

const toTimelineReference = (reference: ResolvedClipReference): ClipReference =>
  reference.kind === 'asset' ? {kind: 'asset', assetId: reference.asset.id as AssetId} : {kind: reference.kind, identity: reference.identity};

const isResolvedTimeline = (value: unknown, assets: ReadonlyMap<string, AssetRecord>): value is ResolvedTimeline => {
  if (!isRecord(value) || !Array.isArray(value.tracks)) return false;
  for (const track of value.tracks) {
    if (!isRecord(track) || !Array.isArray(track.clips)) return false;
    for (const clip of track.clips) if (!isRecord(clip) || !isResolvedClipReference(clip.reference, assets)) return false;
  }
  const structuralTimeline = {
    ...value,
    tracks: value.tracks.map((track) => ({...track, clips: (track.clips as readonly ResolvedTimelineClip[]).map((clip) => ({...clip, reference: toTimelineReference(clip.reference)}))})),
  } as Timeline;
  return isTimeline(structuralTimeline);
};

export const isRenderSnapshot = (value: unknown): value is RenderSnapshot => {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'id', 'timeline', 'template', 'style', 'resolvedStyle', 'renderProfile', 'assets', 'manifest'])) return false;
  if (value.schemaVersion !== 1 || !/^snapshot_[a-f0-9]{24}$/.test(String(value.id))) return false;
  if (!isTemplateDefinition(value.template) || !isStyleDefinition(value.style) || !isStyleTokens(value.resolvedStyle) || !isRenderProfile(value.renderProfile)) return false;
  if (!Array.isArray(value.assets) || !value.assets.every(isAssetRecord) || value.assets.some((asset) => !isProjectRelativeAssetPath(asset.localPath))) return false;
  const assets = new Map(value.assets.map((asset) => [asset.id, asset] as const));
  if (assets.size !== value.assets.length || containsSecretKey(value) || !isResolvedTimeline(value.timeline, assets)) return false;
  if (!isRecord(value.manifest) || !hasExactKeys(value.manifest, ['schemaVersion', 'snapshotId', 'timelineId', 'templateId', 'styleId', 'renderProfile', 'assetIds', 'assetContentHashes'])) return false;
  if (value.manifest.schemaVersion !== 1 || value.manifest.snapshotId !== value.id || value.manifest.timelineId !== value.timeline.id || value.manifest.templateId !== value.template.id || value.manifest.styleId !== value.style.id) return false;
  if (!isRenderProfile(value.manifest.renderProfile) || stableJson(value.manifest.renderProfile) !== stableJson(value.renderProfile)) return false;
  if (!Array.isArray(value.manifest.assetIds) || !value.manifest.assetIds.every(nonEmptyString) || !Array.isArray(value.manifest.assetContentHashes) || !value.manifest.assetContentHashes.every(nonEmptyString)) return false;
  const sortedAssets = [...value.assets].sort((a, b) => a.id.localeCompare(b.id));
  if (value.manifest.assetIds.length !== sortedAssets.length || !value.manifest.assetIds.every((id, index) => id === sortedAssets[index].id) || !value.manifest.assetContentHashes.every((hash, index) => hash === sortedAssets[index].contentHash)) return false;
  const {id: _id, manifest: _manifest, ...withoutIdentity} = value as RenderSnapshot;
  return snapshotIdentity(withoutIdentity) === value.id;
};

export const parseRenderSnapshot = (value: unknown): RenderSnapshot => {
  if (!isRenderSnapshot(value)) throw new Error('Invalid RenderSnapshot');
  return value;
};
