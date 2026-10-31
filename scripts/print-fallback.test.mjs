import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { chromePath, drive, pdfInfo, printPdf, printTimeouts, runProcess } from "./print.mjs";

test("runProcess kills a hung child and reports the timeout", async () => {
  const result = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], 400);
  assert.equal(result.ok, false);
  assert.match(result.reason, /timed out after 400 ms and was killed/);
});

test("printPdf falls back to Page.printToPDF when the CLI hangs", async () => {
  const calls = [];
  const result = await printPdf("/tmp/sheet.html", "/tmp/sheet.pdf", {
    cli: async () => {
      calls.push("cli");
      return { ok: false, reason: "timed out after 20 ms and was killed" };
    },
    cdp: async () => {
      calls.push("cdp");
      return { ok: true, pages: 2, bytes: 4000 };
    },
  });
  assert.deepEqual(calls, ["cli", "cdp"]);
  assert.equal(result.via, "cdp");
  assert.equal(result.pages, 2);
});

test("printPdf names both failures instead of hanging", async () => {
  await assert.rejects(
    () => printPdf("/tmp/missing-sheet.html", "/tmp/missing-sheet.pdf", {
      cli: async () => ({ ok: false, reason: "timed out after 20 ms and was killed" }),
      cdp: async () => ({ ok: false, reason: "DevTools socket failed" }),
    }),
    (error) => {
      assert.match(error.message, /Chrome --print-to-pdf: timed out after 20 ms and was killed/);
      assert.match(error.message, /Page\.printToPDF: DevTools socket failed/);
      assert.match(error.message, /no PDF was written/);
      assert.match(error.message, /Printing stopped instead of hanging/);
      assert.doesNotMatch(error.message, /unchanged/);
      assert.doesNotMatch(error.message, /\n\s+at /);
      return true;
    },
  );
});

test("the Page.printToPDF timeout does not follow ANATOMY_PRINT_TIMEOUT_MS", () => {
  const previous = process.env.ANATOMY_PRINT_TIMEOUT_MS;
  process.env.ANATOMY_PRINT_TIMEOUT_MS = "1";
  delete process.env.ANATOMY_PRINT_FALLBACK_TIMEOUT_MS;
  try {
    const timeouts = printTimeouts();
    assert.equal(timeouts.cli, 1);
    assert.equal(timeouts.fallback, 20000);
    assert.equal(printTimeouts({ fallbackTimeoutMs: 8000 }).fallback, 8000);
    assert.equal(printTimeouts({ timeoutMs: 50, fallbackTimeoutMs: 9000 }).cli, 50);
  } finally {
    if (previous === undefined) delete process.env.ANATOMY_PRINT_TIMEOUT_MS;
    else process.env.ANATOMY_PRINT_TIMEOUT_MS = previous;
  }
});

test("a 1ms print budget fails both paths with a short error", { timeout: 20000 }, async (t) => {
  if (!chromePath()) {
    t.skip("Chrome is not installed");
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), "anatomy-print-fast-"));
  try {
    const htmlFile = join(directory, "sheet.html");
    const pdfFile = join(directory, "sheet.pdf");
    await writeFile(htmlFile, "<!doctype html><html><body><h1>문장 조립 라인</h1><script>requestAnimationFrame(function loop(){requestAnimationFrame(loop)})</script></body></html>");
    const error = await printPdf(htmlFile, pdfFile, { timeoutMs: 1, fallbackTimeoutMs: 1, forceCli: true }).then(() => null, (failure) => failure);
    assert.ok(error, "printPdf resolved");
    assert.match(error.message, /no PDF was written/);
    assert.match(error.message, /timed out after 1 ms/);
    assert.doesNotMatch(error.message, /unchanged/);
    assert.doesNotMatch(error.message, /\n\s+at /);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a pose timeout kills the drive group and names the kill", { timeout: 30000 }, async (t) => {
  if (!chromePath()) {
    t.skip("Chrome is not installed");
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), "anatomy-pose-"));
  try {
    const page = join(directory, "page.html");
    await writeFile(page, "<!doctype html><p>pose</p>");
    const error = await drive(page, [["wait", 30000]], { width: 400, height: 300, timeoutMs: 600 }).then(() => null, (failure) => failure);
    assert.ok(error);
    assert.match(error.message, /pose capture was killed/);
    assert.doesNotMatch(error.message, /\n\s+at /);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("printPdf writes a real PDF when Chrome is available", { timeout: 45000 }, async (t) => {
  if (!chromePath()) {
    t.skip("Chrome is not installed");
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), "anatomy-print-"));
  try {
    const htmlFile = join(directory, "sheet.html");
    const pdfFile = join(directory, "sheet.pdf");
    await writeFile(htmlFile, '<!doctype html><html><head><style>@page{size:A4;margin:12mm}body{font:16px sans-serif}</style></head><body><h1>Sentence blocks</h1><p>Tom reads books.</p><script>requestAnimationFrame(function loop(){requestAnimationFrame(loop)})</script></body></html>');
    const result = await printPdf(htmlFile, pdfFile, { timeoutMs: 15000, pages: 1, paper: { px: [794, 1123] } });
    assert.ok(result.via === "cli" || result.via === "cdp");
    const info = pdfInfo(pdfFile);
    assert.equal(info.pdf, true);
    assert.ok(info.pages >= 1);
    assert.equal((await readFile(pdfFile)).subarray(0, 4).toString(), "%PDF");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
