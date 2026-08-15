export type ProjectId = string & {readonly __brand: 'ProjectId'};
export type StageRunId = string & {readonly __brand: 'StageRunId'};
export type AssetId = string & {readonly __brand: 'AssetId'};

export type ProjectRecord = {
  readonly schemaVersion: 1;
  readonly id: ProjectId;
  readonly name: string;
  readonly createdAt: string;
};

export type ProjectConfig = {
  readonly template?: string;
  readonly style?: string;
  readonly renderProfile?: string;
  readonly textProvider?: string;
  readonly imageProvider?: string;
  readonly speechProvider?: string;
  readonly captionAlignmentProvider?: string;
};

export type VideoFactoryConfig = {
  readonly projectRoot: string;
  readonly defaultTemplate: string;
  readonly defaultStyle: string;
  readonly defaultRenderProfile: string;
  readonly providers: {
    readonly text?: string;
    readonly image?: string;
    readonly speech?: string;
    readonly captionAlignment?: string;
  };
};

export type StageName =
  | 'content'
  | 'timeline'
  | 'assetResolve'
  | 'assetGenerate'
  | 'tts'
  | 'captionAlign'
  | 'snapshot'
  | 'render';

export type StageRunStatus = 'running' | 'succeeded' | 'failed';

export type StageRunRecord = {
  readonly schemaVersion: 1;
  readonly id: StageRunId;
  readonly projectId: ProjectId;
  readonly stage: StageName;
  readonly status: StageRunStatus;
  readonly attempt: number;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly inputHash: string;
  readonly outputHash?: string;
  readonly errorCode?: string;
  readonly dependencyRunIds: readonly StageRunId[];
};

export type StageRunEvent =
  | {
      readonly type: 'started';
      readonly run: StageRunRecord;
    }
  | {
      readonly type: 'succeeded';
      readonly runId: StageRunId;
      readonly finishedAt: string;
      readonly outputHash?: string;
    }
  | {
      readonly type: 'failed';
      readonly runId: StageRunId;
      readonly finishedAt: string;
      readonly errorCode: string;
    };

export type CapabilityKind = 'text' | 'image' | 'speech' | 'captionAlignment';

export type CapabilityProviderMetadata = {
  readonly provider: string;
  readonly model: string;
  readonly requestHash: string;
};

export type TextGenerationRequest = {
  readonly prompt: string;
  readonly language?: string;
};

export type TextGenerationResult = {
  readonly text: string;
  readonly metadata: CapabilityProviderMetadata;
};

export type ImageGenerationRequest = {
  readonly prompt: string;
  readonly width: number;
  readonly height: number;
};

export type ImageGenerationResult = {
  readonly localPath: string;
  readonly contentHash: string;
  readonly width: number;
  readonly height: number;
  readonly metadata: CapabilityProviderMetadata;
};

export type SpeechSynthesisRequest = {
  readonly text: string;
  readonly language: string;
  readonly voice: string;
};

export type SpeechSynthesisProviderMetadata = CapabilityProviderMetadata & {
  readonly voice: string;
  readonly language: string;
  readonly synthesisParameters: Readonly<Record<string, unknown>>;
};

export type SpeechWordTiming = {
  readonly word: string;
  readonly startMs: number;
  readonly endMs: number;
};

export type SpeechSynthesisResult = {
  readonly localPath: string;
  readonly durationMs: number;
  readonly wordTimings?: readonly SpeechWordTiming[];
  readonly metadata: SpeechSynthesisProviderMetadata;
};

export type CaptionAlignmentRequest = {
  readonly audioPath: string;
  readonly transcript: string;
  readonly language: string;
};

export type CaptionTiming = {
  readonly text: string;
  readonly startMs: number;
  readonly endMs: number;
};

export type CaptionAlignmentResult = {
  readonly timings: readonly CaptionTiming[];
  readonly metadata: CapabilityProviderMetadata;
};

export type AssetKind = string;
export type AssetOrigin = 'generated' | 'source';

export type AssetLineageDependency = {
  readonly kind: string;
  readonly identity: string;
};

export type AssetGenerationProvenance = {
  readonly provider: string;
  readonly model: string;
  readonly generationParameters: Readonly<Record<string, unknown>>;
};

export type AssetRecord = {
  readonly schemaVersion: 1;
  readonly id: AssetId;
  readonly kind: AssetKind;
  readonly origin: AssetOrigin;
  readonly contentHash: string;
  readonly width?: number;
  readonly height?: number;
  readonly localPath: string;
  readonly mimeType: string;
  readonly cacheKey?: string;
  readonly provenance?: AssetGenerationProvenance;
  readonly lineage: readonly AssetLineageDependency[];
};
