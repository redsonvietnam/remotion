import type {CaptionTrack} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidTiming = (value: unknown): boolean =>
  isRecord(value) &&
  isNonEmptyString(value.text) &&
  typeof value.startMs === 'number' &&
  typeof value.endMs === 'number' &&
  Number.isFinite(value.startMs) &&
  Number.isFinite(value.endMs) &&
  value.startMs >= 0 &&
  value.endMs > value.startMs;

export const isValidCaptionTrack = (
  value: unknown,
): value is CaptionTrack => {
  if (!isRecord(value)) return false;

  if (!isNonEmptyString(value.language)) return false;

  if (!Array.isArray(value.timings)) return false;

  for (let index = 0; index < value.timings.length; index += 1) {
    const timing = value.timings[index];

    if (!isValidTiming(timing)) return false;

    const previous = value.timings[index - 1];

    if (previous && timing.startMs < previous.endMs) {
      return false;
    }
  }

  return true;
};