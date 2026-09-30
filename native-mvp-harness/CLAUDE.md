# 주변(Zubyeon) 네이티브 MVP 모노레포 — 공통 작업 규칙

이 파일은 저장소 어디서 작업하든 먼저 적용되는 규칙이다. 폴더별 규칙은 각 폴더의 `CLAUDE.md`가 이어서 정한다.
근거 문서: 「주변 앱 개발 기술 결정서 v1.0」(2026-09-30). 이 파일과 결정서가 다르면 결정서를 따르고, 이 파일을 고친다.

## 1. 서비스 한 줄

동네 "이장님"이 초대코드로 연결된 주민끼리 소개해 주는 **신뢰 기반 지역 연결 서비스**.
MVP는 무료로 실제 사용 반응을 검증하는 것이 목적이다.

## 2. 무엇을 어디에 만드는가 (결정 사항, 임의 변경 금지)

| 접점 | 기술 | 범위 |
|---|---|---|
| `apps/android` | Kotlin · Jetpack Compose · Material 3 · Hilt | 로그인, 프로필, 초대·이장 관계, 매칭, 주변인 테스트, 채팅, 신고·차단, 설정·탈퇴 |
| `apps/ios` | Swift · SwiftUI · async/await | Android와 동일 기능 |
| `apps/web` | React · TypeScript · Vite · React Router · Tailwind | 공용 웹뷰(공지·약관·개인정보·FAQ·문의·피드백) + 공개 웹(정책, 계정 삭제 요청, 인증 복귀·앱 링크) |
| `apps/admin` | React · TypeScript · Vite · TanStack Query · RHF · Zod · shadcn/ui | 회원·신고·문의, 문항·콘텐츠·운영 설정, 감사 기록·지표 |
| `supabase` | Postgres · RLS · DB 함수/RPC · Edge Functions(TypeScript/Deno) · Storage · Realtime | 공통 백엔드 |
| `packages/api-contract` | OpenAPI 3.1 · JSON Schema · 예제 JSON | 앱·웹·서버가 공유하는 유일한 계약 |
| `packages/design-tokens` | JSON 토큰 → Compose/SwiftUI/Tailwind 생성물 | 디자인 단일 출처 |

푸시 FCM(iOS는 APNs 연결) · 메일 Resend + Supabase Custom SMTP · 웹 호스팅 Cloudflare Workers Static Assets · 앱 오류 Crashlytics.

## 3. MVP에서 하지 않는 것

결제·유료 구독·포인트·리워드 정산, 가게 홍보, 네이버 로그인, Capacitor/PWA, 동영상 업로드, 별도 Spring/Next API 서버.
기존 웹(`lsyong941214/YA-YourArround-`)에 이 기능들의 코드와 계획이 있어도 **새 요구로 승계하지 않는다.**
요청받지 않은 새 외부 서비스·유료 플랜을 도입하지 않는다.

## 4. 반드시 먼저 읽을 문서

| 작업 | 문서 |
|---|---|
| 구조·화면 분류·변경 관리 | `docs/ARCHITECTURE.md` |
| 용어·역할·상태 전이 | `docs/DOMAIN_MODEL.md` |
| API 추가/변경 | `docs/API_CONTRACT.md` → `packages/api-contract` |
| 로그인·세션·권한 | `docs/AUTH_SESSION.md` |
| 앱↔웹뷰 통신 | `docs/BRIDGE_SPEC.md` |
| 화면·컴포넌트 | `docs/DESIGN_SYSTEM.md` |
| 테스트·배포·운영 | `docs/QA_RELEASE.md` |

반복 작업은 `.claude/skills/`의 절차를 따른다: `add-api-endpoint`, `port-screen`, `add-bridge-command`, `supabase-migration`.

## 5. 절대 규칙

1. **계약 먼저.** 앱이 쓰는 API는 `packages/api-contract`에 먼저 정의하고, 서버와 두 앱이 같은 커밋의 계약을 구현한다.
2. **권한은 서버에서.** 버튼 숨김은 권한이 아니다. 모든 업무 요청은 Edge Function과 RLS에서 당사자·상태·차단·정지를 다시 확인한다.
3. **원자적 변경은 DB 함수 하나로.** Edge Function에서 DB API를 여러 번 부르는 것은 트랜잭션이 아니다.
4. **외부 호출(푸시·메일)은 트랜잭션 밖.** 대기 기록(outbox)을 같은 트랜잭션에 저장하고 별도 함수가 발송한다.
5. **비밀값 노출 금지.** `service_role` 키·서버 secret을 앱·웹 코드, 로그, 커밋에 넣지 않는다. 장기 토큰을 URL·웹 페이지로 넘기지 않는다.
6. **테이블은 화면 계약이 아니다.** 앱은 업무 데이터를 Edge API로 읽고 쓴다. Realtime은 "바뀌었다"는 신호로만 쓰고 데이터는 API로 다시 조회한다.
7. **API는 필드 추가 우선.** 이미 배포된 필드의 의미·타입을 바꾸거나 지우지 않는다. 호환이 깨지면 새 버전 경로.
8. **원격 설정은 앱이 이미 지원하는 범위만.** 스토어 심사를 우회하거나 새 코드를 내려받는 용도로 쓰지 않는다.
9. **Android와 iOS는 같은 의미, 다른 관례.** 기능 의미·오류·로딩·빈 화면·재시도는 맞추고, 뒤로가기·키보드·권한 UI는 OS 관례를 따른다.
10. **개인정보 최소화.** 정밀 위치, 성적 지향 등은 수집하지 않는다. 푸시·로그·피드백에 채팅 원문, 비밀번호, 토큰을 넣지 않는다.

## 6. 명명·언어 규칙

- 기존 웹의 "단어당 최대 4자" 규칙은 **새 코드에 적용하지 않는다.** 각 플랫폼 표준 스타일을 따른다.
  - Kotlin/Swift: 타입 `PascalCase`, 함수·변수 `camelCase`
  - TypeScript: 변수 `camelCase`, 컴포넌트 `PascalCase`
  - DB·API JSON 필드: `snake_case` 완전한 단어 (`resident_id`, `created_at`)
  - API enum 값: `snake_case` 문자열 (`pending_chief`)
- 도메인 용어는 `docs/DOMAIN_MODEL.md`의 용어표를 코드 이름과 사용자 문구에 똑같이 쓴다 (예: 주민=resident, 이장=chief, 주변인 테스트=blind_test).
- 사용자에게 보이는 문구는 한국어. 코드 주석은 한국어 가능, 식별자는 영어.
- 시간은 서버에 UTC(`timestamptz`)로 저장하고, 앱이 기기 시간대로 표시한다.

## 7. 작업 방식

- 한 번에 한 기능 단위로 끝까지 연결한다: 계약 → 마이그레이션/DB 함수 → Edge Function → 테스트 → Android → iOS.
- 구현 순서(결정서 9장): ① 로그인·본인 프로필 → ② 다른 사용자 접근 차단 → ③ 초대코드 1회 사용·관계 생성 → ④ 중간 실패 전체 취소·동시 요청 검증 → 매칭 → 주변인 테스트 → 채팅 → 신고.
- 변경 후 해당 영역의 빠른 검사(lint·타입·단위 테스트)를 직접 돌리고 결과를 보고한다. 못 돌린 검사는 못 돌렸다고 쓴다(iOS 빌드는 Mac 필요).
- 권한 경계와 실패 동작은 개발자가 설명·재현할 수 있게 테스트로 남긴다.
- 커밋 메시지는 한국어 요약 + 영향 범위(`[android]`, `[ios]`, `[web]`, `[admin]`, `[supabase]`, `[contract]`, `[docs]`).
- 공통 계약에 영향을 주는 플랫폼 변경은 PR 설명에 "계약 영향"을 적고 Android·iOS·백엔드 담당 모두 리뷰한다.

## 8. 기존 웹을 참고할 때

기존 웹은 **화면 구성과 사용자 흐름을 파악하는 자료**다. 다음은 복사하지 않는다:
합성 이메일(`@jubyeon.local`)과 이메일 확인 생략, 목업 데이터·죽은 라우트, 하드코딩 포인트 배지, 신고 3건 자동 정지 같은 자동 확정 로직,
클라이언트에서 테이블을 직접 읽고 쓰는 구조, `alter_*.sql` 수동 적용 방식.
