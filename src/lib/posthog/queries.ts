import "server-only";
import { runPostHogQuery } from "./client";
import type { FunnelDefinition } from "@/lib/funnels/definitions";

type EventsNode = {
  kind: "EventsNode";
  event: string;
  name: string;
  properties?: { key: string; value: unknown; operator: string; type: "event" }[];
};

export type FunnelStepResult = {
  name: string;
  count: number;
  average_conversion_time: number | null;
};

export type FunnelsQueryResponse = {
  results: FunnelStepResult[];
};

function toEventsNode(step: FunnelDefinition["steps"][number]): EventsNode {
  if (step.type === "event") {
    return {
      kind: "EventsNode",
      event: step.event,
      name: step.label,
      properties: step.eventProperties?.map((prop) => ({
        key: prop.key,
        value: prop.value,
        operator: "exact",
        type: "event",
      })),
    };
  }

  return {
    kind: "EventsNode",
    event: "$pageview",
    name: step.label,
    properties: [
      {
        key: "$current_url",
        value: step.urlPattern,
        operator: step.operator ?? "icontains",
        type: "event",
      },
    ],
  };
}

export async function fetchFunnelResults(funnel: FunnelDefinition, dateFrom = "-30d") {
  const query = {
    kind: "FunnelsQuery",
    series: funnel.steps.map(toEventsNode),
    dateRange: { date_from: dateFrom },
    funnelsFilter: { funnelOrderType: "ordered" },
  };

  return runPostHogQuery<FunnelsQueryResponse>(query);
}

export type TrendResultPoint = {
  label: string;
  data: number[];
  days: string[];
  count: number;
};

export type TrendsQueryResponse = {
  results: TrendResultPoint[];
};

export async function fetchEventTrend(
  event: string,
  options: { dateFrom?: string; interval?: "day" | "week"; math?: "total" | "dau" } = {},
) {
  const { dateFrom = "-30d", interval = "day", math = "total" } = options;
  const query = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", event, name: event, math }],
    dateRange: { date_from: dateFrom },
    interval,
  };

  return runPostHogQuery<TrendsQueryResponse>(query);
}

export type HogQLQueryResponse = {
  results: unknown[][];
  columns: string[];
};

export async function fetchRecentEvents(options: { eventName?: string; limit?: number } = {}) {
  const { eventName, limit = 100 } = options;
  const eventFilter = eventName ? `AND event = {eventName}` : "";

  const query = {
    kind: "HogQLQuery",
    query: `SELECT event, timestamp, distinct_id, properties FROM events WHERE timestamp >= now() - INTERVAL 7 DAY ${eventFilter} ORDER BY timestamp DESC LIMIT {limit}`,
    values: { eventName, limit },
  };

  return runPostHogQuery<HogQLQueryResponse>(query, 60);
}
