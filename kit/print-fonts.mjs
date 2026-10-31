// Korean print faces. Register real local files at 400 and 700 and turn
// synthesis off, so a bold request uses an outline instead of a faux-bold
// Type 3. Chrome on Linux can still emit Type 3 for a face it will not
// subset (some SVG text, some local CJK files). Noto Sans KR embeds as
// CID TrueType when it is the file Chrome actually uses.

export const PRINT_FONT_FAMILY = `"Anatomy Hangul","NanumGothic","Noto Sans KR","Noto Sans CJK KR","Source Han Sans KR","Apple SD Gothic Neo","Malgun Gothic","Helvetica Neue",Helvetica,Arial,sans-serif`;

export const PRINT_FONT_FACE = `@font-face{font-family:"Anatomy Hangul";font-style:normal;font-weight:400;font-display:swap;src:local("NanumGothic"),local("Nanum Gothic"),local("Noto Sans KR"),local("NotoSansKR-Regular"),local("Noto Sans CJK KR"),local("Source Han Sans KR"),local("Apple SD Gothic Neo"),local("Malgun Gothic")}
@font-face{font-family:"Anatomy Hangul";font-style:normal;font-weight:700;font-display:swap;src:local("NanumGothicBold"),local("NanumGothic Bold"),local("Nanum Gothic Bold"),local("Noto Sans KR Bold"),local("NotoSansKR-Bold"),local("Noto Sans CJK KR Bold"),local("Source Han Sans KR Bold"),local("NanumGothic"),local("Noto Sans KR"),local("Apple SD Gothic Neo"),local("Malgun Gothic")}`;

export const PRINT_FONT_SYNTHESIS = "font-synthesis:none";
