import "server-only";
import { query } from "@/lib/db";

export type TopLearner = {
  userId: string;
  nickname: string;
  completions: number;
  verses: number;
  lastStudiedAt: string;
};

type TopLearnerRow = {
  user_id: string;
  nickname: string;
  completions: string;
  verses: string;
  last_studied_at: Date;
};

/**
 * 학습을 많이 완주한 순서대로 상위 N명.
 *
 * PostHog 이벤트가 아니라 study_completions 테이블을 센다. 이벤트는 브라우저에서
 * 발사돼 유실될 수 있어 실제보다 적게 잡히고, 이 테이블이 완주 기록의 원천이다.
 *
 * 앱은 이미 완주한 말씀을 다시 학습하면 completeRetry로 보내고 행을 추가하지 않는다.
 * 그래서 completions와 verses는 현재 같은 값이지만, 나중에 재완주를 기록하게 되면
 * 갈릴 수 있어 두 값을 따로 보여준다.
 */
export async function fetchTopLearners(limit = 50): Promise<TopLearner[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error(`Invalid limit: ${limit}`);
  }

  const rows = await query<TopLearnerRow>(
    `
      SELECT
        u.id AS user_id,
        u.nickname AS nickname,
        count(*) AS completions,
        count(DISTINCT sc.verse_id) AS verses,
        max(sc.completed_at) AS last_studied_at
      FROM study_completions sc
      JOIN users u ON u.id = sc.user_id
      GROUP BY u.id, u.nickname
      ORDER BY completions DESC, last_studied_at DESC
      LIMIT $1
    `,
    [limit],
  );

  return rows.map((row) => ({
    userId: row.user_id,
    nickname: row.nickname,
    completions: Number(row.completions),
    verses: Number(row.verses),
    lastStudiedAt: row.last_studied_at.toISOString(),
  }));
}
