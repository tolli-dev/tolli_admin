export type ConversionResult = {
  variant: string;
  converted: number;
  total: number;
  rate: number;
};

export type SignificanceResult = {
  control: ConversionResult;
  treatment: ConversionResult;

  liftPoints: number;

  relativeLiftPercent: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;

  hasEnoughSample: boolean;
  verdict: Verdict;
};

export type Verdict =
  | "treatment-wins"
  | "control-wins"
  | "no-difference"
  | "insufficient-data";

export const MIN_SAMPLE_PER_VARIANT = 100;

const Z_CRITICAL_95 = 1.96;

export function toConversion(variant: string, converted: number, total: number): ConversionResult {
  return {
    variant,
    converted,
    total,
    rate: total > 0 ? converted / total : 0,
  };
}

export function computeSignificance(
  control: ConversionResult,
  treatment: ConversionResult,
): SignificanceResult {
  const liftPoints = (treatment.rate - control.rate) * 100;
  const relativeLiftPercent =
    control.rate > 0 ? ((treatment.rate - control.rate) / control.rate) * 100 : 0;

  const hasEnoughSample =
    control.total >= MIN_SAMPLE_PER_VARIANT && treatment.total >= MIN_SAMPLE_PER_VARIANT;

  const zScore = computeZScore(control, treatment);
  const pValue = twoTailedPValue(zScore);
  const isSignificant = hasEnoughSample && pValue < 0.05;

  return {
    control,
    treatment,
    liftPoints,
    relativeLiftPercent,
    zScore,
    pValue,
    isSignificant,
    hasEnoughSample,
    verdict: decideVerdict({ hasEnoughSample, isSignificant, liftPoints }),
  };
}

function decideVerdict({
  hasEnoughSample,
  isSignificant,
  liftPoints,
}: {
  hasEnoughSample: boolean;
  isSignificant: boolean;
  liftPoints: number;
}): Verdict {
  if (!hasEnoughSample) return "insufficient-data";
  if (!isSignificant) return "no-difference";
  return liftPoints > 0 ? "treatment-wins" : "control-wins";
}

function computeZScore(control: ConversionResult, treatment: ConversionResult): number {
  if (control.total === 0 || treatment.total === 0) return 0;

  const pooledRate =
    (control.converted + treatment.converted) / (control.total + treatment.total);

  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1 / control.total + 1 / treatment.total),
  );
  if (standardError === 0) return 0;

  return (treatment.rate - control.rate) / standardError;
}

function twoTailedPValue(zScore: number): number {
  if (zScore === 0) return 1;
  return Math.min(1, 2 * (1 - standardNormalCdf(Math.abs(zScore))));
}

function standardNormalCdf(z: number): number {
  const P = 0.2316419;
  const COEFFICIENTS = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];

  const density = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const t = 1 / (1 + P * z);

  const series = COEFFICIENTS.reduce((sum, coefficient, index) => sum + coefficient * t ** (index + 1), 0);

  return 1 - density * series;
}

export function confidenceInterval(
  control: ConversionResult,
  treatment: ConversionResult,
): { lower: number; upper: number } {
  if (control.total === 0 || treatment.total === 0) return { lower: 0, upper: 0 };

  const standardError = Math.sqrt(
    (control.rate * (1 - control.rate)) / control.total +
      (treatment.rate * (1 - treatment.rate)) / treatment.total,
  );

  const difference = (treatment.rate - control.rate) * 100;
  const margin = Z_CRITICAL_95 * standardError * 100;

  return { lower: difference - margin, upper: difference + margin };
}
