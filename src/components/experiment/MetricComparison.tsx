import type { MetricDefinition } from "@/lib/experiment/definitions";
import type { SignificanceResult, Verdict } from "@/lib/experiment/stats";
import { MIN_SAMPLE_PER_VARIANT, confidenceInterval } from "@/lib/experiment/stats";

export function MetricComparison({
  metric,
  result,
}: {
  metric: MetricDefinition;
  result: SignificanceResult;
}) {
  const { control, treatment } = result;
  const interval = confidenceInterval(control, treatment);

  const isTreatmentBetter = metric.higherIsBetter ? result.liftPoints > 0 : result.liftPoints < 0;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-100">{metric.label}</h3>
          <p className="mt-1 text-sm text-neutral-500">{metric.description}</p>
        </div>
        <VerdictBadge verdict={result.verdict} isTreatmentBetter={isTreatmentBetter} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <RateBlock
          label="A · 대조군"
          rate={control.rate}
          converted={control.converted}
          total={control.total}
          isWinner={result.isSignificant && !isTreatmentBetter}
        />
        <RateBlock
          label="B · 실험군"
          rate={treatment.rate}
          converted={treatment.converted}
          total={treatment.total}
          isWinner={result.isSignificant && isTreatmentBetter}
        />
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-2 border-t border-neutral-800 pt-4 text-sm sm:grid-cols-2">
        <Stat label="차이 (B − A)" value={`${formatSigned(result.liftPoints)}%p`} />
        <Stat
          label="상대 변화"
          value={control.rate > 0 ? `${formatSigned(result.relativeLiftPercent)}%` : "-"}
        />
        <Stat label="p-value" value={formatPValue(result.pValue)} />
        <Stat
          label="95% 신뢰구간"
          value={`${formatSigned(interval.lower)} ~ ${formatSigned(interval.upper)}%p`}
        />
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-neutral-500">{explain(result, interval)}</p>
    </div>
  );
}

function RateBlock({
  label,
  rate,
  converted,
  total,
  isWinner,
}: {
  label: string;
  rate: number;
  converted: number;
  total: number;
  isWinner: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        isWinner ? "border-emerald-500/40 bg-emerald-500/10" : "border-neutral-800 bg-neutral-950/40"
      }`}
    >
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-50">
        {total > 0 ? `${(rate * 100).toFixed(1)}%` : "-"}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        {converted.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}명
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-200 tabular-nums">{value}</dd>
    </div>
  );
}

const VERDICT_STYLES: Record<Verdict, { label: string; className: string }> = {
  "treatment-wins": { label: "B 우세 (유의미)", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  "control-wins": { label: "A 우세 (유의미)", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  "no-difference": { label: "유의미한 차이 없음", className: "border-neutral-700 bg-neutral-800/60 text-neutral-300" },
  "insufficient-data": { label: "표본 부족", className: "border-neutral-700 bg-neutral-800/60 text-neutral-400" },
};

function VerdictBadge({ verdict, isTreatmentBetter }: { verdict: Verdict; isTreatmentBetter: boolean }) {
  const resolved: Verdict =
    verdict === "treatment-wins" || verdict === "control-wins"
      ? isTreatmentBetter
        ? "treatment-wins"
        : "control-wins"
      : verdict;

  const style = VERDICT_STYLES[resolved];
  return (
    <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

function formatSigned(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatPValue(pValue: number): string {
  if (pValue < 0.001) return "< 0.001";
  return pValue.toFixed(3);
}

function explain(result: SignificanceResult, interval: { lower: number; upper: number }): string {
  if (!result.hasEnoughSample) {
    return `아직 그룹당 ${MIN_SAMPLE_PER_VARIANT}명이 모이지 않아 판정을 보류합니다. 현재 A ${result.control.total.toLocaleString("ko-KR")}명 / B ${result.treatment.total.toLocaleString("ko-KR")}명. 표본이 적을 때의 차이는 우연일 가능성이 큽니다.`;
  }

  if (!result.isSignificant) {
    return `p-value가 0.05보다 커서, 관측된 차이를 우연이 아니라고 말하기 어렵습니다. 신뢰구간(${formatSigned(interval.lower)} ~ ${formatSigned(interval.upper)}%p)이 0을 포함하므로 "차이가 없다"도 여전히 가능한 설명입니다.`;
  }

  return `p-value가 0.05 미만이라, 이 차이가 우연히 나올 확률은 5% 미만입니다. 신뢰구간(${formatSigned(interval.lower)} ~ ${formatSigned(interval.upper)}%p)이 0을 포함하지 않아 방향도 분명합니다.`;
}
