import assert from "node:assert/strict";
import test from "node:test";
import { reportLegible } from "./legible-text.mjs";

test("several engraved labels on a narrow viewport warn as one range", () => {
  const report = reportLegible({
    min: 16,
    checked: 8,
    teaching: 3,
    failures: [],
    warnings: [
      { text: "S", px: 5.6, required: 12, hard: false, ok: false },
      { text: "V", px: 8.6, required: 12, hard: false, ok: false },
      { text: "O", px: 7.1, required: 12, hard: false, ok: false },
    ],
    folded: false,
    fold: true,
    width: 390,
  });
  assert.equal(report.failed, false);
  assert.match(report.lines.join("\n"), /3 engraved labels are 5\.6–8\.6px on a 390px viewport/);
  assert.match(report.lines.join("\n"), /teaching text at least 16px/);
});
