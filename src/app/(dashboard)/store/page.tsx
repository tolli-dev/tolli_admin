import { fetchAppStoreSummary } from "@/lib/appstore/client";
import { fetchAppDownloadsTotal, type DownloadsReportStatus } from "@/lib/appstore/analyticsReports";
import { fetchPlayStoreReviews } from "@/lib/playstore/client";
import { KpiTile } from "@/components/charts/KpiTile";
import { ReviewList } from "@/components/store/ReviewList";
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
          "생성된 서비스 계정에 '앱 정보 보기 및 대량 리포트 다운로드' 권한 부여",
          "서비스 계정 JSON 키 발급 → .env의 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON에 한 줄 JSON 문자열로 붙여넣기",
          ".env에 GOOGLE_PLAY_PACKAGE_NAME=com.example.app 추가",
        ]}
      />
    );
  }

  try {
    const reviews = await fetchPlayStoreReviews(20);
    const averageOfSample =
      reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-neutral-400">Google Play — 최근 리뷰 {reviews.length}건</p>
          <p className="text-sm text-neutral-300">최근 평균 {averageOfSample.toFixed(1)}점</p>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          다운로드 수는 Play Console 통계나 연결된 BigQuery 익스포트로만 볼 수 있어서 아직 연동 안 함. 위
          평균도 최근 리뷰 샘플 기준이라 스토어에 표시되는 전체 평균과는 다를 수 있어요.
        </p>
        <div className="mt-4">
          <ReviewList reviews={reviews} />
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
