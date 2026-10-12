// Shared design tokens for every generated SVG, so the profile reads as one system
// (and matches the portfolio site). Each asset is rendered once per theme.

export const THEMES = {
  dark: {
    name: "dark",
    bg: "#050608",
    surface: "#0b0d12",
    border: "#1d212b",
    grid: "rgba(255,255,255,0.035)",
    fg: "#f2f4f8",
    muted: "#a6aec0",
    dim: "#7d859a",
    chipBg: "rgba(255,255,255,0.03)",
    chipBorder: "rgba(255,255,255,0.11)",
    mint: "#5ef2c2",
    violet: "#8b7cff",
    gradient: ["#5ef2c2", "#d9fff2", "#b9b0ff", "#8b7cff"],
    glowMint: "rgba(94,242,194,0.16)",
    glowViolet: "rgba(139,124,255,0.16)",
    spark: "#ffffff",
  },
  light: {
    name: "light",
    bg: "#ffffff",
    surface: "#f6f8fa",
    border: "#d8dee4",
    grid: "rgba(9,12,17,0.045)",
    fg: "#0b0d12",
    muted: "#424a57",
    dim: "#656d78",
    chipBg: "#ffffff",
    chipBorder: "#d0d7de",
    mint: "#0a8f6d",
    violet: "#5b4bdb",
    gradient: ["#0a8f6d", "#0e9c8a", "#4a63d9", "#5b4bdb"],
    glowMint: "rgba(10,143,109,0.10)",
    glowViolet: "rgba(91,75,219,0.10)",
    spark: "#0b0d12",
  },
};

// GitHub renders README images without web fonts, so every stack ends in a system face.
export const FONT = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

export const esc = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Monospace glyphs are ~0.6em wide; `textLength` then pins that width on every OS. */
export const monoWidth = (text, size) => Math.round(text.length * size * 0.6 * 10) / 10;

/** Shared <defs>: brand gradient plus the two corner glows used on every card. */
export function defs(t, id) {
  const stops = t.gradient
    .map((c, i) => `<stop offset="${(i / (t.gradient.length - 1)).toFixed(2)}" stop-color="${c}"/>`)
    .join("");
  return `
  <defs>
    <linearGradient id="${id}-brand" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
    <radialGradient id="${id}-mint" cx="0.82" cy="0.1" r="0.7"><stop offset="0" stop-color="${t.glowMint}"/><stop offset="1" stop-color="${t.glowMint}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-violet" cx="0.08" cy="0.95" r="0.7"><stop offset="0" stop-color="${t.glowViolet}"/><stop offset="1" stop-color="${t.glowViolet}" stop-opacity="0"/></radialGradient>
    <pattern id="${id}-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="${t.grid}" stroke-width="1"/></pattern>
    <clipPath id="${id}-clip"><rect width="100%" height="100%" rx="20"/></clipPath>
  </defs>`;
}

/** Rounded card background with grid, glows and hairline border. */
export function frame(t, id, w, h, { grid = true } = {}) {
  return `
  <g clip-path="url(#${id}-clip)">
    <rect width="${w}" height="${h}" fill="${t.bg}"/>
    ${grid ? `<rect width="${w}" height="${h}" fill="url(#${id}-grid)"/>` : ""}
    <rect width="${w}" height="${h}" fill="url(#${id}-mint)"/>
    <rect width="${w}" height="${h}" fill="url(#${id}-violet)"/>
  </g>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="19.5" fill="none" stroke="${t.border}"/>`;
}

/** Row of pill chips in monospace. Returns the markup and the y of the last row. */
export function chips(t, items, { x, y, maxWidth, size = 12, padX = 11, height = 26, gap = 7 }) {
  let cx = x;
  let cy = y;
  let out = "";
  for (const item of items) {
    const textW = monoWidth(item, size);
    const w = textW + padX * 2;
    if (cx + w > x + maxWidth && cx > x) {
      cx = x;
      cy += height + gap;
    }
    out += `<rect x="${cx}" y="${cy}" width="${w}" height="${height}" rx="${height / 2}" fill="${t.chipBg}" stroke="${t.chipBorder}"/>`;
    out += `<text x="${cx + padX}" y="${cy + height / 2 + size * 0.36}" font-family="${FONT.mono}" font-size="${size}" fill="${t.muted}" textLength="${textW}" lengthAdjust="spacingAndGlyphs">${esc(item)}</text>`;
    cx += w + gap;
  }
  return { markup: out, bottom: cy + height };
}

export const svg = (w, h, label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">\n<title>${esc(label)}</title>${body}\n</svg>\n`;
