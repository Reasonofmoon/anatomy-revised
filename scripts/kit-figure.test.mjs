import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GRID_AZIMUTH, GRID_ELEVATION, ISO_CSS, fitProjection, flatLabelSvg, iso, paletteCss, plateHtml } from "../kit/iso-kit.mjs";
import { inlinePaint } from "./print-paint.mjs";
import { reportLegible } from "./legible-text.mjs";

test("paletteCss writes a category ramp without a hand-built stylesheet", () => {
  const css = paletteCss({
    alkali: {
      dark: { top: "#111", shades: ["#000", "#222", "#333", "#444"], paper: "#010", hi: "#eee", lo: "#555" },
      light: { top: "#fff", shades: ["#111", "#222", "#333", "#444"], paper: "#eee", hi: "#000", lo: "#888" },
    },
  });
  assert.match(css, /\[data-palette="alkali"\]\{--anatomy-top:#111/);
  assert.match(css, /--anatomy-shade-0:#000/);
  assert.match(css, /--anatomy-shade-3:#444/);
  assert.match(css, /\.iso\[data-theme="light"\] \[data-palette="alkali"\]\{--anatomy-top:#fff/);
  const plain = paletteCss({ metal: { top: "#abc", shades: ["#111"] } });
  assert.match(plain, /\[data-palette="metal"\]\{--anatomy-top:#abc;--anatomy-shade-0:#111\}/);
});

test("a dense grid camera is near top-down and flat labels are not sheared", () => {
  assert.ok(GRID_AZIMUTH > 80 && GRID_AZIMUTH < 90);
  assert.ok(GRID_ELEVATION > 60 && GRID_ELEVATION < 80);
  const camera = { origin: [0, 0], scale: 1, azimuth: GRID_AZIMUTH, elevation: GRID_ELEVATION };
  const [xAxis] = iso([1, 0, 0], camera);
  const [yAxis] = iso([0, 1, 0], camera);
  assert.ok(Math.abs(xAxis) > Math.abs(yAxis) * 4);
  const projection = fitProjection([[0, 0, 0], [18, 0, 0], [0, 10, 0], [0, 0, 1]], 640, 360, { azimuth: GRID_AZIMUTH, elevation: GRID_ELEVATION });
  const label = flatLabelSvg([4, 3, 1], projection, "Fe");
  assert.match(label, /class="iso-flat-label"/);
  assert.match(label, />Fe</);
  assert.doesNotMatch(label, /transform=/);
});

test("the legend sits inside the plate and the footer wraps on a narrow screen", () => {
  const html = plateHtml({
    fig: "Fig 1",
    title: "Table",
    hint: "Keys 1-0",
    readout: "118 elements",
    keys: [{ mark: "lit", label: "Alkali", html: "<i class='sw'></i>" }],
    caption: "Ten colours",
    body: "<svg></svg>",
  });
  const plate = html.slice(html.indexOf('<div class="iso-plate">'), html.lastIndexOf("</div></figure>"));
  assert.match(plate, /class="iso-legend"/);
  assert.match(plate, /data-edge="bottom"/);
  assert.match(html, /<i class='sw'><\/i>Alkali/);
  assert.match(ISO_CSS, /white-space:normal/);
  assert.match(ISO_CSS, /flex-wrap:wrap/);
  assert.match(ISO_CSS, /max-width:720px/);
  const file = readFileSync(new URL("../kit/iso.css", import.meta.url), "utf8");
  assert.equal(file.trim(), ISO_CSS.trim());
});

test("print capture keeps a category colour and leaves tone fills to the variables", () => {
  const baked = inlinePaint({
    props: { "--cat-top": "#f4c7c3", "--anatomy-top": "#ffffff" },
    parent: { "--anatomy-top": "#ffffff" },
    fill: "rgb(244, 199, 195)",
    stroke: "none",
    tokens: ["#ffffff", "rgb(255, 255, 255)"],
  });
  assert.match(baked, /--cat-top:#f4c7c3/);
  assert.doesNotMatch(baked, /--anatomy-top/);
  assert.match(baked, /fill:rgb\(244, 199, 195\)/);
  const tone = inlinePaint({
    props: { "--anatomy-top": "#f4c7c3" },
    parent: {},
    fill: "#f4c7c3",
    tokens: ["#f4c7c3"],
  });
  assert.match(tone, /--anatomy-top:#f4c7c3/);
  assert.doesNotMatch(tone, /fill:/);
  const part = inlinePaint({ props: { "--anatomy-hi": "#111" }, parent: {}, fill: "red", tokens: [], part: true });
  assert.match(part, /--anatomy-hi:#111/);
  assert.doesNotMatch(part, /fill:/);
});

test("a folded legibility warning tells you to pass --state unfolded", () => {
  const report = reportLegible({ checked: 0, teaching: 0, failures: [], warnings: [], folded: true, fold: true, min: 28 });
  const text = report.lines.join("\n");
  assert.match(text, /--state unfolded/);
  assert.doesNotMatch(text, /--eval/);
});
