import type {
  CaptionAlignmentCapability,
  SpeechSynthesisResult,
} from '../foundation/capabilities';
import type {
  CaptionAlignmentRequest,
  CaptionTiming,
} from '../foundation/types';
import type {CaptionTrack} from './types';
import {normalizeCaptionTimings} from './normalization';
import {isValidCaptionTrack} from './validation';

const fromSpeechWordTimings = (
  result: SpeechSynthesisResult,
): readonly CaptionTiming[] =>
  (result.wordTimings ?? []).map((word) => ({
    text: word.word,
    startMs: word.startMs,
    endMs: word.endMs,
  }));

export const alignCaptions = async ({
  speech,
  transcript,
  language,
  captionAlignment,
}: {
  readonly speech: SpeechSynthesisResult;
  readonly transcript: string;
  readonly language: string;
  readonly captionAlignment?: CaptionAlignmentCapability;
}): Promise<CaptionTrack> => {
  let timings: readonly CaptionTiming[];

  if (speech.wordTimings && speech.wordTimings.length > 0) {
    timings = fromSpeechWordTimings(speech);
  } else {
    if (!captionAlignment) {
      throw new Error('Caption alignment capability unavailable');
    }

    const request: CaptionAlignmentRequest = {
      audioPath: speech.localPath,
      transcript,
      language,
    };

    const result = await captionAlignment.align(request);

    timings = result.timings;
  }

  const track: CaptionTrack = {
    language,
    timings: normalizeCaptionTimings(timings),
  };

  if (!isValidCaptionTrack(track)) {
    throw new Error('Caption alignment produced invalid timings');
  }

  return track;
};