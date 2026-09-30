# API_CONTRACT — 공통 API 계약 규칙

Android·iOS·웹·관리자 웹은 같은 업무 API를 쓴다. 계약의 원본은 `packages/api-contract/`이며 이 문서는 작성 규칙이다.

## 1. 파일 구성

```
packages/api-contract/
├─ openapi.yaml            # OpenAPI 3.1 — 경로, 요청/응답, 오류 코드
├─ schemas/*.json          # JSON Schema (openapi.yaml에서 $ref)
├─ examples/<operationId>/ # 성공·실패 예제 JSON (최소 1개씩)
├─ bridge/*.json           # 브리지 명령 스키마 (docs/specs/SPEC_05_BRIDGE.md)
└─ CHANGELOG.md            # 계약 변경 이력 (추가/폐기 예정/버전)
```

- 모든 operation에 `operationId`(camelCase, 예: `acceptMatchRequest`)와 상태 전이 설명을 적는다.
- 예제 JSON은 계약 테스트에서 스키마 검증을 통과해야 한다(CI).

## 2. 경로와 서버 구성

- 기본 주소: `https://<project>.supabase.co/functions/v1/api` 아래 `/v1/...`
- Edge Function 하나(`api`)가 라우터로 경로를 나눈다. 기능별 파일은 `supabase/functions/api/routes/`.
- 자원 중심 경로 + 상태 전이는 동사 하위 경로:
  - 계정·프로필: `GET /v1/me`, `PATCH /v1/me/profile`, `PUT /v1/me/profile-visibility`, `GET /v1/me/profile-viewers`
  - 입력 보조: `GET /v1/regions?q=` (시군구 검색), `GET /v1/companies?q=` (회사명 검색)
  - 초대: `POST /v1/invites/batch` (번호 목록 → 번호별 코드), `GET /v1/invites`, `POST /v1/invites/{id}/revoke`, `POST /v1/invites/redeem` (code + 본인 번호)
  - 이장 네트워크: `GET /v1/chief-links`, `DELETE /v1/chief-links/{chief_id}`, `GET /v1/chiefs/{id}` (프로필), `GET /v1/chiefs/{id}/residents` (요약 카드)
  - 소개 요청·대기열: `POST /v1/intro-requests`, `POST /v1/intro-requests/{id}/decision`, `POST /v1/queue-entries`, `DELETE /v1/queue-entries/{id}`, `GET /v1/queue?chief_id=` (연결된 이장들의 대기열)
  - 프로필 열람: `GET /v1/residents/{id}/profile` (공개 범위 적용), `POST /v1/profile-view-requests`, `POST /v1/profile-view-requests/{id}/decision`
  - 소개 제안: `POST /v1/proposals`, `POST /v1/proposals/{id}/chief-decision`, `POST /v1/proposals/{id}/resident-decision`, `POST /v1/proposals/{id}/cancel`, `GET /v1/proposals`
  - 주변인 테스트: `GET /v1/blind-tests/{id}`, `POST /v1/blind-tests/{id}/answers`, `POST /v1/blind-tests/{id}/actions`
  - 채팅: `GET /v1/chat-rooms`, `GET /v1/chat-rooms/{id}/messages?after=`, `POST /v1/chat-rooms/{id}/messages`
  - 안전: `POST /v1/reports`, `POST /v1/blocks`, `DELETE /v1/blocks/{user_id}`
  - 설정·콘텐츠: `GET /v1/config`, `GET /v1/content/onboarding?kind=welcome|role_guide`, `GET /v1/public/notices` (공개), `/v1/admin/*` (관리자)
- 경로 세그먼트는 `kebab-case`, JSON 필드는 `snake_case`.

## 3. 공통 헤더

| 헤더 | 방향 | 필수 | 설명 |
|---|---|---|---|
| `Authorization: Bearer <access_token>` | 요청 | 인증 API | Supabase 세션 토큰 |
| `X-Request-Id` | 요청/응답 | 권장 | 클라이언트 UUID. 없으면 서버가 발급해 응답에 넣음 |
| `Idempotency-Key` | 요청 | **모든 상태 변경 POST/PATCH/DELETE** | 작업별 UUID. 재시도해도 같은 값 |
| `X-App-Version` / `X-Platform` | 요청 | 필수 | `1.2.0` / `android`·`ios`·`web`·`admin` |
| `X-Config-Version` | 요청 | 선택 | 피드백·오류 추적용 |

중복 방지: 서버는 (사용자, 작업 종류, `Idempotency-Key`)를 DB 유일 제약으로 저장하고, 같은 키의 재요청에는 처음 결과를 그대로 돌려준다.

## 4. 응답 형식

성공
```json
{ "data": { ... }, "meta": { "next_cursor": "opaque", "request_id": "uuid" } }
```

실패 (HTTP 4xx/5xx)
```json
{
  "error": {
    "code": "proposal_invalid_state",
    "message": "이미 처리된 요청이에요.",
    "retryable": false,
    "request_id": "uuid",
    "details": { "current_status": "matched" }
  }
}
```
- `message`는 사용자에게 그대로 보여도 되는 한국어. 내부 사유·SQL 오류를 넣지 않는다.
- 앱은 `code`로 분기하고, 모르는 `code`는 `message` 표시 + `retryable`에 따라 재시도 버튼.

## 5. 오류 코드 초기 목록

| code | HTTP | retryable | 상황 |
|---|---|---|---|
| `unauthenticated` | 401 | false | 토큰 없음/만료(앱은 갱신 후 1회 재시도) |
| `forbidden` | 403 | false | 당사자 아님, 권한 없음 |
| `account_restricted` | 403 | false | 정지·영구 정지 → `account.restricted` 화면 |
| `blocked_relation` | 403 | false | 차단 관계 |
| `not_found` | 404 | false | 없음 또는 볼 권한 없음(구분하지 않음) |
| `validation_failed` | 422 | false | 입력 오류, `details.fields` |
| `invalid_state` / `<domain>_invalid_state` | 409 | false | 현재 상태에서 불가한 전이 |
| `duplicate_request` | 409 | false | 같은 작업 중복(키 다름) |
| `limit_exceeded` | 429 | false | 신청 한도 등 서버 설정 한도 |
| `rate_limited` | 429 | true | 요청 과다, `Retry-After` |
| `feature_disabled` | 503 | false | 원격 설정으로 기능 중단·점검 |
| `upgrade_required` | 426 | false | `min_app_version` 미만 |
| `content_blocked` | 422 | false | 금칙어 |
| `invite_invalid` | 422 | false | 코드 없음·만료·사용됨·**번호 불일치**(구분하지 않음) |
| `invite_locked` | 423 | false | 번호 불일치 횟수 초과로 코드 잠김 |
| `phone_invalid` | 422 | false | 휴대폰 번호 형식 오류 |
| `profile_view_required` | 403 | false | 승인제 주민 — 열람 허락이 먼저 필요 |
| `view_request_pending` | 409 | false | 이미 열람 요청 대기 중 |
| `view_request_cooldown` | 429 | false | 거절 후 재요청 대기 기간 |
| `chief_link_required` | 403 | false | 연결되지 않은 이장의 주민·대기열 |
| `queue_entry_busy` | 409 | false | 해당 주민이 이미 다른 제안 진행 중 |
| `profile_incomplete` | 422 | false | 대기열 등록에 필요한 프로필 항목 누락 |
| `internal_error` | 500 | true | 서버 오류 |

## 6. 데이터 규칙

- 시간: ISO 8601 UTC 문자열(`2026-09-30T02:29:08Z`). 표시 변환은 앱.
- ID: UUID 문자열. 순번 노출 금지.
- 목록: 커서 페이지네이션(`limit` 기본 20·최대 50, `cursor`). 정렬 기준을 operation 설명에 명시.
- enum: `snake_case` 문자열. 클라이언트는 **알 수 없는 값을 `unknown`으로** 받아 안전하게 표시(크래시 금지).
- null과 필드 없음을 구분하지 않는다(둘 다 "값 없음"). 클라이언트는 새로 추가된 모르는 필드를 무시한다.
- 이미지: 응답에는 짧은 유효기간 signed URL + `expires_at`. 업로드는 `POST /v1/uploads`로 경로·업로드 URL을 받아 올린 뒤, 해당 업무 API에 경로를 등록.

## 7. 호환성

- **추가만 자유.** 선택 필드·새 enum 값·새 operation 추가는 같은 버전.
- 의미 변경·삭제·필수화는 금지. 필요하면 `/v2/...` 경로를 새로 만들고, `CHANGELOG.md`에 폐기 예정 표시 후 두 버전을 함께 운영.
- 새 enum 값을 추가할 때는 이전 앱이 `unknown`으로 받아도 문제가 없는지 PR에 적는다.
- Android 신규/iOS 이전 버전(및 반대) 조합에서 동작해야 한다(`docs/specs/SPEC_07_QA_RELEASE.md`).

## 8. 개인정보가 들어오는 요청

- `POST /v1/invites/batch`, `POST /v1/invites/redeem`의 휴대폰 번호는 **요청 본문에서만** 받는다(URL·쿼리 금지). 서버는 HMAC 계산에만 쓰고 저장·로그·오류 메시지·응답에 넣지 않는다.
- 요청 로그 미들웨어는 이 두 경로의 본문을 기록하지 않는다(테스트로 확인).
- `GET /v1/residents/{id}/profile`은 공개 범위에 따라 응답 필드가 달라진다: 허락 전 `{ age, height_cm, region_name, visibility: "summary" }`, 허락 후 전체. 클라이언트는 `visibility` 값으로 화면을 나눈다.

## 9. 처리 순서 (예: 소개 제안 주민 수락)

앱 요청 → Edge Function: 토큰·헤더·입력 스키마 검증 → DB 함수 `respond_proposal(p_proposal_id, p_decision, p_idempotency_key)` 호출
→ DB 함수 안: 당사자·현재 상태·차단·정지·이장 연결 확인 → 응답 기록 → 두 주민 모두 수락이면 `matched`(또는 `testing`) + 대기열 항목 갱신 + 대화방 생성 + `notification_outbox` 기록 (한 트랜잭션)
→ 공통 응답 형식으로 반환 → 별도 발송 함수가 outbox를 읽어 FCM 발송·재시도.
