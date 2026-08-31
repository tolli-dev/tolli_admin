import "server-only";
import { Pool } from "pg";

/**
 * Firebase Data Connect가 쓰는 Postgres에 직접 붙는다. Data Connect SDK는
 * 로그인한 사용자 본인의 데이터만 읽도록 설계돼 있어서, 전체 집계가 필요한
 * 어드민 화면은 SQL로 직접 조회한다.
 *
 * Next.js는 개발 중 모듈을 다시 불러오므로 globalThis에 풀을 캐싱해
 * 커넥션이 계속 쌓이는 걸 막는다.
 */
const globalForDb = globalThis as unknown as { adminPgPool?: Pool };

function createPool(): Pool {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
    throw new Error("DB_HOST / DB_USER / DB_PASSWORD is not set");
  }

  return new Pool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME || "fdcdb",
    port: Number(DB_PORT ?? 5432),
    ssl: { rejectUnauthorized: false },
    // 서버리스에서는 인스턴스마다 풀이 생기므로 커넥션을 적게 잡는다.
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pool = (globalForDb.adminPgPool ??= createPool());

/** 조회 전용 헬퍼. 어드민은 읽기만 하므로 쓰기 경로는 두지 않는다. */
export async function query<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
  const result = await pool.query(sql, params as unknown[]);
  return result.rows as T[];
}
