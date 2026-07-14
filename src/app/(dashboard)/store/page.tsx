import { fetchAppStoreSummary } from "@/lib/appstore/client";
import { fetchAppDownloadsTotal, type DownloadsReportStatus } from "@/lib/appstore/analyticsReports";
import { fetchPlayStoreReviews } from "@/lib/playstore/client";
import { fetchPlayStoreSummary } from "@/lib/playstore/listing";
import { fetchPlayStoreStats, type PlayStatsStatus } from "@/lib/playstore/bulkReports";
import { KpiTile } from "@/components/charts/KpiTile";
import { ReviewList } from "@/components/store/ReviewList";
import { StarDistribution } from "@/components/store/StarDistribution";
import { StoreSetupNotice } from "@/components/store/StoreSetupNotice";
import { RefreshButton } from "@/components/ui/refresh-button";

export const revalidate = 3600;

async function AppStoreSection() {
  if (!process.env.APPLE_APP_ID) {
    return (
      <StoreSetupNotice
        title="App Store"
        steps={[
          "App Store Connect에서 앱 페이지 URL의 숫자 ID(예: id1234567890)를 확인",
          ".env에 APPLE_APP_ID=1234567890 추가",
          "필요하면 APPLE_STORE_COUNTRY도 추가 (기본값 kr)",
        ]}
      />
    );
  }

  try {
    const summary = await fetchAppStoreSummary();
    const downloads: DownloadsReportStatus = await fetchAppDownloadsTotal(process.env.APPLE_APP_ID).catch(
      (error) => ({
        status: "pending",
        message: error instanceof Error ? error.message : "다운로드 수를 가져오는 데 실패했어요.",
      }),
    );

    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <p className="text-sm text-neutral-400">{summary.appName} (App Store)</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500">전체 평점</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-50">{summary.averageRating.toFixed(1)}</p>
            <p className="text-xs text-neutral-500">{summary.ratingCount.toLocaleString("ko-KR")}개 평가</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">현재 버전 평점</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-50">
              {summary.currentVersionRating.toFixed(1)}
            </p>
            <p className="text-xs text-neutral-500">
              {summary.currentVersionRatingCount.toLocaleString("ko-KR")}개 평가
            </p>
          </div>
        </div>
        <a
          href={summary.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs text-neutral-500 underline"
        >
          App Store에서 보기
        </a>
        {downloads.status === "ready" ? (
          <p className="mt-4 text-sm text-neutral-300">
            총 다운로드 수{" "}
            <span className="font-semibold text-neutral-50">
              {downloads.totalDownloads.toLocaleString("ko-KR")}
            </span>
          </p>
        ) : (
          <p className="mt-4 text-xs text-neutral-600">{downloads.message}</p>
        )}
      </div>
    );
  } catch (error) {
    return (
      <StoreSetupNotice
        title="App Store"
        steps={[error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."]}
      />
    );
  }
}

async function PlayStoreSection() {
  if (!process.env.GOOGLE_PLAY_PACKAGE_NAME || !process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    return (
      <StoreSetupNotice
        title="Google Play"
        steps={[
          "Google Play Console → 설정 → API 액세스에서 서비스 계정 생성 (또는 GCP에서 만든 서비스 계정 연결)",
          "사용자 및 권한 → 해당 계정 → '계정 권한' 탭에서 '앱 정보 보기 및 보고서 일괄 다운로드(읽기 전용)' 부여",
          "서비스 계정 JSON 키 발급 → .env의 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON에 한 줄 JSON 문자열로 붙여넣기",
          ".env에 GOOGLE_PLAY_PACKAGE_NAME=com.example.app 추가",
          "Play Console → 다운로드 리포트에 표시된 gs:// 버킷 이름을 .env의 GOOGLE_PLAY_REPORTS_BUCKET에 추가",
        ]}
      />
    );
  }

  try {
    const [reviews, summary, statsStatus] = await Promise.all([
      fetchPlayStoreReviews(20),
      fetchPlayStoreSummary(),
      fetchPlayStoreStats().catch(
        (error): PlayStatsStatus => ({
          status: "pending",
          message: error instanceof Error ? error.message : "통계를 가져오는 데 실패했어요.",
        }),
      ),
    ]);

    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <p className="text-sm text-neutral-400">tolli - 톨리 (Google Play)</p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500">전체 평점</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-50">
              {summary.averageRating?.toFixed(1) ?? "—"}
            </p>
            <p className="text-xs text-neutral-500">
              {summary.ratingCount !== null ? `${summary.ratingCount.toLocaleString("ko-KR")}개 평가` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">다운로드</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-50">
              {statsStatus.status === "ready" && statsStatus.stats.totalUserInstalls !== null
                ? statsStatus.stats.totalUserInstalls.toLocaleString("ko-KR")
                : (summary.installs ?? "—")}
            </p>
            <p className="text-xs text-neutral-500">
              {statsStatus.status === "ready" && statsStatus.stats.totalUserInstalls !== null
                ? `현재 활성 기기 ${statsStatus.stats.activeDeviceInstalls?.toLocaleString("ko-KR") ?? "—"}`
                : "스토어 표시값 (구간)"}
            </p>
          </div>
        </div>

        <a
          href={summary.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs text-neutral-500 underline"
        >
          Google Play에서 보기
        </a>

        {statsStatus.status === "ready" ? (
          <div className="mt-5">
            <StarDistribution distribution={statsStatus.stats.starDistribution} />
            {statsStatus.stats.asOf && (
              <p className="mt-3 text-xs text-neutral-600">
                별점 분포·설치 수는 Play Console 리포트 기준 · {statsStatus.stats.asOf}까지 집계
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs text-neutral-600">별점 분포는 아직 못 가져와요. {statsStatus.message}</p>
        )}

        <div className="mt-5 border-t border-neutral-800 pt-4">
          <p className="text-xs text-neutral-500">최근 리뷰 {reviews.length}건 (글이 달린 리뷰만)</p>
          <div className="mt-3">
            <ReviewList reviews={reviews} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <StoreSetupNotice
        title="Google Play"
        steps={[error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."]}
      />
    );
  }
}

export default function StorePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">스토어 현황</h1>
          <p className="mt-1 text-sm text-neutral-500">App Store / Google Play 평점과 리뷰</p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AppStoreSection />
        <PlayStoreSection />
      </div>
    </div>
  );
}
