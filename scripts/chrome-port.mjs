import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

export function removeProfile(profile) {
  if (!profile) return;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch { /* chrome can still be creating files while the directory is removed */ }
    if (!existsSync(profile)) return;
    spawnSync("sleep", ["0.05"]);
  }
}

export function killChrome(chrome, profile) {
  const pids = new Set();
  if (chrome?.pid) pids.add(chrome.pid);
  if (profile && process.platform === "win32") {
    if (chrome?.pid) spawnSync("taskkill", ["/pid", String(chrome.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  if (profile && process.platform !== "win32") {
    const listed = spawnSync("ps", ["-eo", "pid,command"], { encoding: "utf8" });
    const needle = `--user-data-dir=${profile}`;
    for (const line of String(listed.stdout || "").split("\n")) {
      if (!line.includes(needle)) continue;
      const pid = Number(line.trim().split(/\s+/, 1)[0]);
      if (pid > 0) pids.add(pid);
    }
  }
  for (const pid of pids) {
    try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ }
  }
}

export async function chromePort(chrome, profile) {
  if (chrome.exitCode != null || chrome.signalCode) {
    killChrome(chrome, profile);
    throw new Error(`Chrome exited before startup: ${chrome.exitCode ?? chrome.signalCode}`);
  }
  try {
    return await new Promise((done, fail) => {
      let text = "";
      const clean = () => {
        clearTimeout(timer);
        chrome.stderr.off("data", data);
        chrome.off("error", error);
        chrome.off("exit", exited);
      };
      const error = (cause) => {
        clean();
        fail(cause);
      };
      const exited = (code, signal) => error(new Error(`Chrome exited before startup: ${code ?? signal}`));
      const data = (chunk) => {
        text += chunk;
        const match = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
        if (match) {
          clean();
          done(Number(match[1]));
        }
      };
      const timer = setTimeout(() => error(new Error("Chrome did not start")), 20000);
      chrome.stderr.on("data", data);
      chrome.on("error", error);
      chrome.on("exit", exited);
    });
  } catch (error) {
    killChrome(chrome, profile);
    removeProfile(profile);
    throw error;
  }
}
