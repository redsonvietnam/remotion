import {normalizeTypographyText} from './normalization';
import {validateGlyphCoverage} from './validation';
import type {FontManifest, TypographySpec} from './types';

export interface TextMeasurementCapability {
  measure(text: string, spec: TypographySpec, font: FontManifest): number;
}

const measureCodePoint = (codePoint: number, font: FontManifest): number => {
  const key = codePoint.toString(16).toUpperCase().padStart(4, '0');
  const units = font.advanceWidths[key];
  if (units === undefined) throw new Error(`Font "${font.family}" does not cover U+${key}`);
  return units / font.unitsPerEm;
};

/**
 * Deterministic WS3 measurement contract.
 *
 * This adapter uses the checked-in font's OpenType advance widths. It is
 * deterministic and machine-independent, but it does not claim browser
 * shaping/kerning parity. A renderer-compatible measurement adapter may be
 * introduced later without changing the core layout contract.
 */
export const deterministicOpenTypeMeasurement: TextMeasurementCapability = {
  measure(text, spec, font) {
    const normalized = normalizeTypographyText(text);
    validateGlyphCoverage(normalized, font);
    let width = 0;
    let count = 0;
    for (const character of normalized) {
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined) continue;
      width += measureCodePoint(codePoint, font) * spec.fontSize;
      count += 1;
    }
    if (count > 1) width += spec.letterSpacing * (count - 1);
    return width;
  },
};
