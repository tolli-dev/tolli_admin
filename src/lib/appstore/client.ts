import "server-only";

export type AppStoreSummary = {
  appName: string;
  averageRating: number;
  ratingCount: number;
  currentVersionRating: number;
  currentVersionRatingCount: number;
  storeUrl: string;
};

type ItunesLookupResult = {
  trackName: string;
  averageUserRating?: number;
  userRatingCount?: number;
  averageUserRatingForCurrentVersion?: number;
  userRatingCountForCurrentVersion?: number;
  trackViewUrl: string;
};

/**
 * Apple has no simple authenticated endpoint for aggregate rating/review
 * counts (App Store Connect's Sales/Finance reports don't include ratings,
 * and the Customer Reviews API only returns individual paginated reviews).
 * The public, unauthenticated iTunes Lookup API already returns the
 * aggregate rating summary, so we use that instead of standing up API keys
 * for a number this endpoint gives us for free.
 */
export async function fetchAppStoreSummary(): Promise<AppStoreSummary> {
  const appId = process.env.APPLE_APP_ID;
  if (!appId) throw new Error("APPLE_APP_ID is not set");
  const country = process.env.APPLE_STORE_COUNTRY ?? "kr";

  const response = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=${country}`, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`App Store lookup failed (${response.status})`);

  const data: { results: ItunesLookupResult[] } = await response.json();
  const result = data.results?.[0];
  if (!result) throw new Error("App Store에서 해당 앱을 찾지 못했어요. APPLE_APP_ID를 확인해주세요.");

  return {
    appName: result.trackName,
    averageRating: result.averageUserRating ?? 0,
    ratingCount: result.userRatingCount ?? 0,
    currentVersionRating: result.averageUserRatingForCurrentVersion ?? 0,
    currentVersionRatingCount: result.userRatingCountForCurrentVersion ?? 0,
    storeUrl: result.trackViewUrl,
  };
}
