"use client";

import ReactECharts from "echarts-for-react";

const CATEGORICAL = ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9", "#e66767", "#d55181", "#d95926"];

export type BreakdownRow = { label: string; count: number };

export function BreakdownBar({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const ordered = [...rows].reverse(); // ECharts renders category axis bottom-up

  const option = {
    grid: { left: 0, right: 24, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      backgroundColor: "#1a1a19",
      borderColor: "#2c2c2a",
      textStyle: { color: "#ffffff" },
    },
    xAxis: { show: false, type: "value" },
    yAxis: {
      type: "category",
      data: ordered.map((row) => row.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#c3c2b7", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 24,
        label: {
          show: true,
          position: "right",
          color: "#ffffff",
          fontSize: 12,
          formatter: (params: { value: number }) => params.value.toLocaleString("ko-KR"),
        },
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: (params: { dataIndex: number }) => CATEGORICAL[params.dataIndex % CATEGORICAL.length],
        },
        data: ordered.map((row) => row.count),
      },
    ],
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <p className="text-sm text-neutral-400">{title}</p>
      <div className="mt-4" style={{ height: `${Math.max(rows.length * 40, 120)}px` }}>
        <ReactECharts option={option} style={{ height: "100%" }} />
      </div>
    </div>
  );
}
