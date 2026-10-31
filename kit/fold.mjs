// Front-facing paper nets for words that must be read. Isometric face text
// stays small; a fold layer draws each block flat, then folds it into a slot.
// references/fold.md

export const FOLD_LABELS = {
  unfolded: "Unfolded nets",
  folded: "Folded in slots",
  fold: "Fold into slots",
  unfold: "Unfold",
  hint: "Dashed lines are hinges. The outer line is the cut. The tab is the key. Space or click folds the net into its slot.",
  glue: "glue",
  kbd: "Space / click",
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shadesOf(block) {
  const shades = block.shades || [];
  return [0, 1, 2, 3].map((index) => shades[index] || block.fill || "#eeeeee");
}

function styleOf(block) {
  const [a, b, c, d] = shadesOf(block);
  return [
    `--fn-fill:${block.fill || "#fff"}`,
    `--fn-top:${block.top || block.fill || "#fff"}`,
    `--fn-edge:${block.edge || "#222"}`,
    `--fn-ink:${block.ink || "#111"}`,
    `--fn-sub:${block.sub || block.ink || "#333"}`,
    `--fn-0:${a}`,
    `--fn-1:${b}`,
    `--fn-2:${c}`,
    `--fn-3:${d}`,
  ].join(";");
}

export function foldNetsHtml(blocks = [], labels = {}) {
  const glue = escapeHtml(labels.glue || FOLD_LABELS.glue);
  return blocks.map((block, index) => {
    const compact = String(block.text || "").length > 16 ? " data-compact=\"true\"" : "";
    const weight = Number(block.weight ?? Math.max(1, String(block.text || "").length / 6));
    const important = block.important ? ` data-important="${escapeHtml(block.important)}"` : "";
    const note = block.note ? `<div class="fn-note">${escapeHtml(block.note)}</div>` : "";
    return `<div class="fn-net" data-net="${escapeHtml(block.id ?? index)}" data-role="${escapeHtml(block.role || "")}" data-slot="${escapeHtml(block.slot ?? index)}"${compact}${important} style="flex:${weight.toFixed(2)} 1 0%;${styleOf(block)}"><div class="fn-flap fn-flap-top"><div class="fn-glue" data-legible="secondary">${glue}</div></div><div class="fn-flap fn-flap-left"></div><div class="fn-flap fn-flap-right"></div><div class="fn-main"><div class="fn-word" data-legible data-net-word>${escapeHtml(block.text)}</div><div class="fn-role">${escapeHtml(block.label || "")}</div>${note}</div><div class="fn-flap fn-flap-bottom"><span class="fn-slot-tag" data-legible="secondary">${escapeHtml(block.key || block.slot || "")}</span></div></div>`;
  }).join("");
}

export function foldLegendHtml(blocks = []) {
  return `<div class="fn-legend" data-fold-legend>${blocks.map((block) => `<div class="fn-legend-item" data-role="${escapeHtml(block.role || "")}"${block.important ? ` data-important="${escapeHtml(block.important)}"` : ""} style="${styleOf(block)}"><div class="fn-legend-word" data-legible>${escapeHtml(block.text)}</div><div class="fn-legend-role">${escapeHtml(block.label || "")}</div></div>`).join("")}</div>`;
}

export function foldLayerHtml({ blocks = [], labels = {}, state = "unfolded", formula = "" } = {}) {
  const text = { ...FOLD_LABELS, ...labels };
  const pill = state === "folded" ? text.folded : text.unfolded;
  const button = state === "folded" ? text.unfold : text.fold;
  return `<div class="fn-layer" data-fold-layer data-fold-state="${escapeHtml(state)}" data-fold-phase="flat"><div class="fn-top" data-important="controls"><div class="fn-badges"><span class="fn-pill" data-fold-pill>${escapeHtml(pill)}</span>${formula ? `<span class="fn-formula" data-fold-formula>${escapeHtml(formula)}</span>` : `<span class="fn-formula" data-fold-formula></span>`}</div><button type="button" class="fn-toggle" data-fold-toggle><span data-fold-btn>${escapeHtml(button)}</span><kbd class="fn-kbd">${escapeHtml(text.kbd)}</kbd></button></div><div class="fn-center" data-fold-center><div class="fn-nets" data-fold-nets>${foldNetsHtml(blocks, text)}</div></div><p class="fn-hint" data-fold-hint data-important="hint">${escapeHtml(text.hint)}</p></div>`;
}

export function foldCss() {
  return `.fn-stage{position:relative;cursor:pointer;user-select:none;container-type:inline-size}
.fn-stage>.iso-svg{transition:opacity 380ms cubic-bezier(.32,.72,0,1)}
.fn-stage[data-fold-instant]>.iso-svg,.fn-stage[data-fold-instant] .fn-net,.fn-stage[data-fold-instant] .fn-flap{transition:none}
.fn-stage[data-stage-fold="unfolded"]>.iso-svg,.fn-stage[data-stage-fold="folding"]>.iso-svg{opacity:.2}
.fn-stage[data-stage-fold="folded"]>.iso-svg{opacity:1}
.fn-layer{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;justify-content:space-between;padding:8px 4px 6px;pointer-events:none}
.fn-top{display:flex;align-items:center;justify-content:space-between;gap:8px;pointer-events:auto;z-index:8}
.fn-badges{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.fn-pill{background:var(--anatomy-strong);color:var(--anatomy-card);font-size:12px;font-weight:700;padding:3px 8px}
.fn-formula{border:1px solid var(--anatomy-lo);background:color-mix(in srgb,var(--anatomy-card) 92%,transparent);color:var(--anatomy-strong);font:700 12px/1.3 var(--anatomy-mono);padding:2px 8px}
.fn-toggle{appearance:none;display:inline-flex;align-items:center;gap:6px;background:var(--anatomy-card);color:var(--anatomy-strong);border:1.5px solid var(--anatomy-strong);padding:4px 10px;font:700 12px/1.3 inherit;cursor:pointer}
.fn-toggle:hover{background:var(--anatomy-lit-top)}
.fn-kbd{font:600 10.5px/1.3 var(--anatomy-mono);padding:1px 5px;background:var(--anatomy-shade-2);border:1px solid var(--anatomy-lo);color:var(--anatomy-text)}
.fn-center{flex:1;display:flex;align-items:center;justify-content:center;width:100%;padding:18px 0 28px}
.fn-nets{display:flex;align-items:center;justify-content:center;gap:8px;width:100%}
.fn-net{position:relative;margin:22px 16px 28px;perspective:750px;transform-style:preserve-3d;transition:transform 340ms cubic-bezier(.32,.72,0,1),opacity 300ms ease;pointer-events:auto}
.fn-layer[data-fold-phase="drop"] .fn-net{transform:translate(var(--drop-x,0px),var(--drop-y,72px)) scale(.24);opacity:0}
.fn-layer[data-fold-state="folded"] .fn-center,.fn-layer[data-fold-state="folded"] .fn-hint{opacity:0;visibility:hidden;pointer-events:none}
.fn-main{position:relative;z-index:3;min-height:104px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;padding:10px 8px 8px;background:var(--fn-fill);border:2px dashed var(--fn-edge);box-shadow:0 6px 18px rgba(0,0,0,.13)}
.fn-word{font-size:32px;font-weight:800;line-height:1.15;letter-spacing:-.02em;color:var(--fn-ink)}
.fn-net[data-compact="true"] .fn-word{font-size:28px}
.fn-role{font-size:15px;font-weight:800;line-height:1.2;color:var(--fn-sub);background:color-mix(in srgb,var(--fn-top) 78%,white);padding:2px 7px;border:1px solid var(--fn-edge)}
.fn-note{font-size:12px;font-weight:800;color:var(--fn-ink);background:var(--fn-top);border:1.5px solid var(--fn-edge);padding:1px 7px}
.fn-flap{position:absolute;background:var(--fn-0);border:1.5px solid var(--fn-edge);transition:transform 310ms cubic-bezier(.32,.72,0,1),background-color 310ms ease}
.fn-flap-top{bottom:100%;left:-1px;right:-1px;height:18px;border-bottom:none;transform-origin:50% 100%;background:var(--fn-top)}
.fn-glue{position:absolute;bottom:100%;left:14%;right:14%;height:8px;background:var(--fn-0);border:1px solid var(--fn-edge);border-bottom:none;clip-path:polygon(8% 0,92% 0,100% 100%,0 100%);font-size:8px;line-height:8px;text-align:center;color:var(--fn-sub);font-weight:700}
.fn-flap-bottom{top:100%;left:-1px;right:-1px;height:18px;border-top:none;transform-origin:50% 0;display:flex;align-items:center;justify-content:center}
.fn-slot-tag{font:700 10px/1.2 var(--anatomy-mono);color:var(--fn-ink);letter-spacing:.03em}
.fn-flap-left{right:100%;top:-1px;bottom:-1px;width:16px;border-right:none;transform-origin:100% 50%;background:var(--fn-1)}
.fn-flap-right{left:100%;top:-1px;bottom:-1px;width:16px;border-left:none;transform-origin:0 50%;background:var(--fn-0)}
.fn-layer[data-fold-phase="hinge"] .fn-flap-top,.fn-layer[data-fold-phase="drop"] .fn-flap-top{transform:rotateX(-86deg);background:var(--fn-2)}
.fn-layer[data-fold-phase="hinge"] .fn-flap-bottom,.fn-layer[data-fold-phase="drop"] .fn-flap-bottom{transform:rotateX(86deg);background:var(--fn-2)}
.fn-layer[data-fold-phase="hinge"] .fn-flap-left,.fn-layer[data-fold-phase="drop"] .fn-flap-left{transform:rotateY(86deg);background:var(--fn-3)}
.fn-layer[data-fold-phase="hinge"] .fn-flap-right,.fn-layer[data-fold-phase="drop"] .fn-flap-right{transform:rotateY(-86deg);background:var(--fn-2)}
.fn-hint{align-self:center;margin:0;background:color-mix(in srgb,var(--anatomy-card) 92%,transparent);border:1px solid var(--anatomy-lo);padding:3px 10px;font-size:12px;font-weight:600;color:var(--anatomy-text);text-align:center}
.fn-legend{display:none;gap:8px;flex-wrap:wrap;margin-top:8px}
.fn-legend-item{flex:1 1 140px;background:var(--fn-fill);border:2px solid var(--fn-edge);padding:8px 12px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px}
.fn-legend-word{font-size:32px;font-weight:800;line-height:1.15;color:var(--fn-ink)}
.fn-legend-role{font-size:15px;font-weight:700;color:var(--fn-sub)}
@media (prefers-reduced-motion:reduce){.fn-net,.fn-flap,.fn-stage>.iso-svg{transition:none!important}.fn-legend{display:flex}}
@media (max-width:640px){.fn-nets{flex-wrap:wrap}.fn-net{margin:18px 12px 24px;flex:1 1 130px!important}.fn-layer[data-fold-state="folded"] .fn-center,.fn-layer[data-fold-state="folded"] .fn-hint{display:none}.fn-stage[data-stage-fold="unfolded"]{min-height:520px}.fn-stage[data-stage-fold="unfolded"]>.iso-svg{position:absolute;inset:0;width:100%;height:100%}.fn-stage[data-stage-fold="unfolded"] .fn-layer{position:relative;min-height:520px}.fn-stage[data-stage-fold="unfolded"] .an-callout,.fn-stage[data-stage-fold="unfolded"] .an-callout-leader{display:none}}
`;
}

export function foldScript(config) {
  const payload = JSON.stringify(config).replace(/</g, "\\u003c");
  return `const FOLD = ${payload};
const stage = document.querySelector("[data-fold-stage]");
const layer = document.querySelector("[data-fold-layer]");
const netsEl = document.querySelector("[data-fold-nets]");
const pill = document.querySelector("[data-fold-pill]");
const buttonText = document.querySelector("[data-fold-btn]");
const formulaEl = document.querySelector("[data-fold-formula]");
const svg = stage ? stage.querySelector("svg") : document.querySelector(".iso-svg");
const still = window.matchMedia("(prefers-reduced-motion: reduce)");
const labels = Object.assign({ unfolded: "Unfolded nets", folded: "Folded in slots", fold: "Fold into slots", unfold: "Unfold", glue: "glue" }, FOLD.labels || {});
let blocks = FOLD.blocks || [];
let foldState = still.matches ? "folded" : (FOLD.initial || "unfolded");
let timerA = 0;
let timerB = 0;
const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function render(next, extra) {
  if (extra && typeof extra === "object") {
    if (extra.formula != null) FOLD.formula = String(extra.formula);
    if (extra.labels) Object.assign(labels, extra.labels);
  }
  blocks = next || blocks;
  if (formulaEl) formulaEl.textContent = FOLD.formula || "";
  if (!netsEl) return foldState;
  const glue = esc(labels.glue);
  netsEl.innerHTML = blocks.map((block, index) => {
    const shades = block.shades || [];
    const paint = [0, 1, 2, 3].map((i) => shades[i] || block.fill || "#eee");
    const style = "--fn-fill:" + (block.fill || "#fff") + ";--fn-top:" + (block.top || block.fill || "#fff") + ";--fn-edge:" + (block.edge || "#222") + ";--fn-ink:" + (block.ink || "#111") + ";--fn-sub:" + (block.sub || block.ink || "#333") + ";--fn-0:" + paint[0] + ";--fn-1:" + paint[1] + ";--fn-2:" + paint[2] + ";--fn-3:" + paint[3];
    const compact = String(block.text || "").length > 16 ? " data-compact=\\"true\\"" : "";
    const weight = Number(block.weight ?? Math.max(1, String(block.text || "").length / 6));
    const important = block.important ? " data-important=\\"" + esc(block.important) + "\\"" : "";
    const note = block.note ? "<div class=\\"fn-note\\">" + esc(block.note) + "</div>" : "";
    return "<div class=\\"fn-net\\" data-net=\\"" + esc(block.id ?? index) + "\\" data-role=\\"" + esc(block.role || "") + "\\" data-slot=\\"" + esc(block.slot ?? index) + "\\"" + compact + important + " style=\\"flex:" + weight.toFixed(2) + " 1 0%;" + style + "\\"><div class=\\"fn-flap fn-flap-top\\"><div class=\\"fn-glue\\" data-legible=\\"secondary\\">" + glue + "</div></div><div class=\\"fn-flap fn-flap-left\\"></div><div class=\\"fn-flap fn-flap-right\\"></div><div class=\\"fn-main\\"><div class=\\"fn-word\\" data-legible data-net-word>" + esc(block.text) + "</div><div class=\\"fn-role\\">" + esc(block.label || "") + "</div>" + note + "</div><div class=\\"fn-flap fn-flap-bottom\\"><span class=\\"fn-slot-tag\\" data-legible=\\"secondary\\">" + esc(block.key || block.slot || "") + "</span></div></div>";
  }).join("");
  const legend = document.querySelector("[data-fold-legend]");
  if (legend) legend.innerHTML = blocks.map((block) => {
    const shades = block.shades || [];
    const paint = [0, 1, 2, 3].map((i) => shades[i] || block.fill || "#eee");
    const style = "--fn-fill:" + (block.fill || "#fff") + ";--fn-top:" + (block.top || block.fill || "#fff") + ";--fn-edge:" + (block.edge || "#222") + ";--fn-ink:" + (block.ink || "#111") + ";--fn-sub:" + (block.sub || block.ink || "#333") + ";--fn-0:" + paint[0] + ";--fn-1:" + paint[1] + ";--fn-2:" + paint[2] + ";--fn-3:" + paint[3];
    const important = block.important ? " data-important=\\"" + esc(block.important) + "\\"" : "";
    return "<div class=\\"fn-legend-item\\" data-role=\\"" + esc(block.role || "") + "\\"" + important + " style=\\"" + style + "\\"><div class=\\"fn-legend-word\\" data-legible>" + esc(block.text) + "</div><div class=\\"fn-legend-role\\">" + esc(block.label || "") + "</div></div>";
  }).join("");
  return foldState;
}
function drops() {
  if (!netsEl || !svg) return;
  const rect = svg.getBoundingClientRect();
  const box = svg.viewBox && svg.viewBox.baseVal;
  if (!rect.width || !rect.height || !box || !box.width) return;
  [...netsEl.querySelectorAll(".fn-net")].forEach((net, index) => {
    const block = blocks[index];
    const slot = block && FOLD.slots ? FOLD.slots[block.slot] : null;
    if (!slot) return;
    const targetX = rect.left + (slot[0] - box.x) / box.width * rect.width;
    const targetY = rect.top + (slot[1] - box.y) / box.height * rect.height;
    const own = net.getBoundingClientRect();
    net.style.setProperty("--drop-x", (targetX - (own.left + own.width / 2)).toFixed(1) + "px");
    net.style.setProperty("--drop-y", (targetY - (own.top + own.height / 2)).toFixed(1) + "px");
  });
}
function announce() {
  document.dispatchEvent(new CustomEvent("foldchange", { detail: { state: foldState } }));
}
function paint(state) {
  foldState = state;
  if (stage) stage.setAttribute("data-stage-fold", state === "folding" ? "folding" : state);
  if (layer) {
    layer.setAttribute("data-fold-state", state === "folding" ? "unfolded" : state);
    if (state !== "folding") layer.setAttribute("data-fold-phase", "flat");
  }
  if (pill) pill.textContent = state === "unfolded" ? labels.unfolded : labels.folded;
  if (buttonText) buttonText.textContent = state === "unfolded" ? labels.fold : labels.unfold;
}
function setFoldState(next, immediate) {
  clearTimeout(timerA);
  clearTimeout(timerB);
  const calm = Boolean(immediate) || still.matches;
  if (stage) {
    if (calm) stage.setAttribute("data-fold-instant", "");
    else stage.removeAttribute("data-fold-instant");
  }
  const finish = (state) => { paint(state); announce(); return foldState; };
  if (next === "unfolded" && !still.matches) return finish("unfolded");
  if (calm || next !== "folded") return finish(next === "unfolded" ? "unfolded" : "folded");
  drops();
  paint("folding");
  if (layer) layer.setAttribute("data-fold-phase", "hinge");
  if (stage) stage.setAttribute("data-stage-fold", "folding");
  return new Promise((resolve) => {
    timerA = setTimeout(() => {
      if (layer) layer.setAttribute("data-fold-phase", "drop");
      if (stage) stage.setAttribute("data-stage-fold", "folded");
    }, 270);
    timerB = setTimeout(() => {
      paint("folded");
      announce();
      resolve(foldState);
    }, 590);
  });
}
function toggleFold() {
  return setFoldState(foldState === "unfolded" ? "folded" : "unfolded", false);
}
window.__fold = {
  get state() { return foldState; },
  set(next, immediate = false) { return setFoldState(next, immediate); },
  toggle: toggleFold,
  render(next, extra) { const state = render(next, extra); announce(); return state; },
};
render(blocks);
setFoldState(foldState, true);
const toggleBtn = document.querySelector("[data-fold-toggle]");
if (toggleBtn) toggleBtn.addEventListener("click", (event) => { event.stopPropagation(); toggleFold(); });
if (stage) stage.addEventListener("click", (event) => {
  if (event.target.closest("[data-fold-toggle], a, button, input, textarea")) return;
  toggleFold();
});
window.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.code !== "Space") return;
  if (event.target.closest("input, textarea, select")) return;
  event.preventDefault();
  toggleFold();
});
`;
}
