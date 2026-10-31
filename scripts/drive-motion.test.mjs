import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("./drive.mjs", import.meta.url));

test("drive forces no-preference unless --reduced is passed", { timeout: 40000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-motion-"));
  try {
    const page = join(directory, "motion.html");
    await writeFile(page, "<!doctype html><p id='m'></p><script>document.querySelector('#m').textContent = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference'</script>");
    const actions = JSON.stringify([["eval", "document.querySelector('#m').textContent"]]);
    const open = await execute(process.execPath, [drive, page, actions, "--width", "800", "--height", "600"], { timeout: 30000 });
    assert.match(open.stdout, /eval: "no-preference"/);
    const reduced = await execute(process.execPath, [drive, page, actions, "--reduced", "--width", "800", "--height", "600"], { timeout: 30000 });
    assert.match(reduced.stdout, /eval: "reduce"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
