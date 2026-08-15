# Vietnamese typography foundation

WS3 provides the deterministic typography contract used by later rendering work.

## Controlled font

The current bundled primary font is **DejaVu Sans**, distributed as a small Vietnamese-focused WOFF2 subset at `public/fonts/DejaVuSans-Vietnamese.woff2`.

- Source: https://dejavu-fonts.github.io/
- License: Bitstream Vera / DejaVu font license
- Weight currently bundled: 400
- SHA-256: `a5f9982da8c56f49f564437e0321751e4f5050b81c2055e37b567236efdb5e18`

The subset contains the ASCII/basic punctuation required by the typography fixtures plus the Vietnamese character matrix and representative mixed Vietnamese content. It is committed to the repository; runtime loading never consults machine-installed fonts or a network font service.

The bundled license notice is at `public/fonts/LICENSE-dejavu.txt`.

## Loading

`font-loader.ts` is the Remotion adapter. It resolves only the manifest-declared `public/fonts/...` path, registers the font with `FontFace`, blocks frame capture while loading, and calls `cancelRender()` if the controlled font cannot be loaded. It never substitutes a system font.

## Text normalization and layout

Typography inputs are normalized to Unicode NFC before glyph validation and measurement. Measurement uses the bundled font's OpenType advance-width metrics rather than character-count constants. Wrapping is word-based and deterministic; a word wider than the configured width remains intact rather than being split into arbitrary characters.
