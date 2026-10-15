export type BetaPosterior = { alpha: number; beta: number };

export type ArmCounts = { units: number; conversions: number };

export type ExperimentDecision = "winning" | "losing" | "inconclusive";

export type VariantStats = {
  chanceToBeatControl: number;
  lift: number;
  liftInterval: [number, number];
  riskVariant: number;
  riskControl: number;
  decision: ExperimentDecision;
};

export const WIN_PROBABILITY = 0.95;
export const RISK_THRESHOLD = 0.0025;

const EXACT_SUM_LIMIT = 5000;
const Z_95 = 1.959963984540054;

export function betaPosterior({ units, conversions }: ArmCounts): BetaPosterior {
  const safeUnits = Math.max(0, units);
  const safeConversions = Math.min(Math.max(0, conversions), safeUnits);
  return { alpha: 1 + safeConversions, beta: 1 + safeUnits - safeConversions };
}

function betaMean({ alpha, beta }: BetaPosterior): number {
  return alpha / (alpha + beta);
}

function betaVariance({ alpha, beta }: BetaPosterior): number {
  const total = alpha + beta;
  return (alpha * beta) / (total * total * (total + 1));
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const shifted = x - 1;
  let sum = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i] / (shifted + i);
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

function normalPdf(z: number): number {
  return Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
}

function exactProbabilityBBeatsA(a: BetaPosterior, b: BetaPosterior): number {
  let total = 0;
  const logBetaA = logBeta(a.alpha, a.beta);
  for (let i = 0; i < b.alpha; i++) {
    total += Math.exp(logBeta(a.alpha + i, a.beta + b.beta) - Math.log(b.beta + i) - logBeta(1 + i, b.beta) - logBetaA);
  }
  return Math.min(1, Math.max(0, total));
}

export function probabilityBBeatsA(a: BetaPosterior, b: BetaPosterior): number {
  const smallerAlpha = Math.min(a.alpha, b.alpha);
  if (Number.isInteger(a.alpha) && Number.isInteger(b.alpha) && smallerAlpha <= EXACT_SUM_LIMIT) {
    return b.alpha <= a.alpha ? exactProbabilityBBeatsA(a, b) : 1 - exactProbabilityBBeatsA(b, a);
  }

  const sd = Math.sqrt(betaVariance(a) + betaVariance(b));
  if (sd === 0) return 0.5;
  return normalCdf((betaMean(b) - betaMean(a)) / sd);
}

export function relativeLift(a: BetaPosterior, b: BetaPosterior): { lift: number; interval: [number, number] } {
  const meanA = betaMean(a);
  const meanB = betaMean(b);
  const logRatio = Math.log(meanB / meanA);
  const logSd = Math.sqrt(betaVariance(a) / (meanA * meanA) + betaVariance(b) / (meanB * meanB));
  return {
    lift: meanB / meanA - 1,
    interval: [Math.exp(logRatio - Z_95 * logSd) - 1, Math.exp(logRatio + Z_95 * logSd) - 1],
  };
}

export function expectedLoss(a: BetaPosterior, b: BetaPosterior): { chooseA: number; chooseB: number } {
  const mean = betaMean(b) - betaMean(a);
  const sd = Math.sqrt(betaVariance(a) + betaVariance(b));
  if (sd === 0) return { chooseA: Math.max(mean, 0), chooseB: Math.max(-mean, 0) };
  const z = mean / sd;
  return {
    chooseA: sd * normalPdf(z) + mean * normalCdf(z),
    chooseB: sd * normalPdf(z) - mean * normalCdf(-z),
  };
}

export function compareToControl(control: ArmCounts, variant: ArmCounts): VariantStats | null {
  if (control.units <= 0 || variant.units <= 0) return null;

  const controlPosterior = betaPosterior(control);
  const variantPosterior = betaPosterior(variant);
  const chanceToBeatControl = probabilityBBeatsA(controlPosterior, variantPosterior);
  const { lift, interval } = relativeLift(controlPosterior, variantPosterior);
  const loss = expectedLoss(controlPosterior, variantPosterior);
  const riskScale = betaMean(controlPosterior);

  let decision: ExperimentDecision = "inconclusive";
  if (chanceToBeatControl >= WIN_PROBABILITY && loss.chooseB / riskScale < RISK_THRESHOLD) {
    decision = "winning";
  } else if (chanceToBeatControl <= 1 - WIN_PROBABILITY && loss.chooseA / riskScale < RISK_THRESHOLD) {
    decision = "losing";
  }

  return {
    chanceToBeatControl,
    lift,
    liftInterval: interval,
    riskVariant: loss.chooseB,
    riskControl: loss.chooseA,
    decision,
  };
}

export const MAX_PROJECTION_SCALE = 100;

function decides(control: ArmCounts, variant: ArmCounts, scale: number): boolean {
  const scaled = ({ units, conversions }: ArmCounts) => ({
    units: Math.round(units * scale),
    conversions: Math.round(conversions * scale),
  });
  return compareToControl(scaled(control), scaled(variant))?.decision !== "inconclusive";
}

export function projectedScaleToDecide(
  control: ArmCounts,
  variant: ArmCounts,
  maxScale = MAX_PROJECTION_SCALE
): number | null {
  if (control.units <= 0 || variant.units <= 0 || decides(control, variant, 1)) return null;

  let low = 1;
  let high = 2;
  while (!decides(control, variant, high)) {
    if (high >= maxScale) return null;
    low = high;
    high = Math.min(high * 2, maxScale);
  }
  while (high / low > 1.01) {
    const middle = Math.sqrt(low * high);
    if (decides(control, variant, middle)) high = middle;
    else low = middle;
  }
  return high;
}

function upperIncompleteGamma(a: number, x: number): number {
  if (x <= 0) return 1;
  const logPrefix = -x + a * Math.log(x) - logGamma(a);

  if (x < a + 1) {
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n < 500; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return 1 - sum * Math.exp(logPrefix);
  }

  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return Math.exp(logPrefix) * h;
}

export function chiSquarePValue(statistic: number, degreesOfFreedom: number): number {
  return upperIncompleteGamma(degreesOfFreedom / 2, statistic / 2);
}

export const SRM_P_VALUE = 0.001;

export type SampleRatioCheck = { chiSquare: number; pValue: number; mismatch: boolean };

export function sampleRatioMismatch(observed: number[], weights: number[]): SampleRatioCheck | null {
  const arms = observed
    .map((count, index) => ({ count: Math.max(0, count), weight: Math.max(0, weights[index] ?? 0) }))
    .filter(arm => arm.weight > 0);
  const totalUnits = arms.reduce((sum, arm) => sum + arm.count, 0);
  const totalWeight = arms.reduce((sum, arm) => sum + arm.weight, 0);
  if (arms.length < 2 || totalUnits === 0) return null;

  const chiSquare = arms.reduce((sum, arm) => {
    const expected = (totalUnits * arm.weight) / totalWeight;
    return sum + ((arm.count - expected) * (arm.count - expected)) / expected;
  }, 0);
  const pValue = chiSquarePValue(chiSquare, arms.length - 1);
  return { chiSquare, pValue, mismatch: pValue < SRM_P_VALUE };
}
