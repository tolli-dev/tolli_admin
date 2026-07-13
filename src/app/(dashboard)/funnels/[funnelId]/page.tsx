import { notFound } from "next/navigation";
import { FUNNELS, getFunnelById } from "@/lib/funnels/definitions";
import { fetchFunnelResults, fetchPropertyBreakdown } from "@/lib/posthog/queries";
import { resolveDateRange } from "@/lib/dateRange";
import { FunnelChart } from "@/components/funnel/FunnelChart";
import { BreakdownBar } from "@/components/charts/BreakdownBar";
import { DateRangePicker } from "@/components/funnel/DateRangePicker";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 300;

export function generateStaticParams() {
  return FUNNELS.map((funnel) => ({ funnelId: funnel.id }));
}

const STUDY_STEP_LABELS: Record<string, string> = {
  "0": "학습 시작 화면에서 이탈",
  "1": "구절 훑어보기 중 이탈",
  "2": "빈칸 연습(1단계) 중 이탈",
  "3": "빈칸 연습(2단계) 중 이탈",
  "4": "빈칸 연습(3단계) 중 이탈",
  "5": "빈칸 연습(4단계) 중 이탈",
  "6": "자음 힌트 연습 중 이탈",
  "7": "낭독 녹음 중 이탈",
};

function studyStepLabel(rawValue: string) {
  const step = String(Math.trunc(Number(rawValue)));
  const base = STUDY_STEP_LABELS[step] ?? `스텝 ${step}에서 이탈`;
  return `${base} (step${step})`;
}

export default async function FunnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ funnelId: string }>;
  searchParams: Promise<{ preset?: string; date?: string }>;
}) {
  const { funnelId } = await params;
  const sp = await searchParams;
  const funnel = getFunnelById(funnelId);
  if (!funnel) notFound();

  const range = resolveDateRange(sp);

  const result = await fetchFunnelResults(funnel, range);
  // PostHog's funnel response ignores our custom `name` and returns the raw
  // event name instead, so the display label always comes from our own
  // funnel definition (by step order), never from the API response.
  const steps = result.results.map((step, index) => ({
    name: funnel.steps[index]?.label ?? step.name,
    count: step.count,
  }));
  const hasData = steps.length > 0 && steps[0].count > 0;
  const overallConversion = hasData ? (steps.at(-1)!.count / steps[0].count) * 100 : 0;

  const abandonment =
    funnelId === "study"
      ? await fetchPropertyBreakdown("study_abandoned", "abandoned_at_step", { dateFrom: range.from, dateTo: range.to })
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">{funnel.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{funnel.description}</p>
        </div>
        <RefreshButton />
      </div>

      <DateRangePicker funnelId={funnelId} activePreset={range.preset} customDate={sp.date} />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <p className="text-sm text-neutral-400">전체 전환율 (맨 처음 단계 → 마지막 단계) · {range.label}</p>
        <p className="mt-1 text-3xl font-semibold text-neutral-50">
          {hasData ? `${overallConversion.toFixed(1)}%` : "-"}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
        {hasData ? (
          <FunnelChart steps={steps} />
        ) : (
          <p className="py-10 text-center text-sm text-neutral-500">
            {range.label} 기간에는 이 퍼널 데이터가 없어요.
          </p>
        )}
      </div>

      {abandonment && abandonment.results.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-neutral-500">
            화면 이동 기록만으로는 학습 중 어디서 중간에 그만두는지 잡히지 않아서, 앱이 직접 남기는 &quot;이탈&quot;
            기록으로 대신 보여줘요.
          </p>
          <BreakdownBar
            title={`스텝별 이탈율 (${range.label}, 단계 순)`}
            rows={abandonment.results
              .slice()
              .sort((a, b) => Number(a.label) - Number(b.label))
              .map((row) => ({ label: studyStepLabel(row.label), count: row.count }))}
            percentOf={steps[0]?.count}
            sortRows="as-is"
            caption={`이탈율 = 이 지점에서 이탈한 인원 ÷ 학습을 시작한 전체 인원(${(steps[0]?.count ?? 0).toLocaleString("ko-KR")}명, study_started 기준) × 100. 위에서부터 학습 초반(0단계) → 후반(7단계) 순서예요.`}
          />
        </div>
      )}
    </div>
  );
}
