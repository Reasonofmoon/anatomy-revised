import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const lines = fileURLToPath(new URL("lines.mjs", import.meta.url));

async function check(path) {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-lines-"));
  try {
    const page = join(directory, "figure.html");
    await writeFile(page, `<!doctype html><svg id="figure" width="200" height="100" viewBox="0 0 200 100"><path class="iso-line" fill="none" stroke="black" d="${path}"/></svg>`);
    try {
      return { code: 0, ...await execute(process.execPath, [lines, page, "--select", "#figure", "--wait", "0"], { timeout: 30000 }) };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("a selected SVG checks its own floating lines", async () => {
  const result = await check("M20 20L180 20");
  assert.equal(result.code, 1);
  assert.match(result.stdout, /line ends: 2 of 2 ends on 1 lines float/);
});

test("a selected SVG preserves closed-path exemption", async () => {
  const result = await check("M20 20L180 20L180 80L20 80Z");
  assert.equal(result.code, 0);
  assert.match(result.stdout, /line ends: 0/);
  assert.doesNotMatch(result.stdout, /lines: EMPTY/);
});

async function runLines(html, args = []) {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-lines-"));
  try {
    const page = join(directory, "figure.html");
    await writeFile(page, html);
    try {
      return { code: 0, ...await execute(process.execPath, [lines, page, "--wait", "0", ...args], { timeout: 30000 }) };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("zero candidate lines fail instead of a silent 0 of 0", async () => {
  const result = await runLines('<!doctype html><svg id="figure" width="200" height="100" viewBox="0 0 200 100"><rect width="40" height="20" fill="black"/></svg>', ["--select", "#figure"]);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /lines: EMPTY — 0 candidate lines/);
  assert.match(result.stdout, /not a pass/);
});

test("allow-empty warns and does not fail when a state has no texture lines", async () => {
  const result = await runLines('<!doctype html><svg id="figure" width="200" height="100" viewBox="0 0 200 100"></svg>', ["--select", "#figure", "--allow-empty"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /lines: EMPTY/);
});

test("an eval hook reveals the state that should be checked", async () => {
  const hidden = await runLines('<!doctype html><svg id="drawn" style="display:none" width="200" height="100" viewBox="0 0 200 100"><path class="iso-line" fill="none" stroke="black" d="M20 20L180 20"/></svg>', ["--select", "#drawn"]);
  assert.equal(hidden.code, 1);
  assert.match(hidden.stdout, /lines: EMPTY/);
  assert.match(hidden.stdout, /hidden or below the opacity floor/);
  const shown = await runLines('<!doctype html><svg id="drawn" style="display:none" width="200" height="100" viewBox="0 0 200 100"><path class="iso-line" fill="none" stroke="black" d="M20 20L180 20"/></svg>', ["--select", "#drawn", "--eval", "document.querySelector('#drawn').style.display='block'"]);
  assert.equal(shown.code, 1);
  assert.match(shown.stdout, /line ends: 2 of 2 ends on 1 lines float/);
  assert.doesNotMatch(shown.stdout, /lines: EMPTY/);
});
