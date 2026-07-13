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

export async function fetchFunnelResults(funnel: FunnelDefinition, range: { from: string; to: string }) {
  const query = {
    kind: "FunnelsQuery",
    series: funnel.steps.map(toEventsNode),
    dateRange: { date_from: range.from, date_to: range.to },
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

export type PropertyBreakdownRow = { label: string; count: number };

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_$]+$/;

/**
 * Groups an event's count by one of its properties (e.g. login provider,
 * device type, abandonment step). `propertyKey` must be a hardcoded constant
 * from our own call sites, never a value derived from user/request input —
 * it's interpolated directly into the HogQL string, not bound as a param.
 *
 * `uniqueUsers: true` counts distinct people (distinct_id) instead of raw
 * event occurrences — e.g. "몇 명이 카카오로 로그인했는지" instead of "로그인이
 * 몇 번 발생했는지". Without this, high-frequency events like $pageview or
 * repeat logins by the same returning user inflate the count far past
 * something like the signup total, which is naturally confusing to compare.
 *
 * Pass either `days` (rolling window from now) or `dateFrom`/`dateTo`
 * (absolute `YYYY-MM-DD`, inclusive) to inspect a specific day or range —
 * `dateFrom`/`dateTo` take precedence when both are given.
 */
export async function fetchPropertyBreakdown(
  event: string,
  propertyKey: string,
  options: { days?: number; dateFrom?: string; dateTo?: string; limit?: number; uniqueUsers?: boolean } = {},
): Promise<{ results: PropertyBreakdownRow[] }> {
  if (!SAFE_IDENTIFIER.test(propertyKey)) {
    throw new Error(`Unsafe property key: ${propertyKey}`);
  }
  const { days = 30, dateFrom, dateTo, limit = 20, uniqueUsers = false } = options;
  const countExpr = uniqueUsers ? "count(DISTINCT distinct_id)" : "count()";
  const dateFilter =
    dateFrom && dateTo
      ? "toDate(timestamp) >= toDate({dateFrom}) AND toDate(timestamp) <= toDate({dateTo})"
      : `timestamp >= now() - INTERVAL ${days} DAY`;

  const query = {
    kind: "HogQLQuery",
    query: `SELECT toString(properties.${propertyKey}) AS value, ${countExpr} AS total FROM events WHERE event = {event} AND ${dateFilter} GROUP BY value ORDER BY total DESC LIMIT {limit}`,
    values: { event, limit, dateFrom, dateTo },
  };

  const response = await runPostHogQuery<HogQLQueryResponse>(query, 300);
  return {
    results: response.results.map((row) => ({
      label: String(row[0] ?? "알 수 없음"),
      count: Number(row[1]),
    })),
  };
}

const EXCLUDED_AUTOCAPTURE_EVENTS = ["$pageview", "$pageleave", "$autocapture", "$web_vitals", "$rageclick"];

export async function fetchTopEvents(options: { days?: number; limit?: number } = {}) {
  const { days = 30, limit = 10 } = options;
  const query = {
    kind: "HogQLQuery",
    query: `SELECT event, count() AS total FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY AND event NOT IN {excluded} GROUP BY event ORDER BY total DESC LIMIT {limit}`,
    values: { excluded: EXCLUDED_AUTOCAPTURE_EVENTS, limit },
  };

  const response = await runPostHogQuery<HogQLQueryResponse>(query, 300);
  return {
    results: response.results.map((row) => ({ label: String(row[0]), count: Number(row[1]) })),
  };
}

export async function fetchRageClickCount(days = 30) {
  const query = {
    kind: "HogQLQuery",
    query: `SELECT count() FROM events WHERE event = '$rageclick' AND timestamp >= now() - INTERVAL ${days} DAY`,
  };
  const response = await runPostHogQuery<HogQLQueryResponse>(query, 300);
  return Number(response.results[0]?.[0] ?? 0);
}

export async function fetchAverageRecordingDuration(days = 30) {
  const query = {
    kind: "HogQLQuery",
    query: `SELECT avg(toFloat(properties.duration_sec)), count() FROM events WHERE event = 'recording_completed' AND timestamp >= now() - INTERVAL ${days} DAY`,
  };
  const response = await runPostHogQuery<HogQLQueryResponse>(query, 300);
  const [avg, count] = response.results[0] ?? [0, 0];
  return { averageSeconds: Number(avg ?? 0), count: Number(count ?? 0) };
}
