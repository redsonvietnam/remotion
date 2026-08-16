import {createGeneratedAssetRecord} from '../foundation/assets';
import type {AssetRecord} from '../foundation/types';
import type {CaptionTrack} from './types';
import {hashValue, stableJson} from '../foundation/ids';
export const createCaptionAssetRecord = ({
  track,
  localPath,
}: {
  readonly track: CaptionTrack;
  readonly localPath: string;
}): AssetRecord =>
  createGeneratedAssetRecord({
    request: {
      kind: 'captionTrack',
      provider: 'captionAlign',
      model: 'deterministic',
      generationParameters: {
        language: track.language,
        timings: track.timings,
      },
      lineage: [
        {
          kind: 'captionTrack',
          identity: stableJson(track),
        },
      ],
      mimeType: 'application/json',
      extension: 'json',
    },
    contentHash: hashValue(track),
    localPath,
  });