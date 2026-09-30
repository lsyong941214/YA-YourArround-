---
name: add-api-endpoint
description: 주변 앱에 업무 API(Edge Function 경로)를 새로 추가하거나 기존 API에 필드·상태 전이를 추가할 때 사용. 계약(OpenAPI) → DB 함수 → Edge Function → 테스트 → Android·iOS 클라이언트 순서를 강제한다. "API 추가", "엔드포인트 만들어", "서버에 기능 추가", "매칭/초대/채팅 로직 구현" 같은 요청에 사용.
---

# API 추가 절차

먼저 읽기: `docs/API_CONTRACT.md`, `docs/DOMAIN_MODEL.md`, `supabase/CLAUDE.md`.

## 1. 설계 확인 (코드 작성 전)

- 이 API가 바꾸는 상태 전이를 `docs/DOMAIN_MODEL.md`에서 찾는다. 없으면 문서에 먼저 추가하고 사용자에게 확인받는다.
- 누가 호출할 수 있는지(역할·당사자 조건), 차단·정지 시 동작, 한도(원격 설정)를 한 줄씩 적는다.
- 기존 API 변경이면: **필드 추가만** 가능한지 확인. 의미 변경이면 `/v2` 경로를 제안하고 멈춘다.

## 2. 계약

1. `packages/api-contract/openapi.yaml`에 operation 추가(`operationId`, 경로, 요청/응답 스키마 `$ref`, 오류 코드 목록, 상태 전이 설명).
2. `schemas/*.json`에 요청·응답 스키마.
3. `examples/<operationId>/`에 성공 1개 + 주요 실패(권한·상태·검증) 예제.
4. `CHANGELOG.md`에 한 줄.
5. 계약 검사 실행(OpenAPI lint + 예제 스키마 검증).

## 3. DB

- 원자성이 필요하면 `supabase-migration` 스킬로 DB 함수를 만든다(당사자·상태·차단·정지 확인, 잠금, 중복 방지, outbox).
- pgTAP 테스트: 정상 1 + 권한 거절 + 잘못된 상태 + 동시 요청(해당 시) + 같은 `Idempotency-Key` 재요청.

## 4. Edge Function

- `supabase/functions/api/routes/<domain>.ts`에 핸들러: 입력 스키마 검증 → 사용자 토큰 클라이언트로 RPC → DB 오류 메시지를 API 오류 코드로 변환 → 공통 응답.
- 상태 변경이면 `Idempotency-Key` 필수 검사.
- `deno test`로 핸들러 테스트(성공·401·403·409·422).

## 5. 클라이언트

- Android: `data/<domain>`에 DTO(`@SerialName`)·Repository 메서드, 모르는 enum → `UNKNOWN`. ViewModel에서 키 생성·재사용. 계약 예제로 MockEngine 테스트.
- iOS: `Data/<Domain>`에 DTO(`Codable`)·Repository 메서드, `.unknown` 처리, `URLProtocol` 스텁 테스트.
- 두 앱의 오류 코드별 사용자 문구가 같은지 확인.

## 6. 보고

- 돌린 검사와 결과(계약, `supabase test db`, `deno test`, Android 테스트). iOS를 빌드하지 못했으면 명시.
- 이전 앱 버전이 이 변경을 받아도 괜찮은지 한 줄.
