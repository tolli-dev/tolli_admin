"use client";

import { motion } from "framer-motion";

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("ko-KR");
}

export function KpiTile({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: number;
  delta?: { percent: number; isGood: boolean } | null;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5"
    >
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-50">
        {formatCompact(value)}
        {suffix}
      </p>
      {delta && (
        <p className={`mt-1 text-xs ${delta.isGood ? "text-[#0ca30c]" : "text-[#d03b3b]"}`}>
          {delta.percent > 0 ? "+" : ""}
          {delta.percent.toFixed(1)}% (지난 기간 대비)
        </p>
      )}
    </motion.div>
  );
}
