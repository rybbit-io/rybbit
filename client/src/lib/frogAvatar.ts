/**
 * Frog avatars: deterministic SVG portraits seeded from a visitor id.
 *
 * Same contract as the boring-avatars `beam` variant this replaces — one string
 * in, one stable image out — but drawn here so the palette and the features are
 * ours. Everything is derived from a hash of the id; the only values that reach
 * the markup are numbers and `hsl()` strings, so the result is safe to inject.
 */

type Rng = () => number;

interface Species {
  h: number;
  s: number;
  l: number;
}

/**
 * Hand-tuned rather than swept around the wheel: equal-lightness hues turn the
 * warm half of the spectrum to mud, so each entry carries its own saturation
 * and lightness. Greens and blues are deliberately a minority of the ring.
 */
const SPECIES: Species[] = [
  { h: 78, s: 72, l: 52 }, // lime
  { h: 96, s: 62, l: 46 }, // grass
  { h: 128, s: 56, l: 44 }, // leaf
  { h: 148, s: 64, l: 44 }, // emerald
  { h: 162, s: 54, l: 58 }, // mint
  { h: 176, s: 64, l: 42 }, // jade
  { h: 188, s: 70, l: 46 }, // teal
  { h: 198, s: 78, l: 52 }, // cyan
  { h: 210, s: 80, l: 56 }, // sky
  { h: 224, s: 74, l: 60 }, // azure
  { h: 240, s: 64, l: 64 }, // periwinkle
  { h: 262, s: 60, l: 62 }, // violet
  { h: 282, s: 58, l: 58 }, // purple
  { h: 300, s: 60, l: 56 }, // orchid
  { h: 318, s: 70, l: 58 }, // magenta
  { h: 334, s: 80, l: 62 }, // pink
  { h: 348, s: 76, l: 58 }, // rose
  { h: 6, s: 76, l: 54 }, // red
  { h: 18, s: 84, l: 58 }, // coral
  { h: 28, s: 90, l: 54 }, // orange
  { h: 38, s: 92, l: 52 }, // amber
  { h: 48, s: 92, l: 52 }, // gold
  { h: 58, s: 86, l: 52 }, // citron
  { h: 68, s: 78, l: 50 }, // chartreuse
];

type Morph = "classic" | "dusk" | "dart" | "chalk";
type Ground = "deep" | "contrast" | "pale" | "duo";
type Pupil = "round" | "slit" | "wide" | "pin";
type Iris = "paper" | "cream" | "mist" | "shell";
type Belly = "none" | "light" | "cream" | "contrast";
type Marks = "none" | "saddle" | "mask" | "stripe" | "blaze" | "halves";
type Mouth = "smile" | "wide" | "open" | "smirk";

interface FrogFeatures {
  species: Species;
  morph: Morph;
  ground: Ground;
  /** Spare jitter, reused wherever a shape needs a nudge that nothing else owns. */
  jitter: [number, number, number, number];
  headRx: number;
  headRy: number;
  headCy: number;
  domeOffset: number;
  domeY: number;
  domeRadius: number;
  eyeScale: number;
  gazeX: number;
  gazeY: number;
  pupil: Pupil;
  iris: Iris;
  lid: boolean;
  brow: boolean;
  cheeks: boolean;
  belly: Belly;
  marks: Marks;
  mouth: Mouth;
  mouthY: number;
  mouthCurve: number;
}

interface FrogPalette {
  lightness: number;
  skin: string;
  dark: string;
  light: string;
  line: string;
  mark: string;
  bg: string;
  bgAlt: string;
  cream: string;
  contrast: string;
  bright: string;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** mulberry32 — avalanches properly on sequential seeds, unlike xorshift. */
function makeRng(seed: number): Rng {
  let a = seed >>> 0 || 2463534242;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: Rng, options: readonly T[]): T {
  return options[Math.min(options.length - 1, Math.floor(r() * options.length))];
}

function weighted<T>(r: Rng, pairs: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, weight] of pairs) total += weight;
  let x = r() * total;
  for (const [value, weight] of pairs) {
    x -= weight;
    if (x <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function hsl(h: number, s: number, l: number): string {
  const hue = (((h % 360) + 360) % 360).toFixed(1);
  return `hsl(${hue} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

/** Two decimals is plenty at avatar sizes and keeps the markup short. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function smile(cx: number, y: number, width: number, curve: number, color: string, strokeWidth: number): string {
  return (
    `<path d="M${r2(cx - width / 2)} ${r2(y)} Q ${r2(cx)} ${r2(y + curve)} ${r2(cx + width / 2)} ${r2(y)}"` +
    ` fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
  );
}

function frogFeatures(r: Rng): FrogFeatures {
  return {
    species: pick(r, SPECIES),
    morph: weighted<Morph>(r, [
      ["classic", 54],
      ["dusk", 16],
      ["dart", 15],
      ["chalk", 15],
    ]),
    ground: weighted<Ground>(r, [
      ["deep", 38],
      ["contrast", 24],
      ["pale", 21],
      ["duo", 17],
    ]),
    jitter: [r(), r(), r(), r()],
    headRx: 41 + r() * 6,
    headRy: 36 + r() * 6,
    headCy: 65 + r() * 5,
    domeOffset: 20 + r() * 5,
    domeY: 29 + r() * 11,
    domeRadius: 16.5 + r() * 5,
    eyeScale: 0.56 + r() * 0.13,
    gazeX: pick(r, [-1, 0, 0, 1]),
    gazeY: pick(r, [-1, 0, 0, 1]),
    pupil: weighted<Pupil>(r, [
      ["round", 38],
      ["slit", 26],
      ["wide", 20],
      ["pin", 16],
    ]),
    iris: weighted<Iris>(r, [
      ["paper", 40],
      ["cream", 22],
      ["mist", 20],
      ["shell", 18],
    ]),
    lid: r() < 0.18,
    brow: r() < 0.3,
    cheeks: r() < 0.32,
    belly: weighted<Belly>(r, [
      ["none", 24],
      ["light", 34],
      ["cream", 22],
      ["contrast", 20],
    ]),
    marks: weighted<Marks>(r, [
      ["none", 26],
      ["saddle", 16],
      ["mask", 15],
      ["stripe", 15],
      ["blaze", 14],
      ["halves", 14],
    ]),
    mouth: weighted<Mouth>(r, [
      ["smile", 40],
      ["wide", 20],
      ["open", 22],
      ["smirk", 18],
    ]),
    mouthY: 67 + r() * 6,
    mouthCurve: 9 + r() * 12,
  };
}

/**
 * The disc has to stay visible against whatever it sits on. The app's dark
 * background is 8% lightness and its light background is 97%, so a ground
 * outside this band merges with the page and the icon stops reading as a
 * circle — what is left is a frog-shaped silhouette.
 */
const GROUND_MIN_L = 28;
const GROUND_MAX_L = 80;

/** A ground lightness inside that band, still a clear step away from the frog. */
function groundLightness(preferred: number, frogL: number): number {
  const bg = clamp(preferred, GROUND_MIN_L, GROUND_MAX_L);
  if (Math.abs(bg - frogL) >= 24) return bg;
  // Keep the ground on the side it was already heading for, unless the band
  // leaves no room there.
  const darker = clamp(frogL - 34, GROUND_MIN_L, GROUND_MAX_L);
  const lighter = clamp(frogL + 34, GROUND_MIN_L, GROUND_MAX_L);
  const preferredSide = bg < frogL ? darker : lighter;
  const otherSide = bg < frogL ? lighter : darker;
  return Math.abs(preferredSide - frogL) >= 24 ? preferredSide : otherSide;
}

function frogPalette(f: FrogFeatures): FrogPalette {
  const h = f.species.h;
  let s = f.species.s;
  let l = f.species.l;

  if (f.morph === "dart") {
    l = 20 + f.jitter[0] * 6;
    s = Math.min(s * 0.9, 66);
  } else if (f.morph === "chalk") {
    l = 79 + f.jitter[0] * 8;
    s = s * 0.36;
  } else if (f.morph === "dusk") {
    l = l * 0.72;
    s = s * 0.42;
  }

  let bgH: number;
  let bgS: number;
  let bgL: number;
  if (f.ground === "pale") {
    bgH = h + 6;
    bgS = 36 + f.jitter[1] * 26;
    bgL = 69 + f.jitter[2] * 11;
  } else if (f.ground === "contrast") {
    bgH = h + 152 + f.jitter[1] * 30;
    bgS = 26 + f.jitter[1] * 22;
    bgL = 31 + f.jitter[2] * 13;
  } else {
    bgH = h + 20;
    bgS = 20 + f.jitter[1] * 18;
    bgL = 29 + f.jitter[2] * 10;
  }
  // The frog and the ground it sits on never share a value.
  bgL = groundLightness(bgL, l);

  const bright = hsl(h, Math.min(s + 18, 94), 64);
  const deep = hsl(h + 8, Math.min(s * 0.85, 74), clamp(l - 32, 8, 40));

  return {
    lightness: l,
    skin: hsl(h, s, l),
    dark: hsl(h + 4, s * 0.95, clamp(l - 15, 6, 92)),
    light: hsl(h - 6, s * 0.78, clamp(l + 16, 20, 92)),
    line: f.morph === "dart" ? bright : deep,
    mark: f.morph === "dart" ? bright : hsl(h + 4, s * 0.95, clamp(l > 66 ? l - 26 : l - 22, 6, 92)),
    bg: hsl(bgH, bgS, bgL),
    bgAlt: hsl(bgH + 20, bgS + 10, clamp(bgL > 60 ? bgL - 16 : bgL + 21, GROUND_MIN_L, GROUND_MAX_L)),
    cream: hsl(h - 12, 38, 88),
    contrast: hsl(h + 148, 42, 72),
    bright,
  };
}

/**
 * Real frogs have gold and copper irises. At 20px a saturated iris reads as a
 * bloodshot eye rather than an amphibian one, so these stay near-white — the
 * variation is in the tint of that white, not its hue.
 */
const IRIS: Record<Iris, (h: number) => string> = {
  paper: h => hsl(h, 10, 96),
  cream: () => hsl(44, 42, 93),
  mist: h => hsl(h + 180, 16, 93),
  shell: () => hsl(18, 34, 93),
};

function drawEyes(f: FrogFeatures, c: FrogPalette): string {
  const xs = [50 - f.domeOffset, 50 + f.domeOffset];
  const rad = f.domeRadius * f.eyeScale;
  const iris = IRIS[f.iris](f.species.h);
  const pupilColor = hsl(f.species.h + 10, 40, 9);
  const pr = rad * 0.5;
  const gx = f.gazeX * rad * 0.2;
  const gy = f.gazeY * rad * 0.16;
  let o = "";

  if (f.brow) {
    for (const x of xs) {
      o +=
        `<path d="M${r2(x - f.domeRadius * 0.8)} ${r2(f.domeY - f.domeRadius * 0.55)}` +
        ` Q ${r2(x)} ${r2(f.domeY - f.domeRadius * 1.15)} ${r2(x + f.domeRadius * 0.8)} ${r2(f.domeY - f.domeRadius * 0.55)}"` +
        ` fill="none" stroke="${c.dark}" stroke-width="3.2" stroke-linecap="round"/>`;
    }
  }

  for (const x of xs) {
    o += `<circle cx="${r2(x)}" cy="${r2(f.domeY)}" r="${r2(rad)}" fill="${iris}"/>`;
    if (f.pupil === "slit") {
      o += `<ellipse cx="${r2(x + gx)}" cy="${r2(f.domeY + gy)}" rx="${r2(pr * 1.15)}" ry="${r2(pr * 0.62)}" fill="${pupilColor}"/>`;
    } else if (f.pupil === "wide") {
      o += `<circle cx="${r2(x + gx)}" cy="${r2(f.domeY + gy)}" r="${r2(pr * 1.25)}" fill="${pupilColor}"/>`;
    } else if (f.pupil === "pin") {
      o += `<circle cx="${r2(x + gx)}" cy="${r2(f.domeY + gy)}" r="${r2(pr * 0.62)}" fill="${pupilColor}"/>`;
    } else {
      o += `<circle cx="${r2(x + gx)}" cy="${r2(f.domeY + gy)}" r="${r2(pr)}" fill="${pupilColor}"/>`;
    }
    o += `<circle cx="${r2(x + gx - pr * 0.44)}" cy="${r2(f.domeY + gy - pr * 0.52)}" r="${r2(pr * 0.3)}" fill="#fff" opacity=".8"/>`;
    if (f.lid) {
      o +=
        `<path d="M${r2(x - rad - 0.4)} ${r2(f.domeY - rad * 0.25)} A ${r2(rad)} ${r2(rad)} 0 0 1 ` +
        `${r2(x + rad + 0.4)} ${r2(f.domeY - rad * 0.25)} Z" fill="${c.skin}"/>`;
      o +=
        `<path d="M${r2(x - rad)} ${r2(f.domeY - rad * 0.25)} H ${r2(x + rad)}"` +
        ` stroke="${c.dark}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
  }
  return o;
}

function drawFrog(f: FrogFeatures, clipId: string): string {
  const c = frogPalette(f);
  const x1 = 50 - f.domeOffset;
  const x2 = 50 + f.domeOffset;
  const headClipId = `${clipId}h`;

  const head =
    `<ellipse cx="50" cy="${r2(f.headCy)}" rx="${r2(f.headRx)}" ry="${r2(f.headRy)}"/>` +
    `<circle cx="${r2(x1)}" cy="${r2(f.domeY)}" r="${r2(f.domeRadius)}"/>` +
    `<circle cx="${r2(x2)}" cy="${r2(f.domeY)}" r="${r2(f.domeRadius)}"/>`;

  let o = `<circle cx="50" cy="50" r="50" fill="${c.bg}"/>`;
  if (f.ground === "duo") {
    o += `<polygon points="-2,102 -2,${r2(28 + f.jitter[3] * 34)} 102,${r2(8 + f.jitter[3] * 44)} 102,102" fill="${c.bgAlt}"/>`;
  }
  o += `<defs><clipPath id="${headClipId}">${head}</clipPath></defs>`;
  o += `<g fill="${c.skin}">${head}</g>`;

  // Markings and belly, clipped to the frog's own silhouette.
  let inner = "";
  if (f.marks === "saddle") {
    inner += `<ellipse cx="50" cy="${r2(f.domeY - 4)}" rx="62" ry="${r2(24 + f.jitter[3] * 10)}" fill="${c.mark}" opacity=".7"/>`;
  } else if (f.marks === "mask") {
    inner += `<rect x="-2" y="${r2(f.domeY - f.domeRadius * 0.75)}" width="104" height="${r2(f.domeRadius * 1.5)}" fill="${c.mark}" opacity=".65"/>`;
  } else if (f.marks === "stripe") {
    inner += `<rect x="${r2(43 + f.jitter[3] * 3)}" y="-2" width="${r2(12 + f.jitter[0] * 6)}" height="104" fill="${c.mark}" opacity=".6"/>`;
  } else if (f.marks === "blaze") {
    inner += `<polygon points="50,${r2(f.mouthY - 15)} ${r2(38 - f.jitter[0] * 5)},-2 ${r2(62 + f.jitter[0] * 5)},-2" fill="${c.mark}" opacity=".55"/>`;
  } else if (f.marks === "halves") {
    inner += `<rect x="${f.jitter[3] > 0.5 ? "-2" : "50"}" y="-2" width="52" height="104" fill="${c.mark}" opacity=".5"/>`;
  }

  if (f.belly !== "none") {
    const bellyColor =
      f.belly === "cream" ? c.cream : f.belly === "contrast" ? c.contrast : c.lightness > 70 ? c.dark : c.light;
    inner +=
      `<ellipse cx="50" cy="${r2(f.headCy + f.headRy * 0.66)}" rx="${r2(f.headRx * 0.72)}" ry="${r2(f.headRy * 0.52)}"` +
      ` fill="${bellyColor}" opacity="${f.belly === "contrast" ? ".72" : ".62"}"/>`;
  }
  if (f.cheeks) {
    inner += `<ellipse cx="${r2(50 - f.headRx * 0.74)}" cy="${r2(f.headCy + 2)}" rx="10" ry="8" fill="${c.light}" opacity=".45"/>`;
    inner += `<ellipse cx="${r2(50 + f.headRx * 0.74)}" cy="${r2(f.headCy + 2)}" rx="10" ry="8" fill="${c.light}" opacity=".45"/>`;
  }
  if (inner) o += `<g clip-path="url(#${headClipId})">${inner}</g>`;

  o += drawEyes(f, c);
  o += `<circle cx="44" cy="${r2(f.mouthY - 13)}" r="2" fill="${c.line}" opacity=".5"/>`;
  o += `<circle cx="56" cy="${r2(f.mouthY - 13)}" r="2" fill="${c.line}" opacity=".5"/>`;

  if (f.mouth === "open") {
    o += `<path d="M24,${r2(f.mouthY)} Q50,${r2(f.mouthY + 24)} 76,${r2(f.mouthY)} Z" fill="${c.line}"/>`;
    o += `<ellipse cx="50" cy="${r2(f.mouthY + 13)}" rx="9" ry="5.5" fill="hsl(348 62% 60%)"/>`;
  } else if (f.mouth === "wide") {
    o += smile(50, f.mouthY, 68, f.mouthCurve * 0.35, c.line, 4.2);
  } else if (f.mouth === "smirk") {
    o +=
      `<path d="M${r2(23)} ${r2(f.mouthY + 4)} Q 50 ${r2(f.mouthY + f.mouthCurve)} ${r2(77)} ${r2(f.mouthY - 6)}"` +
      ` fill="none" stroke="${c.line}" stroke-width="4.4" stroke-linecap="round"/>`;
  } else {
    o += smile(50, f.mouthY, 56, f.mouthCurve, c.line, 4.4);
  }
  return o;
}

/**
 * The contents of a `0 0 100 100` viewBox, ready for dangerouslySetInnerHTML.
 *
 * The clip-path ids are derived from the id rather than from useId or a
 * counter, so the same visitor produces byte-identical markup everywhere —
 * server and client render the same string, and the same frog drawn twice on
 * one page shares a mask it would have duplicated anyway.
 */
export function frogAvatarMarkup(id: string): string {
  const clipId = `frog${hashCode(`${id}clip`).toString(36)}`;
  const features = frogFeatures(makeRng(hashCode(id)));
  return (
    `<defs><clipPath id="${clipId}"><circle cx="50" cy="50" r="50"/></clipPath></defs>` +
    `<g clip-path="url(#${clipId})">${drawFrog(features, clipId)}</g>`
  );
}

/**
 * A standalone `<svg>` string, for the map markers and other places that build
 * DOM by hand instead of rendering React.
 */
export function frogAvatarSVG(id: string, size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img"` +
    ` xmlns="http://www.w3.org/2000/svg" style="display:block;border-radius:50%">${frogAvatarMarkup(id)}</svg>`
  );
}
