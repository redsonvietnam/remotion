import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {VIETNAMESE_FONT_MANIFEST} from './font-manifest';

export const bundledVietnameseFontUrl = (): string => staticFile(VIETNAMESE_FONT_MANIFEST.file);

export const loadBundledVietnameseFont = (): void => {
  const handle = delayRender(`Loading ${VIETNAMESE_FONT_MANIFEST.family}`);
  const documentRef = globalThis.document;
  if (!documentRef || typeof globalThis.FontFace === 'undefined') {
    cancelRender(new Error('Controlled Vietnamese font loading requires a browser FontFace environment'));
    return;
  }

  const font = new globalThis.FontFace(
    VIETNAMESE_FONT_MANIFEST.family,
    `url(${bundledVietnameseFontUrl()})`,
    {weight: '400', style: 'normal', display: 'block'},
  );

  font.load()
    .then((loaded) => {
      documentRef.fonts.add(loaded);
      continueRender(handle);
    })
    .catch((error: unknown) => {
      cancelRender(error instanceof Error ? error : new Error(`Failed to load ${VIETNAMESE_FONT_MANIFEST.family}`));
    });
};
