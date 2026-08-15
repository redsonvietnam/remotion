import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';
import {VIETNAMESE_FONT_MANIFEST} from './font-manifest';
import {layoutText, measureText} from './layout';
import {normalizeTypographyText} from './normalization';
import {requiredVietnameseFixtureText, validateGlyphCoverage, validateVietnameseFont} from './validation';
import type {TypographySpec} from './types';

const fontPath = new URL('../../../public/fonts/DejaVuSans-Vietnamese.woff2', import.meta.url);
const baseSpec: TypographySpec = {
  fontFamily: VIETNAMESE_FONT_MANIFEST.family,
  fontWeight: 400,
  fontSize: 48,
  lineHeight: 60,
  letterSpacing: 0,
  maxWidth: 500,
  alignment: 'left',
};

describe('Vietnamese typography', () => {
  it('discovers the controlled bundled font and verifies its checksum', async () => {
    const bytes = await readFile(fontPath);
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(bytes.subarray(0, 4).toString('hex')).toBe('774f4632');
    expect(hash).toBe(VIETNAMESE_FONT_MANIFEST.sha256);
  });

  it('has deterministic font identity and controlled metadata', () => {
    expect(VIETNAMESE_FONT_MANIFEST.family).toBe('DejaVu Sans');
    expect(VIETNAMESE_FONT_MANIFEST.file).toBe('fonts/DejaVuSans-Vietnamese.woff2');
    expect(VIETNAMESE_FONT_MANIFEST.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(VIETNAMESE_FONT_MANIFEST.weights).toEqual([400]);
  });

  it('validates the representative Vietnamese glyph matrix', () => {
    validateVietnameseFont(VIETNAMESE_FONT_MANIFEST);
    validateGlyphCoverage('Việt Nam — Nghị quyết 57 — Công nghệ thông tin — Chuyển đổi số — Đắk Nông — Nâm Nung', VIETNAMESE_FONT_MANIFEST);
  });

  it('normalizes precomposed and decomposed Vietnamese text to the same identity', () => {
    const composed = 'Nghị quyết';
    const decomposed = 'Nghị quyết';
    expect(normalizeTypographyText(decomposed)).toBe(composed);
    expect(layoutText(composed, baseSpec, VIETNAMESE_FONT_MANIFEST)).toEqual(
      layoutText(decomposed, baseSpec, VIETNAMESE_FONT_MANIFEST),
    );
  });

  it('lays out short Vietnamese text deterministically', () => {
    const first = layoutText('Việt Nam', baseSpec, VIETNAMESE_FONT_MANIFEST);
    const second = layoutText('Việt Nam', baseSpec, VIETNAMESE_FONT_MANIFEST);
    expect(first).toEqual(second);
    expect(first.lines).toHaveLength(1);
    expect(first.width).toBeGreaterThan(0);
  });

  it('wraps Vietnamese phrases at word boundaries', () => {
    const layout = layoutText('Công nghệ thông tin và chuyển đổi số tại Việt Nam', {...baseSpec, maxWidth: 360}, VIETNAMESE_FONT_MANIFEST);
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.every((line) => line.text.length > 0)).toBe(true);
    expect(layout.lines.some((line) => line.text.startsWith('Công'))).toBe(true);
  });

  it('keeps a long Vietnamese word intact instead of splitting characters', () => {
    const layout = layoutText('nghiêng', {...baseSpec, maxWidth: 30}, VIETNAMESE_FONT_MANIFEST);
    expect(layout.lines[0].text).toBe('nghiêng');
    expect(layout.lines).toHaveLength(1);
  });

  it('changes wrapping deterministically when max width changes', () => {
    const narrow = layoutText('Nghị quyết 57 về chuyển đổi số', {...baseSpec, maxWidth: 250}, VIETNAMESE_FONT_MANIFEST);
    const wide = layoutText('Nghị quyết 57 về chuyển đổi số', {...baseSpec, maxWidth: 600}, VIETNAMESE_FONT_MANIFEST);
    expect(narrow.lines.length).toBeGreaterThan(wide.lines.length);
  });

  it('changes measured layout deterministically when font size changes', () => {
    const small = layoutText('Nghị quyết', {...baseSpec, fontSize: 32}, VIETNAMESE_FONT_MANIFEST);
    const large = layoutText('Nghị quyết', {...baseSpec, fontSize: 64}, VIETNAMESE_FONT_MANIFEST);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBe(small.height);
    expect(measureText('Nghị quyết', {...baseSpec, fontSize: 64}, VIETNAMESE_FONT_MANIFEST)).toBe(large.width);
  });

  it('does not depend on machine-installed font discovery', () => {
    expect(VIETNAMESE_FONT_MANIFEST.file.startsWith('fonts/')).toBe(true);
    expect(VIETNAMESE_FONT_MANIFEST.file).not.toMatch(/^([A-Za-z]:)?[\\/]/);
    expect(VIETNAMESE_FONT_MANIFEST.file).not.toContain('..');
    expect(requiredVietnameseFixtureText).toContain('ắ');
  });

  it('fails explicitly when a required glyph is unavailable', () => {
    expect(() => validateGlyphCoverage('漢', VIETNAMESE_FONT_MANIFEST)).toThrow(/does not cover U\+6F22/);
  });
});
