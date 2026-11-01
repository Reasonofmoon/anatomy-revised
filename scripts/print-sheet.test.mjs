import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { FORMATS, PAPER, boxOf, detailedPlan, fitAspect, focusCrop, layerTable, pagesOf, paperChoice, pinLeader, relax, sheetHtml } from "./print-sheet.mjs";
import { captureScript } from "./print.mjs";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("drive.mjs", import.meta.url));

const layer = (id) => `<g class="it" data-print-part="${id}" style="--anatomy-hi:var(--on-${id}-hi,var(--part-hi,#26262a));display:var(--show-${id},inline)"><path d="M0 0L10 10"/></g>`;

function fakeCapture() {
  const view = {
    vb: [0, 0, 400, 600],
    content: [20, 20, 360, 560],
    layers: [`<path d="M0 0L400 600"/>`, layer("pump") + layer("bell") + layer("frame")],
    boxes: { pump: [100, 100, 180, 160], bell: [120, 300, 260, 520], frame: [0, 0, 400, 40] },
    anchors: { pump: [140, 130], bell: [190, 410], frame: [200, 20] },
  };
  return {
    css: ".iso-line{stroke:#000}",
    views: {
      rest: view,
      apart: { ...view, layers: [view.layers[0], layer("pump") + layer("bell")] },
      fire: { vb: [0, 0, 400, 600], layers: [], boxes: {}, anchors: {}, raster: { region: [50, 50, 300, 400], href: "data:image/png;base64,AAAA" } },
    },
  };
}

const SPEC = {
  name: "Test engine",
  title: "Test engine: how it works",
  number: "AN-900",
  tagline: "A test",
  question: "How does it work?",
  lead: "It pumps, then it burns.",
  quote: "One line",
  numbers: [["1", "x", "one"], ["2", "y", "two"]],
  spec: [["Mass", "1 kg"]],
  why: { title: "Why?", text: "Because." },
  parts: [
    { id: "pump", name: "Pump", say: "Raises the pressure." },
    { id: "bell", name: "Bell", say: "Turns pressure into speed." },
    { id: "frame" },
  ],
  main: { view: "apart" },
  inset: { label: "Assembled", view: "rest" },
  steps: [
    { view: "apart", title: "Pump", text: "It pumps.", focus: ["pump"] },
    { view: "apart", title: "Bell", text: "It burns.", focus: ["bell"], hide: ["frame"] },
    { view: "fire", title: "Fire", text: "It fires." },
  ],
  details: [{ title: "The pump", text: "Close up.", around: ["pump"], focus: ["pump"] }],
};

test("fitAspect keeps the box and reaches the aspect", () => {
  for (const aspect of [0.5, 1, 2.4]) {
    const [x, y, w, h] = fitAspect([10, 20, 100, 50], aspect);
    assert.ok(Math.abs(w / h - aspect) < 0.01);
    assert.ok(x <= 10 && y <= 20 && x + w >= 110 && y + h >= 70);
  }
});

test("boxOf unions part boxes and throws on unknown parts", () => {
  const view = fakeCapture().views.rest;
  assert.deepEqual(boxOf(view, ["pump", "bell"]), [100, 100, 160, 420]);
  assert.throws(() => boxOf(view, ["nope"]), /no boxes/);
});

test("focusCrop has the asked aspect and stays inside a larger frame", () => {
  const view = fakeCapture().views.rest;
  const frame = [0, 0, 400, 600];
  const [x, y, w, h] = focusCrop(view, ["pump"], 1, frame);
  assert.ok(Math.abs(w / h - 1) < 0.01);
  assert.ok(x >= 0 && y >= 0 && x + w <= 400.1 && y + h <= 600.1);
  assert.ok(x <= 100 && x + w >= 180);
});

test("relax pushes pins apart to the gap and keeps distant pins still", () => {
  const out = relax([{ n: 1, at: [0, 0] }, { n: 2, at: [1, 0] }, { n: 3, at: [1, 1] }, { n: 4, at: [100, 100] }], 10);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(Math.hypot(out[i].pos[0] - out[j].pos[0], out[i].pos[1] - out[j].pos[1]) >= 9.99);
  assert.deepEqual(out[3].pos, [100, 100]);
});

test("layerTable stores a layer shared by two views once", () => {
  const { defs, refs } = layerTable(fakeCapture().views);
  assert.equal(refs.rest[0], refs.apart[0]);
  assert.notEqual(refs.rest[1], refs.apart[1]);
  assert.equal((defs.match(/<g id="pl/g) ?? []).length, 3);
});

test("every format renders its pages, numbered pins and the named parts only", () => {
  for (const format of FORMATS) {
    const html = sheetHtml(fakeCapture(), SPEC, PAPER.a4, format);
    assert.equal((html.match(/<main class="ps /g) ?? []).length, pagesOf(format), format);
    assert.match(html, /@page\{size:210mm 297mm/);
    const pins = [...html.matchAll(/class="ps-pin" style="[^"]*">(\d+)</g)].map((m) => m[1]);
    assert.deepEqual(pins, ["1", "2"], format);
    assert.ok(html.includes("Pump") && html.includes("Bell"));
    assert.ok(!/https?:\/\//.test(html.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "")), `${format} reaches outside the page`);
  }
});

test("focus lights the asked parts, dims the rest and hide removes a part", () => {
  const html = sheetHtml(fakeCapture(), SPEC, PAPER.a4, "drawing");
  assert.match(html, /--part-hi:#cdcdd1;[^"]*--on-pump-hi:#000000/);
  assert.match(html, /--on-bell-hi:#000000;[^"]*--show-frame:none/);
  assert.match(html, /<image href="data:image\/png;base64,AAAA" x="50" y="50" width="300" height="400"/);
});

test("the detailed format marks close-ups on the figure and adds the why", () => {
  const html = sheetHtml(fakeCapture(), SPEC, PAPER.a4, "detailed");
  assert.match(html, /class="ps-mark"/);
  assert.match(html, /ps-letter[^>]*>A</);
  assert.ok(html.includes("Because."));
});

test("Letter paper changes the page size and unknown formats throw", () => {
  assert.match(sheetHtml(fakeCapture(), SPEC, PAPER.letter, "poster"), /@page\{size:215\.9mm 279\.4mm/);
  assert.throws(() => sheetHtml(fakeCapture(), SPEC, PAPER.a4, "zine"), /unknown format/);
});

test("a landscape poster keeps every content box inside the printable area", async () => {
  const view = {
    vb: [0, 0, 700, 500],
    content: [0, 0, 700, 500],
    layers: [`<path d="M0 0H700V500H0Z"/>`],
    boxes: {},
    anchors: {},
  };
  const capture = { css: "", views: { apart: view } };
  const spec = {
    name: "Wide table",
    title: "Wide table",
    number: "AN-1",
    tagline: "Landscape",
    question: "Does the whole poster fit?",
    lead: "The figure is only a little wider than the page is tall.",
    quote: "Fits on one page",
    numbers: [["1", "row", "one"], ["2", "row", "two"]],
    parts: [
      { id: "a", name: "Hydrogen", say: "The first tile." },
      { id: "b", name: "Helium", say: "The second tile." },
    ],
    main: { view: "apart", crop: [0, 0, 700, 500] },
  };
  const measure = `(() => {
    const page = document.querySelector("main.ps");
    const rect = page.getBoundingClientRect();
    const style = getComputedStyle(page);
    const pad = (name) => parseFloat(style[name]) || 0;
    const limit = { left: rect.left + pad("paddingLeft"), top: rect.top + pad("paddingTop"), right: rect.right - pad("paddingRight"), bottom: rect.bottom - pad("paddingBottom") };
    const nodes = [...page.querySelectorAll("header, aside, .pp-art, .pp-legend, footer, .ps-fig, h1, .pp-q, .pp-lead")];
    const over = [];
    for (const el of nodes) {
      const box = el.getBoundingClientRect();
      if (box.width < 1 && box.height < 1) continue;
      const past = Math.max(limit.left - box.left, limit.top - box.top, box.right - limit.right, box.bottom - limit.bottom);
      if (past > 1) over.push({ cls: String(el.className).slice(0, 40), past: Math.round(past * 10) / 10 });
    }
    return { wide: page.classList.contains("pp-wide"), over, contentH: Math.round(limit.bottom - limit.top) };
  })()`;
  const directory = await mkdtemp(join(tmpdir(), "anatomy-poster-"));
  try {
    for (const paper of [PAPER.a4Landscape, PAPER.letterLandscape]) {
      const page = join(directory, `${paper.name}.html`);
      const actions = join(directory, `${paper.name}.json`);
      await writeFile(page, sheetHtml(capture, spec, paper, "poster"));
      await writeFile(actions, JSON.stringify([["eval", measure]]));
      const result = await execute(process.execPath, [drive, page, "--actions", actions, "--width", "1400", "--height", "1000", "--no-webgl"], { timeout: 30000 });
      const line = result.stdout.split("\n").find((item) => item.startsWith("eval: "));
      const measured = JSON.parse(line.slice(6));
      assert.equal(measured.wide, true, paper.name);
      assert.deepEqual(measured.over, [], `${paper.name} overflows the printable area`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("landscape paper is A4 or Letter turned on its side", () => {
  assert.deepEqual(paperChoice({ landscape: true }), PAPER.a4Landscape);
  assert.deepEqual(paperChoice({ letter: true, landscape: true }), PAPER.letterLandscape);
  assert.match(sheetHtml(fakeCapture(), SPEC, PAPER.a4Landscape, "poster"), /@page\{size:297mm 210mm/);
  assert.match(sheetHtml(fakeCapture(), SPEC, PAPER.letterLandscape, "poster"), /@page\{size:279\.4mm 215\.9mm/);
});

test("a pin placed off its anchor draws a leader to the target", () => {
  const spec = {
    ...SPEC,
    parts: [
      { id: "pump", name: "Pump", say: "Raises the pressure.", at: [40, 40] },
      { id: "bell", name: "Bell", say: "Turns pressure into speed." },
    ],
  };
  const view = fakeCapture().views.apart;
  const leader = pinLeader({ n: 1, at: [40, 40], target: view.anchors.pump, pos: [40, 40] }, 1);
  assert.ok(leader);
  assert.deepEqual([leader.x2, leader.y2], view.anchors.pump);
  const html = sheetHtml(fakeCapture(), spec, PAPER.a4, "poster");
  assert.match(html, /<line x1="40" y1="40" x2="140" y2="130"/);
});

test("captureScript is one expression that carries the part selectors and copies computed colour", () => {
  const script = captureScript({ parts: [{ id: "pump", name: "Pump", select: '[data-name^="pump"]' }, { id: "x", name: "X" }], strip: [".glow"] });
  assert.doesNotThrow(() => new Function(`return ${script}`));
  assert.ok(script.includes('[data-name^=\\"pump\\"]'));
  assert.ok(script.includes(".glow"));
  assert.ok(!script.includes('"id":"x"'));
  assert.match(script, /paintedStyle/);
  assert.match(script, /function inlinePaint/);
  assert.match(script, /Anatomy Latin, Anatomy Hangul, sans-serif/);
  assert.match(script, /localName === "text"/);
});

test("detailed grows from 2 to 4 pages with steps and assemblies, under a cap", () => {
  const steps = (n) => Array.from({ length: n }, (_, i) => ({ title: `s${i}` }));
  const asm = (n) => Array.from({ length: n }, (_, i) => ({ title: `a${i}`, parts: ["pump"] }));
  assert.equal(detailedPlan({ steps: steps(5), why: { title: "w", text: "t" } }).total, 2);
  assert.equal(detailedPlan({ steps: steps(5), assemblies: asm(4) }).total, 3);
  assert.equal(detailedPlan({ steps: steps(9), assemblies: asm(4) }).total, 4);
  assert.equal(detailedPlan({ steps: steps(9), assemblies: asm(8) }).total, 4);
  assert.equal(detailedPlan({ steps: steps(5), assemblies: asm(4), maxPages: 2 }).total, 2);
  assert.throws(() => detailedPlan({ steps: steps(19) }), /over maxPages/);
  const html = sheetHtml(fakeCapture(), { ...SPEC, assemblies: [{ title: "Pump group", parts: ["pump"] }] }, PAPER.a4, "detailed");
  assert.equal((html.match(/<main class="ps /g) ?? []).length, 3);
  assert.ok(html.includes("Assemblies") && html.includes("1 / 3"));
});

test("poster titles keep wrapped CJK from colliding and prefer an outline Korean font", () => {
  const html = sheetHtml(fakeCapture(), { ...SPEC, name: "문장 조립 라인" }, PAPER.a4, "poster");
  assert.match(html, /line-height:1\.08/);
  assert.doesNotMatch(html, /line-height:\.86/);
  assert.match(html, /word-break:keep-all/);
  assert.match(html, /Anatomy Hangul/);
  assert.match(html, /local\("NanumGothic"\)/);
  assert.match(html, /font-weight:700/);
  assert.match(html, /font-synthesis:none/);
  assert.match(html, /local\("NanumGothicBold"\)/);
  assert.match(html, /local\("NotoSans-Regular"\)/);
  assert.match(html, /local\("Arimo-Regular"\)/);
  assert.match(html, /local\("NotoSans-Bold"\)/);
  assert.match(html, /Anatomy Latin/);
  assert.match(html, /font-weight:500/);
  assert.match(html, /font:500 6pt\/1 "Anatomy Hangul","Anatomy Latin"/);
  assert.doesNotMatch(html, /font:500 6pt\/1 "Helvetica Neue"/);
  assert.match(html, /문장 조립 라인/);
});
