import type {
  CaptionAlignmentRequest,
  CaptionAlignmentResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  ProjectConfig,
  ProjectRecord,
  SpeechSynthesisRequest,
  SpeechSynthesisResult,
  StageRunRecord,
  TextGenerationRequest,
  TextGenerationResult,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const PROJECT_RECORD_KEYS = ['schemaVersion', 'id', 'name', 'createdAt'] as const;
const STAGE_RUN_RECORD_KEYS = [
  'schemaVersion',
  'id',
  'projectId',
  'stage',
  'status',
  'attempt',
  'startedAt',
  'finishedAt',
  'inputHash',
  'outputHash',
  'errorCode',
  'dependencyRunIds',
] as const;

const isProjectConfig = (value: unknown): value is ProjectConfig => {
  if (!isRecord(value)) return false;
  return [
    'template',
    'style',
    'renderProfile',
    'textProvider',
    'imageProvider',
    'speechProvider',
    'captionAlignmentProvider',
  ].every((key) => value[key] === undefined || isNonEmptyString(value[key]));
};

export const isProjectRecord = (value: unknown): value is ProjectRecord =>
  isRecord(value) &&
  hasExactKeys(value, PROJECT_RECORD_KEYS) &&
  value.schemaVersion === 1 &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.name) &&
  isIsoDate(value.createdAt);

export const parseProjectRecord = (value: unknown): ProjectRecord => {
  if (!isProjectRecord(value)) throw new Error('Invalid persisted project record');
  return value;
};

export const isStageRunRecord = (value: unknown): value is StageRunRecord => {
  if (!isRecord(value) || !hasExactKeys(value, STAGE_RUN_RECORD_KEYS)) return false;
  const validStatus = value.status === 'running' || value.status === 'succeeded' || value.status === 'failed';
  const validStage = [
    'content',
    'timeline',
    'assetResolve',
    'assetGenerate',
    'tts',
    'captionAlign',
    'snapshot',
    'render',
  ].includes(String(value.stage));
  const baseValid =
    value.schemaVersion === 1 &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.projectId) &&
    validStage &&
    validStatus &&
    isPositiveInteger(value.attempt) &&
    isIsoDate(value.startedAt) &&
    (value.finishedAt === undefined || isIsoDate(value.finishedAt)) &&
    isNonEmptyString(value.inputHash) &&
    (value.outputHash === undefined || isNonEmptyString(value.outputHash)) &&
    (value.errorCode === undefined || isNonEmptyString(value.errorCode)) &&
    Array.isArray(value.dependencyRunIds) &&
    value.dependencyRunIds.every(isNonEmptyString);

  if (!baseValid) return false;

  if (value.status === 'running') {
    return value.finishedAt === undefined && value.outputHash === undefined && value.errorCode === undefined;
  }

  if (value.status === 'succeeded') {
    return value.finishedAt !== undefined && value.errorCode === undefined;
  }

  return value.finishedAt !== undefined && value.errorCode !== undefined && value.outputHash === undefined;
};

export const parseStageRunRecord = (value: unknown): StageRunRecord => {
  if (!isStageRunRecord(value)) throw new Error('Invalid persisted StageRun record');
  return value;
};

export const isProjectConfigValue = isProjectConfig;

export const isTextGenerationRequest = (value: unknown): value is TextGenerationRequest =>
  isRecord(value) && isNonEmptyString(value.prompt) && (value.language === undefined || isNonEmptyString(value.language));

export const isTextGenerationResult = (value: unknown): value is TextGenerationResult =>
  isRecord(value) && isNonEmptyString(value.text) && isCapabilityMetadata(value.metadata);

export const isImageGenerationRequest = (value: unknown): value is ImageGenerationRequest =>
  isRecord(value) && isNonEmptyString(value.prompt) && isPositiveInteger(value.width) && isPositiveInteger(value.height);

export const isImageGenerationResult = (value: unknown): value is ImageGenerationResult =>
  isRecord(value) &&
  isNonEmptyString(value.localPath) &&
  isNonEmptyString(value.contentHash) &&
  isPositiveInteger(value.width) &&
  isPositiveInteger(value.height) &&
  isCapabilityMetadata(value.metadata);

export const isSpeechSynthesisRequest = (value: unknown): value is SpeechSynthesisRequest =>
  isRecord(value) &&
  isNonEmptyString(value.text) &&
  isNonEmptyString(value.language) &&
  isNonEmptyString(value.voice);

export const isSpeechSynthesisResult = (value: unknown): value is SpeechSynthesisResult =>
  isRecord(value) &&
  isNonEmptyString(value.localPath) &&
  typeof value.durationMs === 'number' &&
  Number.isFinite(value.durationMs) &&
  value.durationMs > 0 &&
  (value.wordTimings === undefined ||
    (Array.isArray(value.wordTimings) &&
      value.wordTimings.every(
        (timing) =>
          isRecord(timing) &&
          isNonEmptyString(timing.word) &&
          typeof timing.startMs === 'number' &&
          typeof timing.endMs === 'number' &&
          timing.startMs >= 0 &&
          timing.endMs > timing.startMs,
      ))) &&
  isCapabilityMetadata(value.metadata);

export const isCaptionAlignmentRequest = (value: unknown): value is CaptionAlignmentRequest =>
  isRecord(value) &&
  isNonEmptyString(value.audioPath) &&
  isNonEmptyString(value.transcript) &&
  isNonEmptyString(value.language);

export const isCaptionAlignmentResult = (value: unknown): value is CaptionAlignmentResult =>
  isRecord(value) &&
  Array.isArray(value.timings) &&
  value.timings.every(
    (timing) =>
      isRecord(timing) &&
      isNonEmptyString(timing.text) &&
      typeof timing.startMs === 'number' &&
      typeof timing.endMs === 'number' &&
      timing.startMs >= 0 &&
      timing.endMs > timing.startMs,
  ) &&
  isCapabilityMetadata(value.metadata);

const isCapabilityMetadata = (value: unknown): boolean =>
  isRecord(value) &&
  isNonEmptyString(value.provider) &&
  isNonEmptyString(value.model) &&
  isNonEmptyString(value.requestHash);
