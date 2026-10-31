import assert from "node:assert/strict";
import test from "node:test";
import { CALLOUT_COVER, CALLOUT_CSS, calloutRuntime, coverageRatio, overlapArea, placeCallout } from "../kit/callout.mjs";

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

test("callout runtime uses the callout's offset parent, avoids siblings, and draws a leader", () => {
  const source = calloutRuntime();
  assert.match(source, /offsetParent/);
  assert.match(source, /an-callout-leader/);
  assert.match(source, /taken\.push/);
  assert.match(source, /setTimeout\(nudgeCallouts, 420\)/);
  assert.match(CALLOUT_CSS, /clamp\(8px,1\.05cqw,13px\)/);
  assert.match(CALLOUT_CSS, /an-callout-leader/);
});
