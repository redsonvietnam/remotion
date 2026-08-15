import {describe, expect, it} from 'vitest';
import {createGeneratedAssetRecord} from '../foundation/assets';
import {createStyle, createTemplate} from '../templates/templates';
import {createTimeline} from '../timeline/timeline';
import type {RenderProfile} from '../templates/types';
import {isRenderSnapshot} from './validation';
import {resolveRenderSnapshot, serializeRenderSnapshot} from './resolver';

const request = {
  kind: 'image', provider: 'fake', model: 'image-model', generationParameters: {prompt: 'Việt Nam', seed: 1},
  lineage: [{kind: 'visualPrompt', identity: 'prompt_1'}], mimeType: 'image/png', extension: 'png', width: 1080, height: 1920,
} as const;
const asset = createGeneratedAssetRecord({request, contentHash: 'a'.repeat(64), localPath: 'assets/asset-fixture.png'});
const template = createTemplate({name: 'fixture', defaults: {colors: {background: '#000000'}}});
const style = createStyle({name: 'fixture-style', tokens: {colors: {foreground: '#ffffff'}}});
const renderProfile: RenderProfile = {resolution: {width: 1080, height: 1920}, fps: 30, codec: 'h264', container: 'mp4'};
const timeline = createTimeline({
  schemaVersion: 1, fps: 30, durationFrames: 30,
  tracks: [{schemaVersion: 1, kind: 'visual', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'visual', startFrame: 0, durationFrames: 30, reference: {kind: 'asset', assetId: asset.id}}]}],
});

const resolve = (overrides: Partial<Parameters<typeof resolveRenderSnapshot>[0]> = {}) =>
  resolveRenderSnapshot({timeline, template, style, renderProfile, assets: [asset], verifyAsset: () => true, ...overrides});

describe('WS6 RenderSnapshot', () => {
  it('creates a complete valid immutable snapshot', async () => {
    const snapshot = await resolve();
    expect(isRenderSnapshot(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.timeline)).toBe(true);
    expect(Object.isFrozen(snapshot.manifest)).toBe(true);
    expect(snapshot.timeline.tracks[0]?.clips[0]?.reference.kind).toBe('asset');
    expect(() => {
      (snapshot.timeline as {durationFrames: number}).durationFrames = 99;
    }).toThrow();
  });

  it('rejects unresolved asset, content, and renderData references', async () => {
    const missingAssetTimeline = createTimeline({schemaVersion: 1, fps: 30, durationFrames: 30, tracks: [{schemaVersion: 1, kind: 'visual', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'visual', startFrame: 0, durationFrames: 30, reference: {kind: 'asset', assetId: 'asset_aaaaaaaaaaaaaaaaaaaaaaaa' as typeof asset.id}}]}]});
    await expect(resolve({timeline: missingAssetTimeline})).rejects.toThrow('Unresolved asset reference');
    const contentTimeline = createTimeline({schemaVersion: 1, fps: 30, durationFrames: 30, tracks: [{schemaVersion: 1, kind: 'text', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'text', startFrame: 0, durationFrames: 30, reference: {kind: 'content', identity: 'missing'}}]}]});
    await expect(resolve({timeline: contentTimeline})).rejects.toThrow('Unresolved content reference');
    const renderDataTimeline = createTimeline({schemaVersion: 1, fps: 30, durationFrames: 30, tracks: [{schemaVersion: 1, kind: 'text', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'text', startFrame: 0, durationFrames: 30, reference: {kind: 'renderData', identity: 'missing'}}]}]});
    await expect(resolve({timeline: renderDataTimeline})).rejects.toThrow('Unresolved renderData reference');
  });

  it('rejects missing and integrity-invalid assets', async () => {
    const missing = createTimeline({schemaVersion: 1, fps: 30, durationFrames: 30, tracks: [{schemaVersion: 1, kind: 'visual', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'visual', startFrame: 0, durationFrames: 30, reference: {kind: 'asset', assetId: 'asset_bbbbbbbbbbbbbbbbbbbbbbbb' as typeof asset.id}}]}]});
    await expect(resolve({timeline: missing})).rejects.toThrow('Unresolved asset reference');
    await expect(resolve({verifyAsset: () => false})).rejects.toThrow('Asset integrity check failed');
  });

  it('produces deterministic identity for equivalent complete inputs', async () => {
    const first = await resolve();
    const second = await resolve({assets: [asset]});
    expect(second.id).toBe(first.id);
    expect(serializeRenderSnapshot(second)).toBe(serializeRenderSnapshot(first));
  });

  it('changes identity for material snapshot inputs', async () => {
    const first = await resolve();
    const changedProfile = await resolve({renderProfile: {...renderProfile, fps: 60}});
    const changedAsset = {...asset, contentHash: 'b'.repeat(64)};
    const changedAssetSnapshot = await resolve({assets: [changedAsset]});
    expect(changedProfile.id).not.toBe(first.id);
    expect(changedAssetSnapshot.id).not.toBe(first.id);
  });

  it('resolves equivalent object-key order identically', async () => {
    const contentTimeline = createTimeline({schemaVersion: 1, fps: 30, durationFrames: 30, tracks: [{schemaVersion: 1, kind: 'text', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'text', startFrame: 0, durationFrames: 30, reference: {kind: 'content', identity: 'content-1'}}]}]});
    const first = await resolve({timeline: contentTimeline, content: { 'content-1': {a: 1, b: 2} }});
    const second = await resolve({timeline: contentTimeline, content: { 'content-1': {b: 2, a: 1} }});
    expect(second.id).toBe(first.id);
  });

  it('rejects secrets and unsafe asset paths before snapshot creation', async () => {
    await expect(resolve({assets: [{...asset, localPath: '../outside.png'}]})).rejects.toThrow('Invalid project-relative asset path');
    await expect(resolve({assets: [{...asset, localPath: '/absolute.png'}]})).rejects.toThrow('Invalid project-relative asset path');
    await expect(resolve({template: {...template, apiKey: 'secret'} as never})).rejects.toThrow('Invalid TemplateDefinition');
    await expect(resolve({content: {safe: {apiKey: 'secret'}}})).rejects.toThrow('Secrets are not permitted');
  });
});
