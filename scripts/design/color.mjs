// Colour maths for the design checks: CSS oklch()/hex → linear sRGB, alpha
// compositing and WCAG 2 contrast. No dependencies.

/** oklch(L C H [/ A]) with L as 0–1 or %, A as 0–1 or %. */
export function parseOklch(value) {
  const m =
    /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)/i.exec(
      value,
    );
  if (!m) return null;
  const num = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s));
  return {
    l: num(m[1]),
    c: parseFloat(m[2]),
    h: parseFloat(m[3]),
    alpha: m[4] ? num(m[4]) : 1,
  };
}

/** OKLCH → linear sRGB (clamped to gamut), per Björn Ottosson's OKLab. */
export function oklchToLinearRgb({ l, c, h }) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

const toGamma = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const toLinear = (v) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/** Gamma-encoded sRGB 0–1 triplet for a CSS colour (oklch or #hex), plus alpha. */
export function cssToSrgb(value) {
  const ok = parseOklch(value);
  if (ok) return { rgb: oklchToLinearRgb(ok).map(toGamma), alpha: ok.alpha };
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return {
      rgb: [n >> 16, (n >> 8) & 255, n & 255].map((v) => v / 255),
      alpha: 1,
    };
  }
  return null;
}

/** Composite `fg` (with its alpha, times `extraAlpha`) over an opaque `bg` (gamma space, like browsers). */
export function over(fg, bg, extraAlpha = 1) {
  const a = fg.alpha * extraAlpha;
  return { rgb: fg.rgb.map((v, i) => v * a + bg.rgb[i] * (1 - a)), alpha: 1 };
}

export function luminance({ rgb }) {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
