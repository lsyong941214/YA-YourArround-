# apps/web — 공용 웹뷰 + 공개 웹 작업 규칙

루트 `CLAUDE.md`를 먼저 따른다.

## 역할

1. **공용 웹뷰**(앱 안에서 열림): 공지, 약관, 개인정보 안내, FAQ, 문의 작성·목록, 피드백
2. **공개 웹**(앱 밖에서도 열림): 정책·지원 안내, 계정 삭제 요청, 인증 복귀(`/auth/callback`), 앱 링크 파일

서비스 핵심 기능(매칭·테스트·채팅 등)은 여기서 만들지 않는다.

## 스택

React · TypeScript(strict) · Vite · React Router · Tailwind CSS(설정은 `packages/design-tokens` 생성물) · pnpm · Cloudflare Workers Static Assets

## 라우트

| 경로 | 화면 ID | 인증 |
|---|---|---|
| `/notices`, `/notices/:id` | `web.notices` | 공개 API |
| `/terms/:slug`, `/privacy` | `web.terms`, `web.privacy` | 공개 API(버전별 게시본) |
| `/faq` | `web.faq` | 공개 API |
| `/support`, `/support/new` | `web.support` | 브리지(`support.list`, `support.create`) |
| `/feedback` | `web.feedback` | 브리지(`feedback.create`) |
| `/account/delete` | `public.account-delete` | 이메일 확인 링크 방식 |
| `/auth/callback` | `public.auth-callback` | 앱 열기 / 미설치 안내 |
| `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association` | — | 정적 파일 |

## 규칙

- **로그인 토큰을 갖지 않는다.** Supabase Auth를 이 앱에서 쓰지 않는다. 로그인 필요 작업은 브리지로 네이티브에 요청.
- 브리지는 `src/bridge/`의 래퍼(`bridge.request(cmd, payload)`)만 사용. 로드 시 `bridge.hello` → `commands`에 있는 기능만 활성.
- 앱 안(`ZubyeonApp/` UA 또는 hello 성공)이면 자체 헤더·푸터를 숨기고 `nav.setTitle`로 제목 전달. 브라우저면 일반 웹 레이아웃.
- 외부 링크는 앱 안에서 `nav.openExternal`로. 브라우저에서는 새 탭.
- 개인 데이터(내 문의 목록)는 메모리에만 두고 localStorage·서비스워커 캐시 금지. 서비스워커를 쓰지 않는다.
- 공개 콘텐츠는 `GET /v1/public/*` API로 읽고, 짧은 HTTP 캐시만 사용. 콘텐츠 수정은 관리자 웹에서(코드 배포 없이).
- 글자 확대(앱이 넘겨준 `font_scale`)와 안전 영역(`safe_area`)을 반영.
- 색·간격은 Tailwind 토큰 클래스만(`bg-brand-primary` 등). 임의 hex 금지.
- 모든 페이지에 로딩·빈·오류 상태.

## 명령어

```bash
pnpm -F web dev
pnpm -F web lint && pnpm -F web typecheck && pnpm -F web test && pnpm -F web build
```

## 테스트

- 브리지 래퍼: 가짜 브리지로 hello 미지원·타임아웃·`unsupported_command` 처리.
- 앱 밖(브라우저)에서 모든 페이지가 깨지지 않는지.
