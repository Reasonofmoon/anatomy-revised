# Printable sheets (A4)

A finished figure can also be printed: one A4 (or US Letter) PDF that explains the machine on paper, drawn from the same page and the same model as the live figure. Make one only when the user asks for something printable: a handout, a poster, a PDF, an A4 or Letter sheet, something for a classroom wall or a binder.

`scripts/print.mjs` does the work. It opens the built light page in headless Chrome, plays the poses you list, and freezes each pose as vector SVG (WebGL layers as a 2× PNG). Then it lays the stills out in one of three formats and prints the PDF with Chrome.

```bash
node scripts/print.mjs examples/raptor-engine/sheet.mjs                 # poster, A4
node scripts/print.mjs examples/raptor-engine/sheet.mjs --format all --png
node scripts/print.mjs examples/arcade-cabinet/sheet.mjs --format detailed --letter
node scripts/print.mjs sheet.mjs --format poster --landscape            # A4 landscape, 297×210 mm
node scripts/print.mjs sheet.mjs --letter --landscape                   # Letter landscape
```

It writes `<out>-<format>-a4.pdf` and `.html` next to the spec (`-letter` with `--letter`, `-a4-landscape` or `-letter-landscape` with `--landscape`), plus a preview `.png` with `--png`. It exits 1 when a format runs past its page count. The three formats are poster, drawing and detailed. `PAPER.a4Landscape` and `PAPER.letterLandscape` are the same sizes for a sheet built by hand.

On a landscape poster the figure is fit on both axes into the row that remains after the mast, the question, the legend and the footer. A wide crop no longer stretches to the full content width: that made an A4 landscape figure about 189mm tall inside an 182mm printable height and cut off the legend, the description and the footer. The printable area is the page inside the 16mm side and top padding and the 12mm bottom padding.

Chrome's `--print-to-pdf` flag hangs on Linux, so `print.mjs` prints with `Page.printToPDF` there and does not wait out the flag (set `ANATOMY_PRINT_FORCE_CLI=1` to try it). Elsewhere the flag is killed after `ANATOMY_PRINT_TIMEOUT_MS` (default 20 seconds) and the same HTML is printed with `Page.printToPDF`, which has its own `ANATOMY_PRINT_FALLBACK_TIMEOUT_MS` (default 20 seconds). Lowering the first timeout does not shorten the fallback. The log says `via --print-to-pdf` or `via Page.printToPDF`. If both fail, the script prints both reasons, says when the HTML was written, and exits. It does not dump a stack trace. Pose capture through `drive.mjs` is killed after 120 seconds, Chrome included: the browser runs in that process group, and the `/tmp/iso-drive-*` profile is removed. `node scripts/drive.mjs --clean-profiles` deletes leftover `iso-drive-*`, `iso-capture-*`, `iso-print-*` and `iso-cdp-pdf-*` directories that are older than `ANATOMY_PROFILE_STALE_MS` (default 120 seconds) and not open in a live Chrome. A young profile, or one a concurrent run is using, is left alone.

An `eval` action should return JSON. `window.__fold.set` returns the state it landed on (a promise, if the fold is still animating). A hook that returns `undefined` is ignored, not parsed.

## The three formats

| Format | Pages | What is on it | Use it for |
|---|---|---|---|
| `poster` (default) | 1 | The name set large, the question and a short lead, a column of big numbers, the figure with numbered pins, then every part with one line on what it does | A wall, a cover sheet, a first look |
| `drawing` | 1 | A drawing header with a number, the figure with pins, a parts list, a specification, a small inset of another pose, then a strip of steps with the parts at work lit | A technical handout |
| `detailed` | 2 | Page 1: the figure with pins and lettered close-up marks, the question, lead, numbers, every part with its line, and round close-ups under the figure. Page 2: each step as a large lit still with two or three sentences, the why, and the specification | Homework, a binder, someone who wants to understand it fully |

All three are minimal and print well in black and white: hairline rules, one sans for words, mono uppercase only for labels, black pins, and the figure in the light theme on white paper.

## The spec

A sheet is a module next to the example, `sheet.mjs`, whose default export says where the page is, what to capture and what to say. Every number and sentence in it must come from the figure's model or caption, the same truth rule as the figure itself.

```js
export default {
  page: "raptor-engine-light.html",             // the built light page, relative to this file
  out: "raptor-engine",                         // output base name
  layers: ".rp-stage > svg.rp-back, .rp-stage > svg.rp-front", // the SVG layers to freeze, back to front
  rasterSelector: ".rp-stage",                  // the box that WebGL shots are cropped from
  strip: [".rp-deckglow"],                      // elements to drop from every still
  reduced: true,                                // emulate reduced motion (calm, no tour); false to catch animation
  views: {                                      // poses, captured in this order, each after its actions
    rest: {},
    apart: { actions: [["key", " "], ["wait", 2500]], reset: [["key", " "], ["wait", 2500]] },
    firing: { actions: [["key", "i"], ["wait", 3500]], raster: { region: [250, 150, 432, 530] } },
  },
  name, title, number, tagline, question, lead, quote,
  numbers: [["230", "tf", "thrust at sea level"]],
  spec: [["Chamber", "300 bar"]],
  why: { title: "Why full flow?", text: "…" },
  parts: [{ id: "otp", name: "Oxygen turbopump", say: "…", select: '.it[data-piece="otp"]', at: [x, y] }],
  main: { view: "apart", crop: [x, y, w, h], layers: [1], hide: ["stand"] },
  inset: { label: "Assembled", view: "rest", crop: [x, y, w, h] },
  steps: [{ view: "apart", title: "…", text: "…", focus: ["otp", "ftp"] }],
  details: [{ title: "…", text: "…", around: ["otp"], focus: ["otp"] }],
};
```

- **Actions** are `drive.mjs` actions. `["slow", 0.03]` then `["until", js]` catches a moment of an animation exactly (the arcade's coin in the chute); `reset` puts the page back before the next view.
- **Parts** are CSS selectors over the live SVG, so any figure works: the Raptor's assemblies are `.it[data-piece]` groups, the arcade's are `[data-name^="mech"]` prefixes from its recorder names. A part without a `name` is not listed or pinned, but steps can still light it (`coin`) or hide it (`stand`). The pin sits at the centre of the part's largest shape; give `at` (viewBox units) where that lands in empty space. Pins that crowd each other spread apart and draw a hairline back to their point. A pin whose `at` is away from that anchor also draws a hairline to the anchor, so a number in an empty bay still points at its part.
- **Colour.** The capture copies computed custom properties onto the elements that set them, and bakes a fill or stroke that is not one of the anatomy tone tokens. A category tile coloured with `[data-palette]` or `[data-cat]` stays that colour inside the print `<use>` clone. Tone tokens are left as variables so a focused step can still dim a part.
- **Focus** lights the listed parts (black lines) and greys everything else, labelled or not. **Hide** removes a part from that still: hide what stands in front of a close-up (the arcade's coin door in front of the mech).
- **Crops** are in the figure's viewBox units. Without one, the main view crops to its drawn content; steps and close-ups crop around their focus or `around` parts, never below 42% of the main crop's width.
- **Rasters** are for WebGL only. Mark the view `raster` with the viewBox `region` to shoot; the plume prints as a 2× PNG inside the vector page.
- **Text** has to fit: titles of five words or fewer for steps, one line per part, two or three sentences per step. The script fails when a format runs onto another page.

## Check it

1. Build the light page first (`node build.mjs --light`).
2. Run with `--format all --png` and read every PNG. Look for pins on empty space, a close-up that shows the wrong part, a lit part hidden behind another, and text cut at the foot of the page.
3. Zoom into the PDF or the HTML at 4× (`drive.mjs` `["shot", out, ".ps", 4, [x, y, w, h]]` on `<name>.html?print`): lines must be vector and crisp, and the lit parts must stand out at the size of a step still. On a landscape poster, the mast, the figure, the question, the legend and the footer all sit inside the padded page.
4. Print one page if you can. Light-grey dims and hairlines must still read on an office laser printer.

## Fonts in the PDF

`kit/print-fonts.mjs` registers three families and sets `font-synthesis: none`.

| Family | What it is for | `src: local()` |
|---|---|---|
| Anatomy Hangul | Korean, and Latin when NanumGothic is the file Chrome opens | NanumGothic at 400 and 500, NanumGothicBold at 700 |
| Anatomy Latin | Latin when no Korean file is installed, including pin numbers and SVG `<text>` in the sheet | `NotoSans-Regular` / `Arimo-Regular` / Liberation Sans at 400 and 500, the bold files at 700 |
| Anatomy Mono | Labels set in the mono stack | `NotoSansMono-Regular`, Liberation Mono |

Weight 500 points at the regular file. A medium request then uses that outline.

Chrome embeds the opened file as CID TrueType when it is a static TrueType (glyf outlines) and its OS/2 embedding bits allow a subset. It emits Type 3, and this repo cannot force CID, when the file Chrome actually opens is a variable font, a CFF OpenType, a collection it will not split, or a face whose fsType forbids embedding. A generic `Arial` or `sans-serif` that misses every `local()` also becomes Type 3 on Chrome builds that will not subset the fontconfig fallback (`NotoSans-Regular` or `Arimo-Regular`). The sheet names those files in `src: local()` so that path is not the one Chrome takes.

A `<use>` clone does not see a font rule on the sheet. The capture writes `font-family="Anatomy Latin, Anatomy Hangul, sans-serif"` onto each `<text>` and `<tspan>`, and snaps the weight to 400 or 700, so a raw `Arial` or `sans-serif` on a periodic-table label does not fall through to Arimo or Noto as a system face.

## A PDF link on the figure

`kit/pdf-button.mjs` exports `pdfButton(href)`: a small "PDF" link with an icon at the top right of the card, carrying its own CSS so pages without it are unchanged. Put it first inside the plate body and only when the file exists (`examples/push-button/build.mjs`). Order: build the light page, print, then rebuild so the button appears.

## Longer detailed sheets

`detailed` runs 2–4 pages, chosen from the spec:

1. Overview (always): pinned figure, numbers, parts with a line each, round close-ups (`details`).
2. How it works: steps six to a page, the `why` taking the last slot; more steps flow onto another page.
3. Assemblies (when the spec has `assemblies`): up to four per page, each `{ title, text, parts: [ids] }` drawn as a large lit close-up with its own pins and part numbers. Give a figure with ten or more parts three or four groups.
4. The specification closes the last page.

`maxPages` (2–4, default 4) caps the count: assembly pages drop first, and too many steps for the cap is an error. `examples/raptor-engine/sheet.mjs` (3 pages) is the reference; `push-button` and `arcade-cabinet` stay at 2.
