"use client";

import ReactECharts from "echarts-for-react";

const CONTROL_COLOR = "#3987e5";
const TREATMENT_COLOR = "#9085e9";

export type DropoffSeries = {
  stepLabels: string[];
  control: number[];
  treatment: number[];
};

export function VariantDropoffChart({ series }: { series: DropoffSeries }) {
  const option = {
    grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
    legend: {
      data: ["A · 대조군", "B · 실험군"],
      textStyle: { color: "#c3c2b7" },
      top: 0,
      icon: "roundRect",
      itemWidth: 12,
      itemHeight: 12,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#1a1a19",
      borderColor: "#2c2c2a",
      textStyle: { color: "#ffffff" },
      valueFormatter: (value: number) => `${Number(value).toFixed(1)}%`,
    },
    xAxis: {
      type: "category",
      data: series.stepLabels,
      axisLine: { lineStyle: { color: "#2c2c2a" } },
      axisTick: { show: false },
      axisLabel: { color: "#c3c2b7", fontSize: 11, interval: 0, rotate: 30 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#c3c2b7", fontSize: 11, formatter: "{value}%" },
      splitLine: { lineStyle: { color: "#2c2c2a" } },
    },
    series: [
      {
        name: "A · 대조군",
        type: "bar",
        data: series.control,
        barMaxWidth: 22,
        itemStyle: { color: CONTROL_COLOR, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: "B · 실험군",
        type: "bar",
        data: series.treatment,
        barMaxWidth: 22,
        itemStyle: { color: TREATMENT_COLOR, borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <p className="text-sm text-neutral-400">스텝별 이탈률 비교 (그룹별 학습 시작 인원 대비)</p>
      <div className="mt-4" style={{ height: "320px" }}>
        <ReactECharts option={option} style={{ height: "100%" }} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        각 막대는 그 그룹에서 학습을 시작한 인원 대비 해당 스텝에서 이탈한 비율이에요. 두 그룹의 인원수가 다르기 때문에
        건수가 아니라 비율로 비교해야 해요. 대조군(A)은 step0을, 실험군(B)은 step1을 아예 보지 않으므로 해당 칸이 0인 것이
        정상이에요. 실험군의 step2~5 이탈이 대조군보다 눈에 띄게 높다면, 단어 뜻을 건너뛴 부작용일 수 있어요.
      </p>
    </div>
  );
}
