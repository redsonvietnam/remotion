import {createTimeline, normalizeTimeline} from './timeline';
import type {Timeline, TimelineDraft} from './types';

/** WS4 uses integer frames as its sole runtime timing unit. */
export const secondsToFrames = (seconds: number, fps: number): number => {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('seconds must be finite and non-negative');
  if (!Number.isInteger(fps) || fps <= 0) throw new Error('fps must be a positive integer');
  return Math.round(seconds * fps);
};

/** Compilation establishes canonical ordering and deterministic runtime IDs. */
export const compileTimeline = (draft: TimelineDraft): Timeline => normalizeTimeline(createTimeline(draft));
