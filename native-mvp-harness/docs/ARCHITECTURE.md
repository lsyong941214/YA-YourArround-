# ARCHITECTURE — 구조, 화면 분류, 변경 관리

## 1. 전체 구성

```
[Android 앱]   [iOS 앱]              ← 네이티브: 서비스 핵심 기능
     │  ▲          │  ▲
     │  └ 웹뷰 ────┘  └ 브리지(docs/BRIDGE_SPEC.md)
     │        [apps/web: 공용 웹뷰·공개 웹]   [apps/admin: 관리자 웹]
     ▼                    ▼                          ▼
          [Supabase Edge Functions  /v1/*  — 유일한 업무 API]
                    │ 검증·권한·응답 조합
                    ▼
          [PostgreSQL: 제약 + DB 함수/RPC + RLS]──[outbox]──▶ [발송 함수] → FCM / Resend
                    │
          [Storage(private, signed URL)]  [Realtime(변경 신호)]
```

- 앱 ↔ 서버: HTTPS JSON(`docs/API_CONTRACT.md`). Supabase SDK는 Auth·Storage 업로드·Realtime 구독에만 쓰고 Repository 안에 가둔다.
- 웹뷰 ↔ 앱: 브리지 메시지. 웹뷰는 로그인 토큰을 갖지 않는다.
- 관리자 웹 ↔ 서버: `/v1/admin/*` API. 관리자 역할 + TOTP MFA(aal2) 필수.

## 2. 모노레포 구조

```
/
├─ CLAUDE.md
├─ apps/
│  ├─ android/   (Gradle, CLAUDE.md)
│  ├─ ios/       (Xcode/SPM, CLAUDE.md)
│  ├─ web/       (pnpm workspace, CLAUDE.md)
│  └─ admin/     (pnpm workspace, CLAUDE.md)
├─ packages/
│  ├─ api-contract/   openapi.yaml, schemas/*.json, examples/*.json, bridge/*.json
│  └─ design-tokens/  tokens.json → build/{compose,swiftui,tailwind}
├─ supabase/
│  ├─ CLAUDE.md
│  ├─ migrations/  functions/  tests/  seed.sql
├─ docs/          (이 문서들, 화면 명세, 권한표, 테스트 결과)
└─ .claude/skills/
```

비공개 GitHub 모노레포. 웹 워크스페이스는 pnpm. 기존 웹은 별도 저장소로 참고용 유지.

## 3. 화면 목록과 구현 방식

화면 ID는 두 앱·피드백·로그·Crashlytics에서 **같은 값**을 쓴다.

| 화면 ID | 화면 | 방식 | 기존 웹 참고 |
|---|---|---|---|
| `splash` | 시작(세션 확인, 설정 로드) | 네이티브 | `LoadingScreen` |
| `auth.login` | 로그인 선택(카카오·Google·Apple·이메일) | 네이티브 | `LoginScreen` |
| `auth.email` | 이메일 로그인/가입/비밀번호 재설정 | 네이티브 | `LocalLoginScreen`(흐름만) |
| `auth.terms` | 약관 동의 | 네이티브 + 약관 본문 웹뷰 | `TermsModal` |
| `onboarding.profile` | 최초 프로필 작성 | 네이티브 | `OnbdScreen` |
| `home` | 홈 대시보드 | 네이티브 | `HomeScreen` |
| `profile.edit` / `profile.view` | 내 프로필 수정 / 상대 프로필 보기 | 네이티브 | `ProfEditModal`, `ProfileViewModal` |
| `invite` | 초대코드 발급(이장)·입력(주민) | 네이티브 | `InvtScreen` |
| `contacts` / `contacts.detail` | 이장·주민 연락처 | 네이티브 | `CntcDetail`, `ChiefListScreen` |
| `match.request` | 매칭 신청 | 네이티브 | `ReqSendScreen` |
| `match.review` | 이장 검토(수락/거절) | 네이티브 | `MatcReviewScreen` |
| `match.proposals` | 받은 제안(주민 수락/거절) | 네이티브 | `ProposalListScreen` |
| `match.status` | 매칭 현황(보낸/받은) | 네이티브 | `SentListScreen`, `MatcListScreen` |
| `match.done` | 매칭 성사 + 이장 리뷰 | 네이티브 | `MatchedScreen`, `RevwModal` |
| `blind.request` / `blind.review` | 주변인 테스트 신청 / 응답 | 네이티브 | `BlndReqScreen`, `BlndReviewScreen` |
| `blind.game` | 밸런스 게임 | 네이티브 | `BlndGameScreen` |
| `blind.result` | 결과서 | 네이티브 | `BlndRsltScreen` |
| `chat.list` / `chat.room` | 대화 목록 / 채팅방 | 네이티브 | `ChatScreen` |
| `safety.report` | 신고 | 네이티브 | `ReportModal` |
| `account.restricted` | 정지·차단 안내 | 네이티브 | `SuspScreen` |
| `settings` | 설정(알림, 로그인 연결, 로그아웃, 탈퇴) | 네이티브 | `MyPageScreen` |
| `mypage` | 마이페이지 | 네이티브 | `MyPageScreen` |
| `web.notices` | 공지 목록/상세 | 웹뷰 | — |
| `web.terms` / `web.privacy` | 약관 / 개인정보 안내 | 웹뷰 | `TermsModal` 본문 |
| `web.faq` | FAQ | 웹뷰 | `GuideScreen`(가이드 내용) |
| `web.support` | 문의 작성·내 문의 | 웹뷰 + 브리지 `support.*` | — |
| `web.feedback` | 피드백 | 웹뷰 + 브리지 `feedback.create` | — |
| `public.account-delete` | 계정 삭제 요청(앱 없이) | 공개 웹 | — |
| `public.auth-callback` | 인증 복귀·앱 링크 | 공개 웹 | — |

하단 탭(네이티브): **홈 · 매칭 · 메시지 · 마이페이지**. 기존 웹의 "마을" 탭은 MVP 범위 밖(확장 시 추가).

## 4. 클라이언트 레이어

| | Android | iOS |
|---|---|---|
| UI | Compose 화면(`*Screen`) | SwiftUI View |
| 상태 | `ViewModel` + `StateFlow<UiState>` | `@Observable` ViewModel |
| 데이터 | `Repository` → `ApiClient`(Ktor) / Room / DataStore | `Repository` protocol → `APIClient`(URLSession) / SwiftData / Keychain |
| Supabase SDK | `supabase-kt` — `data/auth`, `data/realtime`, `data/storage` 안에서만 | `supabase-swift` — 동일 |

UseCase·모듈 분리는 복잡성이 실제로 생길 때 한다. 처음부터 만들지 않는다.

## 5. 변경 관리 — 앱 재배포 줄이기

| 변경 | 처리 위치 | 앱 배포 |
|---|---|---|
| 테스트 문항·선택지·이미지·출제 순서 | 관리자 문항 게시 | 불필요 |
| 지원 범위 안의 문항 수(1~20) | 서버 설정 | 불필요 |
| 결과 점수·설명 문구 | 서버 계산·콘텐츠 | 불필요 |
| 신청 한도·점검·기능 노출 | 서버 설정 + 서버 재검증 | 불필요 |
| 공지·FAQ·약관·문의 화면 | 웹 콘텐츠/웹 배포 | 불필요 |
| 계약을 유지하는 서버 수정 | 서버 배포 | 불필요 |
| 새 화면·입력 유형·브리지 명령 | 네이티브 코드 | **필요** |
| 앱 버그·SDK·권한 처리 | 네이티브 코드 | **필요** |

### 원격 설정 규칙

- 출처는 한 곳: Postgres 설정 테이블 → `GET /v1/config` → 관리자 웹에서 편집.
- 응답에 `schema_version`, `platform`, `min_app_version`, `recommended_app_version`, `config_version` 포함.
- 앱은 시작·foreground 복귀 시 갱신, 일반 값 TTL 5분. 실패하면 **마지막 정상 설정**, 없으면 코드의 안전한 기본값.
- 앱이 모르는 기능 키는 무시하고, 모르는 기능은 꺼진 것으로 본다.
- 초안 → 미리보기 → 테스트 그룹 적용 → 게시. 변경자·사유·이력 기록, 되돌리기 제공.
- 긴급 중단·차단·한도는 앱 표시와 무관하게 서버가 요청 시점에 다시 확인한다.
- 강제 업데이트는 `min_app_version`으로만, 보안·로그인 불가 같은 경우에만 올린다.

## 6. 환경

| 환경 | 구성 |
|---|---|
| local | Supabase CLI + Docker, `seed.sql` 가상 계정 |
| dev (선택) | 별도 Supabase Free 프로젝트, 앱 ID 접미사 `.dev`, 별도 웹 배포 |
| pilot/prod | 분리된 Supabase 프로젝트(서울 리전), 실제 지인 데이터 |

앱 빌드 변형(Android flavor / iOS scheme)은 `dev`, `pilot`을 두고 API 주소·Supabase 키(anon)·앱 ID를 분리한다.
