import "server-only";
import { SignJWT, importPKCS8 } from "jose";

type ServiceAccount = { client_email: string; private_key: string };

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set");
  return JSON.parse(raw) as ServiceAccount;
}

async function getAccessToken(): Promise<string> {
  const { client_email, private_key } = getServiceAccount();
  const key = await importPKCS8(private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/androidpublisher" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(client_email)
    .setSubject(client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange failed (${response.status}): ${await response.text()}`);
  }

  const data: { access_token: string } = await response.json();
  return data.access_token;
}

export type PlayReview = {
  reviewId: string;
  authorName: string;
  text: string;
  rating: number;
  at: string | null;
};

type PlayReviewsResponse = {
  reviews?: {
    reviewId: string;
    authorName?: string;
    comments?: { userComment?: { text?: string; starRating?: number; lastModified?: { seconds?: string } } }[];
  }[];
};

/**
 * Google Play has no public API for aggregate install/download counts —
 * that data only exists in the Play Console UI or a linked BigQuery export.
 * Reviews (with star ratings) are available via this endpoint, so an average
 * can be computed over the fetched page, but it's a recent-reviews sample,
 * not the store-wide average shown on the listing page.
 */
export async function fetchPlayStoreReviews(limit = 20): Promise<PlayReview[]> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) throw new Error("GOOGLE_PLAY_PACKAGE_NAME is not set");

  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/reviews?maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 3600 } },
  );

  if (!response.ok) {
    throw new Error(`Google Play reviews fetch failed (${response.status}): ${await response.text()}`);
  }

  const data: PlayReviewsResponse = await response.json();

  return (data.reviews ?? []).map((review) => {
    const comment = review.comments?.[0]?.userComment;
    const seconds = comment?.lastModified?.seconds;
    return {
      reviewId: review.reviewId,
      authorName: review.authorName ?? "익명",
      text: comment?.text ?? "",
      rating: comment?.starRating ?? 0,
      at: seconds ? new Date(Number(seconds) * 1000).toISOString() : null,
    };
  });
}
