import {describe, expect, it} from 'vitest';
import {defaultVideo} from '../data/default-video';
import {getVideoDurationInFrames, getVideoDurationInSeconds} from './timeline';

describe('video timeline', () => {
  it('calculates duration from intro, scenes, and outro', () => {
    expect(getVideoDurationInSeconds(defaultVideo)).toBe(21);
  });

  it('converts seconds to frames deterministically', () => {
    expect(getVideoDurationInFrames(defaultVideo, 30)).toBe(630);
  });

  it('keeps every scene addressable by a stable id', () => {
    const ids = defaultVideo.scenes.map((scene) => scene.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
