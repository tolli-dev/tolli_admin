"use client";

import { motion } from "framer-motion";

export type FunnelBarStep = {
  name: string;
  count: number;
};

function dropOffTone(dropOffPercent: number) {
  if (dropOffPercent >= 50) return "text-[#d03b3b]";
  if (dropOffPercent >= 20) return "text-[#fab219]";
  return "text-neutral-500";
}

export function FunnelChart({ steps }: { steps: FunnelBarStep[] }) {
  const baseline = steps[0]?.count ?? 0;

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const widthPercent = baseline > 0 ? Math.max((step.count / baseline) * 100, 2) : 0;
        const previous = steps[index - 1];
        const dropOffPercent = previous && previous.count > 0 ? 100 - (step.count / previous.count) * 100 : 0;

        return (
          <div key={step.name}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-neutral-300">
                {index + 1}. {step.name}
              </span>
              <span className="text-neutral-100">
                {step.count.toLocaleString("ko-KR")}
                {index > 0 && (
                  <span className={`ml-2 text-xs ${dropOffTone(dropOffPercent)}`}>
                    -{dropOffPercent.toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-6 rounded-sm bg-neutral-900">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="h-6 rounded-r-sm bg-[#3987e5]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
