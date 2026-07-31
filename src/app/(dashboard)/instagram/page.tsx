import Image from "next/image";
import {
  fetchInstagramInsights,
  fetchInstagramMedia,
  fetchInstagramProfile,
  isInstagramConfigured,
  INSIGHTS_DAYS,
  type InstagramInsightsStatus,
} from "@/lib/instagram/client";
import { AD_CONTENT_TYPE } from "@/lib/instagram/client";
import { KpiTile } from "@/components/charts/KpiTile";
import { TrendLine } from "@/components/charts/TrendLine";
import { BreakdownBar } from "@/components/charts/BreakdownBar";
import { MediaGrid } from "@/components/instagram/MediaGrid";
import { StoreSetupNotice } from "@/components/store/StoreSetupNotice";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 3600;

const SETUP_STEPS = [
  "톨리 인스타 계정을 프로페셔널(비즈니스 또는 크리에이터) 계정으로 전환 — 개인 계정은 API로 아무 데이터도 못 받아요",
  "developers.facebook.com에서 앱 생성 → 제품에 'Instagram' 추가 → 'API setup with Instagram login'",
  "인스타 계정을 연결하고 instagram_business_basic, instagram_business_manage_insights 권한으로 토큰 생성",
  ".env에 INSTAGRAM_ACCESS_TOKEN=<장기 토큰> 추가 (장기 토큰은 60일 유효, 만료 전 갱신 필요)",
  "페이스북 페이지에 연결된 계정이면 INSTAGRAM_GRAPH_HOST=graph.facebook.com 과 INSTAGRAM_USER_ID=<IG 유저 ID>도 함께 추가",
];

function InsightsSection({ status }: { status: InstagramInsightsStatus }) {
  if (status.status === "unavailable") {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-5">
        <p className="text-sm font-medium text-neutral-300">인사이트를 못 가져왔어요</p>
        <p className="mt-2 text-sm text-neutral-500">{status.message}</p>
        <p className="mt-2 text-xs text-neutral-600">
          토큰에 instagram_business_manage_insights 권한이 있는지 확인해 주세요. 도달·조회수는 팔로워
          수와 무관하게 열리지만, 팔로워 인구통계(audience_*)는 100명 이상부터 나와요.
        </p>
      </div>
    );
  }

  const { totals, series, since, until, followTypeReach, byContentType } = status.insights;

  // 조회수는 유형별 합이 전체와 맞아떨어져서 광고/오가닉을 갈라 볼 수 있다.
  // 반면 도달은 같은 사람이 여러 유형에 걸치면 한 번만 세는 값이라 합계와
  // 유형별 합이 다르다 — 그래서 뺄셈으로 오가닉 도달을 만들지 않는다.
  const adViews = byContentType.find((row) => row.key === AD_CONTENT_TYPE)?.views ?? 0;
  const organicViews = byContentType
    .filter((row) => row.key !== AD_CONTENT_TYPE)
    .reduce((sum, row) => sum + row.views, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        최근 {INSIGHTS_DAYS}일 ({since} ~ {until})
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiTile label="도달 (계정 수)" value={totals.reach ?? 0} />
        <KpiTile label="조회수" value={totals.views ?? 0} />
        <KpiTile label="상호작용" value={totals.totalInteractions ?? 0} />
        <KpiTile label="참여한 계정" value={totals.accountsEngaged ?? 0} />
        <KpiTile label="프로필 방문" value={totals.profileViews ?? 0} />
        <KpiTile label="바이오 링크 클릭" value={totals.websiteClicks ?? 0} />
      </div>

      {series.days.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrendLine title="일별 도달" days={series.days} values={series.reach} valueLabel="도달" />
          <TrendLine title="일별 조회수" days={series.days} values={series.views} valueLabel="조회수" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {followTypeReach && (
          <BreakdownBar
            title="도달한 계정 — 팔로워 vs 비팔로워"
            rows={[
              { label: "비팔로워", count: followTypeReach.nonFollower },
              { label: "팔로워", count: followTypeReach.follower },
            ]}
            caption="비팔로워 비중이 높을수록 추천·탐색 탭을 타고 계정 밖으로 퍼지고 있다는 뜻이에요. 신규 유입이 얼마나 도는지 보는 지표라 팔로워 수보다 먼저 봐야 해요."
            sortRows="as-is"
          />
        )}

        {byContentType.length > 0 && (
          <BreakdownBar
            title="콘텐츠 유형별 조회수"
            rows={byContentType.map((row) => ({ label: row.label, count: row.views }))}
            caption={
              adViews > 0
                ? `광고로 발생한 조회수 ${adViews.toLocaleString("ko-KR")}회가 포함돼 있어요. 자연 노출(오가닉)만 보면 ${organicViews.toLocaleString("ko-KR")}회예요.`
                : "이 기간에 집행된 광고는 없어요. 전부 자연 노출이에요."
            }
          />
        )}
      </div>

      {byContentType.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <p className="text-sm text-neutral-400">콘텐츠 유형별 도달 · 조회수</p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="pb-2 font-normal">유형</th>
                <th className="pb-2 text-right font-normal">도달</th>
                <th className="pb-2 text-right font-normal">조회수</th>
              </tr>
            </thead>
            <tbody>
              {byContentType.map((row) => (
                <tr key={row.key} className="border-t border-neutral-800">
                  <td className="py-2 text-neutral-300">{row.label}</td>
                  <td className="py-2 text-right tabular-nums text-neutral-400">
                    {row.reach.toLocaleString("ko-KR")}
                  </td>
                  <td className="py-2 text-right tabular-nums text-neutral-400">
                    {row.views.toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            도달은 유형별 값을 더해도 위쪽 전체 도달({totals.reach?.toLocaleString("ko-KR") ?? "—"})과 맞지
            않아요. 같은 사람이 릴스와 피드를 모두 봤으면 전체에서는 한 명으로만 세기 때문이에요. 조회수는
            더하면 전체와 맞습니다.
          </p>
        </div>
      )}

      <p className="text-xs text-neutral-600">
        프로필 안 버튼(주소·전화·이메일) 탭 {totals.profileLinksTaps?.toLocaleString("ko-KR") ?? "—"}회 ·
        인스타그램은 과거 팔로워 수 이력을 주지 않아서 팔로워는 항상 현재 값이에요.
      </p>
    </div>
  );
}

async function InstagramContent() {
  if (!isInstagramConfigured()) {
    return <StoreSetupNotice title="Instagram" steps={SETUP_STEPS} />;
  }

  let profile;
  try {
    profile = await fetchInstagramProfile();
  } catch (error) {
    return (
      <StoreSetupNotice
        title="Instagram"
        steps={[error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.", ...SETUP_STEPS]}
      />
    );
  }

  const [insights, media] = await Promise.all([
    fetchInstagramInsights(),
    fetchInstagramMedia(12).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-start gap-4">
          {profile.profilePictureUrl && (
            <Image
              src={profile.profilePictureUrl}
              alt={profile.username}
              width={64}
              height={64}
              className="rounded-full border border-neutral-800"
            />
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold text-neutral-50">{profile.name ?? profile.username}</p>
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 underline"
            >
              @{profile.username}
            </a>
            {profile.biography && (
              <p className="mt-2 whitespace-pre-line text-sm text-neutral-400">{profile.biography}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiTile label="팔로워" value={profile.followersCount ?? 0} />
        <KpiTile label="팔로잉" value={profile.followsCount ?? 0} />
        <KpiTile label="게시물" value={profile.mediaCount ?? 0} />
      </div>

      <InsightsSection status={insights} />

      <div>
        <h2 className="text-sm font-medium text-neutral-300">최근 게시물</h2>
        <div className="mt-3">
          <MediaGrid media={media} />
        </div>
      </div>
    </div>
  );
}

export default function InstagramPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">인스타그램</h1>
          <p className="mt-1 text-sm text-neutral-500">톨리 공식 계정의 팔로워 · 도달 · 게시물 반응</p>
        </div>
        <RefreshButton />
      </div>

      <InstagramContent />
    </div>
  );
}
