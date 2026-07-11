# tolli_admin

tolli_FE의 PostHog 이벤트를 시각화하고 퍼널 분석을 보여주는 내부용 관리자 대시보드.

## 설정

1. 의존성 설치: `pnpm install`
2. `.env.local`에 다음 값을 채운다:
   - `ADMIN_DASHBOARD_PASSWORD` — 대시보드 접속용 공유 비밀번호
   - `SESSION_SECRET` — `openssl rand -base64 32`로 생성한 랜덤 문자열
   - `POSTHOG_PERSONAL_API_KEY` — PostHog 유저 설정에서 **Query Read** 권한만으로 발급한 Personal API Key
   - `POSTHOG_PROJECT_ID` — PostHog 프로젝트 ID (PostHog 대시보드 URL의 `/project/<id>`)
   - `POSTHOG_HOST` — 기본값 `https://us.i.posthog.com` (US 클라우드가 아니면 변경)
3. `pnpm dev` 실행 후 http://localhost:3000 접속

## 구조

- `src/proxy.ts` — 세션 쿠키가 없으면 `/login`으로 리다이렉트하는 낙관적 인증 체크
- `src/lib/session.ts` — 서명된 세션 쿠키 발급/검증 (DAL, 실제 인증 검증은 여기서)
- `src/lib/posthog/` — PostHog Query API 호출 래퍼 및 트렌드/퍼널/이벤트 쿼리 빌더
- `src/lib/funnels/definitions.ts` — 퍼널 스텝 정의 (커스텀 이벤트 + `$pageview` URL 패턴 혼합)
- `src/app/(dashboard)/` — 로그인 후 대시보드 페이지 (개요, 퍼널 3종, 이벤트 탐색기)

## 테스트

```bash
pnpm test:e2e
```

## 참고

GA4는 v1 범위에서 제외했다 — tolli_FE의 GA4 설정은 커스텀 이벤트가 0개이고 자동 pageview만 발생해, PostHog의 자동 `$pageview`와 100% 중복되기 때문. 나중에 GA4의 유입 채널(소스/매체) 데이터가 필요해지면 `src/lib/datasources/ga4.ts` 형태로 추가할 수 있게 구조를 열어뒀다.
