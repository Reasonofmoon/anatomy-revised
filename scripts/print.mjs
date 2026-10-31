import { spawn, spawnSync } from "node:child_process";
import { chromePort } from "./chrome-port.mjs";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FORMATS, PAPER, pagesOf, sheetHtml } from "./print-sheet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRIVE = join(HERE, "drive.mjs");

function usage() {
  console.log(`Print a figure as an explained drawing on one A4 sheet: an HTML page and a PDF.

  node print.mjs <sheet.mjs> [--format poster|drawing|detailed|all] [--letter] [--png] [--out name]

  sheet.mjs     a module whose default export names the built page, the poses to capture, the parts and the text
                (see references/print.md and examples/raptor-engine/sheet.mjs)
  --format f    poster (one page, big title, numbers and a legend; the default), drawing (one page, parts list,
                specification and a strip of steps), detailed (two pages: the figure with every part, then the steps,
                close-ups and the why), or all
  --letter      US Letter instead of A4
  --png         also write a preview PNG of the sheet
  --out name    output base name (default: the spec's out, else the page name)

Writes <name>-<format>-a4.html and .pdf next to the spec. poster, drawing and detailed are unchanged.
Chrome --print-to-pdf is killed if it is still running after ANATOMY_PRINT_TIMEOUT_MS (default 20s) and the PDF is
printed with Page.printToPDF instead. If both fail, the script exits with both reasons instead of hanging.`);
}

export function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe")] : []),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const playwright = join(homedir(), "Library/Caches/ms-playwright");
  if (existsSync(playwright)) {
    for (const dir of readdirSync(playwright).sort().reverse()) {
      for (const sub of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        candidates.push(join(playwright, dir, sub));
      }
    }
  }
  const linux = join(homedir(), ".cache/ms-playwright");
  if (existsSync(linux)) for (const dir of readdirSync(linux).sort().reverse()) for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome"]) candidates.push(join(linux, dir, sub));
  return candidates.find((path) => existsSync(path));
}

export function captureScript(spec) {
  const config = {
    layers: spec.layers ?? ".iso-stage svg.iso-svg, .iso-plate svg.iso-svg",
    strip: spec.strip ?? [],
    parts: (spec.parts ?? []).filter((part) => part.select).map(({ id, select }) => ({ id, select })),
    frame: spec.rasterSelector ?? ".iso-stage",
  };
  return `(() => {
  const C = ${JSON.stringify(config)};
  const TONES = ["hi", "mid", "lo", "dot"];
  const layers = [...document.querySelectorAll(C.layers)].filter((svg) => svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width);
  if (!layers.length) return { __print: true, error: "no layers match " + C.layers };
  const base = layers[0];
  const vbox = base.viewBox.baseVal;
  const rect = base.getBoundingClientRect();
  const k = vbox.width / rect.width;
  const toVb = (b) => [vbox.x + (b.left - rect.left) * k, vbox.y + (b.top - rect.top) * k, vbox.x + (b.right - rect.left) * k, vbox.y + (b.bottom - rect.top) * k];
  const sets = C.parts.map((part) => ({ id: part.id, els: layers.map((svg) => [...svg.querySelectorAll(part.select)]) }));
  const boxes = {};
  const anchors = {};
  for (const set of sets) {
    let box = null;
    let best = null;
    for (const el of set.els.flat()) {
      const b = el.getBoundingClientRect();
      if (!b.width && !b.height) continue;
      const v = toVb(b);
      box = box ? [Math.min(box[0], v[0]), Math.min(box[1], v[1]), Math.max(box[2], v[2]), Math.max(box[3], v[3])] : v;
      for (const shape of el.matches("path,circle,ellipse,rect,polygon") ? [el] : el.querySelectorAll("path,circle,ellipse,rect,polygon")) {
        if (shape.closest(".iso-halo, [class*=halo]")) continue;
        const s = shape.getBoundingClientRect();
        const area = s.width * s.height;
        if (!best || area > best.area) best = { area, at: [(toVb(s)[0] + toVb(s)[2]) / 2, (toVb(s)[1] + toVb(s)[3]) / 2] };
      }
    }
    if (box) boxes[set.id] = box.map((n) => Math.round(n * 10) / 10);
    if (best) anchors[set.id] = best.at.map((n) => Math.round(n * 10) / 10);
  }
  const html = layers.map((svg, index) => {
    const live = new Map();
    for (const set of sets) for (const el of set.els[index]) live.set(el, set.id);
    const clone = svg.cloneNode(true);
    const walkLive = [...svg.querySelectorAll("*")];
    const walkClone = [...clone.querySelectorAll("*")];
    walkLive.forEach((el, at) => {
      const id = live.get(el);
      if (!id) return;
      const cs = getComputedStyle(el);
      const tokens = TONES.map((tone) => "--anatomy-" + tone + ":var(--on-" + id + "-" + tone + ",var(--part-" + tone + "," + (cs.getPropertyValue("--anatomy-" + tone).trim() || "currentColor") + "))").join(";");
      const target = walkClone[at];
      const own = target.getAttribute("style");
      target.setAttribute("style", (own ? own.replace(/;?\\s*$/, ";") : "") + tokens + ";display:var(--show-" + id + "," + (cs.display === "none" ? "none" : "inline") + ")");
      target.setAttribute("data-print-part", id);
    });
    for (const sel of C.strip) clone.querySelectorAll(sel).forEach((el) => el.remove());
    clone.querySelectorAll("title,desc").forEach((el) => el.remove());
    clone.querySelectorAll("[id]").forEach((el) => el.setAttribute("id", "ps" + index + "-" + el.id));
    let inner = clone.innerHTML;
    clone.querySelectorAll("[id]").forEach((el) => {
      const old = el.id.slice(("ps" + index + "-").length);
      inner = inner.split("url(#" + old + ")").join("url(#" + el.id + ")").split('href="#' + old + '"').join('href="#' + el.id + '"');
    });
    return inner;
  });
  let content = null;
  for (const svg of layers) for (const el of svg.children) {
    if (el.tagName === "defs" || el.tagName === "title" || el.tagName === "desc") continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const v = toVb(b);
    content = content ? [Math.min(content[0], v[0]), Math.min(content[1], v[1]), Math.max(content[2], v[2]), Math.max(content[3], v[3])] : v;
  }
  const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\\n");
  const r = (document.querySelector(C.frame) || base.parentElement).getBoundingClientRect();
  return { __print: true, vb: [vbox.x, vbox.y, vbox.width, vbox.height], content: content && [content[0], content[1], content[2] - content[0], content[3] - content[1]].map((n) => Math.round(n * 10) / 10), k, offset: [(rect.left - r.left), (rect.top - r.top)], layers: html, boxes, anchors, css, readout: (document.querySelector("[data-readout]") || {}).textContent || "" };
})()`;
}

function drive(page, actions, { reduced, width, height }) {
  const profile = mkdtempSync(join(tmpdir(), "iso-print-"));
  const file = join(profile, "actions.json");
  writeFileSync(file, JSON.stringify(actions));
  const args = [DRIVE, page, "--actions", file, "--width", String(width), "--height", String(height)];
  if (reduced) args.push("--reduced");
  const log = join(profile, "out.txt");
  const fd = openSync(log, "w");
  const run = spawnSync(process.execPath, args, { stdio: ["ignore", fd, "pipe"], encoding: "utf8", maxBuffer: 1 << 26, timeout: 120000, killSignal: "SIGKILL" });
  closeSync(fd);
  const stdout = readFileSync(log, "utf8");
  rmSync(profile, { recursive: true, force: true });
  if (run.error?.code === "ETIMEDOUT") throw new Error("drive.mjs timed out after 120s while capturing poses. The print did not hang; the pose capture was killed.");
  if (run.error) throw new Error(`drive.mjs failed: ${run.error.message}`);
  if (run.status !== 0) throw new Error(`drive.mjs failed:\n${(run.stderr || stdout || "").slice(-2000)}`);
  return stdout
    .split("\n")
    .filter((line) => line.startsWith("eval: "))
    .map((line) => JSON.parse(line.slice(6)));
}

export async function capture(spec, pagePath) {
  const options = { reduced: spec.reduced ?? true, width: spec.width ?? 1200, height: spec.height ?? 1200 };
  const views = Object.entries(spec.views ?? { rest: {} });
  const script = captureScript(spec);
  const actions = [["wait", spec.settle ?? 1200]];
  for (const [, view] of views) actions.push(...(view.actions ?? []), ["eval", script], ...(view.reset ?? []));
  const results = drive(pagePath, actions, options).filter((result) => result && result.__print);
  if (results.length !== views.length) throw new Error(`expected ${views.length} captures, got ${results.length}`);
  const out = { views: {}, css: "" };
  results.forEach((result, index) => {
    if (result.error) throw new Error(result.error);
    out.css = result.css;
    const [name, view] = views[index];
    out.views[name] = { vb: result.vb, content: result.content, layers: result.layers, boxes: result.boxes, anchors: result.anchors, k: result.k, offset: result.offset, readout: result.readout, raster: view.raster ? true : undefined };
  });
  const rasters = views.filter(([, view]) => view.raster);
  if (rasters.length) {
    const dir = mkdtempSync(join(tmpdir(), "iso-print-shots-"));
    const shots = [["wait", spec.settle ?? 1200]];
    for (const [name, view] of views) {
      shots.push(...(view.actions ?? []));
      if (view.raster) {
        const captured = out.views[name];
        const region = view.raster.region ?? captured.vb;
        const [vx, vy] = captured.vb;
        const box = [(region[0] - vx) / captured.k + captured.offset[0], (region[1] - vy) / captured.k + captured.offset[1], region[2] / captured.k, region[3] / captured.k].map((n) => Math.round(n));
        shots.push(["shot", join(dir, `${name}.png`), view.raster.selector ?? spec.rasterSelector ?? ".iso-stage", view.raster.scale ?? 2, box]);
        out.views[name].raster = { region, file: join(dir, `${name}.png`) };
      }
      shots.push(...(view.reset ?? []));
    }
    drive(pagePath, shots, options);
    for (const [name] of rasters) {
      const raster = out.views[name].raster;
      if (!existsSync(raster.file)) throw new Error(`raster shot for ${name} was not written`);
      raster.href = `data:image/png;base64,${readFileSync(raster.file).toString("base64")}`;
      delete raster.file;
    }
    rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

function killGroup(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    try { child.kill("SIGKILL"); } catch { /* already gone */ }
  }
}

export function runProcess(binary, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { stdio: "ignore", detached: true });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      killGroup(child);
      finish({ ok: false, reason: `timed out after ${timeoutMs} ms and was killed` });
    }, timeoutMs);
    child.on("error", (error) => finish({ ok: false, reason: error.message }));
    child.on("exit", (code, signal) => finish({ ok: code === 0 && !signal, code, signal, reason: signal ? `exited on ${signal}` : code === 0 ? "" : `exited ${code}` }));
  });
}

export function pdfInfo(file) {
  if (!existsSync(file)) return { pages: 0, bytes: 0, pdf: false };
  const bytes = statSync(file).size;
  const text = bytes ? readFileSync(file, "latin1") : "";
  const pdf = text.startsWith("%PDF") && bytes >= 500;
  const pages = pdf ? (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length : 0;
  return { pages, bytes, pdf };
}

function chromeLaunch(profile) {
  return ["--headless=new", ...(process.platform === "linux" ? ["--no-sandbox"] : []), "--disable-gpu", "--disable-dev-shm-usage", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--mute-audio", "--allow-file-access-from-files", `--user-data-dir=${profile}`];
}

async function printPdfViaCli(htmlFile, pdfFile, { timeoutMs }) {
  const binary = chromePath();
  if (!binary) return { ok: false, reason: "No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary." };
  const profile = mkdtempSync(join(tmpdir(), "iso-print-pdf-"));
  if (existsSync(pdfFile)) rmSync(pdfFile);
  const run = await runProcess(binary, [...chromeLaunch(profile), "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, pathToFileURL(htmlFile).href], timeoutMs);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still be releasing the profile */ }
  const info = pdfInfo(pdfFile);
  if (!run.ok || !info.pdf) {
    if (existsSync(pdfFile)) rmSync(pdfFile);
    return { ok: false, reason: run.ok ? "Chrome exited without a usable PDF" : run.reason };
  }
  return { ok: true, ...info, via: "cli" };
}

async function printPngViaCli(htmlFile, pngFile, { timeoutMs, paper, pages }) {
  const binary = chromePath();
  if (!binary || !paper) return { ok: false, reason: "no Chrome or paper size for the preview" };
  const profile = mkdtempSync(join(tmpdir(), "iso-print-png-"));
  if (existsSync(pngFile)) rmSync(pngFile);
  const run = await runProcess(binary, [...chromeLaunch(profile), "--force-device-scale-factor=2", `--window-size=${paper.px[0]},${paper.px[1] * pages}`, `--screenshot=${pngFile}`, `${pathToFileURL(htmlFile).href}?print`], timeoutMs);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile cleanup is best-effort */ }
  if (!run.ok || !existsSync(pngFile) || statSync(pngFile).size < 100) return { ok: false, reason: run.reason || "Chrome did not write the preview" };
  return { ok: true };
}

async function printPdfViaCdp(htmlFile, pdfFile, { png, paper, pages: expected = 1, timeoutMs, pdf = true } = {}) {
  if (typeof WebSocket === "undefined") return { ok: false, reason: "Page.printToPDF needs a global WebSocket (Node 22, or Node 20 with --experimental-websocket)" };
  const binary = chromePath();
  if (!binary) return { ok: false, reason: "No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary." };
  const profile = mkdtempSync(join(tmpdir(), "iso-print-cdp-"));
  const chrome = spawn(binary, ["--headless=new", ...(process.platform === "linux" ? ["--no-sandbox"] : []), "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--allow-file-access-from-files", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const timer = setTimeout(() => killGroup(chrome), timeoutMs);
  const fail = (reason) => {
    clearTimeout(timer);
    killGroup(chrome);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* already removed */ }
    return { ok: false, reason };
  };
  try {
    const port = await chromePort(chrome, profile);
    const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    let loaded = () => {};
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.method === "Page.loadEventFired") loaded();
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    };
    await new Promise((done, reject) => {
      socket.onopen = done;
      socket.onerror = () => reject(new Error("DevTools socket failed"));
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const call = ++id;
      const callTimer = setTimeout(() => {
        pending.delete(call);
        reject(new Error(`Chrome did not answer ${method} within ${timeoutMs} ms`));
      }, timeoutMs);
      pending.set(call, (data) => {
        clearTimeout(callTimer);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      });
      socket.send(JSON.stringify({ id: call, method, params }));
    });
    await send("Page.enable");
    const width = paper?.px?.[0] ?? 794;
    const height = (paper?.px?.[1] ?? 1123) * expected;
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: png ? 2 : 1, mobile: false });
    const waitLoad = new Promise((resolve) => { loaded = resolve; });
    await send("Page.navigate", { url: `${pathToFileURL(htmlFile).href}?print` });
    await Promise.race([waitLoad, new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 8000)))]);
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (pdf) {
      if (existsSync(pdfFile)) rmSync(pdfFile);
      const printed = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
      writeFileSync(pdfFile, Buffer.from(printed.data, "base64"));
    }
    if (png) {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
      writeFileSync(png, Buffer.from(shot.data, "base64"));
    }
    socket.close();
    clearTimeout(timer);
    killGroup(chrome);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile cleanup is best-effort */ }
    if (pdf) {
      const info = pdfInfo(pdfFile);
      if (!info.pdf) return { ok: false, reason: "Page.printToPDF wrote no usable PDF" };
      return { ok: true, ...info, via: "cdp" };
    }
    return { ok: true, pages: 0, bytes: 0, via: "cdp" };
  } catch (error) {
    return fail(error.message || String(error));
  }
}

export async function printPdf(htmlFile, pdfFile, options = {}) {
  const timeoutMs = options.timeoutMs ?? Number(process.env.ANATOMY_PRINT_TIMEOUT_MS || 20000);
  const cli = options.cli ?? ((file, out) => printPdfViaCli(file, out, { timeoutMs }));
  const cdp = options.cdp ?? ((file, out, pngPath) => printPdfViaCdp(file, out, { png: pngPath, paper: options.paper, pages: options.pages, timeoutMs }));
  const cliResult = await cli(htmlFile, pdfFile, options);
  if (cliResult?.ok) {
    if (options.png && !options.cli) {
      const shot = await printPngViaCli(htmlFile, options.png, { timeoutMs, paper: options.paper, pages: options.pages ?? 1 });
      if (!shot.ok) {
        console.warn(`print: preview screenshot failed (${shot.reason}); using Page.captureScreenshot`);
        const preview = await printPdfViaCdp(htmlFile, pdfFile, { png: options.png, paper: options.paper, pages: options.pages, timeoutMs, pdf: false });
        if (!preview.ok) console.warn(`print: preview was not written (${preview.reason})`);
      }
    }
    return { pages: cliResult.pages, bytes: cliResult.bytes, via: cliResult.via || "cli" };
  }
  const reason = cliResult?.reason || "Chrome --print-to-pdf failed";
  console.warn(`print: Chrome --print-to-pdf failed (${reason}); falling back to Page.printToPDF`);
  if (existsSync(pdfFile)) rmSync(pdfFile);
  const cdpResult = await cdp(htmlFile, pdfFile, options.png || null);
  if (!cdpResult?.ok) {
    throw new Error(`print: no PDF was written for ${pdfFile}.\n  Chrome --print-to-pdf: ${reason}\n  Page.printToPDF: ${cdpResult?.reason || "failed"}\n  poster, drawing and detailed are unchanged; printing stopped instead of hanging.`);
  }
  return { pages: cdpResult.pages, bytes: cdpResult.bytes, via: "cdp" };
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(argv.length ? 0 : 1);
  }
  const rest = [];
  const options = { letter: false, png: false, out: null, format: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--letter") options.letter = true;
    else if (arg === "--png") options.png = true;
    else if (arg === "--out") options.out = argv[++index];
    else if (arg === "--format") options.format = argv[++index];
    else rest.push(arg);
  }
  const specFile = resolve(rest[0]);
  const spec = (await import(pathToFileURL(specFile).href)).default;
  const dir = dirname(specFile);
  const pagePath = resolve(dir, spec.page);
  if (!existsSync(pagePath)) throw new Error(`no built page at ${pagePath}; build the figure with --light first`);
  const paper = options.letter ? PAPER.letter : PAPER.a4;
  const formats = options.format === "all" ? FORMATS : [options.format ?? spec.format ?? "poster"];
  for (const format of formats) if (!FORMATS.includes(format)) throw new Error(`unknown format "${format}"; use one of ${FORMATS.join(", ")} or all`);
  const base = options.out ?? spec.out ?? spec.page.replace(/(-light)?\.html$/, "");
  const captured = await capture(spec, pagePath);
  for (const part of spec.parts ?? []) {
    if (part.select && !captured.views[spec.main.view].boxes[part.id]) console.warn(`warning: part ${part.id} matched nothing in view ${spec.main.view}`);
  }
  let failed = false;
  for (const format of formats) {
    const name = `${base}-${format}-${options.letter ? "letter" : "a4"}`;
    const html = sheetHtml(captured, spec, paper, format);
    const htmlFile = join(dir, `${name}.html`);
    writeFileSync(htmlFile, html);
    const pdfFile = join(dir, `${name}.pdf`);
    const png = options.png ? join(dir, `${name}.png`) : null;
    const expected = pagesOf(format, spec);
    const { pages, bytes, via } = await printPdf(htmlFile, pdfFile, { png, paper, pages: expected });
    const how = via === "cdp" ? " via Page.printToPDF" : " via --print-to-pdf";
    console.log(`wrote ${name}.html (${(html.length / 1024).toFixed(0)} KB) and ${name}.pdf (${(bytes / 1024).toFixed(0)} KB, ${pages} page${pages === 1 ? "" : "s"})${png ? ` and ${name}.png` : ""}${how}`);
    if (pages !== expected) {
      console.error(`${format} should print on ${expected} page${expected === 1 ? "" : "s"} but runs to ${pages}; shorten the text or the steps until it fits`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
