import type {
  CaptionAlignmentRequest,
  CaptionAlignmentResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  SpeechSynthesisRequest,
  SpeechSynthesisResult,
  TextGenerationRequest,
  TextGenerationResult,
} from './types';

export interface TextGenerationCapability {
  readonly kind: 'text';
  readonly providerId: string;
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

export interface ImageGenerationCapability {
  readonly kind: 'image';
  readonly providerId: string;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export interface SpeechSynthesisCapability {
  readonly kind: 'speech';
  readonly providerId: string;
  synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult>;
}

export interface CaptionAlignmentCapability {
  readonly kind: 'captionAlignment';
  readonly providerId: string;
  align(request: CaptionAlignmentRequest): Promise<CaptionAlignmentResult>;
}

export type Capability =
  | TextGenerationCapability
  | ImageGenerationCapability
  | SpeechSynthesisCapability
  | CaptionAlignmentCapability;

export type CapabilityRegistry = {
  readonly text?: TextGenerationCapability;
  readonly image?: ImageGenerationCapability;
  readonly speech?: SpeechSynthesisCapability;
  readonly captionAlignment?: CaptionAlignmentCapability;
};

export const createCapabilityRegistry = (
  capabilities: readonly Capability[],
): CapabilityRegistry => {
  const registry: CapabilityRegistry = {};
  for (const capability of capabilities) {
    if (capability.kind in registry) {
      throw new Error(`Duplicate capability registration: ${capability.kind}`);
    }
    Object.assign(registry, {[capability.kind]: capability});
  }
  return registry;
};
