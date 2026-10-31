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

`window.__fold.set("folded" | "unfolded", immediate)` is the state hook. Pass `true` for the second argument in a check so the opacity change is instant; otherwise the dim animates and the line check still sees the hidden drawing. `window.__fold.toggle()` and `window.__fold.render(blocks)` are there for a figure with more than one sentence. A `foldchange` event carries `{ state }`.

`prefers-reduced-motion: reduce` starts folded, skips the hinge animation, and shows `.fn-legend` with the same words at 32px.

Colours are per block, not a fixed grammar palette. Pass `labels` to replace the English chrome (`fold`, `unfold`, `glue`, `hint`, …).

## How big the type has to be

| Text | Rule |
|---|---|
| `.iso-face-text` | Warning under 12px of rendered height. It is an engraving. |
| `[data-legible]`, including every `.fn-word` | Failure under 28px when the viewport is at least 1100px wide, and under 16px below that. |
| Cut-and-fold sheet | The word is 20pt or larger. Long words widen the net; they do not shrink the type. |

`capture.mjs` prints the check and exits 1 on a teaching-text failure. `lines.mjs` does the same in whatever state the page is in, so unfold before you measure the nets:

```sh
node scripts/lines.mjs page.html --eval "window.__fold.set('unfolded', true)"
node scripts/lines.mjs page.html --eval "window.__fold.set('folded', true)"
```

The folded command is the one that sees the machine's texture lines. The unfolded command sees the words, and reports `lines: EMPTY` while the drawing is dimmed. That empty report is a failure on purpose.

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

Each net is a cross: solid outer cut, dashed hinge, shaded glue tab, the word, the role, and the key. Print it with `scripts/print.mjs` when it is a figure sheet, or with the same `Page.printToPDF` path that `print.mjs` uses as its fallback. `@page` is A4.

## Callouts

Mark the parts that must stay readable with `data-important`. `calloutRuntime()` measures them and moves each `[data-callout]` to the spot from `placeCallout` that covers the least area, clamped inside `[data-fold-stage]`. `lines.mjs` fails if a bubble still covers 8% or more of a marked part. A callout is a last resort; the net's own label is the one a reader should see first.
