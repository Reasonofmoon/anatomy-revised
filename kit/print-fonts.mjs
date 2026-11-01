// Print faces. Register real local files and turn synthesis off, so a weight
// request uses an outline instead of a faux-bold Type 3.
//
// Chrome embeds a face as CID TrueType (CIDFontType2) when an @font-face
// src:local() opens a static TrueType file (glyf outlines, not a variable
// font and not CFF). A generic family that misses every local() falls
// through fontconfig to NotoSans-Regular or Arimo-Regular, and some Chrome
// builds then emit that fallback as Type 3. Naming those files here is the
// same path NanumGothic already uses.
//
// Chrome still emits Type 3 when the file it actually opens cannot be
// subset: a variable font, a CFF OpenType, a collection it will not split,
// or a face whose OS/2 fsType forbids embedding. This repo does not ship a
// font file or a PDF library, so those files stay Type 3.

export const PRINT_FONT_FAMILY = `"Anatomy Hangul","Anatomy Latin","NanumGothic","Noto Sans KR","Noto Sans","Arimo","Liberation Sans","Helvetica Neue",Helvetica,Arial,sans-serif`;

export const PRINT_MONO_FAMILY = `"Anatomy Mono","Noto Sans Mono","Liberation Mono",Menlo,ui-monospace,monospace`;

const HANGUL_REGULAR = `local("NanumGothic"),local("Nanum Gothic"),local("Noto Sans KR"),local("NotoSansKR-Regular"),local("Noto Sans CJK KR"),local("Source Han Sans KR")`;
const HANGUL_BOLD = `local("NanumGothicBold"),local("NanumGothic Bold"),local("Nanum Gothic Bold"),local("Noto Sans KR Bold"),local("NotoSansKR-Bold"),local("Noto Sans CJK KR Bold"),local("Source Han Sans KR Bold"),local("NanumGothic"),local("Noto Sans KR")`;
const LATIN_REGULAR = `local("NotoSans-Regular"),local("Noto Sans Regular"),local("Noto Sans"),local("Arimo-Regular"),local("Arimo Regular"),local("Arimo"),local("Liberation Sans")`;
const LATIN_BOLD = `local("NotoSans-Bold"),local("Noto Sans Bold"),local("Arimo-Bold"),local("Arimo Bold"),local("Liberation Sans Bold"),${LATIN_REGULAR}`;
const MONO_REGULAR = `local("NotoSansMono-Regular"),local("Noto Sans Mono"),local("Liberation Mono"),local("DejaVu Sans Mono"),local("JetBrains Mono"),local("Menlo")`;

const face = (family, weight, src) => `@font-face{font-family:${family};font-style:normal;font-weight:${weight};font-display:swap;src:${src}}`;

export const PRINT_FONT_FACE = [
  face(`"Anatomy Hangul"`, 400, HANGUL_REGULAR),
  face(`"Anatomy Hangul"`, 500, HANGUL_REGULAR),
  face(`"Anatomy Hangul"`, 700, HANGUL_BOLD),
  face(`"Anatomy Latin"`, 400, LATIN_REGULAR),
  face(`"Anatomy Latin"`, 500, LATIN_REGULAR),
  face(`"Anatomy Latin"`, 700, LATIN_BOLD),
  face(`"Anatomy Mono"`, 400, MONO_REGULAR),
  face(`"Anatomy Mono"`, 500, MONO_REGULAR),
].join("\n");

export const PRINT_FONT_SYNTHESIS = "font-synthesis:none";
