import { notFound } from "next/navigation";
import { FUNNELS, getFunnelById } from "@/lib/funnels/definitions";
import { fetchFunnelResults } from "@/lib/posthog/queries";
import { FunnelChart } from "@/components/funnel/FunnelChart";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 300;

export function generateStaticParams() {
  return FUNNELS.map((funnel) => ({ funnelId: funnel.id }));
}

export default async function FunnelPage({ params }: { params: Promise<{ funnelId: string }> }) {
  const { funnelId } = await params;
  const funnel = getFunnelById(funnelId);
  if (!funnel) notFound();

  const result = await fetchFunnelResults(funnel);
  const steps = result.results.map((step) => ({ name: step.name, count: step.count }));
  const overallConversion =
    steps.length > 1 && steps[0].count > 0 ? (steps.at(-1)!.count / steps[0].count) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">{funnel.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{funnel.description}</p>
        </div>
        <RefreshButton />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <p className="text-sm text-neutral-400">전체 전환율 (첫 단계 → 마지막 단계)</p>
        <p className="mt-1 text-3xl font-semibold text-neutral-50">{overallConversion.toFixed(1)}%</p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
        <FunnelChart steps={steps} />
      </div>
    </div>
  );
}
