# QA_RELEASE — 테스트, 배포, 운영 기준

## 1. 지인 배포 전 통과 기준

| 영역 | 확인 항목 |
|---|---|
| 인증·권한 | 4종 로그인 × 2개 OS / 이메일 인증·비밀번호 재설정·계정 연결·해제·탈퇴 / 타 사용자 데이터 접근 거절 / 일반 계정의 관리자 API 거절 |
| 일관성·호환 | 초대 코드·매칭 수락·메시지 전송 중복 방지(같은 키 재시도, 동시 요청) / Android 신규 + iOS 이전 버전, 그 반대 조합 |
| 복구·안전 | 네트워크 끊김·앱 강제 종료·재연결 후 게임·채팅 복구 / 차단·정지 직후 신규 요청·전송·구독 제한 |
| 콘텐츠·기기 | 진행 중 테스트가 있을 때 문항 변경·롤백 / 알림 거부 상태 / 딥링크·앱 링크 / 글자 확대 200%·키보드 가림·뒤로가기 |
| 운영 복구 | 원격 설정·웹 버전 되돌리기 / DB·Storage 백업 복원 / 문의 접수→관리자 답변→앱 확인 |

각 항목은 `docs/test-results/YYYY-MM-DD-<영역>.md`에 기기·빌드·결과·재현 방법을 남긴다.

## 2. 자동 검사 (GitHub Actions)

| 작업 | 내용 | 트리거 |
|---|---|---|
| contract | OpenAPI lint, 예제 JSON 스키마 검증, 브리지 스키마 검증 | `packages/api-contract/**` |
| supabase | 로컬 Supabase 기동 → 마이그레이션 적용 → `supabase test db`(pgTAP 권한·함수 테스트) → Edge Function 테스트(`deno test`) | `supabase/**` |
| android | `./gradlew lint ktlintCheck testDevDebugUnitTest assembleDevDebug` | `apps/android/**` |
| web / admin | `pnpm -F web lint typecheck test build`, `pnpm -F admin ...` | 각 폴더 |
| ios | 초기에는 담당자 Mac에서 `xcodebuild test` 후 결과를 PR에 첨부 | 수동 |

PR 병합 조건: 영향받은 작업 모두 통과 + 계약 변경 시 Android·iOS·백엔드 리뷰.
운영 반영은 검증된 커밋을 승격(pilot 태그)한다. 운영 DB에 직접 SQL을 실행하지 않는다(긴급 시 사후 마이그레이션으로 기록).

## 3. 배포

| | 방법 | 주의 |
|---|---|---|
| Android | Google Play 내부 테스트 → 비공개 테스트 | 2023-11-13 이후 만든 개인 개발자 계정은 **공개 출시 전 12명이 14일 연속 참여한 비공개 테스트** 필요 |
| iOS | TestFlight 외부 테스트 | 빌드 유효기간 90일, 외부 테스트 첫 빌드는 심사 필요 |
| 웹뷰·공개 웹·관리자 | Cloudflare Workers Static Assets (서로 다른 프로젝트·도메인) | 이전 버전으로 즉시 되돌리기 가능하게 유지 |
| 서버 | `supabase db push`(마이그레이션) → `supabase functions deploy` | 계약 호환 확인 후 |

- 개발팀이 핵심 흐름 전체를 확인한 뒤 지인 5~10명부터 확대.
- 일반 앱 배포는 **주 1회 이내**로 묶는다. 보안·로그인 불가·앱 종료는 즉시 대응.
- 버전: 앱 `MAJOR.MINOR.PATCH`(두 앱 같은 번호 사용 권장) + 빌드 번호 증가.

## 4. 스토어 필수 항목

- 계정 삭제: 앱 안 + 앱 없이 가능한 웹 경로(Google Play 요구).
- 개인정보처리방침 URL(공개 웹 `/privacy`), 데이터 보안 양식(Play) / 개인정보 라벨(App Store).
- 소셜 로그인 제공 시 Sign in with Apple(iOS) — 이미 포함.
- 사용자 생성 콘텐츠(프로필·채팅)가 있으므로 신고·차단·운영 연락 수단이 앱 안에 있어야 한다(App Store 1.2).
- 만 19세 이상 연령 등급 설정.

## 5. 운영 기준 (초기값, 조정 가능)

| 항목 | 기준 |
|---|---|
| 무료 한도 점검 | Supabase(DB 500MB, Storage 1GB, Realtime 동시 200, 함수 월 50만), Resend(월 3,000·일 100), Actions 사용량 — **70% 도달 시 검토** |
| 백업 | Supabase Free는 자동 백업 없음 → 일 1회 + DB 변경 전 DB 덤프, Storage 별도 보관, 암호화, 복원 연습 |
| 이벤트 원본 보관 | 30일, 집계는 관리자 대시보드 |
| 오류 추적 | 앱 Crashlytics(화면 ID·`request_id` 커스텀 키), 서버 Supabase Logs(`request_id`로 연결) |
| 피드백 메타데이터 | 플랫폼·OS·앱 빌드·화면 ID·설정 버전·문항 버전·`request_id` |

가격·무료 한도는 2026-09-30 기준. 가입·배포 시 다시 확인한다.
