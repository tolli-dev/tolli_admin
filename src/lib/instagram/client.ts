import "server-only";

/**
 * Instagram Platform API (구 Instagram Graph API).
 *
 * 로그인 방식이 두 가지고, 방식마다 호스트와 노드가 다르다:
 * - Instagram Login: `graph.instagram.com` + `me` — 인스타 프로페셔널 계정만
 *   있으면 되고 페이스북 페이지 연결이 필요 없다. 기본값으로 쓴다.
 * - Facebook Login: `graph.facebook.com` + IG 유저 ID — 페이스북 페이지에
 *   연결된 계정용. 이 경우 INSTAGRAM_GRAPH_HOST/INSTAGRAM_USER_ID를 채운다.
 *
 * 두 경우 모두 필드 이름은 같아서, 아래 요청들은 호스트만 바뀌면 그대로 동작한다.
 * (단 `account_type`은 Facebook Login 쪽 노드에 없어서 요청하지 않는다.)
 *
 * 참고: 2024년 12월에 Instagram Basic Display API가 종료돼서, 개인 계정으로는
 * 어떤 방식으로도 통계를 못 받는다. 톨리 계정이 프로페셔널(비즈니스/크리에이터)
 * 계정이어야 한다.
 */

const GRAPH_VERSION = "v25.0";
const CACHE_SECONDS = 3600;
/** 인사이트는 한 요청당 최대 30일 구간만 받는다. */
export const INSIGHTS_DAYS = 28;

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
};

function config() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken) throw new Error("INSTAGRAM_ACCESS_TOKEN is not set");

  return {
    accessToken,
    host: process.env.INSTAGRAM_GRAPH_HOST ?? "graph.instagram.com",
    node: process.env.INSTAGRAM_USER_ID ?? "me",
  };
}

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);
}

/**
 * 토큰은 쿼리스트링이 아니라 Authorization 헤더로 보낸다 — Graph가 둘 다 받는데,
 * URL에 넣으면 fetch 캐시 키와 에러 메시지에 토큰이 그대로 남기 때문.
 */
async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const { accessToken, host, node } = config();

  const url = new URL(`https://${host}/${GRAPH_VERSION}/${node}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: CACHE_SECONDS },
  });

  const body = (await res.json().catch(() => ({}))) as T & GraphErrorBody;

  if (!res.ok || body.error) {
    throw new Error(describeGraphError(body.error, res.status));
  }

  return body;
}

/** Graph 에러는 원문이 불친절해서, 실제로 자주 나는 것들만 조치로 바꿔준다. */
function describeGraphError(error: GraphErrorBody["error"], status: number): string {
  const raw = error?.message ?? `Instagram API 요청 실패 (${status})`;

  if (error?.type === "OAuthException") {
    return `액세스 토큰이 만료됐거나 권한이 없어요. 장기 토큰은 60일마다 갱신해야 해요. (${raw})`;
  }
  if (error?.code === 100 && /metric/i.test(raw)) {
    return `요청한 인사이트 지표를 이 계정에서 못 써요. (${raw})`;
  }
  return raw;
}

export type InstagramProfile = {
  username: string;
  name: string | null;
  biography: string | null;
  website: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  profileUrl: string;
};

type ProfileResponse = {
  username: string;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

export async function fetchInstagramProfile(): Promise<InstagramProfile> {
  const data = await graph<ProfileResponse>("", {
    fields: "username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count",
  });

  return {
    username: data.username,
    name: data.name ?? null,
    biography: data.biography ?? null,
    website: data.website ?? null,
    profilePictureUrl: data.profile_picture_url ?? null,
    followersCount: data.followers_count ?? null,
    followsCount: data.follows_count ?? null,
    mediaCount: data.media_count ?? null,
    profileUrl: `https://www.instagram.com/${data.username}/`,
  };
}

export type InstagramInsights = {
  since: string;
  until: string;
  totals: {
    reach: number | null;
    views: number | null;
    totalInteractions: number | null;
    accountsEngaged: number | null;
    profileViews: number | null;
    websiteClicks: number | null;
    profileLinksTaps: number | null;
  };
  series: { days: string[]; reach: number[]; views: number[] };
  /** 도달을 팔로워 / 비팔로워로 쪼갠 값. breakdown 요청이 실패하면 null. */
  followTypeReach: { follower: number; nonFollower: number } | null;
  /** 릴스·피드·스토리·광고별 도달/조회수. 실패하면 빈 배열. */
  byContentType: { key: string; label: string; reach: number; views: number }[];
};

/**
 * 인사이트는 권한·계정 상태에 따라 통째로 막힐 수 있어서, 실패해도 페이지
 * 전체를 죽이지 않는다. (여기서 요청하는 도달/조회수/상호작용은 팔로워 수와
 * 무관하지만, follower_count·audience_* 계열은 100명 미만이면 못 받는다.)
 */
export type InstagramInsightsStatus =
  | { status: "ready"; insights: InstagramInsights }
  | { status: "unavailable"; message: string };

type TotalValueResponse = {
  data: { name: string; total_value?: { value?: number } }[];
};

type TimeSeriesResponse = {
  data: { name: string; values?: { value: number; end_time: string }[] }[];
};

type BreakdownResponse = {
  data: {
    name: string;
    total_value?: {
      breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[];
    };
  }[];
};

/**
 * 인스타가 주는 media_product_type 값. AD가 따로 잡히기 때문에 광고 성과와
 * 오가닉 성과를 분리할 수 있다 — 합쳐 보면 오가닉이 부풀려진다.
 */
const CONTENT_TYPE_LABEL: Record<string, string> = {
  CAROUSEL_CONTAINER: "피드 게시물",
  REEL: "릴스",
  REELS: "릴스",
  STORY: "스토리",
  FEED: "피드 게시물",
  AD: "광고",
};

export const AD_CONTENT_TYPE = "AD";

export function contentTypeLabel(key: string): string {
  return CONTENT_TYPE_LABEL[key] ?? key;
}

/** breakdown 응답에서 `dimension_values[0] -> value` 맵을 뽑는다. */
function breakdownMap(body: BreakdownResponse, metric: string): Map<string, number> {
  const results = body.data.find((row) => row.name === metric)?.total_value?.breakdowns?.[0]?.results ?? [];
  return new Map(results.map((row) => [row.dimension_values[0], row.value]));
}

function insightsWindow() {
  const until = Math.floor(Date.now() / 1000);
  const since = until - INSIGHTS_DAYS * 24 * 60 * 60;
  return { since, until };
}

function isoDay(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export async function fetchInstagramInsights(): Promise<InstagramInsightsStatus> {
  const { since, until } = insightsWindow();
  const range = { since: String(since), until: String(until), period: "day" };

  try {
    // breakdown 두 건은 계정 상태에 따라 빠질 수 있어서, 실패해도 나머지
    // 인사이트는 살리려고 개별로 감싼다.
    const optional = <T>(promise: Promise<T>) => promise.catch(() => null);

    const [totalsRes, seriesRes, followTypeRes, contentTypeRes] = await Promise.all([
      graph<TotalValueResponse>("/insights", {
        ...range,
        metric_type: "total_value",
        metric: "reach,views,total_interactions,accounts_engaged,profile_views,website_clicks,profile_links_taps",
      }),
      graph<TimeSeriesResponse>("/insights", {
        ...range,
        metric_type: "time_series",
        metric: "reach,views",
      }),
      optional(
        graph<BreakdownResponse>("/insights", {
          ...range,
          metric_type: "total_value",
          metric: "reach",
          breakdown: "follow_type",
        }),
      ),
      optional(
        graph<BreakdownResponse>("/insights", {
          ...range,
          metric_type: "total_value",
          metric: "reach,views",
          breakdown: "media_product_type",
        }),
      ),
    ]);

    const total = (name: string) =>
      totalsRes.data.find((metric) => metric.name === name)?.total_value?.value ?? null;

    // reach/views는 같은 날짜 축을 쓰지만, 한쪽만 비어 오는 경우가 있어 축은
    // 값이 있는 쪽에서 만들고 나머지는 날짜로 맞춰 채운다.
    const seriesOf = (name: string) =>
      new Map(
        (seriesRes.data.find((metric) => metric.name === name)?.values ?? []).map((point) => [
          point.end_time.slice(0, 10),
          point.value,
        ]),
      );
    const reachByDay = seriesOf("reach");
    const viewsByDay = seriesOf("views");
    const days = [...new Set([...reachByDay.keys(), ...viewsByDay.keys()])].sort();

    const followType = followTypeRes && breakdownMap(followTypeRes, "reach");
    const followTypeReach =
      followType && followType.size > 0
        ? { follower: followType.get("FOLLOWER") ?? 0, nonFollower: followType.get("NON_FOLLOWER") ?? 0 }
        : null;

    const typeReach = contentTypeRes ? breakdownMap(contentTypeRes, "reach") : new Map<string, number>();
    const typeViews = contentTypeRes ? breakdownMap(contentTypeRes, "views") : new Map<string, number>();
    const byContentType = [...new Set([...typeReach.keys(), ...typeViews.keys()])]
      .map((key) => ({
        key,
        label: contentTypeLabel(key),
        reach: typeReach.get(key) ?? 0,
        views: typeViews.get(key) ?? 0,
      }))
      .sort((a, b) => b.views - a.views);

    return {
      status: "ready",
      insights: {
        since: isoDay(since),
        until: isoDay(until),
        totals: {
          reach: total("reach"),
          views: total("views"),
          totalInteractions: total("total_interactions"),
          accountsEngaged: total("accounts_engaged"),
          profileViews: total("profile_views"),
          websiteClicks: total("website_clicks"),
          profileLinksTaps: total("profile_links_taps"),
        },
        series: {
          days,
          reach: days.map((day) => reachByDay.get(day) ?? 0),
          views: days.map((day) => viewsByDay.get(day) ?? 0),
        },
        followTypeReach,
        byContentType,
      },
    };
  } catch (error) {
    return {
      status: "unavailable",
      message: error instanceof Error ? error.message : "인사이트를 가져오지 못했어요.",
    };
  }
}

export type InstagramMedia = {
  id: string;
  caption: string | null;
  mediaType: string;
  contentTypeLabel: string;
  permalink: string;
  thumbnailUrl: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  reach: number | null;
  views: number | null;
  saved: number | null;
  shares: number | null;
};

type MediaResponse = {
  data: {
    id: string;
    caption?: string;
    media_type: string;
    media_product_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    insights?: { data?: { name: string; values?: { value: number }[] }[] };
  }[];
};

/**
 * 게시물별 인사이트는 `insights.metric(...)` 필드 확장으로 같이 받는다 —
 * 게시물마다 /insights를 따로 부르면 12개면 요청이 12번 더 나간다.
 */
export async function fetchInstagramMedia(limit = 12): Promise<InstagramMedia[]> {
  const data = await graph<MediaResponse>("/media", {
    fields: [
      "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp",
      "like_count,comments_count",
      "insights.metric(reach,views,saved,shares)",
    ].join(","),
    limit: String(limit),
  });

  return (data.data ?? []).map((item) => {
    const insight = (name: string) =>
      item.insights?.data?.find((metric) => metric.name === name)?.values?.[0]?.value ?? null;

    return {
      id: item.id,
      caption: item.caption ?? null,
      mediaType: item.media_type,
      contentTypeLabel: contentTypeLabel(item.media_product_type ?? item.media_type),
      // 동영상은 media_url이 mp4라서 썸네일을 먼저 쓴다.
      thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
      permalink: item.permalink,
      timestamp: item.timestamp ?? null,
      likeCount: item.like_count ?? null,
      commentsCount: item.comments_count ?? null,
      reach: insight("reach"),
      views: insight("views"),
      saved: insight("saved"),
      shares: insight("shares"),
    };
  });
}
