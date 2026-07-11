import { fetchRecentEvents } from "@/lib/posthog/queries";
import { EventTable, type EventRow } from "@/components/events/EventTable";
import { FUNNELS } from "@/lib/funnels/definitions";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 60;

const KNOWN_EVENTS = Array.from(
  new Set(
    FUNNELS.flatMap((funnel) =>
      funnel.steps.filter((step) => step.type === "event").map((step) => step.event),
    ),
  ),
);

function toRows(results: unknown[][], columns: string[]): EventRow[] {
  const eventIndex = columns.indexOf("event");
  const timestampIndex = columns.indexOf("timestamp");
  const distinctIdIndex = columns.indexOf("distinct_id");
  const propertiesIndex = columns.indexOf("properties");

  return results.map((row) => ({
    event: String(row[eventIndex]),
    timestamp: String(row[timestampIndex]),
    distinctId: String(row[distinctIdIndex]),
    properties: (row[propertiesIndex] as Record<string, unknown>) ?? {},
  }));
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event } = await searchParams;
  const response = await fetchRecentEvents({ eventName: event, limit: 100 });
  const rows = toRows(response.results, response.columns);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">이벤트 탐색기</h1>
          <p className="mt-1 text-sm text-neutral-500">최근 7일 원시 이벤트 (최대 100건)</p>
        </div>
        <RefreshButton />
      </div>

      <form method="get" className="flex items-center gap-3">
        <select
          name="event"
          defaultValue={event ?? ""}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
        >
          <option value="">전체 이벤트</option>
          <option value="$pageview">$pageview</option>
          {KNOWN_EVENTS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          필터 적용
        </button>
      </form>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2">
        <EventTable rows={rows} />
      </div>
    </div>
  );
}
