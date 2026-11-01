import assert from "node:assert/strict";
import test from "node:test";
import { CALLOUT_COVER, CALLOUT_CSS, calloutRuntime, coverageRatio, overlapArea, placeCallout, rectGap } from "../kit/callout.mjs";

test("placeCallout leaves an important part uncovered when another spot is free", () => {
  const anchor = { x: 40, y: 40, w: 80, h: 30 };
  const size = { w: 70, h: 28 };
  const subject = { x: 40, y: 0, w: 80, h: 40 };
  const naive = { x: anchor.x, y: anchor.y, w: size.w, h: size.h };
  assert.ok(coverageRatio(naive, subject) < CALLOUT_COVER);
  const above = { x: anchor.x + anchor.w / 2 - size.w / 2, y: anchor.y - size.h - 10, w: size.w, h: size.h };
  assert.ok(overlapArea(above, subject) > 0);
  const place = placeCallout(anchor, size, [subject], { x: 0, y: 0, w: 320, h: 240 });
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  assert.equal(overlapArea(box, subject), 0);
  assert.ok(place.place !== "above");
  assert.ok(place.ratio < CALLOUT_COVER);
});

test("placeCallout stays inside the stage bounds", () => {
  const place = placeCallout({ x: 0, y: 0, w: 20, h: 20 }, { w: 40, h: 30 }, [], { x: 10, y: 10, w: 100, h: 80 }, { prefer: "above" });
  assert.ok(place.x >= 10);
  assert.ok(place.y >= 10);
  assert.ok(place.x + 40 <= 110);
  assert.ok(place.y + 30 <= 90);
});

test("a sub-pixel graze does not abandon the preferred spot", () => {
  const anchor = { x: 80, y: 80, w: 40, h: 24 };
  const size = { w: 60, h: 20 };
  const above = { x: anchor.x + anchor.w / 2 - size.w / 2, y: anchor.y - size.h - 10, w: size.w, h: size.h };
  const obstacle = { x: above.x, y: above.y - 1, w: 0.4, h: 1.2 };
  assert.ok(overlapArea(above, obstacle) > 0);
  assert.ok(overlapArea(above, obstacle) < 2);
  const place = placeCallout(anchor, size, [obstacle], { x: 0, y: 0, w: 400, h: 300 }, { prefer: "above" });
  assert.equal(place.place, "above");
  assert.equal(place.leader, false);
});

test("a callout pushed far from its target asks for a leader", () => {
  const anchor = { x: 150, y: 150, w: 30, h: 30 };
  const size = { w: 50, h: 24 };
  const bounds = { x: 0, y: 0, w: 400, h: 400 };
  const block = { x: 40, y: 40, w: 260, h: 260 };
  const place = placeCallout(anchor, size, [block], bounds, { prefer: "above" });
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  assert.equal(overlapArea(box, block), 0);
  assert.equal(place.leader, true);
});

test("the next callout treats the previous bubble as an obstacle", () => {
  const anchor = { x: 120, y: 120, w: 36, h: 20 };
  const size = { w: 80, h: 28 };
  const bounds = { x: 0, y: 0, w: 420, h: 320 };
  const first = placeCallout(anchor, size, [], bounds, { prefer: "above" });
  const box = { x: first.x, y: first.y, w: size.w, h: size.h };
  const second = placeCallout(anchor, size, [box], bounds, { prefer: "above" });
  assert.equal(overlapArea(box, { x: second.x, y: second.y, w: size.w, h: size.h }), 0);
  assert.notDeepEqual([first.x, first.y], [second.x, second.y]);
});

test("a diagonal near placement leads when the gap to the target body is the nearest edge", () => {
  const body = { x: 220, y: 180, w: 64, h: 40 };
  const loose = { x: body.x - 36, y: body.y - 50, w: body.w + 72, h: body.h + 88 };
  const size = { w: 120, h: 28 };
  const bounds = { x: 0, y: 0, w: 640, h: 480 };
  const place = placeCallout(loose, size, [], bounds, { prefer: "above-right", target: body });
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  const toBody = rectGap(body, box);
  const toLoose = rectGap(loose, box);
  assert.ok(toLoose < 18);
  assert.ok(toBody > 18);
  assert.equal(place.leader, true);
  assert.ok(Math.abs(toBody - 14.1) > 1);
});

test("a snug diagonal draws a leader from the box edge, not from the ring offset", () => {
  const anchor = { x: 80, y: 90, w: 36, h: 28 };
  const size = { w: 72, h: 22 };
  const place = placeCallout(anchor, size, [], { x: 0, y: 0, w: 420, h: 320 }, { prefer: "above-right" });
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  assert.equal(place.place, "above-right");
  assert.ok(rectGap(anchor, box) > 10);
  assert.equal(place.leader, true);
});

test("dense cells keep a callout on a near free side instead of a far corner", () => {
  const cell = 30;
  const pitch = 34;
  const cols = 12;
  const rows = 6;
  const cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) cells.push({ x: 70 + col * pitch, y: 70 + row * pitch, w: cell, h: cell });
  const anchor = cells[2 * cols + 5];
  const bounds = { x: 0, y: 0, w: 820, h: 520 };
  const size = { w: 140, h: 32 };
  const place = placeCallout(anchor, size, cells.filter((item) => item !== anchor), bounds, { prefer: "above" });
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  for (const item of cells) assert.equal(overlapArea(box, item), 0);
  assert.equal(place.place.startsWith("bounds-"), false);
  const corner = rectGap(anchor, { x: bounds.w - size.w - 10, y: 10, w: size.w, h: size.h });
  assert.ok(rectGap(anchor, box) < corner);
});

test("a nearer slot is preferred when the straight leader would cross another callout", () => {
  const anchor = { x: 200, y: 200, w: 40, h: 30 };
  const size = { w: 80, h: 24 };
  const bounds = { x: 0, y: 0, w: 520, h: 420 };
  const other = { x: 176, y: 150, w: 100, h: 36 };
  const place = placeCallout(anchor, size, [other], bounds, { prefer: "above", callouts: [other] });
  const box = { x: place.x, y: place.y, w: size.w, h: size.h };
  assert.equal(overlapArea(box, other), 0);
  assert.equal(place.crosses, 0);
  assert.equal(place.place.startsWith("bounds-"), false);
});

test("callout runtime uses the callout's offset parent, avoids siblings, and draws a leader", () => {
  const source = calloutRuntime();
  assert.match(source, /offsetParent/);
  assert.match(source, /an-callout-leader/);
  assert.match(source, /taken\.push/);
  assert.match(source, /setTimeout\(nudgeCallouts, 420\)/);
  assert.match(CALLOUT_CSS, /clamp\(12px,1\.05cqw,13px\)/);
  assert.match(source, /target: targetBox/);
  assert.match(source, /callouts: callouts/);
  assert.match(CALLOUT_CSS, /an-callout-leader/);
});
