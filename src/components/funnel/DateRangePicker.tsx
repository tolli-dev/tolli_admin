import Link from "next/link";
import type { DatePreset } from "@/lib/dateRange";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "yesterday", label: "어제" },
  { key: "7d", label: "최근 7일" },
  { key: "30d", label: "최근 30일" },
  { key: "all", label: "전체" },
];

export function DateRangePicker({
  funnelId,
  activePreset,
  customDate,
}: {
  funnelId: string;
  activePreset: DatePreset | null;
  customDate?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => {
        const isActive = !customDate && activePreset === preset.key;
        return (
          <Link
            key={preset.key}
            href={`/funnels/${funnelId}?preset=${preset.key}`}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? "bg-blue-500/20 text-blue-300"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
          >
            {preset.label}
          </Link>
        );
      })}
      <form action={`/funnels/${funnelId}`} method="get" className="flex items-center gap-2">
        <input
          type="date"
          name="date"
          defaultValue={customDate}
          className={`rounded-full border px-3 py-1.5 text-sm text-neutral-200 [color-scheme:dark] ${
            customDate ? "border-blue-500/40 bg-blue-500/10" : "border-neutral-800 bg-neutral-900"
          }`}
        />
        <button
          type="submit"
          className="rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          하루만 보기
        </button>
      </form>
    </div>
  );
}
