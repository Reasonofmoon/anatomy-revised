import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
  console.log(`Check that every texture line in a figure ends on something.

  node lines.mjs <file.html | url> [--out marks.png] [--tolerance 1] [--select css] [--wait 1500]
                       [--eval js] [--eval-file hook.js] [--allow-empty] [drive.mjs flags]

Every open subpath of every .iso-line (seams, grooves, ribs, rule lines, ticks, needles) must end on another stroke,
a dot or an outline within the tolerance (viewBox px), or under a fill painted after it. A short straight mark (a tick)
needs one rooted end. Outlines, creases, bevels and tube edges are the kit's own and are not checked. Lines drawn with
fadeLineSvg ramp out and pass; lineSvg(d, { free: true | "start" | "end" }) marks an end that is meant to stop (a needle
tip, rule lines standing for printed text). Exits 1 if any end floats, or if it finds 0 candidate lines (a check that
saw nothing is not a pass). --allow-empty turns that empty result into a warning. --out writes the card with each
floating end ringed.

--eval js and --eval-file hook.js run in the page before the check, so a folded or unfolded state can be selected
(window.__fold.set("folded", true)). Repeat --eval for more than one hook. The same run also measures teaching text
(data-legible) and fails when a data-callout covers a data-important part.`);
  process.exit(argv.length ? 0 : 1);
}
const take = (flag, fallback) => {
  const at = argv.indexOf(flag);
  if (at < 0) return fallback;
  const value = argv[at + 1];
  argv.splice(at, 2);
  return value;
};
const out = take("--out", null);
const tolerance = Number(take("--tolerance", 1));
const select = take("--select", null);
const wait = Number(take("--wait", 1500));
const allowAt = argv.indexOf("--allow-empty");
const allowEmpty = allowAt >= 0;
if (allowEmpty) argv.splice(allowAt, 1);
const evals = [];
for (const flag of ["--eval", "--eval-file"]) {
  let at = argv.indexOf(flag);
  while (at >= 0) {
    const value = argv[at + 1];
    if (value == null) {
      console.error(`lines: ${flag} needs a value`);
      process.exit(1);
    }
    evals.push(flag === "--eval-file" ? readFileSync(value, "utf8") : value);
    argv.splice(at, 2);
    at = argv.indexOf(flag);
  }
}
const actions = JSON.stringify([["wait", wait], ...evals.map((code) => ["eval", code]), ["lines", out, select, { tolerance, allowEmpty }]]);
const child = spawn(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "drive.mjs"), argv[0], actions, ...argv.slice(1)], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
