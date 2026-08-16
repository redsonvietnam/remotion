import {describe, expect, it} from 'vitest';

import {createCaptionAssetRecord} from './asset';
import type {CaptionTrack} from './types';

const track: CaptionTrack = {
  language: 'vi',
  timings: [
    {
      text: 'Xin chào',
      startMs: 0,
      endMs: 1000,
    },
  ],
};

describe('caption asset persistence', () => {
  it('creates deterministic AssetRecord for identical CaptionTrack', () => {
    const first = createCaptionAssetRecord({
      track,
      localPath: 'assets/caption.json',
    });

    const second = createCaptionAssetRecord({
      track,
      localPath: 'assets/caption.json',
    });

    expect(first.id).toBe(second.id);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.cacheKey).toBe(second.cacheKey);
  });

  it('preserves caption provenance and lineage', () => {
    const asset = createCaptionAssetRecord({
      track,
      localPath: 'assets/caption.json',
    });

    expect(asset.provenance?.provider).toBe('captionAlign');
    expect(asset.lineage).toHaveLength(1);
    expect(asset.lineage[0].kind).toBe('captionTrack');
  });
});