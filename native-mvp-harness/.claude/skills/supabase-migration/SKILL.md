---
name: supabase-migration
description: 주변 앱 Supabase에 테이블·컬럼·RLS 정책·DB 함수(RPC)·트리거를 추가하거나 바꿀 때 사용. 마이그레이션 생성 → 로컬 적용 → pgTAP 권한/동시성 테스트 → 배포 전 백업 순서를 강제한다. "테이블 추가", "DB 함수", "RLS", "마이그레이션" 같은 요청에 사용.
---

# Supabase 마이그레이션 절차

먼저 읽기: `supabase/CLAUDE.md`, `docs/DOMAIN_MODEL.md`, `docs/AUTH_SESSION.md` 5절.

## 1. 파일 만들기

```bash
supabase migration new <짧은_설명>   # 예: create_invite_codes
```
- 기존 마이그레이션은 절대 수정하지 않는다. 고칠 게 있으면 새 파일.
- 한 파일 = 한 목적. 테이블 + 그 테이블의 RLS + 관련 함수는 같은 파일에 둬도 된다.

## 2. 작성 체크리스트

- [ ] 이름 `snake_case` 완전한 단어, `id uuid`, `created_at/updated_at timestamptz default now()`
- [ ] 상태 컬럼은 `check` 제약, 값은 DOMAIN_MODEL의 API 값
- [ ] 필요한 유일 제약·외래키·인덱스(조회 조건 기준)
- [ ] `alter table ... enable row level security` + 역할별 정책(select/insert/update/delete 각각)
- [ ] 업무 변경은 DB 함수: 당사자·상태·차단(`is_blocked_pair`)·이용 제한 확인, `for update` 잠금, `idempotency_keys` 기록, `notification_outbox` 기록
- [ ] `security definer` 사용 시 `set search_path = ''` + 스키마 명시 + 내부 권한 확인
- [ ] 오류는 `raise exception ... message = '<error_code>'` (API 오류 코드와 동일)
- [ ] Realtime 대상이면 publication 추가 + RLS로 당사자만
- [ ] 필요하면 `seed.sql`에 테스트 데이터

## 3. 로컬 검증

```bash
supabase db reset        # 전체 마이그레이션 + seed
supabase test db         # pgTAP
```
`supabase/tests/<domain>_test.sql`에 최소:
- 당사자 정상 동작
- 타인·다른 역할 거절
- 잘못된 상태에서 전이 거절
- 차단·정지 사용자 거절
- 동시 요청(두 세션) 1건만 성공 — 해당 시
- 같은 `Idempotency-Key` 재요청 시 같은 결과

## 4. 배포

1. 운영(pilot) DB 백업(덤프) 확인.
2. `supabase db push` — 사용자가 명시적으로 요청했을 때만 실행. 기본은 PR까지.
3. 배포 후 관련 API 스모크 테스트.

## 5. 보고

생성한 파일, 테스트 결과(통과/실패 개수), 되돌리는 방법(역방향 마이그레이션 필요 여부), 앱 계약 영향 여부.
