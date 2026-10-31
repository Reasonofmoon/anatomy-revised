export function stableJson(value, digits = 8) {
  const scale = 10 ** digits;
  const format = (number) => {
    if (!Number.isFinite(number)) return "null";
    const sign = number < 0 ? "-" : "";
    const abs = Math.abs(number);
    if (abs > 1e6) return JSON.stringify(number);
    const scaled = abs * scale;
    const half = Math.round(scaled * 2) / 2;
    const snapped = Math.abs(half % 1) > 0.25 && Math.abs(scaled - half) < 0.49 ? half : scaled;
    const raw = String(Math.round(snapped)).padStart(digits + 1, "0");
    const whole = raw.slice(0, -digits).replace(/^0+(?=\d)/, "") || "0";
    const frac = raw.slice(-digits).replace(/0+$/, "");
    const text = sign + whole + (frac ? `.${frac}` : "");
    return text === "-0" ? "0" : text;
  };
  const walk = (item) => {
    if (typeof item === "number") return format(item);
    if (item instanceof Float64Array || item instanceof Float32Array) return `[${Array.from(item, format).join(",")}]`;
    if (Array.isArray(item)) return `[${item.map(walk).join(",")}]`;
    if (item && typeof item === "object") return `{${Object.keys(item).map((key) => `${JSON.stringify(key)}:${walk(item[key])}`).join(",")}}`;
    return JSON.stringify(item);
  };
  return walk(value);
}
