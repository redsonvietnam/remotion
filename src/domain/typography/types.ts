export type TypographyAlignment = 'left' | 'center' | 'right';

export type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;

export type TypographySpec = {
  readonly fontFamily: string;
  readonly fontWeight: FontWeight;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly maxWidth: number;
  readonly alignment: TypographyAlignment;
};

export type FontManifest = {
  readonly schemaVersion: 1;
  readonly family: string;
  readonly version: string;
  readonly source: string;
  readonly license: string;
  readonly file: string;
  readonly sha256: string;
  readonly unicodeNormalization: 'NFC';
  readonly supportedCodePoints: readonly string[];
  readonly weights: readonly number[];
  readonly unitsPerEm: number;
  readonly advanceWidths: Readonly<Record<string, number>>;
};

export type TextLayoutLine = {
  readonly text: string;
  readonly width: number;
};

export type TextLayout = {
  readonly text: string;
  readonly normalizedText: string;
  readonly lines: readonly TextLayoutLine[];
  readonly lineHeight: number;
  readonly width: number;
  readonly height: number;
  readonly alignment: TypographyAlignment;
  readonly fontFamily: string;
  readonly fontWeight: FontWeight;
  readonly fontSize: number;
};
