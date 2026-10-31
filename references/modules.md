# Small modules

A figure written as one file stalls. The model, the geometry, the page and the motion get pasted into the same script until the edit no longer fits in a step. Split the work before that happens. Keep each module under about 300 lines, and let `build.mjs` assemble them.

`examples/sentence-blocks/` is the skeleton. It is also the fold-layer example, so the pieces are real.

| Module | What it owns |
|---|---|
| `model.mjs` | The sentence, the formula, the block colours, the plate and the view size. Everything else imports this. No DOM, no SVG. |
| `machine.mjs` | The isometric bench: `project()`, `machineSvg(P)`, `slotPoints(P)`. It reads the model and returns strings. |
| `page.mjs` | `assemble({ theme, svg, slots })`. The card, the fold layer, the callout, the extra CSS. |
| `live.mjs` | `liveSource(...)`. The fold runtime, the callout nudge, the readout. A string, not a browser bundle. |
| `build.mjs` | The only CLI. Reads `--light`, calls the others, writes `sentence-blocks.html` or `sentence-blocks-light.html`. |

```js
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { machineSvg, project, slotPoints } from "./machine.mjs";
import { assemble } from "./page.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const projection = project();
const html = assemble({ theme, svg: machineSvg(projection), slots: slotPoints(projection) });
const name = theme === "light" ? "sentence-blocks-light.html" : "sentence-blocks.html";
writeFileSync(join(here, name), html);
```

Rules that keep the split useful:

- The model is the source of truth. The readout, the nets and the blocks on the bench all import the same words. Do not copy the sentence into a second file.
- Geometry does not know about themes or clicks. The page does not recompute the projection.
- Live code is a string the page inlines, the same way `examples/dial-indicator/build.mjs` inlines its loop. It talks to the fold layer through `window.__fold` and the DOM, not through variables the module closed over, except for the JSON config `foldScript` embeds.
- `build.mjs` stays the file CI runs. `node examples/<name>/build.mjs` and `--light` write the committed pages.
- When a module passes about 300 lines, split it by what it draws (base, mechanism, overlays), not by an arbitrary line count in the middle of a function.

A larger figure grows more modules (`colors.mjs`, `scenes.mjs`, `sheet.mjs`) and keeps the same shape: one model, pure drawing functions, one page assembler, one live string, one build script.
