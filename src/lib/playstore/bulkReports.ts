import "server-only";
import { DEVSTORAGE_READ_SCOPE, getAccessToken } from "./client";

/**
 * Play Console drops monthly CSV reports into a developer-owned Cloud Storage
 * bucket (Download reports → the gs:// URI shown there). Unlike the Play
 * Developer API, these carry the aggregate numbers the store listing shows:
 * total average rating, installs, and every review including ratings-only ones.
 *
 * Two things bite here:
 * - the CSVs are UTF-16LE, not UTF-8, so they must be decoded explicitly
 * - reports are per-month, and the current month's file may not exist yet
 *   early in a month, so we always read the newest few and take the last
 *   populated row
 */

const STORAGE_API = "https://storage.googleapis.com/storage/v1/b";

/**
 * A 403 from the bucket means only one thing in practice: the service account
 * hasn't been given the account-level "View app information and download bulk
 * reports (read-only)" permission. Google's raw error is a wall of JSON, so it
 * gets replaced with the actual fix.
 */
class PermissionError extends Error {
  constructor() {
    super(
      "서비스 계정에 리포트 읽기 권한이 없어요. Play Console → 사용자 및 권한 → 해당 서비스 계정 → '계정 권한' 탭에서 '앱 정보 보기 및 보고서 일괄 다운로드(읽기 전용)'를 켜고 저장해 주세요.",
    );
  }
}
const MONTHS_TO_READ = 2;
const REVIEW_FILES_TO_READ = 12;

function bucketName(): string {
  const raw = process.env.GOOGLE_PLAY_REPORTS_BUCKET;
  if (!raw) throw new Error("GOOGLE_PLAY_REPORTS_BUCKET is not set");
  return raw.replace(/^gs:\/\//, "").replace(/\/.*$/, "");
}

function packageName(): string {
  const raw = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!raw) throw new Error("GOOGLE_PLAY_PACKAGE_NAME is not set");
  return raw;
}

async function listReportFiles(prefix: string): Promise<string[]> {
  const token = await getAccessToken(DEVSTORAGE_READ_SCOPE);
  const url = `${STORAGE_API}/${bucketName()}/o?prefix=${encodeURIComponent(prefix)}&fields=items(name)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (res.status === 403) {
    throw new PermissionError();
  }
  if (!res.ok) {
    throw new Error(`Play 리포트 목록 조회 실패 (${res.status}): ${await res.text()}`);
  }

  const data: { items?: { name: string }[] } = await res.json();
  // File names end in the report's YYYYMM, so lexical order is chronological.
  return (data.items ?? []).map((item) => item.name).sort();
}

async function downloadReport(objectName: string): Promise<string> {
  const token = await getAccessToken(DEVSTORAGE_READ_SCOPE);
  const url = `${STORAGE_API}/${bucketName()}/o/${encodeURIComponent(objectName)}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (res.status === 403) {
    throw new PermissionError();
  }
  if (!res.ok) {
    throw new Error(`Play 리포트 다운로드 실패 (${res.status}): ${await res.text()}`);
  }

  return new TextDecoder("utf-16le").decode(await res.arrayBuffer()).replace(/^﻿/, "");
}

/** Review text contains commas, quotes and newlines, so a split(",") won't do. */
function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [header, ...body] = rows;
  if (!header) return [];

  const keys = header.map((key) => key.trim());
  return body
    .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells) => Object.fromEntries(keys.map((key, index) => [key, (cells[index] ?? "").trim()])));
}

async function readLatestRows(prefix: string, fileCount: number): Promise<Record<string, string>[]> {
  const files = await listReportFiles(prefix);
  if (files.length === 0) return [];

  const contents = await Promise.all(files.slice(-fileCount).map(downloadReport));
  return contents.flatMap(parseCsv);
}

/** Columns are looked up by name — Play has added columns to these reports before. */
function lastNumeric(rows: Record<string, string>[], column: string): number | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const value = Number(rows[i][column]);
    if (rows[i][column] !== "" && Number.isFinite(value)) return value;
  }
  return null;
}

export type StarDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export type PlayStoreStats = {
  /** Cumulative store average across all ratings, as of the last reported day. */
  totalAverageRating: number | null;
  /** Cumulative installs by unique user account (what the listing's install count tracks). */
  totalUserInstalls: number | null;
  /** Devices with the app currently installed. */
  activeDeviceInstalls: number | null;
  /** Last day the reports have data for, so the UI can say how fresh this is. */
  asOf: string | null;
  starDistribution: StarDistribution;
  reviewCount: number;
};

export type PlayStatsStatus =
  | { status: "ready"; stats: PlayStoreStats }
  | { status: "pending"; message: string };

export async function fetchPlayStoreStats(): Promise<PlayStatsStatus> {
  const pkg = packageName();

  const [ratingRows, installRows, reviewRows] = await Promise.all([
    readLatestRows(`stats/ratings/ratings_${pkg}_`, MONTHS_TO_READ),
    readLatestRows(`stats/installs/installs_${pkg}_`, MONTHS_TO_READ),
    readLatestRows(`reviews/reviews_${pkg}_`, REVIEW_FILES_TO_READ),
  ]);

  if (ratingRows.length === 0 && installRows.length === 0 && reviewRows.length === 0) {
    return {
      status: "pending",
      message:
        "버킷에 리포트가 아직 없어요. Play Console 리포트는 하루 한 번 생성되고, 첫 파일은 출시 다음 날쯤 나와요.",
    };
  }

  const starDistribution: StarDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviewRows) {
    const rating = Number(review["Star Rating"]);
    if (rating >= 1 && rating <= 5) starDistribution[rating as keyof StarDistribution] += 1;
  }

  const dates = [...ratingRows, ...installRows]
    .map((row) => row["Date"])
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();

  return {
    status: "ready",
    stats: {
      totalAverageRating: lastNumeric(ratingRows, "Total Average Rating"),
      totalUserInstalls: lastNumeric(installRows, "Total User Installs"),
      activeDeviceInstalls: lastNumeric(installRows, "Active Device Installs"),
      asOf: dates.at(-1) ?? null,
      starDistribution,
      reviewCount: reviewRows.length,
    },
  };
}
