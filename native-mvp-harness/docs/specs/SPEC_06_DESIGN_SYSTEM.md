# DESIGN_SYSTEM — 기존 웹 디자인을 네이티브로 옮기는 기준

값은 기존 웹(`tailwind.config.ts`, `globals.css`, 컴포넌트 클래스 사용 빈도)에서 추출했다.
원본은 `packages/design-tokens/tokens.json` 하나이고, Compose(`ZubyeonTheme`)·SwiftUI(`Theme`)·Tailwind 설정은 **생성물**이다. 화면 코드에 색상 hex·px 값을 직접 쓰지 않는다.
Figma가 생기면 Figma가 원본이 되고 이 문서와 토큰을 맞춘다.

## 1. 브랜드 인상

따뜻한 오렌지 + 크림 배경, 흰 카드, 둥근 모서리, 굵은 글씨. 주변인 테스트 영역만 보라색으로 구분한다. 다크 모드는 MVP 범위 밖(라이트 고정, 토큰은 다크 확장이 가능하게 이름 기반으로 둔다).

## 2. 색상 토큰

| 토큰 | 값 | 용도 (기존 웹) |
|---|---|---|
| `color.brand.primary` | `#F26B12` | 주요 버튼, 활성 탭, 강조 텍스트, 로고 |
| `color.brand.primaryPressed` | `#D9560A` | 눌림 |
| `color.brand.light` | `#FB8A3C` | 보조 강조 |
| `color.brand.soft` | `#FFE9D6` | 칩·포인트 배지 배경 |
| `color.brand.subtle` | `#FFF3E9` | 연한 섹션 배경, 선택 카드 |
| `color.brand.border` | `#FFD1A6` | 강조 테두리 |
| `color.brand.gradient` | `#FF9D5C → #F26B12` (좌→우) | 홈 상단 강조 카드 |
| `color.bg.screen` | `#FFF8F3` | 화면 배경(크림) |
| `color.bg.surface` | `#FFFFFF` | 카드, 탭바, 시트 |
| `color.bg.muted` | `#F9FAFB` | 입력칸·비활성 영역 |
| `color.text.primary` | `#111827` | 제목·본문 강조 |
| `color.text.body` | `#374151` | 본문 |
| `color.text.secondary` | `#6B7280` | 보조 설명 |
| `color.text.tertiary` | `#9CA3AF` | 캡션, 비활성 라벨 |
| `color.text.disabled` | `#D1D5DB` | 비활성 아이콘 |
| `color.border.divider` | `#F3F4F6` | 구분선, 탭바 상단선 |
| `color.accent.test` | `#6C63E0` | 주변인 테스트 강조 |
| `color.accent.testSoft` | `#F1F0FD` | 테스트 칩 배경 |
| `color.accent.testBorder` | `#E3E1FA` | 테스트 카드 테두리 |
| `color.accent.testGradient` | `#B7B1F5 → #8A82EA` | 테스트 카드 헤더 |
| `color.status.success` / `successBg` | `#059669` / `#ECFDF5` | 일치·완료 |
| `color.status.warning` / `warningBg` | `#D97706` / `#FFFBEB` | 대기·주의·불일치 |
| `color.status.danger` / `dangerBg` | `#EF4444` / `#FEF2F2` | 오류·거절·신고 |
| `color.badge` | `#EF4444` | 알림 숫자 배지 |
| `color.category.daily` / `food` / `trip` | `#6C63E0`·`#DB2777`·`#0284C7` (배경 `#F1F0FD`·`#FCE7F3`·`#E0F2FE`) | 테스트 카테고리 칩 |
| `color.social.kakao` / `kakaoText` | `#FEE500` / `#191919` | 카카오 버튼(카카오 가이드 준수) |
| `color.avatar.tones` | `#FFB37C #8FB8FF #FFC98F #B5A6FF #FF9E9E #9FD1C7 #FFD08F` | 사진 없을 때 아바타 배경(사용자 ID 해시로 고정 선택) |

Google·Apple 로그인 버튼은 각 사 공식 버튼 가이드를 따른다(색 토큰 사용 안 함).

## 3. 타이포그래피

글꼴: **Pretendard**(앱에 번들, 라이선스 OFL). 대체: Android 시스템 글꼴, iOS SF Pro/Apple SD Gothic Neo.

| 토큰 | 크기/굵기/행간 | 용도 |
|---|---|---|
| `type.display` | 24 / ExtraBold(800) / 32 | 로고·결과 점수 |
| `type.title1` | 20 / Bold / 28 | 화면 큰 제목 |
| `type.title2` | 18 / ExtraBold / 26 | 섹션 대표 수치·이름 |
| `type.title3` | 16 / Bold / 24 | 카드 제목 |
| `type.button` | 15 / SemiBold~Bold / 22 | 주요 버튼 |
| `type.body` | 14 / Regular·Medium / 21 | 본문 |
| `type.bodyStrong` | 14 / Bold / 21 | 강조 본문 |
| `type.caption` | 12 / Regular / 17 | 보조 설명 |
| `type.micro` | 11 / Regular / 16 | 메타 정보 |
| `type.tabLabel` | 10 / Regular(활성 Bold) / 14 | 하단 탭 라벨 |
| `type.badge` | 9 / Bold | 숫자 배지 |

- 단위: Android `sp`, iOS는 Dynamic Type 대응(`relativeTo:`로 스케일). 글자 확대 200%에서 잘림·겹침 없어야 한다(QA 항목).
- 기존 웹은 `font-bold`가 압도적으로 많다 — 굵기 대비로 위계를 만드는 스타일을 유지한다.

## 4. 간격·모서리·그림자

| 토큰 | 값 | 기존 웹 |
|---|---|---|
| `space.screenX` | 20 | `px-5` 화면 좌우 여백 |
| `space.xs / sm / md / lg / xl` | 4 / 8 / 12 / 16 / 24 | `gap-1/2/3`, `p-4`, `mt-6` |
| `space.cardPadding` | 16 | `p-4` |
| `radius.sm` | 8 | `rounded-lg` 작은 칩 |
| `radius.md` | 12 | `rounded-xl` 버튼·입력칸 |
| `radius.lg` | 16 | `rounded-2xl` **카드 기본** |
| `radius.xl` | 24 | `rounded-3xl` 바텀시트·모달 상단 |
| `radius.full` | 999 | 아바타·칩·배지 |
| `elevation.card` | y1 blur3 `#000` 8% | `shadow-sm` 카드 기본 |
| `elevation.raised` | y4 blur12 `#000` 10% | `shadow-md` 떠 있는 버튼 |
| `elevation.sheet` | y10 blur24 `#000` 12% | `shadow-lg` 시트 |

터치 영역 최소 48dp(Android) / 44pt(iOS). 웹의 작은 버튼도 네이티브에서는 이 크기를 맞춘다.

## 5. 컴포넌트 대응표

| 컴포넌트 | 웹 원형(클래스) | Compose | SwiftUI |
|---|---|---|---|
| `PrimaryButton` | `rounded-xl bg-[#F26B12] py-4 text-[15px] font-semibold text-white active:opacity-90` | `ZButton.Primary` (높이 52, radius.md) | `ZPrimaryButtonStyle` |
| `SecondaryButton` | 흰 배경 + `border-[#F26B12]` + 오렌지 글씨 | `ZButton.Secondary` | `ZSecondaryButtonStyle` |
| `SmallButton` | `rounded-xl px-4 py-2 text-xs font-bold` | `ZButton.Small` | `.controlSize(.small)` 대응 스타일 |
| `Card` | `rounded-2xl bg-white p-4 shadow-sm` | `ZCard` | `ZCard` |
| `HighlightCard` | 오렌지 그라데이션 + 흰 글씨 | `ZHighlightCard` | `ZHighlightCard` |
| `Avatar` | 원형, 사진 또는 첫 글자+톤색, 편집 시 우하단 연필 배지 | `ZAvatar(size)` | `ZAvatar(size:)` |
| `Chip` | `rounded-full bg-[#FFE9D6] text-[#F26B12] text-sm font-bold` | `ZChip` | `ZChip` |
| `StatusChip` | 상태별 success/warning/danger 배경+글씨 | `ZStatusChip(status)` | 동일 |
| `Badge` | `bg-red-500 text-[9px] font-bold rounded-full min-w-4 h-4` | `ZBadge(count)` | 동일 |
| `SectionHeader` | 제목 `text-base font-bold` + 우측 "더보기" `text-xs text-gray-400` | `ZSectionHeader` | 동일 |
| `TextField` | `rounded-xl bg-gray-50` + 오류 시 `text-[11px] text-red-500` 안내 | `ZTextField` | 동일 |
| `BottomSheet/Modal` | 상단 `rounded-t-3xl` 흰 시트 | M3 `ModalBottomSheet` | `.sheet` + `presentationDetents` |
| `TabBar` | 흰 배경, 상단 구분선, 활성 오렌지/비활성 `gray-300` 아이콘, 라벨 10 | M3 `NavigationBar`(색만 토큰) | `TabView` + tint |
| `ScoreBar` | 두꺼운 막대(높이 32), 숫자는 흰 칩 안 | `ZScoreBar` | 동일 |
| `SwipeCard`(밸런스 게임) | 나갈 때 위로 28 이동+0.85배+투명 220ms ease-in / 들어올 때 아래 28에서 0.92배→1 260ms ease-out | `AnimatedContent` 사용자 전환 | `.transition` + `withAnimation` |
| `EmptyState` / `ErrorState` / `Loading` | 회색 아이콘 + 안내 + (재시도 버튼) | 공통 컴포저블 | 공통 View |

## 6. 아이콘

기존 웹은 lucide 아이콘. 네이티브 대응:

| 의미 | lucide | Android(Material Symbols Rounded) | iOS(SF Symbols) |
|---|---|---|---|
| 홈 | Home | `home` | `house` |
| 매칭 | Heart | `favorite` | `heart` / `heart.fill`(배지 있을 때) |
| 메시지 | Send / MessageCircle | `chat_bubble` | `bubble.left` |
| 마이페이지 | User | `person` | `person` |
| 연결된 사람 | Users | `group` | `person.2` |
| 초대코드 | Ticket | `confirmation_number` | `ticket` |
| 뒤로 | ChevronLeft | 플랫폼 기본 | 플랫폼 기본 |
| 신고 | Flag | `flag` | `flag` |

플랫폼 기본 아이콘을 쓰되 선 두께·모서리는 둥근 계열로 맞춘다. 브랜드 로고·일러스트·테스트 카드 이미지는 공통 에셋(`packages/design-tokens/assets`).

## 7. 화면 규칙

- 배경 `bg.screen`(크림), 콘텐츠는 흰 카드로 묶는다. 좌우 20 여백.
- 상단: 네이티브 앱바(웹의 커스텀 헤더를 그대로 복제하지 않고 OS 앱바 + 브랜드 색 적용).
- 모든 목록/상세 화면은 **로딩·빈 화면·오류(재시도)** 세 상태를 반드시 가진다. 문구는 두 앱이 같다.
- 사용자 문구 말투: 기존 웹처럼 "~해요/~할까요?" 존댓말. 오류 문구는 원인 + 할 일("잠시 후 다시 시도해 주세요").
- 웹뷰 페이지(`apps/web`)는 같은 토큰으로 만든 Tailwind 설정을 쓰고, 앱 안에서는 자체 헤더·탭바를 숨긴다(네이티브가 제공).

## 8. 기존 웹에서 바꾸는 점

- 하드코딩 hex(`text-[#F26B12]` 등)는 토큰 이름으로 대체.
- 웹 폭 430px 프레임은 네이티브에서 불필요(태블릿은 MVP에서 최대 폭 제한만).
- 네이버 로그인 버튼(`#03C75A`), 포인트 배지, 가게 홍보 슬롯은 MVP에서 제외.
- 하단 탭 "마을"은 제외, "메시지"는 대화 목록으로 실제 동작.
