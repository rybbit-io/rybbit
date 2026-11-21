/**
 * Frog avatars: deterministic SVG portraits seeded from a visitor id.
 *
 * One string in, one stable image out. Everything is derived from the id; the
 * only values that reach the markup are numbers and hex colours, so the result
 * is safe to inject.
 *
 * The frog is one drawn head shape, varied only within narrow bounds, with a
 * small set of discrete parts (eyes, pupils, mouth, jaw, cheeks) on top. Its
 * colour is the colour word in the visitor's generated name, so "Coral Hamster"
 * is a coral frog.
 *
 * The markup references nothing by id: no clipPath, mask or gradient. The
 * sessions ledger renders every avatar twice, once in a layout a container
 * query hides, and Chrome and Firefox resolve a repeated `url(#id)` to whichever
 * copy comes first, hidden or not; when that copy was hidden the clip silently
 * dropped. Every shape here is built to sit inside the head on its own.
 */

type Rng = () => number;
type Point = readonly [number, number];
type Cubic = readonly [Point, Point, Point, Point];

/**
 * One skin per word in unique-names-generator's `colors` dictionary, in the
 * dictionary's order. [OKLCH lightness, chroma, hue], tuned to read as the
 * word while staying clear of both app grounds (dark L .18, light L .97).
 * Words that name skin tones (peach, beige, tan, moccasin) lean towards khaki,
 * so those frogs read as frogs rather than faces.
 */
const SKINS: readonly (readonly [string, number, number, number])[] = [
  ["amaranth", 0.63, 0.19, 8],
  ["amber", 0.8, 0.16, 75],
  ["amethyst", 0.62, 0.15, 305],
  ["apricot", 0.78, 0.13, 62],
  ["aqua", 0.8, 0.12, 200],
  ["aquamarine", 0.83, 0.12, 172],
  ["azure", 0.64, 0.17, 252],
  ["beige", 0.84, 0.06, 100],
  ["black", 0.42, 0.02, 250],
  ["blue", 0.58, 0.19, 262],
  ["blush", 0.7, 0.13, 2],
  ["bronze", 0.64, 0.12, 72],
  ["brown", 0.54, 0.1, 52],
  ["chocolate", 0.5, 0.09, 48],
  ["coffee", 0.52, 0.06, 70],
  ["copper", 0.63, 0.13, 50],
  ["coral", 0.72, 0.15, 36],
  ["crimson", 0.57, 0.2, 18],
  ["cyan", 0.74, 0.13, 220],
  ["emerald", 0.72, 0.16, 155],
  ["fuchsia", 0.65, 0.24, 330],
  ["gold", 0.84, 0.15, 92],
  ["gray", 0.64, 0.01, 250],
  ["green", 0.72, 0.19, 142],
  ["harlequin", 0.8, 0.22, 136],
  ["indigo", 0.5, 0.16, 280],
  ["ivory", 0.93, 0.045, 108],
  ["jade", 0.66, 0.13, 162],
  ["lavender", 0.78, 0.09, 295],
  ["lime", 0.86, 0.19, 125],
  ["magenta", 0.62, 0.24, 345],
  ["maroon", 0.48, 0.13, 18],
  ["moccasin", 0.87, 0.08, 90],
  ["olive", 0.6, 0.11, 112],
  ["orange", 0.76, 0.17, 62],
  ["peach", 0.79, 0.12, 46],
  ["pink", 0.8, 0.1, 355],
  ["plum", 0.52, 0.12, 330],
  ["purple", 0.56, 0.19, 302],
  ["red", 0.62, 0.22, 27],
  ["rose", 0.67, 0.19, 8],
  ["salmon", 0.74, 0.13, 28],
  ["sapphire", 0.54, 0.16, 262],
  ["scarlet", 0.64, 0.23, 33],
  ["silver", 0.8, 0.01, 250],
  ["tan", 0.75, 0.07, 92],
  ["teal", 0.6, 0.1, 192],
  ["tomato", 0.69, 0.19, 34],
  ["turquoise", 0.8, 0.13, 185],
  ["violet", 0.62, 0.19, 300],
  ["white", 0.95, 0.008, 100],
  ["yellow", 0.9, 0.17, 102],
];

export const FROG_COLOR_WORDS: readonly string[] = SKINS.map(([word]) => word);

/**
 * The colour word `generateName` puts first, without pulling in the name
 * generator. With a string seed, unique-names-generator 4.x picks the first
 * word from the sum of the seed's char codes plus one, run through its own
 * mulberry32 variant; this mirrors that. A test holds it to the library.
 */
export function frogColorWord(id: string): string {
  let sum = 1;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  let a = (1831565813 + (sum | 0)) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const x = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return SKINS[Math.floor(x * SKINS.length)][0];
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

/** Two decimals is plenty at avatar sizes and keeps the markup short. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

const pt = (p: Point) => `${r2(p[0])} ${r2(p[1])}`;
const mirror = (p: Point): Point => [100 - p[0], p[1]];

function oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];
}

const inGamut = (rgb: readonly number[]) => rgb.every(v => v >= -0.0005 && v <= 1.0005);

/** OKLCH to sRGB hex, giving up chroma (never lightness or hue) to stay in gamut. */
function oklch(l: number, c: number, h: number): string {
  l = clamp(l, 0, 1);
  let rgb = oklchToLinearRgb(l, c, h);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(l, mid, h))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinearRgb(l, lo, h);
  }
  const encode = (v: number) => {
    v = clamp(v, 0, 1);
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return (
    "#" +
    rgb
      .map(v =>
        Math.round(encode(v) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

interface Geometry {
  domeDx: number;
  domeCy: number;
  domeR: number;
  hw: number;
  hy: number;
  hh: number;
  saddleY: number;
}

/** Three builds of the one head; each frog jitters its build only slightly. */
const BUILDS = {
  round: { domeDx: 23, domeCy: 33, domeR: 16, hw: 41, hy: 61, hh: 26 },
  wide: { domeDx: 25, domeCy: 35, domeR: 15, hw: 44, hy: 62, hh: 23 },
  bug: { domeDx: 24, domeCy: 32, domeR: 17.5, hw: 41, hy: 62, hh: 25 },
} as const;

type Build = keyof typeof BUILDS;
type Eyes = "open" | "bead";
type Pupil = "s" | "m" | "l";
type Mouth = "smile" | "grin" | "small" | "flat";

interface FrogFeatures {
  word: string;
  skin: readonly [number, number, number];
  g: Geometry;
  eyes: Eyes;
  gaze: Point;
  pupil: Pupil;
  mouth: Mouth;
  jaw: boolean;
  cheeks: boolean;
}

function frogFeatures(id: string): FrogFeatures {
  const r = makeRng(hashCode(id));
  const build =
    BUILDS[
      weighted<Build>(r, [
        ["round", 45],
        ["wide", 30],
        ["bug", 25],
      ])
    ];
  const jitter = () => (r() - 0.5) * 2;
  const g: Geometry = {
    domeDx: build.domeDx + jitter() * 0.7,
    domeCy: build.domeCy + jitter() * 0.7,
    domeR: build.domeR + jitter() * 0.5,
    hw: build.hw + jitter() * 0.8,
    hy: build.hy,
    hh: build.hh + jitter() * 0.8,
    saddleY: 0,
  };
  g.saddleY = g.domeCy + g.domeR * 0.16;
  const word = frogColorWord(id);
  const [, l, c, h] = SKINS.find(([w]) => w === word) ?? SKINS[0];

  return {
    word,
    skin: [l, c, h],
    g,
    eyes: weighted<Eyes>(r, [
      ["open", 76],
      ["bead", 24],
    ]),
    gaze: pick<Point>(r, [
      [0, 0],
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
    ]),
    pupil: weighted<Pupil>(r, [
      ["m", 45],
      ["l", 30],
      ["s", 25],
    ]),
    mouth: weighted<Mouth>(r, [
      ["smile", 45],
      ["grin", 20],
      ["small", 20],
      ["flat", 15],
    ]),
    jaw: r() < 0.6,
    cheeks: r() < 0.3,
  };
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const onCircle = (cx: number, cy: number, r: number, deg: number): Point => [
  cx + r * Math.cos(rad(deg)),
  cy + r * Math.sin(rad(deg)),
];
const tangentAt = (deg: number): Point => [-Math.sin(rad(deg)), Math.cos(rad(deg))];

/** One cubic for a circular arc of at most 90°; angles run clockwise on screen. */
function arc(cx: number, cy: number, r: number, from: number, to: number): Cubic {
  const k = (4 / 3) * Math.tan(rad(to - from) / 4) * r;
  const p0 = onCircle(cx, cy, r, from);
  const p3 = onCircle(cx, cy, r, to);
  const t0 = tangentAt(from);
  const t3 = tangentAt(to);
  return [p0, [p0[0] + k * t0[0], p0[1] + k * t0[1]], [p3[0] - k * t3[0], p3[1] - k * t3[1]], p3];
}

/**
 * The head as cubic segments, right half first, then that half mirrored.
 * The forehead leaves the centre level and meets each eye dome on the dome's
 * own tangent, so the dip between the eyes is a valley, not a notch; the dome
 * then follows its circle over the top and drops into the cheek and jaw.
 */
function headOutline(g: Geometry): { right: Cubic[]; left: Cubic[]; domeX: number } {
  const cx = 50 + g.domeDx;
  const cy = g.domeCy;
  const r = g.domeR;
  const join = 196;
  const j = onCircle(cx, cy, r, join);
  const tj = tangentAt(join);
  const lift = g.saddleY - j[1];
  const outer: Point = [cx + r, cy];
  const wide: Point = [50 + g.hw, g.hy];
  const chin: Point = [50, g.hy + g.hh];
  const right: Cubic[] = [
    [
      [50, g.saddleY],
      [50 + (j[0] - 50) * 0.55, g.saddleY],
      [j[0] - tj[0] * lift * 0.62, j[1] - tj[1] * lift * 0.62],
      j,
    ],
    arc(cx, cy, r, join, 270),
    arc(cx, cy, r, 270, 360),
    [outer, [outer[0], cy + r * 0.5], [wide[0], g.hy - (g.hy - cy) * 0.42], wide],
    [wide, [wide[0], g.hy + g.hh * 0.56], [50 + g.hw * 0.58, chin[1]], chin],
  ];
  const left = right.map(([a, b, c, d]): Cubic => [mirror(d), mirror(c), mirror(b), mirror(a)]).reverse();
  return { right, left, domeX: cx };
}

function pathOf(segs: readonly Cubic[]): string {
  let d = `M${pt(segs[0][0])}`;
  for (const [, c1, c2, p] of segs) d += `C${pt(c1)} ${pt(c2)} ${pt(p)}`;
  return d + "Z";
}

/** de Casteljau split of a cubic at t; returns the second half. */
function cubicTail([p0, p1, p2, p3]: Cubic, t: number): Cubic {
  const lerp = (a: Point, b: Point): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = lerp(p0, p1);
  const b = lerp(p1, p2);
  const c = lerp(p2, p3);
  const d = lerp(a, b);
  const e = lerp(b, c);
  return [lerp(d, e), e, c, p3];
}

/**
 * The lighter lower jaw: the outline's own bottom curve from jaw to jaw,
 * closed by a soft lip line, so it never needs clipping to the head.
 */
function jawPath(right: readonly Cubic[]): string {
  const low = cubicTail(right[right.length - 1], 0.36);
  const lowLeft = [...low].map(mirror).reverse();
  return (
    `M${pt(low[0])}C${pt(low[1])} ${pt(low[2])} ${pt(low[3])}` +
    `C${pt(lowLeft[1])} ${pt(lowLeft[2])} ${pt(lowLeft[3])}Q50 ${r2(low[0][1] + 8)} ${pt(low[0])}Z`
  );
}

interface FrogPalette {
  skin: string;
  jaw: string;
  line: string;
  pupil: string;
  sclera: string;
  cheek: string;
}

/** One palette per colour word, so a list of avatars does the colour maths at most 52 times. */
const palettes = new Map<string, FrogPalette>();

function frogPalette(word: string, [l, c, h]: readonly [number, number, number]): FrogPalette {
  let palette = palettes.get(word);
  if (!palette) {
    palette = {
      skin: oklch(l, c, h),
      // Paler and warmer than the skin, except on frogs already near white.
      jaw: l > 0.86 ? oklch(l - 0.07, c * 0.8, h - 10) : oklch(Math.min(l + 0.1, 0.95), c * 0.55, h - 14),
      line: oklch(l < 0.45 ? 0.15 : 0.27, Math.min(c * 0.55, 0.08), h),
      pupil: oklch(0.2, 0.02, h),
      sclera: oklch(0.975, 0.012, 95),
      cheek: oklch(clamp(l + 0.02, 0.62, 0.82), 0.13, 12),
    };
    palettes.set(word, palette);
  }
  return palette;
}

const PUPIL_SCALE: Record<Pupil, number> = { s: 0.4, m: 0.5, l: 0.6 };
const MOUTH_WIDTH: Record<Mouth, number> = { smile: 14, grin: 19, small: 8.5, flat: 11 };
const MOUTH_DEPTH: Record<Mouth, number> = { smile: 6.5, grin: 8.5, small: 4.6, flat: 1.8 };

function drawFrog(f: FrogFeatures, size: number): string {
  const c = frogPalette(f.word, f.skin);
  const { right, left, domeX } = headOutline(f.g);
  const d = pathOf([...right, ...left]);
  // Below this the highlights turn to noise and thin strokes to blur.
  const small = size < 28;

  // A rim under the fill. Translucent black vanishes on the dark theme and
  // edges a pale frog on the light one; dark frogs get the inverse.
  let o =
    `<path d="${d}" fill="none" stroke="${f.skin[0] >= 0.5 ? "#000" : "#fff"}" stroke-opacity=".16"` +
    ` stroke-width="${small ? 6 : 4}" stroke-linejoin="round"/>`;
  o += `<path d="${d}" fill="${c.skin}"/>`;
  if (f.jaw) o += `<path d="${jawPath(right)}" fill="${c.jaw}"/>`;
  if (f.cheeks) {
    for (const x of [50 - f.g.hw * 0.64, 50 + f.g.hw * 0.64]) {
      o += `<ellipse cx="${r2(x)}" cy="${r2(f.g.hy + 1)}" rx="6.6" ry="4.4" fill="${c.cheek}" opacity=".8"/>`;
    }
  }

  // Eyes fill their domes; a small eye in a big dome reads as an ear.
  const cy = f.g.domeCy;
  const er = f.g.domeR * 0.74;
  const pr = er * PUPIL_SCALE[f.pupil];
  const gx = f.gaze[0] * er * 0.28;
  const gy = f.gaze[1] * er * 0.22;
  for (const x of [100 - domeX, domeX]) {
    // Bead eyes vanish into dark skin, so those frogs keep the whites.
    if (f.eyes === "bead" && f.skin[0] >= 0.6) {
      const br = er * 0.82;
      const bx = x + gx * 0.4;
      const by = cy + gy * 0.4;
      o += `<circle cx="${r2(bx)}" cy="${r2(by)}" r="${r2(br)}" fill="${c.pupil}"/>`;
      o += `<circle cx="${r2(bx - br * 0.32)}" cy="${r2(by - br * 0.34)}" r="${r2(br * (small ? 0.36 : 0.3))}" fill="#fff"/>`;
    } else {
      o += `<circle cx="${r2(x)}" cy="${r2(cy)}" r="${r2(er)}" fill="${c.sclera}"/>`;
      o += `<circle cx="${r2(x + gx)}" cy="${r2(cy + gy)}" r="${r2(pr)}" fill="${c.pupil}"/>`;
      if (!small) {
        o +=
          `<circle cx="${r2(x + gx - pr * 0.36)}" cy="${r2(cy + gy - pr * 0.38)}"` +
          ` r="${r2(Math.max(pr * 0.32, 1.6))}" fill="#fff"/>`;
      }
    }
  }

  const my = f.g.hy + (f.jaw ? 2 : 4);
  const w = MOUTH_WIDTH[f.mouth];
  o +=
    `<path d="M${r2(50 - w)} ${r2(my)}Q50 ${r2(my + MOUTH_DEPTH[f.mouth] * 2)} ${r2(50 + w)} ${r2(my)}"` +
    ` fill="none" stroke="${c.line}" stroke-width="${small ? 5.6 : 4.4}" stroke-linecap="round"/>`;
  return o;
}

/**
 * The contents of a `0 0 100 100` viewBox, ready for dangerouslySetInnerHTML.
 * `size` is the rendered size in px; it only decides how much detail to draw.
 */
export function frogAvatarMarkup(id: string, size = 20): string {
  return drawFrog(frogFeatures(id), size);
}

/**
 * A standalone `<svg>` string, for the map markers and other places that build
 * DOM by hand instead of rendering React.
 */
export function frogAvatarSVG(id: string, size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img"` +
    ` xmlns="http://www.w3.org/2000/svg" style="display:block">${frogAvatarMarkup(id, size)}</svg>`
  );
}
