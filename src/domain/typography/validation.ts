import {normalizeTypographyText} from './normalization';
import type {FontManifest} from './types';

const REQUIRED_VIETNAMESE_TEXT = [
  'á à ả ã ạ', 'ă ắ ằ ẳ ẵ ặ', 'â ấ ầ ẩ ẫ ậ', 'đ',
  'é è ẻ ẽ ẹ', 'ê ế ề ể ễ ệ', 'í ì ỉ ĩ ị',
  'ó ò ỏ õ ọ', 'ô ố ồ ổ ỗ ộ', 'ơ ớ ờ ở ỡ ợ',
  'ú ù ủ ũ ụ', 'ư ứ ừ ử ữ ự', 'ý ỳ ỷ ỹ ỵ',
].join(' ');

export const validateGlyphCoverage = (text: string, font: FontManifest): void => {
  const normalized = normalizeTypographyText(text);
  for (const character of normalized) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || /\s/u.test(character)) continue;
    const key = codePoint.toString(16).toUpperCase().padStart(4, '0');
    if (!font.supportedCodePoints.includes(`U+${key}`)) {
      throw new Error(`Font "${font.family}" does not cover U+${key}`);
    }
  }
};

export const validateVietnameseFont = (font: FontManifest): void => {
  if (font.family !== 'DejaVu Sans') throw new Error('Unexpected Vietnamese font family');
  if (font.file !== 'fonts/DejaVuSans-Vietnamese.woff2') throw new Error('Unexpected bundled font path');
  if (font.weights.length !== 1 || font.weights[0] !== 400) throw new Error('Unexpected bundled font weights');
  validateGlyphCoverage(REQUIRED_VIETNAMESE_TEXT, font);
};

export const assertFontManifestIntegrity = (font: FontManifest, actualSha256: string): void => {
  if (actualSha256 !== font.sha256) {
    throw new Error(`Bundled font checksum mismatch for ${font.family}`);
  }
};

export const requiredVietnameseFixtureText = REQUIRED_VIETNAMESE_TEXT;
