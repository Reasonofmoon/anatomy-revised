import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calloutHtml, calloutRuntime, CALLOUT_CSS } from "../kit/callout.mjs";
import { foldCss, foldLayerHtml, foldLegendHtml, foldScript } from "../kit/fold.mjs";
import { pageHtml } from "../kit/iso-kit.mjs";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("./drive.mjs", import.meta.url));

const block = {
  id: "s", slot: "s", role: "S", text: "Tom", label: "Subject S", important: "subject", key: "KEY · S",
  fill: "#FDE68A", top: "#FEF3C7", edge: "#92400E", ink: "#451A03", sub: "#78350F",
  shades: ["#FCD34D", "#F59E0B", "#D97706", "#B45309"],
};

function page() {
  const svg = `<svg class="iso-svg" viewBox="0 0 320 180" width="640" height="360"><g data-important="machine" opacity="1"><rect x="40" y="40" width="80" height="36" fill="#111"/></g></svg>`;
  const body = `<style>${foldCss()}${CALLOUT_CSS}</style><div class="fn-stage iso-stage" data-fold-stage data-stage-fold="unfolded">${svg}${foldLayerHtml({ blocks: [block], formula: "S + V", state: "unfolded" })}${calloutHtml({ text: "The subject does the verb.", name: "note", anchor: "[data-important='subject']", prefer: "above" })}</div>${foldLegendHtml([block])}`;
  const script = foldScript({ blocks: [block], slots: { s: [80, 70] }, width: 320, height: 180, formula: "S + V", initial: "unfolded" }) + calloutRuntime();
  return pageHtml({ title: "Fold runtime", theme: "light", width: 720, body, script });
}

async function run(directory, args) {
  const file = join(directory, "fold.html");
  await writeFile(file, page());
  try {
    return { code: 0, ...await execute(process.execPath, [drive, file, ...args], { timeout: 30000 }) };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("callouts clear flaps and glue, and fold render refreshes formula and legend", { timeout: 40000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-fold-runtime-"));
  try {
    const probe = `(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const callout = box(document.querySelector(".an-callout"));
      const flap = box(document.querySelector(".fn-flap-top"));
      const glue = box(document.querySelector(".fn-glue"));
      const hint = box(document.querySelector("[data-fold-hint]"));
      window.__fold.render([{ id: "v", slot: "s", role: "V", text: "reads", label: "Verb V", important: "verb", fill: "#FECDD3", edge: "#9F1239", ink: "#4C0519" }], { formula: "S + V + O" });
      window.__callout.set({ text: "The verb is reads.", anchor: "[data-important='verb']", prefer: "below" });
      return {
        overFlap: overlap(callout, flap),
        overGlue: overlap(callout, glue),
        overHint: overlap(document.querySelector(".an-callout").getBoundingClientRect(), hint),
        hint: document.querySelector("[data-fold-hint]").getAttribute("data-important"),
        formula: document.querySelector("[data-fold-formula]").textContent,
        legend: document.querySelector("[data-fold-legend]").textContent,
        bubble: document.querySelector(".an-callout").textContent,
        placed: document.querySelector(".an-callout").getAttribute("data-placed"),
        state: window.__fold.set("folded", true),
      };
    })()`;
    const result = await run(directory, [JSON.stringify([["eval", probe]]), "--width", "900", "--height", "700"]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const payload = JSON.parse(result.stdout.match(/eval: (\{.*\})/)[1]);
    assert.equal(payload.overFlap, 0);
    assert.equal(payload.overGlue, 0);
    assert.equal(payload.overHint, 0);
    assert.equal(payload.hint, "hint");
    assert.equal(payload.formula, "S + V + O");
    assert.match(payload.legend, /reads/);
    assert.equal(payload.bubble, "The verb is reads.");
    assert.equal(payload.state, "folded");
    const phone = await run(directory, [JSON.stringify([["eval", "document.querySelector('[data-fold-stage]').getBoundingClientRect().height"]]), "--width", "390", "--height", "800"]);
    assert.equal(phone.code, 0, phone.stdout + phone.stderr);
    const height = JSON.parse(phone.stdout.match(/eval: ([0-9.]+)/)[1]);
    assert.ok(height >= 520, `stage height ${height}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
