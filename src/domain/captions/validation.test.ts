import {describe, expect, it} from 'vitest';

import {isValidCaptionTrack} from './validation';

const validTrack = {
  language: 'vi',
  timings: [
    {text: 'Xin chào', startMs: 0, endMs: 1000},
    {text: 'Việt Nam', startMs: 1000, endMs: 2000},
  ],
};

describe('caption track validation', () => {
  it('accepts a valid caption track', () => {
    expect(isValidCaptionTrack(validTrack)).toBe(true);
  });

  it('rejects an invalid language', () => {
    expect(isValidCaptionTrack({...validTrack, language: ''})).toBe(false);
    expect(isValidCaptionTrack({...validTrack, language: '   '})).toBe(false);
    expect(isValidCaptionTrack({...validTrack, language: 42})).toBe(false);
  });

  it('rejects an empty caption text', () => {
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [{text: '', startMs: 0, endMs: 1000}],
      }),
    ).toBe(false);
  });

  it('rejects a whitespace-only caption text', () => {
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [{text: '   ', startMs: 0, endMs: 1000}],
      }),
    ).toBe(false);
  });

  it('rejects negative start timestamps', () => {
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [{text: 'A', startMs: -1, endMs: 1000}],
      }),
    ).toBe(false);
  });

  it('rejects end timestamps that do not exceed start', () => {
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [{text: 'A', startMs: 1000, endMs: 1000}],
      }),
    ).toBe(false);
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [{text: 'A', startMs: 1000, endMs: 500}],
      }),
    ).toBe(false);
  });

  it('rejects overlapping captions', () => {
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [
          {text: 'A', startMs: 0, endMs: 1000},
          {text: 'B', startMs: 500, endMs: 1200},
        ],
      }),
    ).toBe(false);
  });

  it('returns false instead of throwing for malformed timing entries', () => {
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [null],
      }),
    ).toBe(false);
    expect(
      isValidCaptionTrack({
        language: 'vi',
        timings: [{text: 7, startMs: 0, endMs: 1000}],
      }),
    ).toBe(false);
  });
});