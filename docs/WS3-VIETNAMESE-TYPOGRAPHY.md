# Vietnamese typography foundation

WS3 provides the deterministic typography contract used by later rendering work.

## Controlled font

The current bundled primary font is **DejaVu Sans**, distributed as a small Vietnamese-focused WOFF2 subset at `public/fonts/DejaVuSans-Vietnamese.woff2`.

- Source: https://dejavu-fonts.github.io/
- License: Bitstream Vera / DejaVu font license
- Weight currently bundled: 400
- SHA-256: `56c78e4cfa7e5e6e80c08ffbc46c630a4be48dd5c3295dbd58f43d55367c4730`

The subset contains the ASCII/basic punctuation required by the typography fixtures plus the Vietnamese character matrix and representative mixed Vietnamese content. It is committed to the repository; runtime loading never consults machine-installed fonts or a network font service.

The bundled license notice is at `public/fonts/LICENSE-dejavu.txt`.

## Loading boundary

The Remotion-specific loader lives at `src/renderer/typography/font-loader.ts`. It resolves only the manifest-declared bundled font path, registers the font with `FontFace`, blocks frame capture while loading, and calls `cancelRender()` if the controlled font cannot be loaded. It never substitutes a system font.

The core `src/domain/typography/` modules have no Remotion dependency. The dependency direction is:

`domain typography -> renderer adapter -> Remotion`

## Text normalization and layout

Typography inputs are normalized to Unicode NFC before glyph validation and measurement. Wrapping is word-based and deterministic; a word wider than the configured width remains intact rather than being split into arbitrary characters.

## Measurement contract

The core layout API depends on a `TextMeasurementCapability` boundary. The current deterministic implementation is `deterministicOpenTypeMeasurement`, which uses the checked-in font's OpenType advance-width metrics.

This is intentionally deterministic and machine-independent, but it does **not** claim exact browser/Chromium shaping or kerning parity. The current WS3 contract therefore treats the OpenType adapter as the authoritative measurement for the domain tests. A renderer-compatible shaping/measurement adapter can be introduced later behind the same capability boundary without moving browser APIs into the domain.

The current tests explicitly exercise the measurement adapter and deterministic Vietnamese wrapping. No browser metric parity claim is made until such an adapter is verified against the actual rendering environment.
