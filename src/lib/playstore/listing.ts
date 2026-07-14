import "server-only";

/**
 * The store-wide numbers Google Play shows on the listing page: average
 * rating, rating count, install bucket. There is no API for these — the
 * Play Developer API has no aggregate endpoint, and the bulk reports need a
 * permission that isn't always granted — but the public listing page carries
 * them, the same way Apple's numbers come from the unauthenticated iTunes
 * Lookup API in `../appstore/client.ts`.
 *
 * This parses HTML, so it will break if Google reshapes the page. Every field
 * is optional and the caller degrades to "—" rather than throwing, and
 * `bulkReports.ts` remains the authoritative source once its permission
 * propagates (it gives exact installs and a real star distribution).
 */

export type PlayStoreSummary = {
  averageRating: number | null;
  ratingCount: number | null;
  /** Play only publishes a bucket ("50+"), never an exact figure. */
  installs: string | null;
  storeUrl: string;
};

export async function fetchPlayStoreSummary(): Promise<PlayStoreSummary> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) throw new Error("GOOGLE_PLAY_PACKAGE_NAME is not set");

  const storeUrl = `https://play.google.com/store/apps/details?id=${packageName}&hl=ko&gl=KR`;
  const res = await fetch(storeUrl, { next: { revalidate: 3600 } });

  if (!res.ok) {
    throw new Error(`Play 스토어 페이지를 불러오지 못했어요 (${res.status})`);
  }

  const html = await res.text();

  const rating = html.match(/별표 5개 만점에 ([\d.]+)개를 받았습니다/)?.[1];
  const ratingCount = html.match(/class="g1rdde">리뷰 ([\d,]+)개/)?.[1];
  // The install bucket sits in the badge right above its own "다운로드" label.
  const installs = html.match(/>([\d.]+[천만억]?\+?)<\/div><div class="g1rdde">다운로드/)?.[1];

  return {
    averageRating: rating ? Number(rating) : null,
    ratingCount: ratingCount ? Number(ratingCount.replace(/,/g, "")) : null,
    installs: installs ?? null,
    storeUrl,
  };
}
