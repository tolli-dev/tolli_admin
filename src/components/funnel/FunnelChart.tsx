"use client";

import ReactECharts from "echarts-for-react";

export type FunnelBarStep = {
  name: string;
  count: number;
};

// Ordinal blue ramp (steps 250-600 from the validated palette) — never darker
// than step 600 on a dark surface. Narrowing stages read as "deepening" color.
const ORDINAL_RAMP = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95"];

function colorForStep(index: number, total: number) {
  if (total <= 1) return ORDINAL_RAMP[0];
  const rampIndex = Math.round((index / (total - 1)) * (ORDINAL_RAMP.length - 1));
  return ORDINAL_RAMP[rampIndex];
}

function dropOffTone(dropOffPercent: number) {
  if (dropOffPercent >= 50) return "text-[#e66767]";
  if (dropOffPercent >= 20) return "text-[#c98500]";
  return "text-neutral-500";
}

export function FunnelChart({ steps }: { steps: FunnelBarStep[] }) {
  const baseline = steps[0]?.count ?? 0;

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params: { name: string; value: number; percent: number }) =>
        `${params.name}<br/>${params.value.toLocaleString("ko-KR")}명 (${params.percent}%)`,
      backgroundColor: "#1a1a19",
      borderColor: "#2c2c2a",
      textStyle: { color: "#ffffff" },
    },
    series: [
      {
        type: "funnel",
        left: "8%",
        width: "84%",
        top: 12,
        bottom: 12,
        min: 0,
        max: baseline,
        sort: "none",
        gap: 4,
        label: {
          show: true,
          position: "inside",
          color: "#ffffff",
          fontSize: 13,
          formatter: (params: { name: string; value: number }) =>
            `${params.name}\n${params.value.toLocaleString("ko-KR")}명`,
          lineHeight: 18,
        },
        itemStyle: {
          borderColor: "#1a1a19",
          borderWidth: 2,
        },
        emphasis: {
          label: { fontSize: 14 },
        },
        data: steps.map((step, index) => ({
          value: step.count,
          name: step.name,
          itemStyle: { color: colorForStep(index, steps.length) },
        })),
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} style={{ height: `${Math.max(steps.length * 64, 260)}px` }} />
      <div className="mt-4 space-y-2 border-t border-neutral-800 pt-4">
        {steps.map((step, index) => {
          const previous = steps[index - 1];
          const dropOffPercent = previous && previous.count > 0 ? 100 - (step.count / previous.count) * 100 : 0;
          return (
            <div key={step.name} className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">
                {index + 1}. {step.name}
              </span>
              <span className="text-neutral-100">
                {step.count.toLocaleString("ko-KR")}명
                {index > 0 && (
                  <span className={`ml-2 text-xs ${dropOffTone(dropOffPercent)}`}>
                    -{dropOffPercent.toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
