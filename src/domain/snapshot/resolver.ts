import {stableJson} from '../foundation/ids';
import {isAssetRecord} from '../foundation/validation';
import type {AssetRecord} from '../foundation/types';
import {resolveStyle} from '../templates/resolver';
import {isStyleDefinition, isTemplateDefinition} from '../templates/validation';
import type {RenderProfile, StyleDefinition, TemplateDefinition} from '../templates/types';
import {isTimeline} from '../timeline/validation';
import type {ClipReference, Timeline} from '../timeline/types';
import {isProjectRelativeAssetPath} from './validation';
import {snapshotIdentity} from './identity';
import type {JsonValue, RenderSnapshot, RenderSnapshotId, RenderSnapshotManifest, ResolvedClipReference, ResolvedTimeline} from './types';

export type AssetIntegrityVerifier = (asset: AssetRecord) => boolean | Promise<boolean>;

export type SnapshotResolutionInput = {
  readonly timeline: Timeline;
  readonly template: TemplateDefinition;
  readonly style: StyleDefinition;
  readonly renderProfile: RenderProfile;
  readonly assets: readonly AssetRecord[];
  readonly content?: Readonly<Record<string, JsonValue>>;
  readonly renderData?: Readonly<Record<string, JsonValue>>;
  readonly verifyAsset: AssetIntegrityVerifier;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const SECRET_KEY = /(?:api[_-]?key|access[_-]?token|auth(?:orization)?|bearer|credential|password|secret|private[_-]?key)/i;
const containsSecretKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, entry]) => SECRET_KEY.test(key) || containsSecretKey(entry));
};

const cloneJson = <T>(value: T): T => JSON.parse(stableJson(value)) as T;
const deepFreeze = <T>(value: T): T => {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function') || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

const isValidRenderProfile = (value: unknown): value is RenderProfile =>
  isRecord(value) && isRecord(value.resolution) && Number.isInteger(value.resolution.width) && value.resolution.width > 0 &&
  Number.isInteger(value.resolution.height) && value.resolution.height > 0 && Number.isInteger(value.fps) && value.fps > 0 &&
  typeof value.codec === 'string' && value.codec.length > 0 && typeof value.container === 'string' && value.container.length > 0;

const resolveReference = async (
  reference: ClipReference,
  assets: ReadonlyMap<string, AssetRecord>,
  content: Readonly<Record<string, JsonValue>> | undefined,
  renderData: Readonly<Record<string, JsonValue>> | undefined,
  verifyAsset: AssetIntegrityVerifier,
): Promise<ResolvedClipReference> => {
  if (reference.kind === 'asset') {
    const asset = assets.get(reference.assetId);
    if (!asset) throw new Error(`Unresolved asset reference: ${reference.assetId}`);
    if (!isProjectRelativeAssetPath(asset.localPath)) throw new Error(`Invalid asset path: ${asset.localPath}`);
    if (!(await verifyAsset(asset))) throw new Error(`Asset integrity check failed: ${asset.id}`);
    return {kind: 'asset', asset: cloneJson(asset)};
  }
  if (reference.kind === 'content') {
    if (content === undefined || !Object.prototype.hasOwnProperty.call(content, reference.identity)) throw new Error(`Unresolved content reference: ${reference.identity}`);
    return {kind: 'content', identity: reference.identity, data: cloneJson(content[reference.identity])};
  }
  if (renderData === undefined || !Object.prototype.hasOwnProperty.call(renderData, reference.identity)) throw new Error(`Unresolved renderData reference: ${reference.identity}`);
  return {kind: 'renderData', identity: reference.identity, data: cloneJson(renderData[reference.identity])};
};

const resolveTimeline = async (
  timeline: Timeline,
  assets: ReadonlyMap<string, AssetRecord>,
  content: Readonly<Record<string, JsonValue>> | undefined,
  renderData: Readonly<Record<string, JsonValue>> | undefined,
  verifyAsset: AssetIntegrityVerifier,
): Promise<ResolvedTimeline> => ({
  ...timeline,
  tracks: await Promise.all(timeline.tracks.map(async (track) => ({
    ...track,
    clips: await Promise.all(track.clips.map(async (clip) => ({...clip, reference: await resolveReference(clip.reference, assets, content, renderData, verifyAsset)}))),
  }))),
});

const buildManifest = (id: RenderSnapshotId, snapshot: Omit<RenderSnapshot, 'id' | 'manifest'>): RenderSnapshotManifest => {
  const assets = [...snapshot.assets].sort((a, b) => a.id.localeCompare(b.id));
  return {
    schemaVersion: 1, snapshotId: id, timelineId: snapshot.timeline.id, templateId: snapshot.template.id, styleId: snapshot.style.id,
    renderProfile: cloneJson(snapshot.renderProfile), assetIds: assets.map((asset) => asset.id), assetContentHashes: assets.map((asset) => asset.contentHash),
  };
};

export const resolveRenderSnapshot = async (input: SnapshotResolutionInput): Promise<RenderSnapshot> => {
  if (!isTimeline(input.timeline)) throw new Error('Invalid Timeline');
  if (!isTemplateDefinition(input.template)) throw new Error('Invalid TemplateDefinition');
  if (!isStyleDefinition(input.style)) throw new Error('Invalid StyleDefinition');
  if (!isValidRenderProfile(input.renderProfile)) throw new Error('Invalid RenderProfile');
  if (!Array.isArray(input.assets) || !input.assets.every(isAssetRecord)) throw new Error('Invalid AssetRecord collection');
  if (input.assets.some((asset) => !isProjectRelativeAssetPath(asset.localPath))) throw new Error('Invalid project-relative asset path');
  if (containsSecretKey(input)) throw new Error('Secrets are not permitted in RenderSnapshot inputs');
  const assets = new Map(input.assets.map((asset) => [asset.id, asset] as const));
  if (assets.size !== input.assets.length) throw new Error('Duplicate asset identity');

  const timeline = await resolveTimeline(input.timeline, assets, input.content, input.renderData, input.verifyAsset);
  const snapshotWithoutIdentity: Omit<RenderSnapshot, 'id' | 'manifest'> = {
    schemaVersion: 1, timeline, template: cloneJson(input.template), style: cloneJson(input.style),
    resolvedStyle: resolveStyle(input.template, input.style), renderProfile: cloneJson(input.renderProfile),
    assets: [...assets.values()].sort((a, b) => a.id.localeCompare(b.id)).map(cloneJson),
  };
  const id = snapshotIdentity(snapshotWithoutIdentity);
  return deepFreeze({id, manifest: buildManifest(id, snapshotWithoutIdentity), ...snapshotWithoutIdentity});
};

export const serializeRenderSnapshot = (snapshot: RenderSnapshot): string => stableJson(snapshot);
