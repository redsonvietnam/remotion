import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {createCapabilityRegistry} from './capabilities';
import {resolveConfig} from './config';
import {createAssetCacheKey, createGeneratedAssetId, normalizeAssetRequest, type GeneratedAssetRequest} from './assets';
import {assetFilePath, assetMetadataPath, findCachedAsset, metadataJson, storeGeneratedAsset} from './asset-store';
import {hashValue, stableJson} from './ids';
import {createProject} from './project';
import {projectPaths, resolveProjectPath} from './paths';
import {applyStageRunEvent, failStageRun, startStageRun, succeedStageRun} from './stage-run';
import {isAssetRecord, isProjectRecord, isStageRunRecord} from './validation';
import type {AssetRecord, ProjectId} from './types';

const tempRoots: string[] = [];

const makeRequest = (overrides: Partial<GeneratedAssetRequest> = {}): GeneratedAssetRequest => ({
  kind: 'image',
  provider: 'provider-a',
  model: 'model-a',
  generationParameters: {prompt: 'Nghị quyết 57', width: 1080, height: 1920, style: 'cinematic'},
  lineage: [{kind: 'visualPrompt', identity: 'prompt-1'}],
  mimeType: 'image/png',
  extension: 'png',
  width: 1080,
  height: 1920,
  ...overrides,
});

const makeTempProject = async (): Promise<{root: string; projectId: string}> => {
  const root = await mkdtemp(join(tmpdir(), 'video-factory-assets-'));
  tempRoots.push(root);
  return {root, projectId: 'project_x'};
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe('foundation', () => {
  it('canonicalizes object key order for deterministic hashing', () => {
    expect(stableJson({b: 2, a: 1})).toBe(stableJson({a: 1, b: 2}));
    expect(hashValue({b: 2, a: 1})).toBe(hashValue({a: 1, b: 2}));
  });

  it('creates a self-describing project without secret state', () => {
    const project = createProject({name: '  Nghị quyết 57  ', createdAt: '2026-08-15T00:00:00.000Z'});
    expect(isProjectRecord(project)).toBe(true);
    expect(project.name).toBe('Nghị quyết 57');
    expect(Object.keys(project).sort()).toEqual(['createdAt', 'id', 'name', 'schemaVersion']);
  });

  it('rejects invalid persisted project and StageRun state', () => {
    expect(isProjectRecord({schemaVersion: 1, id: 'x', name: 'x'})).toBe(false);
    expect(isStageRunRecord({schemaVersion: 1, id: 'run_x', projectId: 'project_x', stage: 'render', status: 'running', attempt: 0, startedAt: 'bad', inputHash: 'x', dependencyRunIds: []})).toBe(false);
  });

  it('rejects unexpected persisted ProjectRecord fields', () => {
    const project = {schemaVersion: 1, id: 'project_x', name: 'x', createdAt: '2026-08-15T00:00:00.000Z'};
    expect(isProjectRecord({...project, apiKey: 'secret'})).toBe(false);
    expect(isProjectRecord({...project, unexpected: true})).toBe(false);
  });

  it('rejects impossible persisted StageRun lifecycle states', () => {
    const base = {
      schemaVersion: 1,
      id: 'run_x',
      projectId: 'project_x',
      stage: 'render',
      attempt: 1,
      startedAt: '2026-08-15T00:00:00.000Z',
      inputHash: 'input',
      dependencyRunIds: [],
    };

    expect(isStageRunRecord({...base, status: 'running', finishedAt: '2026-08-15T00:00:01.000Z'})).toBe(false);
    expect(isStageRunRecord({...base, status: 'running', outputHash: 'output'})).toBe(false);
    expect(isStageRunRecord({...base, status: 'running', errorCode: 'late'})).toBe(false);
    expect(isStageRunRecord({...base, status: 'succeeded', finishedAt: '2026-08-15T00:00:01.000Z', errorCode: 'bad'})).toBe(false);
    expect(isStageRunRecord({...base, status: 'failed', finishedAt: '2026-08-15T00:00:01.000Z'})).toBe(false);
    expect(isStageRunRecord({...base, status: 'failed', finishedAt: '2026-08-15T00:00:01.000Z', errorCode: 'failed', outputHash: 'output'})).toBe(false);
  });

  it('validates generated AssetRecord provenance and rejects secrets', () => {
    const request = makeRequest();
    const valid: AssetRecord = {
      schemaVersion: 1,
      id: createGeneratedAssetId(request),
      kind: 'image',
      origin: 'generated',
      contentHash: 'content-hash',
      width: 1080,
      height: 1920,
      localPath: 'assets/asset.png',
      mimeType: 'image/png',
      cacheKey: createAssetCacheKey(request),
      provenance: {
        provider: request.provider,
        model: request.model,
        generationParameters: normalizeAssetRequest(request).generationParameters,
      },
      lineage: normalizeAssetRequest(request).lineage,
    };

    expect(isAssetRecord(valid)).toBe(true);
    expect(isAssetRecord({...valid, provenance: undefined})).toBe(false);
    expect(isAssetRecord({...valid, cacheKey: undefined})).toBe(false);
    expect(isAssetRecord({...valid, apiKey: 'secret'})).toBe(false);
    expect(isAssetRecord({...valid, provenance: {...valid.provenance!, generationParameters: {prompt: 'x', apiKey: 'secret'}}})).toBe(false);
  });

  it('uses deterministic cache identity for normalized requests', () => {
    const first = makeRequest({generationParameters: {b: 2, a: 1}});
    const same = makeRequest({generationParameters: {a: 1, b: 2}, lineage: [{kind: 'visualPrompt', identity: 'prompt-1'}]});
    const changedParameter = makeRequest({generationParameters: {a: 1, b: 3}});
    const changedProvider = makeRequest({provider: 'provider-b'});

    expect(createAssetCacheKey(first)).toBe(createAssetCacheKey(same));
    expect(createAssetCacheKey(first)).not.toBe(createAssetCacheKey(changedParameter));
    expect(createAssetCacheKey(first)).not.toBe(createAssetCacheKey(changedProvider));
  });

  it('changes cache identity when relevant lineage changes but not for unrelated external changes', () => {
    const base = makeRequest({lineage: [{kind: 'contentPlan', identity: 'content-1'}]});
    const changedRelevant = makeRequest({lineage: [{kind: 'contentPlan', identity: 'content-2'}]});
    const unrelatedExternalChange = makeRequest({lineage: [{kind: 'contentPlan', identity: 'content-1'}]});

    expect(createAssetCacheKey(base)).not.toBe(createAssetCacheKey(changedRelevant));
    expect(createAssetCacheKey(base)).toBe(createAssetCacheKey(unrelatedExternalChange));
  });

  it('stores assets with deterministic metadata and reuses a valid cache hit', async () => {
    const {root, projectId} = await makeTempProject();
    const request = makeRequest();
    const first = await storeGeneratedAsset(root, projectId, {request, data: new TextEncoder().encode('asset')});
    const second = await storeGeneratedAsset(root, projectId, {request, data: new TextEncoder().encode('different')});

    expect(second).toEqual(first);
    expect(await readFile(assetFilePath(root, projectId, first), 'utf8')).toBe('asset');
    expect(await readFile(assetMetadataPath(root, projectId, first), 'utf8')).toBe(metadataJson(first));
    expect(metadataJson(first)).toBe(metadataJson(second));
  });

  it('force regeneration bypasses a matching cache entry', async () => {
    const {root, projectId} = await makeTempProject();
    const request = makeRequest();
    const first = await storeGeneratedAsset(root, projectId, {request, data: new TextEncoder().encode('asset')});
    const regenerated = await storeGeneratedAsset(root, projectId, {
      request,
      data: new TextEncoder().encode('regenerated'),
      forceRegenerate: true,
    });

    expect(regenerated.id).toBe(first.id);
    expect(regenerated.cacheKey).toBe(first.cacheKey);
    expect(regenerated.contentHash).not.toBe(first.contentHash);
    expect(await readFile(assetFilePath(root, projectId, regenerated), 'utf8')).toBe('regenerated');
  });

  it('treats changed relevant lineage as a cache miss', async () => {
    const {root, projectId} = await makeTempProject();
    const firstRequest = makeRequest({lineage: [{kind: 'visualPrompt', identity: 'prompt-1'}]});
    const changedRequest = makeRequest({lineage: [{kind: 'visualPrompt', identity: 'prompt-2'}]});
    await storeGeneratedAsset(root, projectId, {request: firstRequest, data: new TextEncoder().encode('asset')});

    expect((await findCachedAsset(root, projectId, changedRequest)).hit).toBe(false);
  });

  it('does not treat an asset file without valid metadata as a cache hit', async () => {
    const {root, projectId} = await makeTempProject();
    const request = makeRequest();
    const assetId = createGeneratedAssetId(request);
    const assetPath = resolveProjectPath(root, projectId, `assets/${assetId}.png`);
    await writeFile(assetPath, 'asset', {encoding: 'utf8'}).catch(async () => {
      await import('node:fs/promises').then(({mkdir}) => mkdir(projectPaths(root, projectId).assets, {recursive: true}));
      await writeFile(assetPath, 'asset', {encoding: 'utf8'});
    });

    expect((await findCachedAsset(root, projectId, request)).hit).toBe(false);
  });

  it('keeps asset storage inside the project asset boundary', async () => {
    const {root, projectId} = await makeTempProject();
    const fakeAsset = {
      schemaVersion: 1,
      id: 'asset_x',
      kind: 'image',
      origin: 'generated',
      contentHash: 'hash',
      localPath: 'assets/../../outside.png',
      mimeType: 'image/png',
      cacheKey: 'cache',
      provenance: {provider: 'provider', model: 'model', generationParameters: {}},
      lineage: [],
    } as AssetRecord;

    expect(() => assetFilePath(root, projectId, fakeAsset)).toThrow('Project path escapes project boundary');
    expect(() => assetMetadataPath(root, projectId, fakeAsset)).toThrow('Project path escapes project boundary');
    expect(() => resolveProjectPath(root, projectId, 'assets/../../outside.png')).toThrow('Project path escapes project boundary');
  });

  it('uses CLI > project > user > environment > defaults precedence', () => {
    const config = resolveConfig({
      defaults: {projectRoot: 'defaults', defaultTemplate: 'defaults', defaultStyle: 'defaults', defaultRenderProfile: 'defaults', providers: {text: 'defaults'}},
      env: {projectRoot: 'env', defaultTemplate: 'env', providers: {text: 'env'}},
      user: {projectRoot: 'user', defaultTemplate: 'user', providers: {text: 'user'}},
      project: {projectRoot: 'project', template: 'project', providers: {text: 'project'}},
      cli: {projectRoot: 'cli', defaultTemplate: 'cli', providers: {text: 'cli'}},
    });
    expect(config.projectRoot).toBe('cli');
    expect(config.defaultTemplate).toBe('cli');
    expect(config.defaultStyle).toBe('defaults');
    expect(config.providers.text).toBe('cli');
  });

  it('models StageRun as an append-only lifecycle', () => {
    const projectId = 'project_x' as ProjectId;
    const started = startStageRun({projectId, stage: 'captionAlign', inputHash: 'input', attempt: 1, startedAt: '2026-08-15T00:00:00.000Z'});
    expect(started.type).toBe('started');
    expect(isStageRunRecord(started.run)).toBe(true);

    const succeeded = succeedStageRun({run: started.run, finishedAt: '2026-08-15T00:00:01.000Z', outputHash: 'output'});
    const completed = applyStageRunEvent(started.run, succeeded);
    expect(completed.status).toBe('succeeded');
    expect(completed.outputHash).toBe('output');
    expect(() => failStageRun({run: completed, finishedAt: '2026-08-15T00:00:02.000Z', errorCode: 'late'})).toThrow();
  });

  it('registers capabilities by capability kind, not provider brand', () => {
    const text = {kind: 'text' as const, providerId: 'fake-text', generate: async () => ({text: 'ok', metadata: {provider: 'fake', model: 'test', requestHash: 'x'}})};
    const registry = createCapabilityRegistry([text]);
    expect(registry.text?.providerId).toBe('fake-text');
    expect(() => createCapabilityRegistry([text, text])).toThrow('Duplicate capability registration');
  });
});
