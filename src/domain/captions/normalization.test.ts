import {describe, expect, it} from 'vitest';

import {normalizeCaptionTiming, normalizeCaptionTimings} from './normalization';

describe('caption normalization', () => {
  it('trims caption text while applying typography normalization', () => {
    const result = normalizeCaptionTiming({
      text: '  Xin chào  ',
      startMs: 0,
      endMs: 1000,
    });

    expect(result.text).toBe('Xin chào');
    expect(result.startMs).toBe(0);
    expect(result.endMs).toBe(1000);
  });

  it('applies NFC typography normalization to caption text', () => {
    const result = normalizeCaptionTiming({
      text: 'Xin cha\u0300o',
      startMs: 0,
      endMs: 1000,
    });

    expect(result.text).toBe('Xin chào');
  });

  it('normalizes all timings deterministically', () => {
    const first = normalizeCaptionTimings([
      {text: '  Xin chào  ', startMs: 0, endMs: 1000},
      {text: 'Việt Nam', startMs: 1000, endMs: 2000},
    ]);
    const second = normalizeCaptionTimings([
      {text: '  Xin chào  ', startMs: 0, endMs: 1000},
      {text: 'Việt Nam', startMs: 1000, endMs: 2000},
    ]);

    expect(first).toEqual([
      {text: 'Xin chào', startMs: 0, endMs: 1000},
      {text: 'Việt Nam', startMs: 1000, endMs: 2000},
    ]);
    expect(second).toEqual(first);
  });
});