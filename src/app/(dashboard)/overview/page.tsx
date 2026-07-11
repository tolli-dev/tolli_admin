import {
  fetchAverageRecordingDuration,
  fetchEventTrend,
  fetchPropertyBreakdown,
  fetchRageClickCount,
  fetchTopEvents,
} from "@/lib/posthog/queries";
import { getEventLabel } from "@/lib/funnels/definitions";
import { KpiTile } from "@/components/charts/KpiTile";
import { TrendLine } from "@/components/charts/TrendLine";
import { BreakdownBar } from "@/components/charts/BreakdownBar";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 300;

export default async function OverviewPage() {
  const [
    dauTrend,
    signupsToday,
    signups7d,
    signups30dTrend,
    loginProvider,
    deviceType,
    topEvents,
    rageClicks,
    recordingDuration,
  ] = await Promise.all([
    fetchEventTrend("$pageview", { dateFrom: "-30d", math: "dau" }),
    fetchEventTrend("signup_complete", { dateFrom: "-1d" }),
    fetchEventTrend("signup_complete", { dateFrom: "-7d" }),
    fetchEventTrend("signup_complete", { dateFrom: "-30d" }),
    fetchPropertyBreakdown("login_clicked", "provider", { days: 30 }),
    fetchPropertyBreakdown("$pageview", "$device_type", { days: 30 }),
    fetchTopEvents({ days: 30, limit: 8 }),
    fetchRageClickCount(30),
    fetchAverageRecordingDuration(30),
  ]);

  const dau = dauTrend.results[0];
  const todayDau = dau?.data.at(-1) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">개요</h1>
          <p className="mt-1 text-sm text-neutral-500">
            이 숫자들은 로그인 계정이 아니라 브라우저(기기) 단위로 집계돼요. 같은 사람이 다른 기기로 접속하면
            별개로 잡힐 수 있어요.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="오늘 방문자 수" value={todayDau} />
        <KpiTile label="오늘 신규 가입" value={signupsToday.results[0]?.count ?? 0} />
        <KpiTile label="최근 7일 신규 가입" value={signups7d.results[0]?.count ?? 0} />
        <KpiTile label="최근 30일 신규 가입" value={signups30dTrend.results[0]?.count ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendLine title="일별 방문자 수 (최근 30일)" days={dau?.days ?? []} values={dau?.data ?? []} />
        <TrendLine
          title="일별 신규 가입 수 (최근 30일)"
          days={signups30dTrend.results[0]?.days ?? []}
          values={signups30dTrend.results[0]?.data ?? []}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiTile label="낭독 녹음 평균 길이(초)" value={Math.round(recordingDuration.averageSeconds)} />
        <KpiTile label="사용성 이슈 신호 (연속 클릭 감지)" value={rageClicks} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownBar title="로그인 방법 (최근 30일)" rows={loginProvider.results} />
        <BreakdownBar title="접속 기기 (최근 30일)" rows={deviceType.results} />
      </div>

      <BreakdownBar
        title="가장 많이 발생한 활동 (최근 30일)"
        rows={topEvents.results.map((row) => ({ label: getEventLabel(row.label), count: row.count }))}
      />
    </div>
  );
}
