# supabase — 백엔드(DB·RLS·DB 함수·Edge Functions) 작업 규칙

`docs/rules/RULE_00_COMMON.md`(공통 규칙)를 먼저 따른다. Supabase Cloud(관리형, 서울 리전)를 쓰고 자체 설치하지 않는다.

## 구조

```
supabase/
├─ config.toml
├─ migrations/<timestamp>_<설명>.sql   # supabase migration new 로 생성
├─ functions/
│  ├─ api/                # 업무 API 라우터 (/v1/*)
│  │  ├─ index.ts         # 라우팅, 공통 미들웨어(인증·헤더·request_id·오류 변환)
│  │  └─ routes/<domain>.ts
│  ├─ notify-dispatch/    # notification_outbox → FCM 발송·재시도
│  └─ _shared/            # 응답 형식, 오류 코드, 스키마 검증, supabase 클라이언트
├─ tests/                 # pgTAP: RLS·DB 함수·동시성
└─ seed.sql               # 가상 계정(주민·이장·정지·운영자)과 샘플 관계
```

## 마이그레이션

- 새 스키마로 시작한다. 기존 웹의 `schema.sql`/`alter_*.sql`은 **참고만**(상태 전이·검증 로직 아이디어), 복사 금지.
- 변경은 항상 새 마이그레이션 파일. **이미 적용된 마이그레이션 수정 금지.**
- 테이블·컬럼은 `snake_case` 완전한 단어, `id uuid default gen_random_uuid()`, `created_at/updated_at timestamptz`.
- 상태 값은 `text + check` 제약(값은 `docs/specs/SPEC_02_DOMAIN_MODEL.md`의 API 값과 동일).
- 모든 테이블 `enable row level security`. 정책 없는 테이블은 접근 불가 상태로 둔다.
- 운영 반영 전 백업(`docs/specs/SPEC_07_QA_RELEASE.md`).

## DB 함수/RPC

- 여러 행을 바꾸는 업무(초대 사용, 매칭 수락, 테스트 행동, 메시지 전송, 차단)는 **함수 하나**에서 처리.
- 함수 안에서 반드시 확인: 호출자 = 당사자(`auth.uid()` 또는 인자로 받은 검증된 actor), 현재 상태 허용 여부, 차단 관계, 이용 제한.
- 동시성: 대상 행을 `select ... for update`로 잠그거나 유일 제약으로 막는다. 동시 요청 테스트 필수.
- `security definer`를 쓰면 `set search_path = ''`(스키마 명시)와 내부 권한 확인을 함께 둔다.
- 중복 방지: `idempotency_keys(user_id, operation, key)` 유일 제약 + 첫 결과 저장.
- 푸시·메일은 `notification_outbox`에 같은 트랜잭션으로 기록만. 외부 호출 금지.
- 실패는 `raise exception using errcode = 'P0001', message = '<error_code>'` 형태로 던지고, Edge Function이 API 오류 코드로 변환.

## 주요 테이블 (SPEC_02 기준, 이름 확정 전 초안)

`profiles`(역할, 생년월일, `height_cm`, `company_id`/`company_name_input`, `region_code`/`region_name`, MBTI, 소개, `profile_visibility`) ·
`resident_memberships`(주민→내 이장님, 주민당 1행) · `chief_links`(이장 쌍, `least/greatest`로 중복 방지) ·
`invites`(`code`, `phone_check`, `key_version`, `invite_type`, 발급 이장, 상태, 실패 횟수, 만료) ·
`intro_requests` · `queue_entries`(주민당 활성 1건 부분 유니크) · `profile_view_requests` · `profile_view_grants`(만료) · `profile_view_logs` ·
`match_proposals`(제안 이장, 주민 A·B, 각 이장, 방식, 상태, 각자 응답) · `blind_tests`/`blind_test_answers` · `chat_rooms`/`chat_messages` ·
`companies` · `regions`(시군구 코드 목록) · `consents`(약관·공개 설정 동의 이력) · `reports` · `blocks` · `restrictions` · `admin_roles` · `admin_audit_logs` ·
`remote_configs` · `content_items`(온보딩·등급 문구) · `notification_outbox` · `idempotency_keys`

- **`invites`에 휴대폰 번호 컬럼을 만들지 않는다.** `phone_check`만 저장. HMAC 계산은 Edge Function에서(비밀키는 secret), DB 함수에는 계산된 값만 넘긴다.
- 열람 가능 판단은 `can_view_resident_profile(viewer, resident)` 한 함수로 만들고 API·RLS·조회 함수가 모두 쓴다.
- 이장 연결 해제·주민 공개 설정 강화 시 관련 `profile_view_grants` 만료와 진행 중 제안 `canceled`를 같은 트랜잭션에서 처리한다.
- 만료 처리(초대 7일, 제안 72시간, 대기열 30일, 열람 요청 7일)는 조회 시점 판정 + 하루 1회 정리 작업(pg_cron 또는 예약 함수)으로 한다.

## Edge Functions

- TypeScript/Deno. 요청마다: 토큰 검증 → 공통 헤더 확인(`X-App-Version`, `min_app_version` 비교) → 입력 스키마 검증 → DB 함수 호출 → 공통 응답.
- 사용자 요청은 **사용자 토큰으로 만든 클라이언트**로 DB 호출(RLS 적용). `service_role` 클라이언트는 outbox 발송·관리자 감사처럼 필요한 곳만, 사용 이유를 주석으로.
- 실행 시간·CPU·메모리 제한이 있다. 오래 걸리는 작업은 만들지 말고 필요하면 별도 설계를 요청.
- 로그에 토큰·비밀번호·채팅 원문 금지. `request_id`를 모든 로그에 포함.
- 비밀값은 `supabase secrets set`. 코드·`.env` 커밋 금지. 초대코드 확인 키: `INVITE_HMAC_KEY_v1`(교체 시 `v2` 추가, 이전 키는 미사용 코드 만료 후 삭제).
- `/v1/invites/batch`, `/v1/invites/redeem` 요청 본문은 어떤 로그에도 남기지 않는다(휴대폰 번호).

## Storage

- 버킷은 private. 조회는 짧은 signed URL(예: 1시간). 경로는 `<user_id>/<uuid>.jpg`.
- 업로드 후 서버에서 형식(jpeg/png/webp)·용량(≤1MB)·소유권 확인. 동영상 금지.

## Realtime

- 채팅 메시지·주변인 테스트 상태 변경만 구독 대상. RLS로 당사자만 수신.
- 클라이언트는 신호를 받으면 API로 재조회한다(페이로드를 원본으로 쓰지 않음).

## 명령어

```bash
supabase start                    # 로컬(Docker)
supabase db reset                 # 마이그레이션 + seed 재적용
supabase test db                  # pgTAP
deno test -A supabase/functions   # 함수 테스트
supabase functions serve api      # 로컬 API
```
변경 후 `db reset` → `test db` → `deno test`를 모두 돌려 결과를 보고한다.

## 권한 테스트 최소 목록

타인 프로필·요청 조회/수정 거절 · 이장의 채팅 조회 0건 · 당사자 아닌 전이 거절 · 정지 계정의 API·구독 거절 ·
연결 안 된 이장의 대기열·주민 조회 거절 · 승인제 주민의 허락 전 전체 프로필 거절 · 연결 해제 직후 열람 거절 ·
초대코드 번호 불일치 거절·5회 잠김 · 초대코드 동시 사용 1건만 성공 · 같은 `Idempotency-Key` 재요청 시 같은 결과 · 일반 계정의 `/v1/admin/*` 거절 · aal1 운영자 거절
