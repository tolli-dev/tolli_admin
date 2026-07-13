import "server-only";
import { gunzipSync } from "node:zlib";
import { SignJWT, importPKCS8 } from "jose";

const API_BASE = "https://api.appstoreconnect.apple.com/v1";
const DOWNLOADS_REPORT_NAME = "App Downloads Standard";

type JsonApiResource = { type: string; id: string; attributes?: Record<string, unknown> };
type JsonApiList = { data: JsonApiResource[] };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/**
 * Apple's App Store Connect API auth: a short-lived ES256 JWT signed with
 * the .p8 private key downloaded when the API key was created (Users and
 * Access → Integrations → App Store Connect API), keyed by APPLE_API_KEY_ID
 * / APPLE_API_ISSUER_ID. Same jose-based approach as the Google Play client.
 */
async function signAppleJwt(): Promise<string> {
  const keyId = requireEnv("APPLE_API_KEY_ID");
  const issuerId = requireEnv("APPLE_API_ISSUER_ID");
  const privateKeyPem = requireEnv("APPLE_API_PRIVATE_KEY").replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ aud: "appstoreconnect-v1" })
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 15)
    .sign(privateKey);
}

async function appleApiFetch(path: string, init?: RequestInit): Promise<JsonApiList> {
  const jwt = await signAppleJwt();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    throw new Error(`App Store Connect API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Apple only allows one ONGOING analytics report request per app, so this
 * reuses the existing one if we already created it (verified against the
 * real API: creating a second one for the same app errors out).
 */
async function ensureOngoingReportRequest(appId: string): Promise<string> {
  const existing = await appleApiFetch(`/apps/${appId}/analyticsReportRequests?filter[accessType]=ONGOING`);
  const found = existing.data[0];
  if (found) return found.id;

  const created = await appleApiFetch(`/analyticsReportRequests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        type: "analyticsReportRequests",
        attributes: { accessType: "ONGOING" },
        relationships: { app: { data: { type: "apps", id: appId } } },
      },
    }),
  });
  return (created as unknown as { data: JsonApiResource }).data.id;
}

async function findDownloadsReportId(reportRequestId: string): Promise<string | null> {
  const reports = await appleApiFetch(`/analyticsReportRequests/${reportRequestId}/reports?limit=200`);
  return reports.data.find((report) => report.attributes?.name === DOWNLOADS_REPORT_NAME)?.id ?? null;
}

/**
 * Picks the most recent instance. Apple's instance `attributes` schema isn't
 * confirmed yet (no instance existed as of writing this — the first one
 * takes 24-48h to appear after the report request is created), so this
 * tries common date-like fields and otherwise falls back to the last item in
 * the list rather than guessing wrong and silently returning stale data.
 */
async function latestInstanceId(reportId: string): Promise<string | null> {
  const instances = await appleApiFetch(`/analyticsReports/${reportId}/instances?limit=200`);
  if (instances.data.length === 0) return null;

  const dateKeys = ["processingDate", "endDate", "date", "reportDate"];
  const withDates = instances.data
    .map((item) => {
      const dateKey = dateKeys.find((key) => typeof item.attributes?.[key] === "string");
      return { id: item.id, date: dateKey ? String(item.attributes![dateKey]) : null };
    })
    .filter((item) => item.date !== null) as { id: string; date: string }[];

  if (withDates.length === 0) return instances.data.at(-1)!.id;
  return withDates.sort((a, b) => b.date.localeCompare(a.date))[0].id;
}

async function segmentUrls(instanceId: string): Promise<string[]> {
  const segments = await appleApiFetch(`/analyticsReportInstances/${instanceId}/segments`);
  return segments.data
    .map((segment) => segment.attributes?.url)
    .filter((url): url is string => typeof url === "string");
}

function parseDownloadsTsv(tsv: string): number {
  const [headerLine, ...rows] = tsv.trim().split("\n");
  const headers = headerLine.split("\t").map((header) => header.trim());
  const countIndex = headers.findIndex((header) => /^(counts?|units|downloads)$/i.test(header));
  if (countIndex === -1) {
    throw new Error(`다운로드 리포트에서 수량 컬럼을 못 찾았어요. 실제 헤더: ${headers.join(", ")}`);
  }

  return rows.reduce((total, row) => {
    if (!row.trim()) return total;
    const value = Number(row.split("\t")[countIndex]);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export type DownloadsReportStatus =
  | { status: "ready"; totalDownloads: number }
  | { status: "pending"; message: string };

export async function fetchAppDownloadsTotal(appId: string): Promise<DownloadsReportStatus> {
  const reportRequestId = await ensureOngoingReportRequest(appId);

  const reportId = await findDownloadsReportId(reportRequestId);
  if (!reportId) {
    return { status: "pending", message: "리포트 요청은 됐지만 아직 리포트 종류가 준비되지 않았어요." };
  }

  const instanceId = await latestInstanceId(reportId);
  if (!instanceId) {
    return { status: "pending", message: "리포트를 요청했어요. 첫 데이터는 보통 24~48시간 후에 나와요." };
  }

  const urls = await segmentUrls(instanceId);
  if (urls.length === 0) {
    return { status: "pending", message: "리포트 인스턴스는 준비됐지만 다운로드할 파일이 아직 없어요." };
  }

  let total = 0;
  for (const url of urls) {
    const res = await fetch(url);
    const gz = Buffer.from(await res.arrayBuffer());
    const tsv = gunzipSync(gz).toString("utf-8");
    total += parseDownloadsTsv(tsv);
  }

  return { status: "ready", totalDownloads: total };
}
