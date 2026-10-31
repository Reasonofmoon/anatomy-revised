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

export function rectGap(a, b) {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  return Math.hypot(dx, dy);
}

export function needsLeader(anchor, box, gap = 10) {
  return rectGap(anchor, box) > 1.8 * gap;
}

export function leaderEnds(anchor, box) {
  const ax = anchor.x + anchor.w / 2;
  const ay = anchor.y + anchor.h / 2;
  const x = Math.min(Math.max(ax, box.x), box.x + box.w);
  const y = Math.min(Math.max(ay, box.y), box.y + box.h);
  return { x1: x, y1: y, x2: ax, y2: ay };
}

export function placeCallout(anchor, size, obstacles = [], bounds = null, { gap = 10, prefer = "above" } = {}) {
  const FAMILIES = ["above", "below", "right", "left", "above-right", "above-left", "below-right", "below-left"];
  const spotOf = (name, ax, ay, aw, ah, box, distance) => {
    const sw = box.w;
    const sh = box.h;
    if (name === "above") return { x: ax + aw / 2 - sw / 2, y: ay - sh - distance };
    if (name === "below") return { x: ax + aw / 2 - sw / 2, y: ay + ah + distance };
    if (name === "left") return { x: ax - sw - distance, y: ay + ah / 2 - sh / 2 };
    if (name === "right") return { x: ax + aw + distance, y: ay + ah / 2 - sh / 2 };
    if (name === "above-left") return { x: ax - sw - distance, y: ay - sh - distance };
    if (name === "above-right") return { x: ax + aw + distance, y: ay - sh - distance };
    if (name === "below-left") return { x: ax - sw - distance, y: ay + ah + distance };
    if (name === "below-right") return { x: ax + aw + distance, y: ay + ah + distance };
    return null;
  };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const ax = anchor.x;
  const ay = anchor.y;
  const aw = anchor.w;
  const ah = anchor.h;
  const rings = [gap, gap * 2.5, gap * 4];
  const graze = Math.max(2, size.w * size.h * 0.005);
  const order = [];
  rings.forEach((distance, ring) => {
    const names = [prefer, ...FAMILIES];
    const seen = new Set();
    for (const name of names) {
      if (!name || seen.has(name) || !FAMILIES.includes(name)) continue;
      seen.add(name);
      order.push({ name, distance, ring });
    }
  });
  if (bounds) {
    order.push({ name: "bounds-tl", x: bounds.x + gap, y: bounds.y + gap, ring: rings.length });
    order.push({ name: "bounds-tr", x: bounds.x + bounds.w - size.w - gap, y: bounds.y + gap, ring: rings.length });
    order.push({ name: "bounds-bl", x: bounds.x + gap, y: bounds.y + bounds.h - size.h - gap, ring: rings.length });
    order.push({ name: "bounds-br", x: bounds.x + bounds.w - size.w - gap, y: bounds.y + bounds.h - size.h - gap, ring: rings.length });
  }
  let best = null;
  for (const item of order) {
    const spot = item.x === undefined ? spotOf(item.name, ax, ay, aw, ah, size, item.distance) : item;
    if (!spot) continue;
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
    const scored = area <= graze ? 0 : area;
    const rank = scored * 1000 + item.ring * 20 + (item.name === prefer ? 0 : 5) + (area > 0.01 ? 0.5 : 0);
    if (!best || rank < best.rank - 1e-6) best = { x, y, area, ratio, place: item.name, rank };
  }
  const box = { x: best.x, y: best.y, w: size.w, h: size.h };
  return { x: best.x, y: best.y, overlap: best.area, ratio: best.ratio, place: best.place, leader: needsLeader(anchor, box, gap) };
}

export const CALLOUT_CSS = `.an-callout{position:absolute;z-index:8;left:8px;top:8px;max-width:min(220px,32cqw);padding:.4em .55em;border:max(1px,.12em) solid var(--anatomy-strong);background:color-mix(in srgb,var(--anatomy-card) 94%,transparent);color:var(--anatomy-strong);font:700 13px/1.3 ui-sans-serif,system-ui,sans-serif;font-size:clamp(8px,1.05cqw,13px);pointer-events:none;box-shadow:0 6px 16px rgba(0,0,0,.12)}
.an-callout[data-placed]{left:var(--an-x);top:var(--an-y)}
.an-callout-leader{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:7}
.an-callout-leader line{stroke:var(--anatomy-strong);stroke-width:1.25;fill:none}`;

export function calloutHtml({ text, name = "note", anchor, prefer = "above" }) {
  const attr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<div class="an-callout" data-callout="${attr(name)}" data-anchor="${attr(anchor)}" data-prefer="${attr(prefer)}">${attr(text)}</div>`;
}

export function calloutRuntime() {
  return `const overlapArea = ${overlapArea.toString()};
const coverageRatio = ${coverageRatio.toString()};
const rectGap = ${rectGap.toString()};
const needsLeader = ${needsLeader.toString()};
const leaderEnds = ${leaderEnds.toString()};
const placeCallout = ${placeCallout.toString()};
const DIM = 0.35;
function shown(el) {
  const svg = el.closest ? el.closest(".iso-svg") : null;
  if (svg && svg.parentElement && svg.parentElement.getAttribute("data-stage-fold") === "unfolded") return false;
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
function leaderSvg(el) {
  const prev = el.previousElementSibling;
  if (prev && prev.classList && prev.classList.contains("an-callout-leader")) return prev;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "an-callout-leader");
  svg.setAttribute("aria-hidden", "true");
  el.parentNode.insertBefore(svg, el);
  return svg;
}
function drawLeader(el, origin, place, anchorBox, size) {
  const svg = leaderSvg(el);
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  if (!place.leader) {
    svg.style.display = "none";
    return;
  }
  svg.style.display = "";
  svg.style.left = "0px";
  svg.style.top = "0px";
  svg.style.width = origin.width + "px";
  svg.style.height = origin.height + "px";
  svg.setAttribute("viewBox", "0 0 " + origin.width + " " + origin.height);
  const ends = leaderEnds(anchorBox, box);
  let line = svg.querySelector("line");
  if (!line) {
    line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    svg.appendChild(line);
  }
  line.setAttribute("x1", ends.x1);
  line.setAttribute("y1", ends.y1);
  line.setAttribute("x2", ends.x2);
  line.setAttribute("y2", ends.y2);
}
function nudgeCallouts() {
  const stage = document.querySelector("[data-fold-stage]") || document.querySelector(".iso-plate") || document.body;
  const folded = document.querySelector("[data-fold-layer]")?.getAttribute("data-fold-state") === "folded";
  const important = [...document.querySelectorAll("[data-important]")].filter(shown);
  const taken = [];
  let moved = 0;
  for (const el of document.querySelectorAll("[data-callout]")) {
    if (!shown(el) && el.getBoundingClientRect().width < 1) {
      const prev = el.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains("an-callout-leader")) prev.style.display = "none";
      continue;
    }
    const originEl = el.offsetParent || stage;
    const origin = originEl.getBoundingClientRect();
    if (!origin.width || !origin.height) continue;
    const local = (rect) => ({ x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height });
    const selector = el.getAttribute("data-anchor");
    const matches = selector ? [...document.querySelectorAll(selector)].filter(shown) : [];
    const preferred = matches.filter((node) => (folded ? !node.closest("[data-fold-layer]") : node.closest("[data-fold-layer], .fn-net")));
    const anchorEl = preferred[0] || matches[0];
    if (!anchorEl) continue;
    const anchorBox = local(measure(anchorEl));
    const obstacles = important.map((node) => local(measure(node))).concat(taken.map((rect) => local(rect)));
    const bounds = { x: 0, y: 0, w: origin.width, h: origin.height };
    const size = { w: el.offsetWidth || 160, h: el.offsetHeight || 36 };
    const place = placeCallout(anchorBox, size, obstacles, bounds, { prefer: el.getAttribute("data-prefer") || "above" });
    el.style.left = place.x + "px";
    el.style.top = place.y + "px";
    el.setAttribute("data-placed", place.place);
    el.toggleAttribute("data-leader", place.leader);
    drawLeader(el, origin, place, anchorBox, size);
    taken.push({ left: origin.left + place.x, top: origin.top + place.y, width: size.w, height: size.h });
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
document.addEventListener("foldchange", () => { requestAnimationFrame(nudgeCallouts); setTimeout(nudgeCallouts, 420); });
window.addEventListener("resize", nudgeCallouts);
nudgeCallouts();
requestAnimationFrame(nudgeCallouts);
`;
}
