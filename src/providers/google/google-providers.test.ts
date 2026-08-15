import {describe, expect, it, vi} from 'vitest';
import {sha256} from '../../domain/foundation/ids';
import {GoogleProviderError, stageRunErrorCode} from './client';
import {loadGoogleProviderConfig, redactGoogleConfig} from './config';
import {createGoogleImageProvider, createGoogleSpeechProvider, createGoogleTextProvider} from './google-providers';

const response = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

describe('Google providers', () => {
  const config = loadGoogleProviderConfig({
    GEMINI_API_KEY: 'secret-test-key',
    GEMINI_TEXT_MODEL: 'text-test',
    GEMINI_IMAGE_MODEL: 'image-test',
    GEMINI_SPEECH_MODEL: 'speech-test',
    VIDEO_FACTORY_PROJECT_ROOT: '/tmp/video-factory-test',
    GEMINI_ASSET_DIRECTORY: 'assets/google',
    GEMINI_API_BASE_URL: 'https://example.test/v1beta',
  });

  const png = (): Uint8Array => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    new DataView(bytes.buffer).setUint32(16, 1080);
    new DataView(bytes.buffer).setUint32(20, 1920);
    return bytes;
  };

  it('loads configuration from environment without changing persisted domain config', () => {
    expect(config.apiKey).toBe('secret-test-key');
    expect(redactGoogleConfig(config).apiKey).not.toContain('secret-test-key');
  });

  it('generates text through the capability boundary', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({candidates: [{content: {parts: [{text: 'Xin chào Việt Nam'}]}}]}));
    const result = await createGoogleTextProvider(config, fetchImpl).generate({prompt: 'Say hello', language: 'vi'});
    expect(result.text).toBe('Xin chào Việt Nam');
    expect(result.metadata.provider).toBe('google');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/v1beta/models/text-test:generateContent',
      expect.objectContaining({headers: expect.objectContaining({'x-goog-api-key': 'secret-test-key'})}),
    );
  });

  it('persists returned image bytes with content integrity', async () => {
    const imageBytes = png();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({candidates: [{content: {parts: [{inlineData: {data: Buffer.from(imageBytes).toString('base64'), mimeType: 'image/png'}}]}}]}));
    const result = await createGoogleImageProvider(config, fetchImpl).generate({prompt: 'test', width: 1080, height: 1920});
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
    expect(result.contentHash).toBe(sha256(imageBytes));
    expect(result.localPath).toMatch(/^assets\/google\/google-image_[0-9a-f]{24}\.png$/u);
  });

  it('preserves Google speech provenance and validates the supported PCM contract', async () => {
    const pcm = new Uint8Array(48000);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({candidates: [{content: {parts: [{inlineData: {data: Buffer.from(pcm).toString('base64'), mimeType: 'audio/L16;rate=24000'}}]}}]}));
    const result = await createGoogleSpeechProvider(config, fetchImpl).synthesize({text: 'Xin chào', language: 'vi', voice: 'Kore'});
    expect(result.durationMs).toBe(1000);
    expect(result.localPath).toMatch(/^assets\/google\/google-speech_[0-9a-f]{24}\.wav$/u);
    expect(result.metadata.provider).toBe('google');
    expect(result.metadata.model).toBe('speech-test');
    expect(result.metadata.voice).toBe('Kore');
    expect(result.metadata.language).toBe('vi');
    expect(result.metadata.synthesisParameters).toEqual({
      responseModality: 'AUDIO',
      voice: 'Kore',
      language: 'vi',
      audioMimeType: 'audio/L16',
      sampleRate: 24000,
      channels: 1,
      bitDepth: 16,
    });
  });

  it('rejects unsupported Google speech audio formats before duration calculation', async () => {
    const pcm = new Uint8Array(48000);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({candidates: [{content: {parts: [{inlineData: {data: Buffer.from(pcm).toString('base64'), mimeType: 'audio/L16;rate=16000'}}]}}]}));
    await expect(createGoogleSpeechProvider(config, fetchImpl).synthesize({text: 'Xin chào', language: 'vi', voice: 'Kore'})).rejects.toThrow(
      'unsupported PCM format; expected audio/L16 at 24000 Hz',
    );
  });

  it('rejects truncated supported PCM output', async () => {
    const pcm = new Uint8Array(3);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({candidates: [{content: {parts: [{inlineData: {data: Buffer.from(pcm).toString('base64'), mimeType: 'audio/L16;rate=24000'}}]}}]}));
    await expect(createGoogleSpeechProvider(config, fetchImpl).synthesize({text: 'Xin chào', language: 'vi', voice: 'Kore'})).rejects.toThrow(
      'truncated PCM data',
    );
  });

  it('maps provider failures to explicit retry-aware stage codes without exposing response bodies', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({error: {message: 'secret-test-key must not leak'}}, 429));
    const provider = createGoogleTextProvider(config, fetchImpl);
    await expect(provider.generate({prompt: 'test'})).rejects.toMatchObject({
      code: 'GOOGLE_RATE_LIMITED',
      retryable: true,
    });
    try {
      await provider.generate({prompt: 'test'});
    } catch (error) {
      expect(error).toBeInstanceOf(GoogleProviderError);
      expect((error as Error).message).not.toContain('secret-test-key');
      expect(stageRunErrorCode('text', error)).toBe('TEXT_GOOGLE_RATE_LIMITED');
    }
  });

  it('does not expose API keys through redaction helpers', () => {
    expect(redactGoogleConfig(config).apiKey).toBe('secr…-key');
  });
});
