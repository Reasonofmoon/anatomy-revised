// Copy computed colour into a print capture so a <use> clone keeps category
// tiles. Custom properties that differ from the parent are inlined (they
// inherit inside the clone). A fill or stroke that is not one of the
// anatomy tone tokens is baked, because an ancestor selector such as
// .iso[data-theme="light"] [data-cat] does not match inside the <use> shadow tree.
// Parts keep the tone variables so a focused step can still dim them.

export function inlinePaint({ props = {}, parent = {}, fill, stroke, tokens = [], part = false } = {}) {
  const bits = [];
  for (const name of Object.keys(props)) {
    if (!name.startsWith("--")) continue;
    const value = String(props[name] || "").trim();
    if (!value) continue;
    if (String(parent[name] || "").trim() === value) continue;
    bits.push(`${name}:${value}`);
  }
  if (!part) {
    const known = new Set(tokens.map((color) => String(color).replace(/\s+/g, "").toLowerCase()));
    const paint = (kind, value) => {
      const text = String(value || "").trim();
      if (!text || text === "none" || text === "transparent" || /url\(/i.test(text)) return;
      if (known.has(text.replace(/\s+/g, "").toLowerCase())) return;
      bits.push(`${kind}:${text}`);
    };
    paint("fill", fill);
    paint("stroke", stroke);
  }
  return bits.join(";");
}

export function capturePaintPrelude() {
  return `const inlinePaint = ${inlinePaint.toString()};
const TOKEN_NAMES = ["--anatomy-paper","--anatomy-face","--anatomy-top","--anatomy-shade-0","--anatomy-shade-1","--anatomy-shade-2","--anatomy-shade-3","--anatomy-hi","--anatomy-mid","--anatomy-lo","--anatomy-dot","--anatomy-lit","--anatomy-faint","--anatomy-lit-top","--anatomy-lit-shade"];
const paintCache = new Map();
function declaredProps() {
  const names = TOKEN_NAMES.slice();
  const add = (rules) => {
    if (!rules) return;
    for (const rule of rules) {
      if (rule.cssRules) add(rule.cssRules);
      const style = rule.style;
      if (!style) continue;
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (name && name.slice(0, 2) === "--" && names.indexOf(name) < 0) names.push(name);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try { add(sheet.cssRules); } catch (error) { /* a cross-origin sheet has no rules */ }
  }
  return names;
}
const PROP_NAMES = declaredProps();
function readProps(el) {
  if (paintCache.has(el)) return paintCache.get(el);
  const cs = getComputedStyle(el);
  const props = {};
  for (const name of PROP_NAMES) {
    const value = cs.getPropertyValue(name).trim();
    if (value) props[name] = value;
  }
  const row = { cs, props };
  paintCache.set(el, row);
  return row;
}
function paintedStyle(el, id) {
  const row = readProps(el);
  const parent = el.parentElement ? readProps(el.parentElement).props : {};
  const tokens = TOKEN_NAMES.map((name) => row.props[name]).filter(Boolean);
  return inlinePaint({ props: row.props, parent: parent, fill: row.cs.fill, stroke: row.cs.stroke, tokens: tokens, part: !!id });
}`;
}
