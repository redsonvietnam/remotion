import {describe, expect, it} from 'vitest';

import {alignCaptions} from './caption-align';
import type {SpeechSynthesisResult} from '../foundation/types';

const speechWithWordTimings: SpeechSynthesisResult = {
  localPath: 'audio/test.wav',
  durationMs: 2000,
  wordTimings: [
    {
      word: 'Xin',
      startMs: 0,
      endMs: 500,
    },
    {
      word: 'chào',
      startMs: 500,
      endMs: 1000,
    },
  ],
  metadata: {
    provider: 'test',
    model: 'fake',
    requestHash: 'hash',
    voice: 'test',
    language: 'vi',
    synthesisParameters: {},
  },
};

describe('caption alignment', () => {
  it('uses speech word timings when available', async () => {
    const result = await alignCaptions({
      speech: speechWithWordTimings,
      transcript: 'Xin chào',
      language: 'vi',
    });

    expect(result.language).toBe('vi');
    expect(result.timings).toHaveLength(2);
    expect(result.timings[0].text).toBe('Xin');
    expect(result.timings[1].text).toBe('chào');
  });

  it('uses caption alignment capability when speech timings are unavailable', async () => {
    const result = await alignCaptions({
      speech: {
        ...speechWithWordTimings,
        wordTimings: undefined,
      },
      transcript: 'Xin chào',
      language: 'vi',
      captionAlignment: {
        kind: 'captionAlignment',
        providerId: 'fake-aligner',
        async align() {
          return {
            timings: [
              {
                text: 'Xin chào',
                startMs: 0,
                endMs: 1000,
              },
            ],
            metadata: {
              provider: 'fake-aligner',
              model: 'fake',
              requestHash: 'hash',
            },
          };
        },
      },
    });

    expect(result.timings).toHaveLength(1);
    expect(result.timings[0].text).toBe('Xin chào');
  });

  it('fails when alignment capability is missing', async () => {
    await expect(
      alignCaptions({
        speech: {
          ...speechWithWordTimings,
          wordTimings: undefined,
        },
        transcript: 'Xin chào',
        language: 'vi',
      }),
    ).rejects.toThrow('Caption alignment capability unavailable');
  });
});