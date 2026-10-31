// On-screen size of teaching text. Face text engraved on an isometric face is
// allowed to be small; words a reader must read are marked data-legible
// (the fold layer's .fn-word carries that mark).

export const LEGIBLE = {
  desktopPx: 28,
  narrowPx: 16,
  desktopAt: 1100,
  faceWarnPx: 12,
  secondaryDesktopPx: 6,
  secondaryNarrowPx: 5,
  printPt: 20,
};

export function legibleMinimum(width) {
  return width >= LEGIBLE.desktopAt ? LEGIBLE.desktopPx : LEGIBLE.narrowPx;
}

function legibleText() {
  const desktopAt = 1100;
  const desktopPx = 28;
  const narrowPx = 16;
  const faceWarnPx = 12;
  const secondaryDesktopPx = 6;
  const secondaryNarrowPx = 5;
  const min = innerWidth >= desktopAt ? desktopPx : narrowPx;
  const secondaryMin = innerWidth >= desktopAt ? secondaryDesktopPx : secondaryNarrowPx;
  const shown = (el) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    }
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0.5 && rect.height > 0.5)) return false;
    if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= innerHeight || rect.left >= innerWidth) return false;
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      const ox = style.overflowX;
      const oy = style.overflowY;
      if ((ox === "visible" || ox === "") && (oy === "visible" || oy === "")) continue;
      const box = node.getBoundingClientRect();
      let left = rect.left;
      let right = rect.right;
      let top = rect.top;
      let bottom = rect.bottom;
      if (ox !== "visible") {
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
      }
      if (oy !== "visible") {
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
      if (right - left <= 0.5 || bottom - top <= 0.5) return false;
    }
    return true;
  };
  const seen = new Set();
  const rows = [];
  for (const el of document.querySelectorAll("[data-legible], .fn-word, .iso-face-text")) {
    if (seen.has(el) || !shown(el)) continue;
    seen.add(el);
    const secondary = el.getAttribute("data-legible") === "secondary";
    const hard = !secondary && el.matches("[data-legible], .fn-word");
    const px = el.getBoundingClientRect().height;
    const required = secondary ? secondaryMin : hard ? min : faceWarnPx;
    rows.push({
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48),
      px: Math.round(px * 10) / 10,
      required,
      hard,
      secondary,
      ok: px + 0.49 >= required,
    });
  }
  const layer = document.querySelector("[data-fold-layer]");
  return {
    min,
    secondaryMin,
    checked: rows.length,
    teaching: rows.filter((row) => row.hard).length,
    secondary: rows.filter((row) => row.secondary).length,
    failures: rows.filter((row) => row.hard && !row.ok),
    secondaryFailures: rows.filter((row) => row.secondary && !row.ok),
    warnings: rows.filter((row) => !row.hard && !row.secondary && !row.ok),
    folded: Boolean(layer && layer.getAttribute("data-fold-state") === "folded"),
    fold: Boolean(layer),
    width: innerWidth,
  };
}

export const LEGIBLE_TEXT = legibleText.toString();

export function reportLegible(result) {
  if (!result) return { lines: ["legible: the check did not run"], failed: false };
  const lines = [];
  let failed = false;
  const foldedNote = "legible: warning · fold layer is folded, so no teaching text is on screen. Unfold it (lines.mjs --state unfolded) to measure the nets.";
  if (result.failures?.length) {
    failed = true;
    lines.push(`legible: FAIL · ${result.failures.length} teaching text${result.failures.length === 1 ? "" : "s"} under ${result.min}px`);
    for (const row of result.failures) lines.push(`  "${row.text}" is ${row.px}px tall, under ${row.required}px`);
  } else if (result.teaching) {
    const secondary = result.secondary && !result.secondaryFailures?.length ? `, secondary text at least ${result.secondaryMin}px` : "";
    lines.push(`legible: ${result.checked} visible text${result.checked === 1 ? "" : "s"}, teaching text at least ${result.min}px${secondary}`);
  } else if (result.checked) {
    lines.push(`legible: ${result.checked} visible text${result.checked === 1 ? "" : "s"}`);
    if (result.folded) lines.push(foldedNote);
  } else if (result.folded) {
    lines.push(foldedNote);
  } else if (result.fold) {
    lines.push("legible: warning · a fold layer is present but no teaching text is visible.");
  }
  if (result.secondaryFailures?.length) {
    failed = true;
    const count = result.secondaryFailures.length;
    lines.push(`legible: FAIL · ${count} secondary text${count === 1 ? "" : "s"} under ${result.secondaryMin}px`);
    for (const row of result.secondaryFailures) lines.push(`  "${row.text}" is ${row.px}px tall, under ${row.required}px`);
  } else if (result.secondary && !result.teaching) {
    lines.push(`legible: secondary · ${result.secondary} text${result.secondary === 1 ? "" : "s"} at least ${result.secondaryMin}px`);
  }
  const warnings = result.warnings ?? [];
  if (warnings.length > 1) {
    const sizes = warnings.map((row) => row.px).sort((a, b) => a - b);
    const width = result.width ? ` on a ${result.width}px viewport` : "";
    lines.push(`legible: warning · ${warnings.length} engraved labels are ${sizes[0]}–${sizes[sizes.length - 1]}px${width} (under ${warnings[0].required}px). They are engravings; put words a reader must read on the fold layer.`);
  } else {
    for (const row of warnings) lines.push(`legible: warning · engraved face text "${row.text}" is ${row.px}px (under ${row.required}px). Put words a reader must read on the fold layer.`);
  }
  return { lines, failed };
}
