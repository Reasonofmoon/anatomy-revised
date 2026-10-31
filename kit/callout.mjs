// Place a label bubble so it does not cover parts marked important.
// Rects are { x, y, w, h } in one coordinate space (viewBox px or CSS px).

export const CALLOUT_COVER = 0.08;

export function overlapArea(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return w * h;
}

export function coverageRatio(box, obstacle) {
  if (!obstacle.w || !obstacle.h) return 0;
  return overlapArea(box, obstacle) / (obstacle.w * obstacle.h);
}

export function placeCallout(anchor, size, obstacles = [], bounds = null, { gap = 10, prefer = "above" } = {}) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const ax = anchor.x;
  const ay = anchor.y;
  const aw = anchor.w;
  const ah = anchor.h;
  const spots = {
    above: { x: ax + aw / 2 - size.w / 2, y: ay - size.h - gap },
    below: { x: ax + aw / 2 - size.w / 2, y: ay + ah + gap },
    left: { x: ax - size.w - gap, y: ay + ah / 2 - size.h / 2 },
    right: { x: ax + aw + gap, y: ay + ah / 2 - size.h / 2 },
    "above-left": { x: ax - size.w - gap, y: ay - size.h - gap },
    "above-right": { x: ax + aw + gap, y: ay - size.h - gap },
    "below-left": { x: ax - size.w - gap, y: ay + ah + gap },
    "below-right": { x: ax + aw + gap, y: ay + ah + gap },
  };
  if (bounds) {
    spots["bounds-tl"] = { x: bounds.x + gap, y: bounds.y + gap };
    spots["bounds-tr"] = { x: bounds.x + bounds.w - size.w - gap, y: bounds.y + gap };
    spots["bounds-bl"] = { x: bounds.x + gap, y: bounds.y + bounds.h - size.h - gap };
    spots["bounds-br"] = { x: bounds.x + bounds.w - size.w - gap, y: bounds.y + bounds.h - size.h - gap };
  }
  const order = [prefer, "above", "below", "right", "left", "above-right", "above-left", "below-right", "below-left", "bounds-tr", "bounds-tl", "bounds-br", "bounds-bl"];
  const seen = new Set();
  let best = null;
  for (const name of order) {
    const spot = spots[name];
    if (!spot || seen.has(name)) continue;
    seen.add(name);
    let x = spot.x;
    let y = spot.y;
    if (bounds) {
      const maxX = bounds.x + Math.max(0, bounds.w - size.w);
      const maxY = bounds.y + Math.max(0, bounds.h - size.h);
      x = clamp(x, bounds.x, maxX);
      y = clamp(y, bounds.y, maxY);
    }
    const box = { x, y, w: size.w, h: size.h };
    let area = 0;
    let ratio = 0;
    for (const obstacle of obstacles) {
      const hit = overlapArea(box, obstacle);
      area += hit;
      ratio = Math.max(ratio, coverageRatio(box, obstacle));
    }
    const rank = area * 1000 + (name === prefer ? 0 : 1);
    if (!best || rank < best.rank - 1e-6) best = { x, y, area, ratio, place: name, rank };
  }
  return { x: best.x, y: best.y, overlap: best.area, ratio: best.ratio, place: best.place };
}

export const CALLOUT_CSS = `.an-callout{position:absolute;z-index:8;left:8px;top:8px;max-width:200px;padding:6px 8px;border:1.5px solid var(--anatomy-strong);background:color-mix(in srgb,var(--anatomy-card) 94%,transparent);color:var(--anatomy-strong);font:700 13px/1.35 ui-sans-serif,system-ui,sans-serif;pointer-events:none;box-shadow:0 6px 16px rgba(0,0,0,.12)}
.an-callout[data-placed]{left:var(--an-x);top:var(--an-y)}`;

export function calloutHtml({ text, name = "note", anchor, prefer = "above" }) {
  const attr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<div class="an-callout" data-callout="${attr(name)}" data-anchor="${attr(anchor)}" data-prefer="${attr(prefer)}">${attr(text)}</div>`;
}

export function calloutRuntime() {
  return `const overlapArea = ${overlapArea.toString()};
const coverageRatio = ${coverageRatio.toString()};
const placeCallout = ${placeCallout.toString()};
const DIM = 0.35;
function shown(el) {
  let alpha = 1;
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    alpha *= Number(style.opacity);
    if (!(alpha >= DIM)) return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width >= 1 && rect.height >= 1;
}
function measure(el) {
  const rect = el.getBoundingClientRect();
  let top = rect.top, left = rect.left, right = rect.right, bottom = rect.bottom;
  for (const child of el.querySelectorAll ? el.querySelectorAll(".fn-flap, .fn-glue") : []) {
    const box = child.getBoundingClientRect();
    if (box.width < 0.5 || box.height < 0.5) continue;
    top = Math.min(top, box.top);
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}
function nudgeCallouts() {
  const stage = document.querySelector("[data-fold-stage]") || document.querySelector(".iso-plate") || document.body;
  const origin = stage.getBoundingClientRect();
  if (!origin.width || !origin.height) return 0;
  const local = (rect) => ({ x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height });
  const folded = document.querySelector("[data-fold-layer]")?.getAttribute("data-fold-state") === "folded";
  const obstacles = [...document.querySelectorAll("[data-important]")].filter(shown).map((el) => local(measure(el)));
  const bounds = { x: 0, y: 0, w: origin.width, h: origin.height };
  let moved = 0;
  for (const el of document.querySelectorAll("[data-callout]")) {
    if (!shown(el) && el.getBoundingClientRect().width < 1) continue;
    const selector = el.getAttribute("data-anchor");
    const matches = selector ? [...document.querySelectorAll(selector)].filter(shown) : [];
    const preferred = matches.filter((node) => (folded ? !node.closest("[data-fold-layer]") : node.closest("[data-fold-layer], .fn-net")));
    const anchorEl = preferred[0] || matches[0];
    if (!anchorEl) continue;
    const size = { w: el.offsetWidth || 160, h: el.offsetHeight || 36 };
    const place = placeCallout(local(measure(anchorEl)), size, obstacles, bounds, { prefer: el.getAttribute("data-prefer") || "above" });
    el.style.left = place.x + "px";
    el.style.top = place.y + "px";
    el.setAttribute("data-placed", place.place);
    moved++;
  }
  return moved;
}
function setCallout(options) {
  const spec = options || {};
  const el = spec.name ? document.querySelector('[data-callout="' + String(spec.name).replace(/"/g, "") + '"]') : document.querySelector("[data-callout]");
  if (!el) return 0;
  if (spec.text != null) el.textContent = String(spec.text);
  if (spec.anchor != null) el.setAttribute("data-anchor", spec.anchor);
  if (spec.prefer != null) el.setAttribute("data-prefer", spec.prefer);
  return nudgeCallouts();
}
window.__callout = { nudge: nudgeCallouts, place: placeCallout, set: setCallout };
document.addEventListener("foldchange", () => requestAnimationFrame(nudgeCallouts));
window.addEventListener("resize", nudgeCallouts);
nudgeCallouts();
requestAnimationFrame(nudgeCallouts);
`;
}
