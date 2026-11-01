// A4 cut-and-fold sheet: one cross-shaped net per block, solid cut lines,
// dashed hinges, glue tabs, and teaching words at 20pt or larger.
import { escapeHtml } from "./fold.mjs";
import { PRINT_FONT_FACE, PRINT_FONT_FAMILY, PRINT_FONT_SYNTHESIS } from "./print-fonts.mjs";

export const SHEET_LABELS = {
  title: "Cut and fold paper nets",
  cutMark: "Cut.",
  foldMark: "Fold.",
  glueMark: "Glue.",
  cut: "Cut the solid outer line",
  fold: "Fold the dashed hinge inward",
  glue: "Glue the shaded tab and close the block",
  glueTab: "glue",
  footer: "Sentence blocks",
};

function marked(mark, text) {
  const prefix = String(mark || "").trim();
  let body = String(text || "").trim();
  if (!prefix) return escapeHtml(body);
  if (body.includes(prefix)) body = body.split(prefix).join(" ").replace(/\s+/g, " ").trim();
  return `<b>${escapeHtml(prefix)}</b>${body ? ` ${escapeHtml(body)}` : ""}`;
}

function styleOf(block) {
  return `--n-fill:${block.fill || "#fff"};--n-top:${block.top || block.fill || "#fff"};--n-flap:${(block.shades && block.shades[0]) || block.fill || "#eee"};--n-edge:${block.edge || "#222"};--n-ink:${block.ink || "#111"};--n-sub:${block.sub || block.ink || "#333"}`;
}

export function paperNetHtml(block, { glue = SHEET_LABELS.glueTab, scene = "" } = {}) {
  const word = String(block.text || "");
  const wide = word.length >= 14 ? " fn-print-net-wide" : word.length >= 8 ? " fn-print-net-med" : "";
  const key = block.key || block.slot || "";
  return `<div class="fn-print-net${wide}" style="${styleOf(block)}"><div class="fn-p-glue fn-p-glue-top"><span>${escapeHtml(glue)}</span></div><div class="fn-p-flap fn-p-flap-top"><span>${escapeHtml(scene)} ${escapeHtml(block.role || "")}</span></div><div class="fn-p-glue fn-p-glue-left"><span>${escapeHtml(glue)}</span></div><div class="fn-p-flap fn-p-flap-left"><span>L</span></div><div class="fn-p-center"><div class="fn-p-word" data-legible>${escapeHtml(word)}</div><div class="fn-p-role">${escapeHtml(block.label || "")}</div>${block.note ? `<div class="fn-p-extra">${escapeHtml(block.note)}</div>` : ""}</div><div class="fn-p-flap fn-p-flap-right"><span>R</span></div><div class="fn-p-glue fn-p-glue-right"><span>${escapeHtml(glue)}</span></div><div class="fn-p-flap fn-p-flap-bot"><span>${escapeHtml(key)}</span></div><div class="fn-p-glue fn-p-glue-bot"><span>${escapeHtml(glue)}</span></div></div>`;
}

function bandHtml(band, labels) {
  const nets = (band.blocks || []).map((block) => paperNetHtml(block, { glue: labels.glueTab, scene: band.title || "" })).join("");
  const columns = band.columns || Math.min(4, (band.blocks || []).length || 1);
  return `<section class="fs-band"><div class="fs-band-hd"><div><span class="fs-badge">${escapeHtml(band.title || "")}</span> <span class="fs-formula">${escapeHtml(band.formula || "")}</span> <strong class="fs-sent">${escapeHtml(band.sentence || "")}</strong></div><span class="fs-readout">${escapeHtml(band.readout || "")}</span></div><div class="fs-nets" style="grid-template-columns:repeat(${columns},minmax(0,1fr))">${nets}</div></section>`;
}

export function foldSheetCss() {
  return `${PRINT_FONT_FACE}
@page{size:210mm 297mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#e9e9e6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{html,body{background:#fff}.fs-page{margin:0!important;box-shadow:none!important}}
.fs-page{width:210mm;height:297mm;margin:0 auto;padding:8mm 10mm 7mm;background:#fff;color:#151517;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;break-after:page;font-family:${PRINT_FONT_FAMILY};${PRINT_FONT_SYNTHESIS}}
.fs-page:last-of-type{break-after:auto}
.fs-hd{border-bottom:.3mm solid #151517;padding-bottom:1.8mm;margin-bottom:2mm}
.fs-hd h1{margin:0;font-size:13pt;font-weight:800;letter-spacing:-.02em}
.fs-sub{margin:.6mm 0 0;font-size:8pt;font-weight:600;color:#4b5563}
.fs-instr{display:flex;gap:3mm;flex-wrap:wrap;margin-top:1.4mm;padding:1.2mm 2mm;background:#f8fafc;border:.22mm solid #94a3b8}
.fs-instr span{font-size:7pt;color:#1e293b}
.fs-body{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:2mm;min-height:0}
.fs-band{border:.22mm solid #cbd5e1;padding:1.6mm 2mm;background:#fcfcfb}
.fs-band-hd{display:flex;justify-content:space-between;gap:2mm;align-items:baseline;border-bottom:.16mm solid #e2e8f0;padding-bottom:.8mm;margin-bottom:1.4mm}
.fs-badge{font-size:7.5pt;font-weight:800;background:#1e293b;color:#fff;padding:.2mm 1.4mm}
.fs-formula{font-family:Menlo,monospace;font-size:7pt;font-weight:700}
.fs-sent{font-size:9pt;font-weight:800}
.fs-readout{font:6pt Menlo,monospace;color:#64748b}
.fs-nets{display:grid;gap:2mm;align-items:center;justify-items:center}
.fn-print-net{width:100%;max-width:52mm;display:grid;grid-template-columns:2.6mm 4mm minmax(0,1fr) 4mm 2.6mm;grid-template-rows:3.2mm 5.2mm auto 5.2mm 3.2mm}
.fn-print-net-med{max-width:62mm}
.fn-print-net-wide{max-width:74mm}
.fn-p-center{grid-column:3;grid-row:3;background:var(--n-fill);border:.45mm dashed var(--n-edge);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1mm .8mm;min-height:18mm}
.fn-p-word{font-size:20pt;font-weight:800;line-height:1.05;letter-spacing:-.03em;color:var(--n-ink)}
.fn-p-role{margin-top:.4mm;font-size:7pt;font-weight:800;color:var(--n-ink);background:rgba(255,255,255,.7);border:.2mm solid var(--n-edge);padding:.15mm 1mm}
.fn-p-extra{margin-top:.3mm;font-size:6pt;font-weight:700;color:var(--n-sub)}
.fn-p-flap{background:var(--n-top);display:flex;align-items:center;justify-content:center;font:700 5pt Menlo,monospace;color:var(--n-sub)}
.fn-p-flap-top{grid-column:3;grid-row:2;border-left:.45mm solid var(--n-edge);border-right:.45mm solid var(--n-edge);border-top:.4mm dashed var(--n-edge)}
.fn-p-flap-bot{grid-column:3;grid-row:4;border-left:.45mm solid var(--n-edge);border-right:.45mm solid var(--n-edge);border-bottom:.4mm dashed var(--n-edge)}
.fn-p-flap-left{grid-column:2;grid-row:3;border-top:.45mm solid var(--n-edge);border-bottom:.45mm solid var(--n-edge);border-left:.4mm dashed var(--n-edge)}
.fn-p-flap-right{grid-column:4;grid-row:3;border-top:.45mm solid var(--n-edge);border-bottom:.45mm solid var(--n-edge);border-right:.4mm dashed var(--n-edge)}
.fn-p-glue{background:repeating-linear-gradient(135deg,rgba(255,255,255,.75) 0 1mm,var(--n-flap) 1mm 2mm);border:.45mm solid var(--n-edge);display:flex;align-items:center;justify-content:center;font-size:5pt;font-weight:800;color:var(--n-ink)}
.fn-p-glue-top{grid-column:3;grid-row:1;border-bottom:none;margin:0 2.4mm}
.fn-p-glue-bot{grid-column:3;grid-row:5;border-top:none;margin:0 2.4mm}
.fn-p-glue-left{grid-column:1;grid-row:3;border-right:none;margin:2mm 0}
.fn-p-glue-right{grid-column:5;grid-row:3;border-left:none;margin:2mm 0}
.fs-ft{border-top:.2mm solid #151517;padding-top:1.2mm;margin-top:1.4mm;display:flex;justify-content:space-between;font:6pt Menlo,monospace;color:#64748b}`;
}

export function foldSheetDocument({ title, pages = [], labels = {} } = {}) {
  const text = { ...SHEET_LABELS, ...labels, title: title || labels.title || SHEET_LABELS.title };
  const total = pages.length || 1;
  const body = pages.map((page, index) => {
    const bands = (page.bands || []).map((band) => bandHtml(band, text)).join("");
    return `<section class="fs-page"><header class="fs-hd"><h1>${escapeHtml(text.title)}</h1><p class="fs-sub">${escapeHtml(page.subtitle || "")}</p><div class="fs-instr"><span>${marked(text.cutMark, text.cut)}</span><span>${marked(text.foldMark, text.fold)}</span><span>${marked(text.glueMark, text.glue)}</span></div></header><div class="fs-body">${bands}</div><footer class="fs-ft"><span>${escapeHtml(text.footer)}</span><span>A4 · ${index + 1} / ${total}</span></footer></section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(text.title)}</title><style>${foldSheetCss()}</style></head><body>${body}</body></html>`;
}
