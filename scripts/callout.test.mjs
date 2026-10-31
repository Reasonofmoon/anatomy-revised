import assert from "node:assert/strict";
import test from "node:test";
import { CALLOUT_COVER, coverageRatio, overlapArea, placeCallout } from "../kit/callout.mjs";

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
