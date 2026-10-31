// Assembles the sentence-blocks figure. Each module stays under 300 lines.
// model.mjs is the sentence, machine.mjs the bench, page.mjs the card and
// fold layer, live.mjs the fold and callout runtime. See references/modules.md.
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
console.log("wrote", name);
