import type {CaptionTiming} from '../foundation/types';

export type CaptionTrack = {
  readonly language: string;
  readonly timings: readonly CaptionTiming[];
};