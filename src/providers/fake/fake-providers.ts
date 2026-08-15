import {deterministicId, hashValue} from '../../domain/foundation/ids';
import type {
  CaptionAlignmentCapability,
  CaptionAlignmentRequest,
  CaptionAlignmentResult,
  ImageGenerationCapability,
  ImageGenerationRequest,
  ImageGenerationResult,
  SpeechSynthesisCapability,
  SpeechSynthesisRequest,
  SpeechSynthesisResult,
  TextGenerationCapability,
  TextGenerationRequest,
  TextGenerationResult,
} from '../../domain/foundation';

export class RetryableFakeProviderError extends Error {
  readonly retryable = true;

  constructor(readonly errorCode: string, message: string) {
    super(message);
    this.name = 'RetryableFakeProviderError';
  }
}

export const createFakeTextProvider = (): TextGenerationCapability => ({
  kind: 'text',
  providerId: 'fake-text-v1',
  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    return {
      text: `FAKE TEXT: ${request.prompt}`,
      metadata: {
        provider: 'fake',
        model: 'text-v1',
        requestHash: hashValue(request),
      },
    };
  },
});

export const createFakeImageProvider = (): ImageGenerationCapability => ({
  kind: 'image',
  providerId: 'fake-image-v1',
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const identity = deterministicId('fake-image', request);
    return {
      localPath: `fixtures/fake-assets/${identity}.png`,
      contentHash: hashValue({identity, request}),
      width: request.width,
      height: request.height,
      metadata: {
        provider: 'fake',
        model: 'image-v1',
        requestHash: hashValue(request),
      },
    };
  },
});

export const createFakeSpeechProvider = (): SpeechSynthesisCapability => ({
  kind: 'speech',
  providerId: 'fake-speech-v1',
  async synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult> {
    const identity = deterministicId('fake-speech', request);
    const words = request.text.trim() ? request.text.trim().split(/\s+/u) : [];
    const durationMs = words.length * 500;
    return {
      localPath: `fixtures/fake-audio/${identity}.wav`,
      durationMs,
      metadata: {
        provider: 'fake',
        model: 'speech-v1',
        requestHash: hashValue(request),
      },
    };
  },
});

export const createFakeCaptionAlignmentProvider = (options: {readonly fail?: boolean} = {}): CaptionAlignmentCapability => ({
  kind: 'captionAlignment',
  providerId: 'fake-caption-alignment-v1',
  async align(request: CaptionAlignmentRequest): Promise<CaptionAlignmentResult> {
    if (options.fail) {
      throw new RetryableFakeProviderError(
        'CAPTION_ALIGNMENT_UNAVAILABLE',
        'Fake caption alignment was configured to fail.',
      );
    }

    const words = request.transcript.trim() ? request.transcript.trim().split(/\s+/u) : [];
    const stepMs = 500;
    return {
      timings: words.map((word, index) => ({
        text: word,
        startMs: index * stepMs,
        endMs: (index + 1) * stepMs,
      })),
      metadata: {
        provider: 'fake',
        model: 'caption-alignment-v1',
        requestHash: hashValue(request),
      },
    };
  },
});

export const createFakeCapabilityRegistry = () => [
  createFakeTextProvider(),
  createFakeImageProvider(),
  createFakeSpeechProvider(),
  createFakeCaptionAlignmentProvider(),
] as const;
