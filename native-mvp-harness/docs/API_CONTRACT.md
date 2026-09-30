# API_CONTRACT — 공통 API 계약 규칙

Android·iOS·웹·관리자 웹은 같은 업무 API를 쓴다. 계약의 원본은 `packages/api-contract/`이며 이 문서는 작성 규칙이다.

## 1. 파일 구성

```
packages/api-contract/
├─ openapi.yaml            # OpenAPI 3.1 — 경로, 요청/응답, 오류 코드
├─ schemas/*.json          # JSON Schema (openapi.yaml에서 $ref)
├─ examples/<operationId>/ # 성공·실패 예제 JSON (최소 1개씩)
├─ bridge/*.json           # 브리지 명령 스키마 (docs/BRIDGE_SPEC.md)
└─ CHANGELOG.md            # 계약 변경 이력 (추가/폐기 예정/버전)
```

- 모든 operation에 `operationId`(camelCase, 예: `acceptMatchRequest`)와 상태 전이 설명을 적는다.
- 예제 JSON은 계약 테스트에서 스키마 검증을 통과해야 한다(CI).

## 2. 경로와 서버 구성

- 기본 주소: `https://<project>.supabase.co/functions/v1/api` 아래 `/v1/...`
- Edge Function 하나(`api`)가 라우터로 경로를 나눈다. 기능별 파일은 `supabase/functions/api/routes/`.
- 자원 중심 경로 + 상태 전이는 동사 하위 경로:
  - `GET /v1/me`, `PATCH /v1/me/profile`
  - `POST /v1/invites`, `POST /v1/invites/redeem`
  - `POST /v1/match-requests`, `POST /v1/match-requests/{id}/chief-decision`, `POST /v1/match-requests/{id}/resident-decision`
  - `POST /v1/blind-tests`, `POST /v1/blind-tests/{id}/answers`, `POST /v1/blind-tests/{id}/actions`
  - `GET /v1/chat-rooms/{id}/messages?after=`, `POST /v1/chat-rooms/{id}/messages`
  - `POST /v1/reports`, `POST /v1/blocks`, `DELETE /v1/blocks/{user_id}`
  - `GET /v1/config`, `GET /v1/public/notices` (공개), `/v1/admin/*` (관리자)
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
    "code": "match_request_invalid_state",
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
- Android 신규/iOS 이전 버전(및 반대) 조합에서 동작해야 한다(`docs/QA_RELEASE.md`).

## 8. 처리 순서 (예: 매칭 수락)

앱 요청 → Edge Function: 토큰·헤더·입력 스키마 검증 → DB 함수 `accept_match_request(p_request_id, p_actor, p_idempotency_key)` 호출
→ DB 함수 안: 당사자·현재 상태·차단·정지 확인 → 상태 변경 + 대화방 생성 + `notification_outbox` 기록 (한 트랜잭션)
→ 공통 응답 형식으로 반환 → 별도 발송 함수가 outbox를 읽어 FCM 발송·재시도.
