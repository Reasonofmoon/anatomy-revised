import assert from "node:assert/strict";
import test from "node:test";
import { stableJson } from "../kit/stable-json.mjs";

test("stableJson prints the same decimals for platform-noisy floats", () => {
  const mac = { V: [0.7021227225941816, 0.5485583912065974, 0.4539904997395468], z: 494.96303493827395 };
  const linux = { V: [0.7021227225941816, 0.5485583912065974, 0.45399049973954675], z: 494.9630349382739 };
  assert.equal(stableJson(mac), stableJson(linux));
  assert.doesNotMatch(stableJson(mac), /453990499739546/);
  assert.doesNotMatch(stableJson(mac), /9382739/);
  assert.equal(stableJson({ n: 12, flag: true, label: "Tom" }), '{"n":12,"flag":true,"label":"Tom"}');
  assert.equal(stableJson([-0, 0.1]), "[0,0.1]");
});
