import {describe, expect, it} from 'vitest';
import {createGeneratedAssetRecord} from '../domain/foundation/assets';
import {createStyle, createTemplate} from '../domain/templates/templates';
import {createTimeline} from '../domain/timeline/timeline';
import type {RenderProfile} from '../domain/templates/types';
import {resolveRenderSnapshot} from '../domain/snapshot/resolver';
import {createRendererInput} from './render-snapshot';

const asset = createGeneratedAssetRecord({
  request: {
    kind: 'image', provider: 'fake', model: 'image-model', generationParameters: {prompt: 'fixture'},
    lineage: [{kind: 'fixture', identity: 'asset-input'}], mimeType: 'image/png', extension: 'png', width: 1080, height: 1920,
  },
  contentHash: 'a'.repeat(64), localPath: 'assets/fixture.png',
});

const timeline = createTimeline({
  schemaVersion: 1, fps: 30, durationFrames: 30,
  tracks: [{schemaVersion: 1, kind: 'visual', order: 0, allowOverlap: false, clips: [{schemaVersion: 1, role: 'visual', startFrame: 0, durationFrames: 30, reference: {kind: 'asset', assetId: asset.id}}]}],
});
const profile: RenderProfile = {resolution: {width: 1080, height: 1920}, fps: 30, codec: 'h264', container: 'mp4'};

const snapshot = () => resolveRenderSnapshot({
  timeline,
  template: createTemplate({name: 'fixture', defaults: {colors: {background: '#000'}}}),
  style: createStyle({name: 'fixture', tokens: {colors: {foreground: '#fff'}}}),
  renderProfile: profile,
  assets: [asset],
  verifyAsset: () => true,
});

describe('WS6 renderer boundary', () => {
  it('accepts only a complete RenderSnapshot as renderer input', async () => {
    const resolved = await snapshot();
    expect(createRendererInput(resolved)).toBe(resolved);
  });

  it('does not contain provider, CLI, config, pipeline, or Remotion runtime imports', async () => {
    const fs = await import('node:fs/promises');
    const source = await fs.readFile(new URL('./render-snapshot.ts', import.meta.url), 'utf8');
    expect(source).toMatch(/RenderSnapshot/);
    expect(source).not.toMatch(/from ['\"](?:remotion|@remotion\//);
    expect(source).not.toMatch(/providers|cli|config|pipeline/);
  });
});
