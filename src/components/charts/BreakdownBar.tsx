"use client";

import ReactECharts from "echarts-for-react";

const CATEGORICAL = ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9", "#e66767", "#d55181", "#d95926"];

export type BreakdownRow = { label: string; count: number };

/**
 * `percentOf`, when passed, shows each bar's share of that total (e.g. study
 * dropoffs as a % of everyone who started) alongside the raw count — a count
 * alone doesn't say whether a dropoff point is actually significant, and a
 * percent alone hides how many people that actually was.
 * `caption`, when passed, renders a small explanation below the chart so the
 * reader knows exactly what's being measured (e.g. what the % is relative to).
 * `sortRows: "as-is"` keeps the given row order (e.g. an already-meaningful
 * step sequence) instead of the default sort-by-count-desc.
 */
export function BreakdownBar({
  title,
  rows,
  percentOf,
  caption,
  sortRows = "count-desc",
}: {
  title: string;
  rows: BreakdownRow[];
  percentOf?: number;
  caption?: string;
  sortRows?: "count-desc" | "as-is";
}) {
  const sorted = sortRows === "count-desc" ? [...rows].sort((a, b) => b.count - a.count) : rows;
  const ordered = [...sorted].reverse(); // ECharts renders category axis bottom-up

  const formatCount = (value: number) => `${value.toLocaleString("ko-KR")}건`;
  const formatPercent = (value: number) => `${((value / (percentOf ?? 1)) * 100).toFixed(1)}%`;

  // The data label sits just past the bar's end, so the longest label (the
  // top row, closest to the axis max) needs enough right-side room or it
  // gets clipped by the canvas edge — bigger when showing "% · count" both.
  const rightMargin = percentOf ? 110 : 70;

  const option = {
    grid: { left: 0, right: rightMargin, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      backgroundColor: "#1a1a19",
      borderColor: "#2c2c2a",
      textStyle: { color: "#ffffff" },
      formatter: (params: { name: string; value: number }) =>
        percentOf
          ? `${params.name}<br/>${formatPercent(params.value)} (${formatCount(params.value)})`
          : `${params.name}<br/>${formatCount(params.value)}`,
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
          formatter: (params: { value: number }) =>
            percentOf ? `${formatPercent(params.value)} · ${formatCount(params.value)}` : formatCount(params.value),
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
      {caption && <p className="mt-3 text-xs leading-relaxed text-neutral-500">{caption}</p>}
    </div>
  );
}
