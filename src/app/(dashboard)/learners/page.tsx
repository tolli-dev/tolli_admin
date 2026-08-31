import { fetchTopLearners } from "@/lib/learners/queries";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 300;

const TOP_LIMIT = 50;

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default async function LearnersPage() {
  const learners = await fetchTopLearners(TOP_LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">학습 랭킹</h1>
          <p className="mt-1 text-sm text-neutral-500">
            학습을 가장 많이 완주한 상위 {TOP_LIMIT}명이에요. 누가 실제로 앱을 꾸준히 쓰는지 보여줘요.
          </p>
        </div>
        <RefreshButton />
      </div>

      {learners.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 text-center text-sm text-neutral-500">
          아직 학습을 완주한 사람이 없어요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                <th className="px-5 py-3 font-medium">순위</th>
                <th className="px-5 py-3 font-medium">사용자</th>
                <th className="px-5 py-3 text-right font-medium">완주 횟수</th>
                <th className="px-5 py-3 text-right font-medium">말씀 수</th>
                <th className="px-5 py-3 text-right font-medium">마지막 학습</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={learner.userId}
                    className="border-b border-neutral-800/60 transition-colors last:border-0 hover:bg-neutral-800/40"
                  >
                    <td className="px-5 py-3 tabular-nums text-neutral-400">
                      {RANK_MEDALS[rank] ?? rank}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-neutral-100">{learner.nickname}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-neutral-50">
                      {learner.completions.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-400">
                      {learner.verses.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-500">
                      {formatDate(learner.lastStudiedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-neutral-500">
        학습 완주 기록(study_completions)을 직접 센 값이라 분석 이벤트 유실 없이 정확해요. 완주 횟수는 총 완주 건수,
        말씀 수는 서로 다른 말씀의 개수예요. 지금은 이미 완주한 말씀을 다시 학습해도 기록이 쌓이지 않아 두 값이
        같아요.
      </p>
    </div>
  );
}
