# tolli_admin

tolli_FE의 PostHog 이벤트를 시각화하고 퍼널 분석·스토어 현황을 보여주는 내부용 관리자 대시보드.

**배포**: https://tolli-admin.vercel.app

## 설정

1. 의존성 설치: `pnpm install`
2. `.env`에 다음 값을 채운다 (Vercel에 배포할 때는 프로젝트 Settings → Environment Variables에도 동일하게 등록):
   - `ADMIN_DASHBOARD_PASSWORD` — 대시보드 접속용 공유 비밀번호
   - `SESSION_SECRET` — `openssl rand -base64 32`로 생성한 랜덤 문자열
   - `POSTHOG_PERSONAL_API_KEY` — PostHog 유저 설정에서 **Query Read** 권한만으로 발급한 Personal API Key
   - `POSTHOG_PROJECT_ID` — PostHog 프로젝트 ID (PostHog 대시보드 URL의 `/project/<id>`)
   - `POSTHOG_HOST` — 기본값 `https://us.i.posthog.com` (US 클라우드가 아니면 변경)
   - `APPLE_APP_ID` — App Store 앱의 숫자 ID (평점/리뷰 수 조회용, 인증 불필요)
   - `APPLE_STORE_COUNTRY` — 기본값 `kr`
   - `GOOGLE_PLAY_PACKAGE_NAME` — Google Play 앱 패키지명 (리뷰 조회용)
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — Play Console에서 발급한 서비스 계정 JSON (한 줄 문자열)
   - `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_API_PRIVATE_KEY` — App Store 다운로드 수 조회용. App Store Connect → Users and Access → Integrations → App Store Connect API에서 **Account Holder**가 발급 (최초 리포트 요청에 Admin 권한이 필요해서). 발급 시 받는 .p8 키 내용을 `APPLE_API_PRIVATE_KEY`에 `\n`으로 개행을 escape해서 한 줄로 넣는다.
3. `pnpm dev` 실행 후 http://localhost:3000 접속

## 구조

- `src/proxy.ts` — 세션 쿠키를 검증해 `/login`으로 리다이렉트하는 인증 체크
- `src/lib/session.ts` — 서명된 세션 쿠키 발급/검증 (DAL)
- `src/lib/posthog/` — PostHog Query API 호출 래퍼 및 트렌드/퍼널/속성별 분포/이벤트 쿼리 빌더
- `src/lib/funnels/definitions.ts` — 퍼널 스텝 정의 (실제 capture() 이벤트만 사용, 근거는 아래 참고)
- `src/lib/dateRange.ts`, `src/components/funnel/DateRangePicker.tsx` — 퍼널 페이지의 오늘/어제/최근 7일/최근 30일/특정일 필터
- `src/lib/appstore/client.ts` — App Store 평점(iTunes Lookup API, 무인증)
- `src/lib/appstore/analyticsReports.ts` — App Store 다운로드 수 (Analytics Reports API, ES256 JWT 인증)
- `src/lib/playstore/` — Google Play 리뷰 (서비스 계정 JWT 인증)
- `src/components/funnel/FunnelChart.tsx` — ECharts 트라페조이드 퍼널 차트
- `src/components/charts/BreakdownBar.tsx` — 속성별 분포(로그인 방법, 기기, 이탈 지점 등) 바 차트
- `src/app/(dashboard)/` — 로그인 후 대시보드 페이지 (개요, 퍼널 3종, 스토어 현황, 이벤트 탐색기)

## 테스트

```bash
pnpm test:e2e
```

## 참고

- GA4는 v1 범위에서 제외했다 — tolli_FE의 GA4 설정은 커스텀 이벤트가 0개이고 자동 pageview만 발생해, PostHog의 자동 `$pageview`와 100% 중복되기 때문. 나중에 GA4의 유입 채널(소스/매체) 데이터가 필요해지면 `src/lib/datasources/ga4.ts` 형태로 추가할 수 있게 구조를 열어뒀다.
- 퍼널 스텝은 커스텀 이벤트로만 구성한다 — 온보딩/학습 화면 상당수는 클라이언트 전환이라 `$pageview`가 실제로 안 잡혀서, 대신 학습 중단 지점은 `study_abandoned`의 `abandoned_at_step` 속성으로 별도 시각화한다.
- 앱스토어 다운로드 수는 Finance 권한이 아니라 **Analytics Reports API**(Sales and Reports 권한)로 받는다 — 최초 1회 `ONGOING` 리포트 요청을 등록해두면(멱등, 이미 있으면 재사용) 24~48시간 후 첫 데이터가 생기고, 그 전까지는 `/store` 페이지에 대기 안내가 뜬다.
- 플레이스토어 다운로드 수는 아직 연동하지 않았다 — 공식 API에 다운로드 수 엔드포인트가 없어 BigQuery 익스포트가 필요하다.
