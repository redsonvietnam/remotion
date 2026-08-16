import type {CaptionTrack} from './types';
import {normalizeCaptionTimings} from './normalization';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const isValidCaptionTrack = (
  value: unknown,
): value is CaptionTrack => {
  if (typeof value !== 'object' || value === null) return false;

  const track = value as Partial<CaptionTrack>;

  if (!isNonEmptyString(track.language)) return false;

  if (!Array.isArray(track.timings)) return false;

  const timings = normalizeCaptionTimings(track.timings);

  for (let index = 0; index < timings.length; index += 1) {
    const timing = timings[index];

    if (!isNonEmptyString(timing.text)) return false;

    if (!Number.isFinite(timing.startMs)) return false;
    if (!Number.isFinite(timing.endMs)) return false;

    if (timing.startMs < 0) return false;
    if (timing.endMs <= timing.startMs) return false;

    const previous = timings[index - 1];

    if (previous && timing.startMs < previous.endMs) {
      return false;
    }
  }

  return true;
};