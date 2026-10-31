import * as k from "../../kit/iso-kit.mjs";
import { BLOCK, BLOCKS, DIAL, PLATE, RAIL, VIEW } from "./model.mjs";

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

export function project() {
  const tall = [DIAL[0], DIAL[1], 48];
  const points = [...k.boxCorners(PLATE, -16, 0), tall, ...BLOCKS.map((block) => [block.at[0], block.at[1], 42])];
  return k.fitProjection(points, VIEW.w, VIEW.h, { pad: 36, azimuth: 42 });
}

const planAt = (cx, cy, w, d, r = 1.4) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r });

export function slotPoints(P) {
  const slots = {};
  for (const block of BLOCKS) slots[block.slot] = k.iso([block.at[0], block.at[1], 30], P);
  return slots;
}

export function machineSvg(P) {
  const at = (point) => k.iso(point, P);
  const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
  const parts = [];
  const put = (z, html) => parts.push({ z, html });

  put(-1, `<path class="iso-halo" d="${k.haloOf(PLATE, -14, 8, P)}"/>`);
  for (const [x, y] of k.corners(PLATE, 18)) {
    put(depth(x, y, -6), S(k.cylinder(x, y, 7, -14, 2, P, 24), { tone: "lo" }) + S(k.cylinder(x, y, 5.2, -12, 7, P, 24), { tone: "mid" }));
  }
  put(depth(0, 0, 4), S(k.slabOf(PLATE, -8, 8, P, 6, 1.2), { tone: "mid" }));
  put(depth(0, 20, 8), L(k.planOutline(k.insetPlan(PLATE, 7), 0.2, P, 6), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  put(depth(40, 40, 1), L(screws.map(([x, y]) => k.ring(x, y, 2.3, 0.3, P, 16)).join(""), { tone: "lo" }));
  put(depth(40, 40, 2), D(screws.map(([x, y]) => at([x, y, 0.3])), { size: 0.5 }));

  const strip = { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 18, w: 150, d: 8, r: 1 };
  put(depth(strip.x, strip.y, 1), S(k.slabOf(strip, 0.15, 0.7, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 4, strip.y + 0.6, 0.85, [2.4, 4.6], P);
  put(depth(strip.x, strip.y, 2), L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }));

  const label = { x: PLATE.x + PLATE.w - 78, y: PLATE.y + 14, w: 58, d: 16, r: 1.2 };
  put(depth(label.x, label.y, 1), S(k.slabOf(label, 0.2, 0.8, P, 3), { tone: "mid", crease: "none" }));
  put(depth(label.x, label.y, 2), k.faceTextSvg(k.topMatrix([label.x + 6, label.y + 11], 1, P, "x"), "S + V + O", { size: 3.2, tone: "lo" }));

  const bedKey = depth(0, 0, 12);
  put(bedKey, S(k.slabOf(RAIL, 8, 5, P, 4, 0.6), { tone: "hi" }));
  const fence = { x: RAIL.x, y: RAIL.y - 8, w: RAIL.w, d: 6, r: 1 };
  put(bedKey - 1, S(k.slabOf(fence, 13, 10, P, 3, 0.4), { tone: "mid" }));

  BLOCKS.forEach((block, index) => {
    const [cx, cy] = block.at;
    const shoe = planAt(cx, cy, BLOCK.w + 8, BLOCK.d + 8, 1.6);
    const body = planAt(cx, cy - 1, BLOCK.w, BLOCK.d, 1.2);
    const lug = { x: cx - 8, y: cy + BLOCK.d / 2 - 2, w: 16, d: 7, r: 0.8 };
    // A block on the far side of the bed has a smaller depth than the bed's centre, so a single
    // rail element would paint over it. Keep every block after the bed, near ones later.
    put(bedKey + 2 + index, `<g class="sb-paper" data-role="${block.role}" data-important="${block.important}" data-part="block-${block.role}">${S(k.slabOf(shoe, 13, 2.2, P, 3, 0.4), { tone: "lo" })}${S(k.slabOf(body, 15.2, BLOCK.h, P, 3, 0.5), { tone: "hi", className: "sb-block" })}${S(k.slabOf(lug, 15.2, 5, P, 2, 0.3), { tone: "mid", className: "sb-lug" })}</g>`);
  });

  const [dx, dy] = DIAL;
  put(depth(dx, dy, 20), S(k.cylinder(dx, dy, 16, 13, 3, P, 36, 0.4), { tone: "lo" }) + S(k.cylinder(dx, dy, 13, 16, 2.4, P, 36), { tone: "hi" }));
  const marks = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const outer = at([dx + Math.cos(angle) * 11, dy + Math.sin(angle) * 11, 18.5]);
    const inner = at([dx + Math.cos(angle) * 8.2, dy + Math.sin(angle) * 8.2, 18.5]);
    marks.push(`M${outer[0].toFixed(2)} ${outer[1].toFixed(2)}L${inner[0].toFixed(2)} ${inner[1].toFixed(2)}`);
  }
  const hub = at([dx, dy, 18.5]);
  const tip = at([dx + 9, dy - 2, 18.5]);
  put(depth(dx, dy, 30), L(k.ring(dx, dy, 11, 18.5, P, 28), { tone: "mid" }) + L(marks.join(""), { tone: "lo" }) + L(`M${hub[0].toFixed(2)} ${hub[1].toFixed(2)}L${tip[0].toFixed(2)} ${tip[1].toFixed(2)}`, { tone: "hi", free: "end" }) + D([hub], { size: 0.7, tone: "hi" }));

  parts.sort((a, b) => a.z - b.z);
  return k.figureSvg({
    width: VIEW.w,
    height: VIEW.h,
    label: "A bench with three keyed slots. Tom, reads and books fold from paper nets into the slots.",
    body: parts.map((part) => part.html).join(""),
  });
}
