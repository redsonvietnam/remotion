import {deterministicId, hashValue, stableJson} from './ids';
import type {AssetId, AssetLineageDependency, AssetRecord} from './types';

export type GeneratedAssetRequest = {
  readonly kind: string;
  readonly provider: string;
  readonly model: string;
  readonly generationParameters: Readonly<Record<string, unknown>>;
  readonly lineage: readonly AssetLineageDependency[];
  readonly mimeType: string;
  readonly extension: string;
  readonly width?: number;
  readonly height?: number;
};

export type AssetCacheIdentity = {
  readonly schemaVersion: 1;
  readonly kind: string;
  readonly provider: string;
  readonly model: string;
  readonly generationParameters: Readonly<Record<string, unknown>>;
  readonly lineage: readonly AssetLineageDependency[];
};

const normalizeJsonObject = <T extends Readonly<Record<string, unknown>>>(value: T): T =>
  JSON.parse(stableJson(value)) as T;

const normalizeLineage = (lineage: readonly AssetLineageDependency[]): readonly AssetLineageDependency[] =>
  [...lineage]
    .map((dependency) => ({kind: dependency.kind, identity: dependency.identity}))
    .sort((a, b) => `${a.kind}\u0000${a.identity}`.localeCompare(`${b.kind}\u0000${b.identity}`));

export const normalizeAssetRequest = (request: GeneratedAssetRequest): AssetCacheIdentity => ({
  schemaVersion: 1,
  kind: request.kind,
  provider: request.provider,
  model: request.model,
  generationParameters: normalizeJsonObject(request.generationParameters),
  lineage: normalizeLineage(request.lineage),
});

export const createAssetCacheKey = (request: GeneratedAssetRequest): string =>
  hashValue(normalizeAssetRequest(request));

export const createGeneratedAssetId = (request: GeneratedAssetRequest): AssetId =>
  deterministicId('asset', normalizeAssetRequest(request)) as AssetId;

export const createGeneratedAssetRecord = (input: {
  readonly request: GeneratedAssetRequest;
  readonly contentHash: string;
}): AssetRecord => ({
  schemaVersion: 1,
  id: createGeneratedAssetId(input.request),
  kind: input.request.kind,
  origin: 'generated',
  contentHash: input.contentHash,
  ...(input.request.width === undefined ? {} : {width: input.request.width}),
  ...(input.request.height === undefined ? {} : {height: input.request.height}),
  localPath: '',
  mimeType: input.request.mimeType,
  cacheKey: createAssetCacheKey(input.request),
  provenance: {
    provider: input.request.provider,
    model: input.request.model,
    generationParameters: normalizeJsonObject(input.request.generationParameters),
  },
  lineage: normalizeLineage(input.request.lineage),
});
