import {normalizeTypographyText} from './normalization';
import {validateGlyphCoverage} from './validation';
import type {FontManifest, TextLayout, TextLayoutLine, TypographySpec} from './types';

const assertPositive = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive finite number`);
};

const measureCodePoint = (codePoint: number, font: FontManifest): number => {
  const key = codePoint.toString(16).toUpperCase().padStart(4, '0');
  const units = font.advanceWidths[key];
  if (units === undefined) throw new Error(`Font "${font.family}" does not cover U+${key}`);
  return units / font.unitsPerEm;
};

export const measureText = (text: string, spec: TypographySpec, font: FontManifest): number => {
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
};

const splitWords = (text: string): string[] => text.trim().split(/\s+/u).filter(Boolean);

export const layoutText = (text: string, spec: TypographySpec, font: FontManifest): TextLayout => {
  assertPositive('fontSize', spec.fontSize);
  assertPositive('lineHeight', spec.lineHeight);
  assertPositive('maxWidth', spec.maxWidth);
  if (!Number.isFinite(spec.letterSpacing)) throw new Error('letterSpacing must be finite');
  if (spec.fontFamily !== font.family) throw new Error(`Font mismatch: expected ${font.family}`);
  if (!font.weights.includes(spec.fontWeight)) throw new Error(`Font weight ${spec.fontWeight} is not bundled`);

  const normalizedText = normalizeTypographyText(text).trim();
  validateGlyphCoverage(normalizedText, font);
  if (normalizedText === '') {
    return {text, normalizedText, lines: [{text: '', width: 0}], lineHeight: spec.lineHeight, width: 0, height: spec.lineHeight, alignment: spec.alignment, fontFamily: spec.fontFamily, fontWeight: spec.fontWeight, fontSize: spec.fontSize};
  }

  const words = splitWords(normalizedText);
  const lines: TextLayoutLine[] = [];
  let current = '';
  let currentWidth = 0;
  const spaceWidth = measureText(' ', spec, font);

  for (const word of words) {
    const wordWidth = measureText(word, spec, font);
    const candidateWidth = current ? currentWidth + spaceWidth + wordWidth : wordWidth;
    if (current && candidateWidth > spec.maxWidth) {
      lines.push({text: current, width: currentWidth});
      current = word;
      currentWidth = wordWidth;
    } else {
      current = current ? `${current} ${word}` : word;
      currentWidth = candidateWidth;
    }
  }
  if (current) lines.push({text: current, width: currentWidth});

  const width = lines.reduce((max, line) => Math.max(max, line.width), 0);
  return {
    text,
    normalizedText,
    lines,
    lineHeight: spec.lineHeight,
    width,
    height: lines.length * spec.lineHeight,
    alignment: spec.alignment,
    fontFamily: spec.fontFamily,
    fontWeight: spec.fontWeight,
    fontSize: spec.fontSize,
  };
};
