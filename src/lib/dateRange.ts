export type DatePreset = "today" | "yesterday" | "7d" | "30d";

export type ResolvedDateRange = {
  from: string;
  to: string;
  label: string;
  preset: DatePreset | null; // null means a specific custom date was picked
};

const DEFAULT_PRESET: DatePreset = "30d";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(count: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - count);
  return date;
}

/**
 * Resolves a funnel page's `?date=` or `?preset=` search params into a
 * concrete { from, to } range, so a single day can be inspected instead of
 * only the rolling 30-day total. `date` wins over `preset` when both are set.
 */
export function resolveDateRange(searchParams: { preset?: string; date?: string }): ResolvedDateRange {
  if (searchParams.date) {
    return { from: searchParams.date, to: searchParams.date, label: searchParams.date, preset: null };
  }

  const preset = (searchParams.preset as DatePreset | undefined) ?? DEFAULT_PRESET;

  switch (preset) {
    case "today": {
      const iso = toISODate(new Date());
      return { from: iso, to: iso, label: "오늘", preset };
    }
    case "yesterday": {
      const iso = toISODate(daysAgo(1));
      return { from: iso, to: iso, label: "어제", preset };
    }
    case "7d":
      return { from: toISODate(daysAgo(6)), to: toISODate(new Date()), label: "최근 7일", preset };
    case "30d":
    default:
      return { from: toISODate(daysAgo(29)), to: toISODate(new Date()), label: "최근 30일", preset: "30d" };
  }
}
