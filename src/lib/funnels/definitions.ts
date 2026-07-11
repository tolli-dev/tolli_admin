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
 * Steps here are event-only, on purpose. The original version backfilled gaps
 * with `$pageview` + `$current_url` matches, but a live check against real
 * PostHog data (2026-07) showed the onboarding slides and study steps are
 * client-side transitions that never fire a full pageview in production —
 * every one of those steps came back at 0, which just confused readers.
 * Only screens with real traffic (`/dashboard`) or a dedicated capture()
 * call are trustworthy funnel steps right now.
 */
export const FUNNELS: FunnelDefinition[] = [
  {
    id: "onboarding",
    title: "가입 퍼널",
    description: "로그인부터 가입 완료, 앱 진입까지",
    steps: [
      { type: "event", event: "login_clicked", label: "로그인 시도" },
      {
        type: "event",
        event: "login_success",
        label: "로그인 성공 (신규 유저)",
        eventProperties: [{ key: "is_new_user", value: true }],
      },
      { type: "event", event: "signup_complete", label: "가입 완료" },
      { type: "pageview", label: "앱 첫 화면 도착", urlPattern: "/dashboard" },
    ],
  },
  {
    id: "study",
    title: "학습 완료 퍼널",
    description: "구절 학습을 시작해서 끝까지 마치는 비율",
    steps: [
      { type: "event", event: "study_started", label: "학습 시작" },
      { type: "event", event: "recording_started", label: "낭독 녹음 시작" },
      { type: "event", event: "recording_completed", label: "낭독 녹음 완료" },
      { type: "event", event: "study_completed", label: "학습 완료" },
    ],
  },
  {
    id: "recall",
    title: "복습 재참여 퍼널",
    description: "저장한 구절을 다시 꺼내서 복습을 끝내는 비율",
    steps: [
      { type: "event", event: "recall_exposed", label: "복습 목록 확인" },
      { type: "event", event: "recall_clicked", label: "복습 시작 클릭" },
      { type: "event", event: "recall_completed", label: "복습 완료" },
    ],
  },
];

export function getFunnelById(id: string) {
  return FUNNELS.find((funnel) => funnel.id === id);
}

const EVENT_LABELS = new Map(
  FUNNELS.flatMap((funnel) =>
    funnel.steps.filter((step) => step.type === "event").map((step) => [step.event, step.label] as const),
  ),
);

export function getEventLabel(eventName: string) {
  if (eventName === "$pageview") return "화면 조회";
  return EVENT_LABELS.get(eventName) ?? eventName;
}
