import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { profileBusy } from "./chrome-port.mjs";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("./drive.mjs", import.meta.url));

async function aged(path) {
  await mkdir(path);
  await writeFile(join(path, "Cookies"), "x");
  const old = new Date(Date.now() - 10 * 60 * 1000);
  await utimes(path, old, old);
}

test("drive --clean-profiles deletes stale profiles of every prefix and keeps a live or young one", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-profiles-"));
  try {
    const stale = join(directory, "iso-drive-stale");
    const capture = join(directory, "iso-capture-old");
    const printCdp = join(directory, "iso-print-cdp-old");
    const cdpPdf = join(directory, "iso-cdp-pdf-old");
    const printDir = join(directory, "iso-print-old");
    const young = join(directory, "iso-drive-young");
    const busy = join(directory, "iso-capture-busy");
    for (const path of [stale, capture, printCdp, cdpPdf, printDir, busy]) await aged(path);
    await mkdir(young);
    await writeFile(join(young, "Cookies"), "x");
    await mkdir(join(directory, "keep-me"));
    const listing = `123 chrome --user-data-dir=${busy}\n`;
    assert.equal(profileBusy(busy, listing), true);
    assert.equal(profileBusy(stale, listing), false);
    const result = await execute(process.execPath, [drive, "--clean-profiles"], {
      env: { ...process.env, ANATOMY_PROFILE_DIR: directory, ANATOMY_PROFILE_PS: listing },
      timeout: 10000,
    });
    assert.match(result.stdout, /removed 5 leftover profiles/);
    for (const path of [stale, capture, printCdp, cdpPdf, printDir]) assert.equal(existsSync(path), false, path);
    assert.equal(existsSync(young), true);
    assert.equal(existsSync(busy), true);
    assert.equal(existsSync(join(directory, "keep-me")), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
