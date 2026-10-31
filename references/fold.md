# Fold layer

Isometric face text is engraved type. `faceTextSvg` takes a size in viewBox units, and on a desktop that is often under 12px. A serial number can live there. A word a student has to read cannot.

The fold layer draws each block as a flat paper net in front of the figure. The word is set at 32px (28px when the string is long). Space or a click folds the four flaps and drops the net into its slot; the same control unfolds it. The machine underneath is dimmed while the nets are open, so the line check must be aimed at the folded state or it reports `lines: EMPTY`.

`examples/sentence-blocks/` is the worked figure: Tom, reads, books.

## On the page

```js
import { foldCss, foldLayerHtml, foldLegendHtml, foldScript } from "../../kit/fold.mjs";
import { calloutHtml, calloutRuntime, CALLOUT_CSS } from "../../kit/callout.mjs";

const blocks = [
  { id: "s", slot: "s", role: "S", text: "Tom", label: "Subject S", important: "subject", key: "KEY · S",
    fill: "#FDE68A", top: "#FEF3C7", edge: "#92400E", ink: "#451A03", sub: "#78350F",
    shades: ["#FCD34D", "#F59E0B", "#D97706", "#B45309"] },
];

// Wrap the svg. data-fold-stage is the positioning root for nets and callouts.
const stage = `<div class="fn-stage" data-fold-stage data-stage-fold="unfolded" tabindex="0">
  ${svg}
  ${foldLayerHtml({ blocks, formula: "S + V + O" })}
  ${calloutHtml({ text: "Object O is what the verb acts on.", name: "object", anchor: "[data-important='object']", prefer: "bounds-tr" })}
</div>${foldLegendHtml(blocks)}`;

const script = foldScript({ blocks, slots, width, height, formula: "S + V + O", initial: "unfolded" })
  + calloutRuntime();
```

Inject `foldCss()` and `CALLOUT_CSS` into the page head. `slots` maps each `block.slot` to a viewBox point `[x, y]`, usually `iso([x, y, z], P)` at the middle of that block. The runtime reads `svg.viewBox` and flies the net there.

`window.__fold.set("folded" | "unfolded", immediate)` is the state hook. It returns that state. Pass `true` for the second argument in a check so the opacity change is instant; without it, folding plays the hinge and `set` returns a promise that resolves to `"folded"` when the drawing is opaque again. `lines.mjs` and `print.mjs` await that promise. An `eval` that returns `undefined` is not printed and is not parsed as JSON. `window.__fold.toggle()` flips the layer. `window.__fold.render(blocks, { formula })` redraws the nets, the formula and the reduced-motion legend, for a figure with more than one sentence. A `foldchange` event carries `{ state }`.

`foldScript` listens for Space on `window`, and for a click on `[data-fold-stage]`. A figure that also toggles on Space will fold and unfold in the same keypress. One binding is enough.

`prefers-reduced-motion: reduce` starts folded, skips the hinge animation, and shows `.fn-legend` with the same words at 32px. `drive.mjs` and `capture.mjs` emulate `no-preference` unless you pass `--reduced`, so a check sees the authored open state even on a machine whose OS reduces motion.

Colours are per block, not a fixed grammar palette. Pass `labels` to replace the English chrome (`fold`, `unfold`, `glue`, `hint`, …).

## How big the type has to be

| Text | Rule |
|---|---|
| `.iso-face-text` | Warning under 12px of rendered height. It is an engraving. |
| `[data-legible]`, including every `.fn-word` | Failure under 28px when the viewport is at least 1100px wide, and under 16px below that. |
| Cut-and-fold sheet | The word is 20pt or larger. Long words widen the net; they do not shrink the type. |

`capture.mjs` prints the check and exits 1 on a teaching-text failure. `lines.mjs` does the same in whatever state the page is in, so unfold before you measure the nets:

```sh
node scripts/lines.mjs page.html --state unfolded
node scripts/lines.mjs page.html --state folded
```

`--state` sets the fold immediately, then waits. The folded command is the one that sees the machine's texture lines. The unfolded command measures the nets and the callouts; it prints `lines: unfolded` and does not fail just because the dimmed drawing has no candidate lines. A bare `lines.mjs` run with the layer still open still prints `lines: EMPTY` and exits 1, on purpose. `window.__callout.set({ text, anchor, prefer })` retargets the bubble when the sentence changes.

## Cut and fold sheet

```js
import { foldSheetDocument } from "../../kit/fold-sheet.mjs";

const html = foldSheetDocument({
  title: "Sentence blocks",
  pages: [{
    subtitle: "Subject, verb, object",
    bands: [{ title: "Tom reads books.", formula: "S + V + O", sentence: "Tom reads books.", blocks }],
  }],
});
```

Each net is a cross: solid outer cut, dashed hinge, shaded glue tab, the word, the role, and the key. `labels.cutMark`, `labels.foldMark` and `labels.glueMark` replace the `Cut.` / `Fold.` / `Glue.` prefixes (for instance Korean `자르기.` / `접기.` / `풀칠.`). Print it with `scripts/print.mjs` when it is a figure sheet, or with the same `Page.printToPDF` path that `print.mjs` uses as its fallback. `@page` is A4. The sheet's font stack requests an outline Korean face by its local name (`NanumGothic`, Noto Sans KR). Chrome's Linux PDF writer still embeds that face as Type 3; the stack is as far as this repo goes without a PDF library.

## Callouts

Mark the parts that must stay readable with `data-important`. The fold hint is marked that way already. `calloutRuntime()` measures each mark, including the absolute-positioned flaps and glue tab that stick out of a net, and moves each `[data-callout]` to the spot from `placeCallout` that covers the least area, clamped inside `[data-fold-stage]`. A drawing dimmed to about 0.2 opacity (the machine while the nets are open) is not an obstacle. `lines.mjs` fails if a bubble still covers 8% or more of a marked part. On a narrow screen the unfolded nets take a taller stage and the callout hides so it cannot sit on a wrapped net. A callout is a last resort; the net's own label is the one a reader should see first.
