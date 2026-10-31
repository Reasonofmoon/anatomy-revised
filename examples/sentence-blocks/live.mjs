import { calloutRuntime } from "../../kit/callout.mjs";
import { foldScript } from "../../kit/fold.mjs";
import { BLOCKS, FORMULA, SENTENCE } from "./model.mjs";

const foldBlocks = BLOCKS.map(({ at, ...block }) => block);

export function liveSource({ slots, width, height }) {
  const fold = foldScript({ blocks: foldBlocks, slots, width, height, formula: FORMULA, initial: "unfolded" });
  const glue = `
const readout = document.querySelector("[data-readout]");
const say = () => { if (readout && window.__fold) readout.textContent = (window.__fold.state === "folded" ? "folded" : "unfolded") + " · ${FORMULA} · ${SENTENCE}"; };
document.addEventListener("foldchange", () => { say(); window.__callout && window.__callout.nudge(); });
say();
`;
  return `${fold}\n${calloutRuntime()}\n${glue}`;
}
