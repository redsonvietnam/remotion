import {normalizeTypographyText} from '../typography/normalization';
import type {CaptionTiming} from '../foundation/types';

export const normalizeCaptionTiming = (
  timing: CaptionTiming,
): CaptionTiming => ({
  text: normalizeTypographyText(timing.text).trim(),
  startMs: timing.startMs,
  endMs: timing.endMs,
});

export const normalizeCaptionTimings = (
  timings: readonly CaptionTiming[],
): readonly CaptionTiming[] =>
  timings.map(normalizeCaptionTiming);