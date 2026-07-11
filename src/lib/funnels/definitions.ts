export type FunnelStepDef =
  | {
      type: "event";
      event: string;
      label: string;
      eventProperties?: { key: string; value: string | number | boolean; operator?: string }[];
    }
  | {
      type: "pageview";
      label: string;
      urlPattern: string;
      operator?: "icontains" | "regex" | "exact";
    };

export type FunnelDefinition = {
  id: string;
  title: string;
  description: string;
  steps: FunnelStepDef[];
};

/**
 * Roughly half the steps in each flow have no dedicated PostHog capture() call.
 * Those steps are backfilled with the autocaptured `$pageview` event filtered by
 * `$current_url`, so the funnel still covers every screen without requiring new
 * instrumentation in tolli_FE.
 */
export const FUNNELS: FunnelDefinition[] = [
  {
    id: "onboarding",
    title: "온보딩 → 가입 퍼널",
    description: "첫 방문부터 가입 완료, 알림/권한 설정까지",
    steps: [
      { type: "event", event: "login_clicked", label: "로그인 버튼 클릭" },
      {
        type: "event",
        event: "login_success",
        label: "로그인 성공 (신규)",
        eventProperties: [{ key: "is_new_user", value: true }],
      },
      { type: "pageview", label: "약관 동의", urlPattern: "/terms" },
      { type: "pageview", label: "웰컴 화면", urlPattern: "/welcome" },
      { type: "pageview", label: "튜토리얼", urlPattern: "/signup/tutorial" },
      { type: "event", event: "signup_complete", label: "닉네임 설정 완료" },
      { type: "pageview", label: "가입 인사", urlPattern: "/signup/greeting" },
      { type: "pageview", label: "알림 설정", urlPattern: "/signup/set-alarm$", operator: "regex" },
      { type: "pageview", label: "알림 시간 설정", urlPattern: "/signup/set-alarm-time$", operator: "regex" },
      { type: "pageview", label: "권한 요청", urlPattern: "/signup/permissions" },
      { type: "pageview", label: "대시보드 도착", urlPattern: "/dashboard" },
    ],
  },
  {
    id: "study",
    title: "학습 플로우 퍼널",
    description: "구절 학습 시작부터 완료까지 (step 0~7)",
    steps: [
      { type: "event", event: "study_started", label: "학습 시작 (step0)" },
      { type: "pageview", label: "step1", urlPattern: "/1$", operator: "regex" },
      { type: "pageview", label: "step2 안내", urlPattern: "step2-intro" },
      { type: "pageview", label: "step2", urlPattern: "/2$", operator: "regex" },
      { type: "pageview", label: "step3", urlPattern: "/3$", operator: "regex" },
      { type: "pageview", label: "step4", urlPattern: "/4$", operator: "regex" },
      { type: "pageview", label: "step5", urlPattern: "/5$", operator: "regex" },
      { type: "pageview", label: "recall 안내", urlPattern: "recall-intro" },
      { type: "pageview", label: "step6", urlPattern: "/6$", operator: "regex" },
      { type: "pageview", label: "record 안내", urlPattern: "record-intro" },
      { type: "event", event: "recording_started", label: "녹음 시작 (step7)" },
      { type: "event", event: "recording_completed", label: "녹음 완료 (step7)" },
      { type: "pageview", label: "다시 듣기", urlPattern: "/listen" },
      { type: "event", event: "study_completed", label: "학습 완료" },
    ],
  },
  {
    id: "recall",
    title: "리콜 재참여 루프",
    description: "저장된 구절 노출부터 재학습 완료까지",
    steps: [
      { type: "event", event: "recall_exposed", label: "리콜 목록 노출" },
      { type: "event", event: "recall_clicked", label: "리콜 클릭" },
      { type: "event", event: "recall_completed", label: "리콜 완료" },
    ],
  },
];

export function getFunnelById(id: string) {
  return FUNNELS.find((funnel) => funnel.id === id);
}
