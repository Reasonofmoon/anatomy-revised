// One sentence, three blocks. The fold layer and the bench both read this.
export const SENTENCE = "Tom reads books.";
export const FORMULA = "S + V + O";
export const VIEW = { w: 780, h: 440 };

export const PLATE = { x: -168, y: -86, w: 336, d: 168, r: 8 };
export const RAIL = { x: -132, y: -18, w: 248, d: 52, r: 2 };

const PAPER = {
  S: { fill: "#FDE68A", top: "#FEF3C7", edge: "#92400E", ink: "#451A03", sub: "#78350F", shades: ["#FCD34D", "#F59E0B", "#D97706", "#B45309"] },
  V: { fill: "#FECDD3", top: "#FFE4E6", edge: "#9F1239", ink: "#4C0519", sub: "#881337", shades: ["#FDA4AF", "#FB7185", "#E11D48", "#BE123C"] },
  O: { fill: "#BAE6FD", top: "#E0F2FE", edge: "#0369A1", ink: "#0C4A6E", sub: "#075985", shades: ["#7DD3FC", "#38BDF8", "#0284C7", "#0369A1"] },
};

export const BLOCKS = [
  { id: "s", slot: "s", role: "S", text: "Tom", label: "Subject S", important: "subject", key: "KEY · S", at: [-78, 8], ...PAPER.S },
  { id: "v", slot: "v", role: "V", text: "reads", label: "Verb V", important: "verb", key: "KEY · V", at: [0, 8], ...PAPER.V },
  { id: "o", slot: "o", role: "O", text: "books", label: "Object O", important: "object", key: "KEY · O", note: "what is read", at: [78, 8], ...PAPER.O },
];

export const BLOCK = { w: 52, d: 30, h: 16 };
export const DIAL = [128, 8];
