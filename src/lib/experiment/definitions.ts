export const EXPERIMENT_KEY = "onboarding_intro_step";

export const EXPERIMENT_START_DATE = "2026-08-01";

export type VariantMeta = {
  id: "A" | "B";
  label: string;
  description: string;
  isControl: boolean;
};

export const VARIANTS: VariantMeta[] = [
  {
    id: "A",
    label: "A · 대조군 (step1 시작)",
    description: "지금 배포된 플로우. 단어 뜻 탭(step1)부터 시작하고 step0은 없다.",
    isControl: true,
  },
  {
    id: "B",
    label: "B · 실험군 (step0 시작)",
    description: "구절 읽기(step0)부터 시작하고 단어 뜻 탭(step1)은 건너뛴다.",
    isControl: false,
  },
];

export const CONTROL_VARIANT = "A";
export const TREATMENT_VARIANT = "B";

export function getVariantMeta(id: string): VariantMeta | undefined {
  return VARIANTS.find((variant) => variant.id === id);
}

export type MetricDefinition = {
  id: string;
  label: string;
  description: string;
  numerator: "started" | "completed" | "abandoned";
  denominator: "exposed" | "started";

  higherIsBetter: boolean;
};

export const METRICS: MetricDefinition[] = [
  {
    id: "start-rate",
    label: "학습 진입률",
    description: "실험에 노출된 사람 중 실제로 첫 학습 화면까지 도달한 비율",
    numerator: "started",
    denominator: "exposed",
    higherIsBetter: true,
  },
  {
    id: "completion-rate",
    label: "학습 완주율",
    description: "학습을 시작한 사람 중 끝까지 마친 비율 (이 실험의 최종 성공 지표)",
    numerator: "completed",
    denominator: "started",
    higherIsBetter: true,
  },
  {
    id: "abandon-rate",
    label: "학습 이탈률",
    description: "학습을 시작한 사람 중 도중에 그만둔 비율 (낮을수록 좋음)",
    numerator: "abandoned",
    denominator: "started",
    higherIsBetter: false,
  },
];

export const STUDY_STEP_LABELS: Record<number, string> = {
  0: "구절 읽기 (step0)",
  1: "단어 뜻 탭 (step1)",
  2: "빈칸 연습 1 (step2)",
  3: "빈칸 연습 2 (step3)",
  4: "빈칸 연습 3 (step4)",
  5: "빈칸 연습 4 (step5)",
  6: "자음 힌트 (step6)",
  7: "낭독 녹음 (step7)",
};

export function studyStepLabel(step: number): string {
  return STUDY_STEP_LABELS[step] ?? `step${step}`;
}
