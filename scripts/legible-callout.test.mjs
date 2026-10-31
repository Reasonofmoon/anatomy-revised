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
const capture = fileURLToPath(new URL("capture.mjs", import.meta.url));
const closed = '<svg width="220" height="80" viewBox="0 0 220 80"><path class="iso-line" fill="none" stroke="black" d="M10 10H210V70H10Z"/></svg>';

async function run(script, html, args) {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-legible-"));
  try {
    const page = join(directory, "figure.html");
    const out = join(directory, "shot.png");
    await writeFile(page, `<!doctype html><div class="iso-plate" style="position:relative;width:320px;height:180px">${html}</div>`);
    const command = script === capture ? [capture, page, "--out", out, "--wait", "0", "--scale", "1", ...args] : [lines, page, "--wait", "0", ...args];
    try {
      return { code: 0, ...await execute(process.execPath, command, { timeout: 30000 }) };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("teaching text under the minimum fails the line check and capture", async () => {
  const html = `${closed}<div data-legible style="font:8px/1 sans-serif">Tom</div>`;
  const checked = await run(lines, html, []);
  assert.equal(checked.code, 1);
  assert.match(checked.stdout, /legible: FAIL/);
  assert.match(checked.stdout, /"Tom" is/);
  const shot = await run(capture, html, []);
  assert.equal(shot.code, 1);
  assert.match(shot.stdout, /legible: FAIL/);
});

test("teaching text at the desktop minimum passes", async () => {
  const html = `${closed}<div data-legible style="font:32px/1.15 sans-serif">Tom</div>`;
  const checked = await run(lines, html, []);
  assert.equal(checked.code, 0, checked.stdout + checked.stderr);
  assert.match(checked.stdout, /teaching text at least 28px/);
});

test("a callout that covers a marked word fails", async () => {
  const html = `${closed}<div data-important="subject" style="position:absolute;left:30px;top:40px;width:100px;height:48px;background:#FDE68A">Tom</div><div data-callout="note" style="position:absolute;left:30px;top:40px;width:100px;height:48px">this covers Tom</div>`;
  const checked = await run(lines, html, []);
  assert.equal(checked.code, 1);
  assert.match(checked.stdout, /callouts: FAIL/);
  assert.match(checked.stdout, /covers/);
  assert.match(checked.stdout, /subject/);
});
