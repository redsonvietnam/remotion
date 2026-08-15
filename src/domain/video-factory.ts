export const videoFactorySchemaVersion = 1 as const;

export type ContentRequest =
  | {
      kind: 'topic';
      topic: string;
    }
  | {
      kind: 'url';
      url: string;
    }
  | {
      kind: 'script';
      script: string;
    };

export type VideoFormat = {
  width: number;
  height: number;
  fps: number;
};

export type ScenePlan = {
  id: string;
  narration: string;
  visualPrompt?: string;
  durationInSeconds?: number;
  assetIds?: string[];
};

export type VideoPlan = {
  schemaVersion: typeof videoFactorySchemaVersion;
  title: string;
  language: 'vi' | 'en' | string;
  scenes: ScenePlan[];
  templateId: string;
  styleId: string;
  format: VideoFormat;
};

export type AssetKind = 'image' | 'audio' | 'video' | 'font';

export type AssetRequest = {
  id: string;
  kind: AssetKind;
  provider?: string;
  model?: string;
  inputHash: string;
  sourceDescription: string;
};

export type AssetManifestEntry = AssetRequest & {
  status: 'pending' | 'ready' | 'failed';
  path?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
};

export type CaptionWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type CaptionSegment = {
  text: string;
  startMs: number;
  endMs: number;
  words?: CaptionWord[];
};

export type CaptionTrack = {
  language: string;
  segments: CaptionSegment[];
};

export type ProjectManifest = {
  schemaVersion: typeof videoFactorySchemaVersion;
  projectId: string;
  createdAt: string;
  request: ContentRequest;
  plan: VideoPlan;
  assets: AssetManifestEntry[];
  captions?: CaptionTrack;
};

export type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  supportedFormats: VideoFormat[];
};

export type StyleDefinition = {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  captionStyleId: string;
};
