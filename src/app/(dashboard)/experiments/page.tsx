import {
  CONTROL_VARIANT,
  EXPERIMENT_KEY,
  EXPERIMENT_START_DATE,
  METRICS,
  TREATMENT_VARIANT,
  VARIANTS,
  studyStepLabel,
} from "@/lib/experiment/definitions";
import type { MetricDefinition } from "@/lib/experiment/definitions";
import { computeSignificance, toConversion } from "@/lib/experiment/stats";
import { fetchExperimentMetrics, fetchExperimentStepDropoff } from "@/lib/posthog/queries";
import type { VariantMetrics, VariantStepDropoff } from "@/lib/posthog/queries";
import { resolveDateRange } from "@/lib/dateRange";
import { MetricComparison } from "@/components/experiment/MetricComparison";
import { VariantDropoffChart } from "@/components/experiment/VariantDropoffChart";
import { DateRangePicker } from "@/components/funnel/DateRangePicker";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 300;

const EMPTY_METRICS: VariantMetrics = {
  variant: "",
  exposed: 0,
  started: 0,
  completed: 0,
  abandoned: 0,
};

const STUDY_STEPS = [0, 1, 2, 3, 4, 5, 6, 7];

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const range = resolveDateRange(sp);

  const [metrics, stepDropoff] = await Promise.all([
    fetchExperimentMetrics(EXPERIMENT_KEY, range),
    fetchExperimentStepDropoff(EXPERIMENT_KEY, range),
  ]);

  const control = metrics.find((row) => row.variant === CONTROL_VARIANT) ?? EMPTY_METRICS;
  const treatment = metrics.find((row) => row.variant === TREATMENT_VARIANT) ?? EMPTY_METRICS;
  const hasData = control.exposed > 0 || treatment.exposed > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">A/B 테스트 · 학습 도입부</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            step0(구절 읽기)과 step1(단어 뜻 탭) 중 어느 도입부가 이탈이 적은지 비교해요.{" "}
            {EXPERIMENT_START_DATE} 이후 가입한 신규 유저만 uid 해시 기준으로 두 그룹에 나뉘어 배정돼요.
          </p>
        </div>
        <RefreshButton />
      </header>

      <DateRangePicker basePath="/experiments" activePreset={range.preset} customDate={sp.date} />

      <div className="grid gap-3 sm:grid-cols-2">
        {VARIANTS.map((variant) => {
          const row = variant.isControl ? control : treatment;
          return (
            <div key={variant.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
              <p className="text-sm font-medium text-neutral-200">{variant.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">{variant.description}</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-50">
                {row.exposed.toLocaleString("ko-KR")}
                <span className="ml-1 text-sm font-normal text-neutral-500">명 노출</span>
              </p>
            </div>
          );
        })}
      </div>

      {!hasData ? (
        <EmptyState label={range.label} />
      ) : (
        <>
          <BalanceNotice control={control.exposed} treatment={treatment.exposed} />

          <section className="space-y-4">
            {METRICS.map((metric) => (
              <MetricComparison
                key={metric.id}
                metric={metric}
                result={computeSignificance(
                  toConversionFor(metric, control, CONTROL_VARIANT),
                  toConversionFor(metric, treatment, TREATMENT_VARIANT),
                )}
              />
            ))}
          </section>

          <VariantDropoffChart series={buildDropoffSeries(stepDropoff, control, treatment)} />
        </>
      )}
    </div>
  );
}

function toConversionFor(metric: MetricDefinition, row: VariantMetrics, variant: string) {
  return toConversion(variant, row[metric.numerator], row[metric.denominator]);
}

function buildDropoffSeries(
  rows: VariantStepDropoff[],
  control: VariantMetrics,
  treatment: VariantMetrics,
) {
  const lookup = new Map(rows.map((row) => [`${row.variant}-${row.step}`, row.count]));

  const toPercent = (count: number, base: number) => (base > 0 ? (count / base) * 100 : 0);

  return {
    stepLabels: STUDY_STEPS.map(studyStepLabel),
    control: STUDY_STEPS.map((step) =>
      toPercent(lookup.get(`${CONTROL_VARIANT}-${step}`) ?? 0, control.started),
    ),
    treatment: STUDY_STEPS.map((step) =>
      toPercent(lookup.get(`${TREATMENT_VARIANT}-${step}`) ?? 0, treatment.started),
    ),
  };
}

function BalanceNotice({ control, treatment }: { control: number; treatment: number }) {
  const total = control + treatment;
  if (total === 0) return null;

  const controlShare = (control / total) * 100;
  const isSkewed = Math.abs(controlShare - 50) > 10;

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        isSkewed
          ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
          : "border-neutral-800 bg-neutral-900/60 text-neutral-400"
      }`}
    >
      그룹 배분 A {controlShare.toFixed(1)}% · B {(100 - controlShare).toFixed(1)}%
      {isSkewed
        ? " — 한쪽으로 10%p 넘게 기울었어요. uid 배정이나 이벤트 수집을 확인해 주세요."
        : " — 정상 범위예요."}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-10 text-center">
      <p className="text-sm text-neutral-400">{label} 기간에는 아직 실험 데이터가 없어요.</p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        실험은 {EXPERIMENT_START_DATE}부터 가입한 신규 유저에게만 적용돼요. 앱에서 학습을 시작하면{" "}
        <code className="rounded bg-neutral-800 px-1 py-0.5 text-neutral-300">experiment_exposed</code> 이벤트가
        쌓이기 시작해요.
      </p>
    </div>
  );
}
