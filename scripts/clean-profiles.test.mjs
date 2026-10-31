import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("./drive.mjs", import.meta.url));

test("drive --clean-profiles deletes iso-drive directories and nothing else", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-profiles-"));
  try {
    const stale = join(directory, "iso-drive-stale");
    await mkdir(stale);
    await writeFile(join(stale, "Cookies"), "x");
    await mkdir(join(directory, "keep-me"));
    const result = await execute(process.execPath, [drive, "--clean-profiles"], { env: { ...process.env, ANATOMY_PROFILE_DIR: directory }, timeout: 10000 });
    assert.match(result.stdout, /removed 1 iso-drive profile/);
    assert.equal(existsSync(stale), false);
    assert.equal(existsSync(join(directory, "keep-me")), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
