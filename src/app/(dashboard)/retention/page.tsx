import {
  fetchActiveUsers,
  fetchEventCount,
  fetchEventTrend,
  fetchRetentionCurve,
} from "@/lib/posthog/queries";
import { SERVICE_LAUNCH_DATE } from "@/lib/dateRange";
import { KpiTile } from "@/components/charts/KpiTile";
import { RetentionCurve } from "@/components/charts/RetentionCurve";
import { TrendLine } from "@/components/charts/TrendLine";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 300;

export default async function RetentionPage() {
  const [dailyCurve, weeklyCurve, signupsTotal, signupTrend, dau, wau, mau] = await Promise.all([
    fetchRetentionCurve({ dateFrom: "-90d" }),
    fetchRetentionCurve({ dateFrom: "-180d", period: "Week", totalIntervals: 5 }), // W0~W4
    fetchEventCount("signup_complete"),
    fetchEventTrend("signup_complete", { dateFrom: SERVICE_LAUNCH_DATE }),
    fetchActiveUsers(1),
    fetchActiveUsers(7),
    fetchActiveUsers(30),
  ]);

  const d1 = dailyCurve[1];
  const d7 = dailyCurve[7];
  const dailyRates = dailyCurve.map((point) => point.rate);

  const w1 = weeklyCurve[1];
  const w2 = weeklyCurve[2];
  const w4 = weeklyCurve[4];
  const weeklyRates = weeklyCurve.map((point) => point.rate);

  const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

  // 누적 가입자 = 일별 가입 수를 오픈일부터 러닝 합계로 쌓은 값.
  const trend = signupTrend.results[0];
  const days = trend?.days ?? [];
  let running = 0;
  const cumulative = (trend?.data ?? []).map((count) => (running += count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">재방문 · 리텐션</h1>
          <p className="mt-1 text-sm text-neutral-500">
            가입한 사람들이 얼마나 다시 돌아오는지, 그리고 전체 가입자가 어떻게 쌓여왔는지 봐요.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile label="D1 재방문율" value={Number((d1?.rate ?? 0).toFixed(1))} suffix="%" />
        <KpiTile label="D7 재방문율" value={Number((d7?.rate ?? 0).toFixed(1))} suffix="%" />
        <KpiTile label="전체 누적 신규 가입" value={signupsTotal} />
      </div>
      <p className="text-xs text-neutral-500">
        재방문율은 첫 가입일 다음날(D1)·7일 후(D7)에 앱을 다시 연 사람의 비율이에요. 아직 그만큼 시간이 지나지
        않은 최근 가입자는 계산에서 빠져요 (분모: D1 {(d1?.cohortSize ?? 0).toLocaleString("ko-KR")}명, D7{" "}
        {(d7?.cohortSize ?? 0).toLocaleString("ko-KR")}명). &apos;다시 열었다&apos;는 화면 조회($pageview) 기준이에요.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RetentionCurve title="재방문 곡선 (가입 후 0~7일차 · 최근 90일 가입자)" rates={dailyRates} />
        <TrendLine title="누적 가입자 추이 (전체)" days={days} values={cumulative} valueLabel="누적 가입자" unit="명" />
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-neutral-100">주간 리텐션</h2>
        <p className="mt-1 text-sm text-neutral-500">
          D7까지는 너무 짧아서, 가입 몇 주 뒤까지 남아있는지 주 단위로 봐요.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label="W1 재방문율 (1주 후)" value={Number((w1?.rate ?? 0).toFixed(1))} suffix="%" />
        <KpiTile label="W2 재방문율 (2주 후)" value={Number((w2?.rate ?? 0).toFixed(1))} suffix="%" />
        <KpiTile label="W4 재방문율 (4주 후)" value={Number((w4?.rate ?? 0).toFixed(1))} suffix="%" />
      </div>
      <RetentionCurve title="주간 재방문 곡선 (가입 후 0~4주차 · 최근 180일 가입자)" rates={weeklyRates} prefix="W" />
      <p className="text-xs text-neutral-500">
        W1이 D7보다 높은 건 정상이에요. D7은 &apos;가입 7일째 그 하루&apos;에 왔는지만 세고, W1은 &apos;가입 다음
        한 주 동안 아무 날이나&apos; 왔으면 세거든요. 일주일 통째로 세는 W1이 하루만 세는 D7보다 클 수밖에 없어요.
        &apos;아직 앱을 쓰는가&apos;를 볼 땐 주간(W) 지표가 더 현실적이에요.
      </p>

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-neutral-100">앱 사용 활성도</h2>
        <p className="mt-1 text-sm text-neutral-500">
          매일 쓰는 앱인지 가끔 쓰는 앱인지를 보는 지표예요. Stickiness가 높을수록 습관처럼 쓴다는 뜻이에요.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="DAU (최근 1일)" value={dau} />
        <KpiTile label="WAU (최근 7일)" value={wau} />
        <KpiTile label="MAU (최근 30일)" value={mau} />
        <KpiTile label="Stickiness (DAU÷MAU)" value={Number(stickiness.toFixed(1))} suffix="%" />
      </div>
      <p className="text-xs text-neutral-500">
        DAU/WAU/MAU는 각 기간에 앱에서 활동한 고유 사용자 수(중복 제외)예요. Stickiness = 하루 활성 유저 ÷ 한 달
        활성 유저 × 100 — 20%를 넘으면 꽤 자주 쓰는 앱으로 봐요.
      </p>
    </div>
  );
}
