import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {basename, extname} from 'node:path';
import {createAssetCacheKey, createGeneratedAssetId, normalizeAssetRequest, type GeneratedAssetRequest} from './assets';
import {stableJson} from './ids';
import {projectPaths, resolveProjectPath} from './paths';
import {isAssetRecord, parseAssetRecord} from './validation';
import type {AssetRecord} from './types';

export type AssetCacheLookup = {
  readonly hit: boolean;
  readonly asset?: AssetRecord;
};

export type StoredGeneratedAssetInput = {
  readonly request: GeneratedAssetRequest;
  readonly data: Uint8Array;
  readonly forceRegenerate?: boolean;
};

const EXTENSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,15}$/i;

const contentHash = (data: Uint8Array): string =>
  createHash('sha256').update(data).digest('hex');

const assetFileName = (assetId: string, extension: string): string => {
  const normalizedExtension = extension.replace(/^\./, '');
  if (!EXTENSION_PATTERN.test(normalizedExtension)) throw new Error('Invalid asset extension');
  return `${assetId}.${normalizedExtension}`;
};

const metadataPathFor = (assetPath: string): string => `${assetPath}.meta.json`;

const readValidMetadata = async (metadataPath: string): Promise<AssetRecord | undefined> => {
  try {
    const raw = JSON.parse(await readFile(metadataPath, 'utf8')) as unknown;
    return isAssetRecord(raw) ? parseAssetRecord(raw) : undefined;
  } catch {
    return undefined;
  }
};

export const metadataJson = (asset: AssetRecord): string => `${stableJson(asset)}\n`;

export const storeGeneratedAsset = async (
  projectRoot: string,
  projectId: string,
  input: StoredGeneratedAssetInput,
): Promise<AssetRecord> => {
  const cacheKey = createAssetCacheKey(input.request);
  const assetId = createGeneratedAssetId(input.request);
  const paths = projectPaths(projectRoot, projectId);
  const fileName = assetFileName(assetId, input.request.extension);
  const localPath = `assets/${fileName}`;
  const assetPath = resolveProjectPath(projectRoot, projectId, localPath);
  const metadataPath = metadataPathFor(assetPath);

  if (!input.forceRegenerate) {
    const cached = await findCachedAsset(projectRoot, projectId, input.request);
    if (cached.hit && cached.asset) return cached.asset;
  }

  const normalized = normalizeAssetRequest(input.request);
  const record: AssetRecord = {
    schemaVersion: 1,
    id: assetId,
    kind: input.request.kind,
    origin: 'generated',
    contentHash: contentHash(input.data),
    ...(input.request.width === undefined ? {} : {width: input.request.width}),
    ...(input.request.height === undefined ? {} : {height: input.request.height}),
    localPath,
    mimeType: input.request.mimeType,
    cacheKey,
    provenance: {
      provider: input.request.provider,
      model: input.request.model,
      generationParameters: normalized.generationParameters,
    },
    lineage: normalized.lineage,
  };

  parseAssetRecord(record);
  await mkdir(paths.assets, {recursive: true});
  await writeFile(assetPath, input.data);
  await writeFile(metadataPath, metadataJson(record), 'utf8');
  return record;
};

export const findCachedAsset = async (
  projectRoot: string,
  projectId: string,
  request: GeneratedAssetRequest,
): Promise<AssetCacheLookup> => {
  const assetId = createGeneratedAssetId(request);
  const cacheKey = createAssetCacheKey(request);
  const assetRoot = projectPaths(projectRoot, projectId).assets;

  let entries: string[];
  try {
    entries = await readdir(assetRoot);
  } catch {
    return {hit: false};
  }

  const normalized = normalizeAssetRequest(request);
  for (const fileName of entries) {
    if (!fileName.startsWith(`${assetId}.`) || fileName.endsWith('.meta.json')) continue;
    let assetPath: string;
    try {
      assetPath = resolveProjectPath(projectRoot, projectId, `assets/${fileName}`);
    } catch {
      continue;
    }
    const expectedLocalPath = `assets/${fileName}`;
    const metadata = await readValidMetadata(metadataPathFor(assetPath));
    if (!metadata || metadata.origin !== 'generated' || metadata.cacheKey !== cacheKey) continue;
    if (metadata.id !== assetId || metadata.localPath !== expectedLocalPath || !metadata.provenance) continue;
    try {
      resolveProjectPath(projectRoot, projectId, metadata.localPath);
    } catch {
      continue;
    }
    if (metadata.provenance.provider !== request.provider || metadata.provenance.model !== request.model) continue;
    if (stableJson(metadata.provenance.generationParameters) !== stableJson(normalized.generationParameters)) continue;
    if (stableJson(metadata.lineage) !== stableJson(normalized.lineage)) continue;

    try {
      const bytes = await readFile(assetPath);
      if (contentHash(bytes) !== metadata.contentHash) continue;
      return {hit: true, asset: metadata};
    } catch {
      continue;
    }
  }

  return {hit: false};
};

export const assetMetadataPath = (projectRoot: string, projectId: string, asset: AssetRecord): string =>
  resolveProjectPath(projectRoot, projectId, `${asset.localPath}.meta.json`);

export const assetFilePath = (projectRoot: string, projectId: string, asset: AssetRecord): string => {
  const extension = extname(basename(asset.localPath));
  if (!extension) throw new Error('Asset local path must include an extension');
  return resolveProjectPath(projectRoot, projectId, asset.localPath);
};
