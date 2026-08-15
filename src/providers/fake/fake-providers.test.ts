import {describe, expect, it} from 'vitest';
import {
  createCapabilityRegistry,
  type ImageGenerationRequest,
  type SpeechSynthesisRequest,
  type CaptionAlignmentRequest,
  type TextGenerationRequest,
} from '../../domain/foundation';
import {
  createFakeCaptionAlignmentProvider,
  createFakeCapabilityRegistry,
  createFakeImageProvider,
  createFakeSpeechProvider,
  createFakeTextProvider,
  RetryableFakeProviderError,
} from './index';

describe('fake providers', () => {
  it('registers all deterministic fake capabilities', () => {
    const registry = createCapabilityRegistry(createFakeCapabilityRegistry());
    expect(registry.text?.providerId).toBe('fake-text-v1');
    expect(registry.image?.providerId).toBe('fake-image-v1');
    expect(registry.speech?.providerId).toBe('fake-speech-v1');
    expect(registry.captionAlignment?.providerId).toBe('fake-caption-alignment-v1');
  });

  it('produces deterministic text output and provenance', async () => {
    const provider = createFakeTextProvider();
    const request: TextGenerationRequest = {prompt: 'Vietnamese fixture', language: 'vi'};
    await expect(provider.generate(request)).resolves.toEqual(await provider.generate(request));
  });

  it('produces deterministic local image references', async () => {
    const provider = createFakeImageProvider();
    const request: ImageGenerationRequest = {prompt: 'A deterministic test image', width: 1080, height: 1920};
    const first = await provider.generate(request);
    const second = await provider.generate(request);
    expect(second).toEqual(first);
    expect(first.localPath).toMatch(/^fixtures\/fake-assets\/fake-image_[0-9a-f]{24}\.png$/u);
  });

  it('produces deterministic speech output without external credentials', async () => {
    const provider = createFakeSpeechProvider();
    const request: SpeechSynthesisRequest = {text: 'Xin chào Việt Nam', language: 'vi', voice: 'fake-vi'};
    const result = await provider.synthesize(request);
    expect(result).toEqual(await provider.synthesize(request));
    expect(result.durationMs).toBe(1500);
    expect(result.localPath).toMatch(/^fixtures\/fake-audio\/fake-speech_[0-9a-f]{24}\.wav$/u);
  });

  it('produces deterministic caption timings', async () => {
    const provider = createFakeCaptionAlignmentProvider();
    const request: CaptionAlignmentRequest = {
      audioPath: 'fixtures/fake-audio/example.wav',
      transcript: 'Việt Nam chuyển đổi số',
      language: 'vi',
    };
    const first = await provider.align(request);
    expect(await provider.align(request)).toEqual(first);
    expect(first.timings).toEqual([
      {text: 'Việt', startMs: 0, endMs: 500},
      {text: 'Nam', startMs: 500, endMs: 1000},
      {text: 'chuyển', startMs: 1000, endMs: 1500},
      {text: 'đổi', startMs: 1500, endMs: 2000},
      {text: 'số', startMs: 2000, endMs: 2500},
    ]);
  });

  it('represents caption alignment failure as retryable', async () => {
    const provider = createFakeCaptionAlignmentProvider({fail: true});
    const request: CaptionAlignmentRequest = {audioPath: 'audio.wav', transcript: 'Việt Nam', language: 'vi'};
    await expect(provider.align(request)).rejects.toMatchObject({
      name: 'RetryableFakeProviderError',
      errorCode: 'CAPTION_ALIGNMENT_UNAVAILABLE',
      retryable: true,
    });
    try {
      await provider.align(request);
    } catch (error) {
      expect(error).toBeInstanceOf(RetryableFakeProviderError);
    }
  });
});
