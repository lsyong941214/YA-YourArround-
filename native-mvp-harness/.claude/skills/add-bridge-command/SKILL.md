---
name: add-bridge-command
description: 네이티브 앱과 공용 웹뷰 사이 브리지 명령을 추가하거나 기존 명령의 payload를 확장할 때 사용. 스키마·Android·iOS·웹 래퍼·문서 다섯 곳을 함께 고친다. "브리지 추가", "웹뷰에서 앱 기능 호출", "웹뷰 문의/피드백 연동" 같은 요청에 사용.
---

# 브리지 명령 추가 절차

먼저 읽기: `docs/BRIDGE_SPEC.md`, `docs/AUTH_SESSION.md` 6절.

## 0. 꼭 필요한지 판단

- 웹뷰 범위(공지·약관·FAQ·문의·피드백)에 속하는 기능인가? 핵심 기능이면 웹뷰가 아니라 네이티브 화면으로 만든다.
- 기존 명령에 **선택 필드 추가**로 해결되는가? 그러면 새 명령을 만들지 않는다.
- 새 명령은 앱 배포가 필요한 변경임을 사용자에게 알린다.

## 1. 스키마

- `packages/api-contract/bridge/<cmd>.json`에 payload·data JSON Schema(최대 길이·enum 포함).
- 이름 규칙: `<영역>.<동사>` camelCase (`support.create`, `nav.setTitle`).

## 2. Android (`apps/android/.../bridge/`)

- 명령 핸들러 등록: 출처·메인 프레임·스키마 검증 통과 후 실행.
- 로그인 필요 명령이면 네이티브 Repository로 API 호출(토큰은 네이티브에만).
- `bridge.hello`의 `commands` 목록에 추가.
- 단위 테스트: 정상, 스키마 위반 → `invalid_payload`, 미로그인 → `unauthenticated`.

## 3. iOS (`apps/ios/Zubyeon/Bridge/`)

- Android와 같은 동작·같은 오류 코드. `commands` 목록 추가. 테스트 동일.

## 4. 웹 (`apps/web/src/bridge/`)

- 래퍼에 타입 있는 함수 추가(`createSupportTicket(payload)`).
- 호출 전 `hello.commands` 포함 여부 확인 → 없으면 "앱 업데이트 안내" UI, 브라우저면 대체 경로.
- 타임아웃·`canceled` 처리.

## 5. 문서

- `docs/BRIDGE_SPEC.md` 4절 표에 행 추가. 호환이 깨지는 변경이면 `bridge_version` 증가와 이전 앱 분기 계획을 적는다.

## 6. 보고

- 세 플랫폼 테스트 결과. iOS 빌드 불가 시 명시.
- 이전 버전 앱에서 웹이 이 명령을 부르지 않는지(hello 확인) 검증했다는 한 줄.
