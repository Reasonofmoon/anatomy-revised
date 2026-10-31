import assert from "node:assert/strict";
import test from "node:test";
import { foldCss, foldLayerHtml, foldNetsHtml, foldScript } from "../kit/fold.mjs";
import { foldSheetDocument } from "../kit/fold-sheet.mjs";
import { LEGIBLE } from "./legible-text.mjs";

const block = {
  id: "s",
  slot: "s",
  role: "S",
  text: "Tom",
  label: "Subject S",
  important: "subject",
  key: "KEY · S",
  fill: "#FDE68A",
  top: "#FEF3C7",
  edge: "#92400E",
  ink: "#451A03",
  sub: "#78350F",
  shades: ["#FCD34D", "#F59E0B", "#D97706", "#B45309"],
};

test("fold nets carry teaching text, hinges and a glue tab", () => {
  const html = foldLayerHtml({ blocks: [block], formula: "S + V + O" });
  assert.match(html, /data-fold-layer/);
  assert.match(html, /data-legible/);
  assert.match(html, /fn-word/);
  assert.match(html, />Tom</);
  assert.match(html, /class="fn-glue"/);
  assert.match(html, /data-important="subject"/);
  assert.match(html, /fn-glue" data-legible="secondary"/);
  assert.match(html, /fn-slot-tag" data-legible="secondary"/);
  assert.match(html, /data-fold-hint data-important="hint"/);
  assert.match(html, /S \+ V \+ O/);
  const css = foldCss();
  assert.match(css, /\.fn-word\{font-size:32px/);
  assert.match(css, /rotateX\(-86deg\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("fold runtime exposes a state hook and escapes block text", () => {
  const source = foldScript({ blocks: [{ ...block, text: "Tom <reads>" }], slots: { s: [10, 20] }, width: 100, height: 80, initial: "unfolded" });
  assert.match(source, /window\.__fold/);
  assert.match(source, /set\(next, immediate = false\) \{ return setFoldState/);
  assert.match(source, /resolve\(foldState\)/);
  assert.match(source, /data-fold-legend/);
  assert.match(source, /extra\.formula/);
  assert.match(source, /\\u003creads/);
  assert.doesNotMatch(source, /Tom <reads>/);
  assert.equal(foldNetsHtml([{ text: "a<b", slot: "s", fill: "#fff" }]).includes("a<b"), false);
});

test("cut-and-fold sheet keeps words at the print minimum", () => {
  const html = foldSheetDocument({
    title: "Sentence blocks",
    pages: [{ subtitle: "One sentence", bands: [{ title: "3형식", formula: "S + V + O", sentence: "Tom reads books.", blocks: [block, { ...block, id: "v", text: "reads", role: "V" }] }] }],
  });
  assert.match(html, /@page\{size:210mm 297mm/);
  assert.match(html, /\.fn-p-word\{font-size:20pt/);
  assert.ok(LEGIBLE.printPt >= 20);
  assert.match(html, /fn-p-glue/);
  assert.match(html, /dashed var\(--n-edge\)/);
  assert.match(html, /solid var\(--n-edge\)/);
  assert.match(html, />Tom</);
  assert.match(html, /<b>Cut\.<\/b>/);
  assert.match(html, /A4 · 1 \/ 1/);
  const korean = foldSheetDocument({
    title: "문장 조립 라인",
    labels: { cutMark: "자르기.", foldMark: "접기.", glueMark: "풀칠.", cut: "실선", fold: "점선", glue: "탭" },
    pages: [{ subtitle: "1형식", bands: [{ title: "1형식", formula: "S + V", sentence: "The baby sleeps.", blocks: [block] }] }],
  });
  assert.match(korean, /<b>자르기\.<\/b> 실선/);
  assert.match(korean, /<b>접기\.<\/b> 점선/);
  assert.match(korean, /<b>풀칠\.<\/b> 탭/);
  assert.doesNotMatch(korean, /<b>Cut\.<\/b>/);
  assert.match(korean, /Anatomy Hangul/);
  assert.match(korean, /local\("NanumGothic"\)/);
  assert.match(korean, /font-weight:700/);
  assert.match(korean, /font-synthesis:none/);
  const doubled = foldSheetDocument({
    title: "문장",
    labels: { cutMark: "자르기.", cut: "자르기. 실선을 따라 자른다", foldMark: "접기.", fold: "접기. 점선", glueMark: "풀칠.", glue: "풀칠. 탭" },
    pages: [{ bands: [{ blocks: [block] }] }],
  });
  assert.equal((doubled.match(/자르기\./g) || []).length, 1);
  assert.match(doubled, /<b>자르기\.<\/b> 실선을 따라 자른다/);
  assert.doesNotMatch(doubled, /자르기\. 자르기\./);
  assert.match(korean, /line-height:1\.05/);
});
