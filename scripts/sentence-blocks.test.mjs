import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { project, machineSvg, slotPoints } from "../examples/sentence-blocks/machine.mjs";
import { assemble } from "../examples/sentence-blocks/page.mjs";

const execute = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const example = join(here, "../examples/sentence-blocks");
const lines = join(here, "lines.mjs");

test("sentence-blocks is split into modules under 300 lines", async () => {
  const names = (await readdir(example)).filter((name) => name.endsWith(".mjs"));
  assert.ok(names.includes("build.mjs"));
  for (const name of names) {
    const count = (await readFile(join(example, name), "utf8")).split("\n").length;
    assert.ok(count < 300, `${name} is ${count} lines`);
  }
});

test("sentence-blocks fold layer passes lines, legible text and callouts", { timeout: 40000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-sentence-"));
  try {
    const projection = project();
    const page = join(directory, "sentence-blocks-light.html");
    await writeFile(page, assemble({ theme: "light", svg: machineSvg(projection), slots: slotPoints(projection) }));
    const run = async (args) => {
      try {
        return { code: 0, ...await execute(process.execPath, [lines, page, ...args], { timeout: 30000 }) };
      } catch (error) {
        return { code: error.code, stdout: error.stdout, stderr: error.stderr };
      }
    };
    const open = await run(["--wait", "50"]);
    assert.equal(open.code, 1, open.stdout);
    assert.match(open.stdout, /lines: EMPTY/);
    assert.match(open.stdout, /hidden or below the opacity floor/);
    assert.match(open.stdout, /teaching text at least 28px/);
    assert.match(open.stdout, /callouts: 0 of 1 cover a marked important part/);
    assert.match(open.stdout, /console: clean/);
    const folded = await run(["--wait", "0", "--eval", "window.__fold.set('folded', true)"]);
    assert.equal(folded.code, 0, folded.stdout + folded.stderr);
    assert.match(folded.stdout, /line ends: 0 of/);
    assert.doesNotMatch(folded.stdout, /lines: EMPTY/);
    assert.match(folded.stdout, /fold layer is folded/);
    assert.match(folded.stdout, /console: clean/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
