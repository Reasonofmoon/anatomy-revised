// A callout covers an important part when their boxes overlap by at least 8%
// of that part. The same threshold is CALLOUT_COVER in kit/callout.mjs.

function calloutHits({ callout = "[data-callout]", important = "[data-important]", ratio = 0.08 } = {}) {
  const overlap = (a, b) => {
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return w * h;
  };
  const shown = (el) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width >= 1 && rect.height >= 1 ? rect : null;
  };
  const nameOf = (el, attr) => el.getAttribute(attr) || (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32) || el.tagName;
  const marks = [...document.querySelectorAll(important)].map((el) => ({ el, rect: shown(el), name: nameOf(el, "data-important") })).filter((mark) => mark.rect);
  const bubbles = [...document.querySelectorAll(callout)].map((el) => ({ el, rect: shown(el), name: nameOf(el, "data-callout") })).filter((bubble) => bubble.rect);
  const problems = [];
  for (const bubble of bubbles) {
    for (const mark of marks) {
      if (bubble.el === mark.el || bubble.el.contains(mark.el) || mark.el.contains(bubble.el)) continue;
      const area = overlap(bubble.rect, mark.rect);
      const share = area / (mark.rect.width * mark.rect.height);
      if (share >= ratio) problems.push({ callout: bubble.name, important: mark.name, ratio: Math.round(share * 1000) / 10, px: Math.round(area) });
    }
  }
  return { callouts: bubbles.length, important: marks.length, problems };
}

export const CALLOUT_HITS = calloutHits.toString();

export function reportCallouts(result) {
  if (!result) return { lines: [], failed: false };
  if (!result.callouts && !result.problems?.length) return { lines: [], failed: false };
  const lines = [];
  if (result.problems?.length) {
    lines.push(`callouts: FAIL · ${result.problems.length} cover a marked important part`);
    for (const problem of result.problems) lines.push(`  "${problem.callout}" covers ${problem.ratio}% of "${problem.important}" (${problem.px} px²)`);
    return { lines, failed: true };
  }
  if (!result.important) {
    lines.push(`callouts: warning · ${result.callouts} bubble${result.callouts === 1 ? "" : "s"} but nothing is marked data-important, so overlap is not checked`);
    return { lines, failed: false };
  }
  lines.push(`callouts: 0 of ${result.callouts} cover a marked important part`);
  return { lines, failed: false };
}
