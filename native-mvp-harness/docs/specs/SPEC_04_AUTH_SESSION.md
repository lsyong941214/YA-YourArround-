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
- 가입 직후 약관 동의 기록(버전·시각)을 서버에 저장한다.
- 가입 순서: 로그인 → 약관 → **초대코드 + 본인 번호 확인**(주민 필수, 3절) → 역할 안내 → 프로필 → (주민) 프로필 공개 설정 → 홈.
  단계가 남아 있으면 `GET /v1/me`의 `onboarding_step`으로 알려주고 앱이 해당 화면으로 보낸다.

## 3. 초대코드 번호 확인

규칙 전체는 `SPEC_02` 4절. 인증·보안 관점의 필수 사항:

- 번호 확인은 `HMAC-SHA256(서버 비밀키, 정규화 번호 + code)`만 비교한다. 비밀키 없는 단순 해시 금지(번호는 약 1억 가지라 전부 대입하면 복원됨).
- 비밀키는 Edge Function secret(`INVITE_HMAC_KEY_v{n}`)에만. DB·앱·로그에 두지 않는다. `key_version`으로 교체.
- 비교는 상수 시간 비교. 불일치·만료·없음은 같은 오류(`invite_invalid`)로 응답.
- 코드당 불일치 5회면 `locked`. IP·계정 단위 redeem 요청 속도 제한도 둔다.
- 번호 원문은 요청 처리 중 메모리에서만 쓰고 저장·로그·Crashlytics·분석 이벤트에 남기지 않는다(앱·서버 모두).
- 이 확인은 "번호 소유 증명"이 아니다(가입자가 번호를 직접 입력). 소유 증명이 필요해지면 SMS OTP 또는 카카오 전화번호 제공 동의를 추가한다 `[정책 확인]`.

## 4. 연락처 접근

- 목적은 **초대할 사람의 번호를 고르는 것뿐**이다. 주소록을 서버로 올리거나, 친구 추천·매칭에 쓰지 않는다.
- iOS: `CNContactPickerViewController`(다중 선택, **연락처 권한 요청 불필요** — 사용자가 고른 연락처만 앱에 전달).
- Android: 다중 선택을 위해 `READ_CONTACTS` 권한이 필요하다. 권한 요청 직전에 사용 목적을 설명하는 안내 화면을 보여주고, 거부해도 **번호 직접 입력**으로 같은 기능을 쓸 수 있어야 한다. 단건이면 권한 없는 시스템 선택기(`ACTION_PICK`)를 쓴다.
- 앱은 선택한 이름·번호를 화면 표시와 발급 요청에만 쓰고, 발급 후 메모리에서 버린다(로컬 DB·캐시 저장 금지).
- 스토어 개인정보 항목(Play 데이터 보안 / App Store 개인정보 라벨)에 "연락처: 앱 기능, 서버 전송 후 미저장"으로 신고한다.

## 5. 세션 보관과 갱신

| | Android | iOS |
|---|---|---|
| 토큰 저장 | Android Keystore 키로 암호화한 저장소(DataStore + Tink 등) | Keychain(`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) |
| 갱신 | supabase-kt 자동 갱신, 401이면 1회 갱신 후 재시도 | supabase-swift 동일 |
| API 호출 | `ApiClient`가 현재 access token을 헤더에 붙임 | `APIClient` 동일 |

- 토큰을 로그·Crashlytics·피드백·웹뷰 URL에 남기지 않는다.
- 앱 시작 순서: 토큰 로드 → `GET /v1/config` → `GET /v1/me` → 상태별 이동(`auth.login` / `onboarding.profile` / `account.restricted` / `home`).

## 6. 로그아웃·계정 전환 시 정리 목록

1. Supabase 세션 로그아웃(서버 refresh token 폐기)
2. 저장 토큰 삭제
3. 계정별 Room/SwiftData DB, 이미지 캐시(Coil/URLCache) 삭제
4. 웹뷰 쿠키·캐시·localStorage 삭제
5. Realtime 구독 해제
6. 푸시 토큰 서버 등록 해제(`DELETE /v1/devices/{id}`)
7. 메모리 상태(ViewModel/스토어) 초기화 후 `auth.login`으로 이동

## 7. 권한 모델

| 대상 | 규칙 |
|---|---|
| 일반 사용자 | 본인 데이터와 허용된 관계의 정보만. 다른 사용자 ID를 넣어 요청해도 거절 |
| 내 이장님 | 소속 주민의 전체 프로필·소개 요청·대기열 항목·열람 요청(승인제 `home_chief_approval`) 처리 |
| 연결된 다른 이장 | 상대 이장의 대기열과 소속 주민 **요약 카드**. 전체 프로필은 주민 공개 설정이 `open`이거나 유효한 열람 허락이 있을 때만. 일일 열람 한도 적용 |
| 연결 안 된 이장 | 다른 이장의 주민·대기열 일체 접근 불가(`chief_link_required`) |
| 제안 당사자 | 제안 이장·상대 이장·두 주민만 해당 제안 조회, 각자 자기 단계만 응답 |
| 정지·차단·탈퇴 계정 | 업무 API·조회·Realtime 구독 시점의 **현재 상태**를 DB에서 확인. 발급된 JWT만 믿지 않음 |
| 운영자 | `admin_roles` 테이블의 역할 + **TOTP MFA(aal2)**. 관리자 API는 `auth.jwt()->>'aal' = 'aal2'` 확인 |
| 앱·웹 코드 | `service_role`·서버 secret 절대 포함 금지. anon key만 포함 |

- RLS는 모든 테이블에 켠다. 앱이 테이블을 직접 읽지 않더라도 **방어선**으로 유지한다.
- Realtime 구독 대상 테이블/채널도 RLS로 당사자만 받게 한다(예: 대화방 두 사람, 테스트 두 사람).
- 열람 가능 여부는 `can_view_resident_profile(viewer, resident)` DB 함수 하나로 판단하고, API·RLS가 모두 이 함수를 쓴다(판단 로직 중복 금지).
- 권한 테스트(`supabase/tests`)는 최소: 타인 데이터 조회·수정 거절, 이장의 채팅 조회 0건, 정지 계정 API 거절, 일반 계정의 관리자 API 거절,
  연결 안 된 이장의 대기열 조회 거절, 승인제 주민의 허락 전 전체 프로필 거절, 연결 해제·설정 강화 직후 열람 거절.

## 8. 프로필 공개 동의

- 주민은 가입 시 `SPEC_02` 6절의 세 선택지 중 하나를 **반드시 직접 고른다**(미리 선택된 값 없음). 선택 전에는 홈으로 갈 수 없다.
- 서버에 `profile_visibility`, 동의 문구 버전, 선택 시각을 저장한다. 변경 이력도 남긴다.
- 설정에서 언제든 변경 가능. 더 엄격하게 바꾸면 기존 열람 허락은 즉시 만료된다.
- 다른 이장에게 프로필이 보이는 것은 개인정보 **제3자 제공 성격**이 있으므로, 개인정보 처리방침과 동의 문구에 대상(연결된 이장)·항목·기간을 적는다 `[정책 확인]`.

## 9. 웹뷰와 인증

- 웹뷰에는 **로그인 토큰을 넘기지 않는다.** 공지·약관·FAQ는 공개 API로 읽는다.
- 문의·피드백처럼 로그인이 필요한 작업은 웹이 브리지 명령(`support.create` 등)을 보내고, **네이티브가 자기 토큰으로 API를 호출**해 결과만 돌려준다.
- 공개 웹의 계정 삭제 요청은 앱 없이도 가능해야 한다(스토어 요구): 이메일 확인 링크로 본인 확인 → 서버 삭제 대기열 등록.

## 10. 탈퇴

- 앱 `settings` → 재인증 → 안내(삭제 범위·보관 항목) → 확인 → `DELETE /v1/me`.
- 서버: 이용 불가 처리 즉시, 실제 삭제·익명화는 보관 정책에 따라 배치. 신고·수사 협조용 보관 범위는 `[정책 확인]`.
