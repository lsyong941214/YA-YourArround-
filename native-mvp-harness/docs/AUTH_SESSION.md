# AUTH_SESSION — 로그인, 세션, 권한

## 1. 로그인 수단 (두 앱 동일)

| 수단 | Android | iOS | Supabase 연결 |
|---|---|---|---|
| 카카오 | 카카오 SDK(OIDC id_token) | 카카오 SDK(OIDC id_token) | `signInWithIdToken(provider=kakao)` — 불가하면 PKCE OAuth(아래) |
| Google | Credential Manager(Sign in with Google) | Google Sign-In SDK | `signInWithIdToken(provider=google)` |
| Apple | OS 인증 브라우저(Custom Tabs) PKCE OAuth | AuthenticationServices(네이티브) | iOS: `signInWithIdToken(provider=apple)` / Android: OAuth |
| 이메일·비밀번호 | 네이티브 폼 | 네이티브 폼 | 실제 이메일 확인 + 비밀번호 재설정(Resend SMTP) |

- PKCE OAuth는 **OS 인증 브라우저**(Android Custom Tabs, iOS `ASWebAuthenticationSession`)로만 연다. 앱 내부 웹뷰로 로그인 페이지를 열지 않는다.
- 인증 복귀 주소: `https://<공개웹 도메인>/auth/callback` (App Links / Universal Links). 앱 미설치 시 이 페이지가 설치 안내를 보여준다.
- 공급자별 SDK 방식이 실제로 되는지는 착수 시 확인하고 이 표를 갱신한다.
- 기존 웹의 합성 이메일(`{id}@jubyeon.local`)·이메일 확인 끄기 설정은 쓰지 않는다. 네이버 로그인은 MVP 제외.

## 2. 계정 식별과 연결

- 모든 업무 데이터는 **Supabase 사용자 UUID**(`auth.users.id`)에 연결한다. 로그인 수단과 무관.
- 같은 이메일의 계정 연결은 Supabase 검증 규칙만 따른다. 다른 이메일이나 Apple 가림 이메일(`privaterelay`)을 같은 사람으로 추정해 병합하지 않는다.
- 로그인 수단 연결·해제, 탈퇴는 **재인증**(최근 로그인 또는 비밀번호 재입력) 후에만.
- 가입 직후 약관 동의 기록(버전·시각)을 서버에 저장하고, 프로필이 없으면 `onboarding.profile`로 보낸다.

## 3. 세션 보관과 갱신

| | Android | iOS |
|---|---|---|
| 토큰 저장 | Android Keystore 키로 암호화한 저장소(DataStore + Tink 등) | Keychain(`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) |
| 갱신 | supabase-kt 자동 갱신, 401이면 1회 갱신 후 재시도 | supabase-swift 동일 |
| API 호출 | `ApiClient`가 현재 access token을 헤더에 붙임 | `APIClient` 동일 |

- 토큰을 로그·Crashlytics·피드백·웹뷰 URL에 남기지 않는다.
- 앱 시작 순서: 토큰 로드 → `GET /v1/config` → `GET /v1/me` → 상태별 이동(`auth.login` / `onboarding.profile` / `account.restricted` / `home`).

## 4. 로그아웃·계정 전환 시 정리 목록

1. Supabase 세션 로그아웃(서버 refresh token 폐기)
2. 저장 토큰 삭제
3. 계정별 Room/SwiftData DB, 이미지 캐시(Coil/URLCache) 삭제
4. 웹뷰 쿠키·캐시·localStorage 삭제
5. Realtime 구독 해제
6. 푸시 토큰 서버 등록 해제(`DELETE /v1/devices/{id}`)
7. 메모리 상태(ViewModel/스토어) 초기화 후 `auth.login`으로 이동

## 5. 권한 모델

| 대상 | 규칙 |
|---|---|
| 일반 사용자 | 본인 데이터와 허용된 관계의 정보만. 다른 사용자 ID를 넣어 요청해도 거절 |
| 이장·매칭 당사자 | 요청마다 서버가 해당 관계·요청의 당사자인지, 현재 상태가 허용되는지 확인 |
| 정지·차단·탈퇴 계정 | 업무 API·조회·Realtime 구독 시점의 **현재 상태**를 DB에서 확인. 발급된 JWT만 믿지 않음 |
| 운영자 | `admin_roles` 테이블의 역할 + **TOTP MFA(aal2)**. 관리자 API는 `auth.jwt()->>'aal' = 'aal2'` 확인 |
| 앱·웹 코드 | `service_role`·서버 secret 절대 포함 금지. anon key만 포함 |

- RLS는 모든 테이블에 켠다. 앱이 테이블을 직접 읽지 않더라도 **방어선**으로 유지한다.
- Realtime 구독 대상 테이블/채널도 RLS로 당사자만 받게 한다(예: 대화방 두 사람, 테스트 두 사람).
- 권한 테스트(`supabase/tests`)는 최소: 타인 데이터 조회·수정 거절, 이장의 채팅 조회 0건, 정지 계정 API 거절, 일반 계정의 관리자 API 거절.

## 6. 웹뷰와 인증

- 웹뷰에는 **로그인 토큰을 넘기지 않는다.** 공지·약관·FAQ는 공개 API로 읽는다.
- 문의·피드백처럼 로그인이 필요한 작업은 웹이 브리지 명령(`support.create` 등)을 보내고, **네이티브가 자기 토큰으로 API를 호출**해 결과만 돌려준다.
- 공개 웹의 계정 삭제 요청은 앱 없이도 가능해야 한다(스토어 요구): 이메일 확인 링크로 본인 확인 → 서버 삭제 대기열 등록.

## 7. 탈퇴

- 앱 `settings` → 재인증 → 안내(삭제 범위·보관 항목) → 확인 → `DELETE /v1/me`.
- 서버: 이용 불가 처리 즉시, 실제 삭제·익명화는 보관 정책에 따라 배치. 신고·수사 협조용 보관 범위는 `[정책 확인]`.
