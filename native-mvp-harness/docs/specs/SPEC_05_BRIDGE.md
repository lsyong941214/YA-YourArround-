# BRIDGE_SPEC — 네이티브 앱 ↔ 공용 웹뷰 브리지

웹뷰(`apps/web`)는 공지·약관·FAQ·문의·피드백만 담당한다. 브리지는 **작고 닫힌 명령 목록**으로 유지한다.
명령의 스키마 원본은 `packages/api-contract/bridge/*.json`.

## 1. 전송 방식

| | Android | iOS |
|---|---|---|
| 웹 → 앱 | `WebViewCompat.addWebMessageListener`(이름 `ZubyeonBridge`, `allowedOriginRules`에 허용 출처만) | `WKScriptMessageHandlerWithReply`(이름 `zubyeon`) |
| 앱 → 웹 | 같은 리스너의 `replyProxy.postMessage` | `WKScriptMessageHandlerWithReply` 응답 / 이벤트는 `evaluateJavaScript("window.__zubyeonBridge.receive(...)")` |
| 금지 | `addJavascriptInterface`, `file://` 로드, 임의 출처 | 임의 출처, 모든 프레임 주입 |

웹 쪽은 `apps/web/src/bridge/`의 래퍼만 사용한다(직접 `postMessage` 금지).

## 2. 메시지 형식 (모든 값은 JSON 문자열로 직렬화)

요청 (웹 → 앱)
```json
{ "v": 1, "type": "request", "id": "uuid", "cmd": "support.create", "payload": { ... } }
```
응답 (앱 → 웹)
```json
{ "v": 1, "type": "response", "id": "uuid", "ok": true, "data": { ... } }
{ "v": 1, "type": "response", "id": "uuid", "ok": false,
  "error": { "code": "unsupported_command", "message": "앱을 업데이트해 주세요.", "retryable": false } }
```
이벤트 (앱 → 웹, 응답 불필요)
```json
{ "v": 1, "type": "event", "name": "app.resume", "data": {} }
```

- `id`는 웹이 만든 UUID. 앱은 같은 `id`로 한 번만 응답한다.
- 웹은 요청마다 타임아웃 **15초**. 넘기면 `timeout` 오류로 처리.
- 메시지 최대 64KB. 초과하면 앱이 `payload_too_large`로 거절.
- `error`는 API 오류 형식과 같은 필드(`code`, `message`, `retryable`)를 쓰고, API 오류는 그대로 전달한다.

## 3. 핸드셰이크

웹은 로드 직후 `bridge.hello`를 보내고, 응답을 받기 전까지 브리지 기능 버튼을 비활성으로 둔다.

```json
// data
{
  "bridge_version": 1,
  "commands": ["bridge.hello", "nav.close", "nav.setTitle", "nav.openExternal", "app.getContext", "support.create", "support.list", "feedback.create"],
  "platform": "android",
  "app_version": "1.0.0",
  "app_build": "12",
  "os_version": "14",
  "locale": "ko-KR",
  "font_scale": 1.0,
  "safe_area": { "top": 0, "bottom": 34 },
  "screen_id": "web.support"
}
```
- 웹은 **`commands`에 있는 명령만** 호출한다. 없으면 "앱을 업데이트하면 이용할 수 있어요" 안내.
- 앱 안 여부는 User-Agent 접미사 `ZubyeonApp/<app_version> (<platform>; bridge <v>)`로 먼저 판단(레이아웃용), 기능 판단은 핸드셰이크로 한다.
- 브라우저(앱 밖)에서는 브리지가 없으므로 문의는 공개 안내(메일 주소 등)로 대체한다.

## 4. 명령 목록 (bridge v1)

| cmd | payload | data | 설명 |
|---|---|---|---|
| `bridge.hello` | `{}` | 위 핸드셰이크 | 필수 |
| `nav.close` | `{}` | `{}` | 웹뷰 화면 닫기 |
| `nav.setTitle` | `{ "title": string(≤30) }` | `{}` | 네이티브 상단바 제목 |
| `nav.openExternal` | `{ "url": https URL }` | `{}` | OS 브라우저로 열기 |
| `app.getContext` | `{}` | 플랫폼·OS·앱 빌드·화면 ID·설정 버전·문항 버전 | 피드백 메타데이터 |
| `support.create` | `{ "category", "title", "body", "attach_screenshot": bool }` | `{ "ticket_id" }` | 네이티브가 `POST /v1/support-tickets` 호출 |
| `support.list` | `{ "cursor"? }` | 내 문의 목록 | 네이티브가 API 호출 |
| `feedback.create` | `{ "rating"?, "body", "attach_screenshot": bool }` | `{ "feedback_id" }` | 메타데이터는 네이티브가 자동 첨부 |

앱 → 웹 이벤트: `app.resume`(foreground 복귀), `app.fontScaleChanged`.

스크린샷은 사용자가 체크한 경우에만 네이티브가 촬영·업로드한다. 비밀번호·토큰·채팅 원문은 절대 자동 수집하지 않는다.

## 5. 보안 규칙 (앱이 매 메시지마다 확인)

1. 출처가 허용 목록(`https://<웹뷰 도메인>`, 환경별)에 있는가 — 아니면 무시(응답도 하지 않음).
2. 메인 프레임에서 온 메시지인가 — iframe 메시지 거절.
3. `v`가 지원 범위이고 `cmd`가 목록에 있는가 — 아니면 `unsupported_command`.
4. `payload`가 JSON Schema를 통과하는가 — 아니면 `invalid_payload`.
5. 로그인 필요 명령인데 세션이 없으면 `unauthenticated`.

추가 규칙:
- 허용 출처 밖으로의 이동(링크 클릭·리다이렉트)은 웹뷰 안에서 열지 않고 OS 브라우저로 넘긴다.
- 웹뷰에 토큰·개인정보를 넣지 않는다. 개인 데이터 응답(`support.list`)은 캐시하지 않도록 웹이 메모리에만 둔다.
- 웹뷰 설정: JavaScript 켬, 파일 접근·유니버설 파일 접근 끔, 혼합 콘텐츠 차단, 디버깅은 dev 빌드만.
- 로그아웃 시 웹뷰 쿠키·캐시·저장소 삭제(`docs/specs/SPEC_04_AUTH_SESSION.md` 4절).

## 6. 버전과 변경

- 명령 추가 = 네이티브 앱 배포가 필요한 변경. `add-bridge-command` 스킬 절차를 따른다.
- 기존 명령의 payload는 **선택 필드 추가만** 허용. 의미 변경은 새 명령 이름(`support.create2` 대신 `support.createTicket` 등)으로.
- 호환이 깨지는 전체 변경만 `bridge_version`을 올리고, 웹은 이전 버전 앱을 위한 분기를 유지한다.
- 오류 코드: `unsupported_command`, `invalid_payload`, `payload_too_large`, `unauthenticated`, `timeout`, `canceled`(사용자가 화면을 닫음) + API 오류 코드.
