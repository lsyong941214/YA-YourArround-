---
name: port-screen
description: 기존 웹(lsyong941214/YA-YourArround-)의 화면을 참고해 Android(Compose)·iOS(SwiftUI) 네이티브 화면을 만들 때 사용. 흐름은 참고하고 디자인은 토큰으로 옮기되, 기존 웹의 버그·목업·임시 인증은 가져오지 않는다. "화면 만들어", "웹 화면을 앱으로", "홈/매칭/결과서 화면 구현" 같은 요청에 사용.
---

# 네이티브 화면 이식 절차

먼저 읽기: `docs/specs/SPEC_01_ARCHITECTURE.md` 3절(화면 ID·참고 웹 컴포넌트), `docs/specs/SPEC_06_DESIGN_SYSTEM.md`, 해당 플랫폼 규칙(`docs/rules/RULE_10_ANDROID.md`, `docs/rules/RULE_11_IOS.md`).

## 1. 원형 파악

1. `docs/specs/SPEC_01_ARCHITECTURE.md`에서 화면 ID와 "기존 웹 참고" 컴포넌트를 찾는다.
2. 기존 웹 컴포넌트(`src/components/...`)를 읽고 **정리만** 한다:
   - 보여주는 정보(필드), 사용자 행동(버튼), 상태별 분기(로딩·빈·오류·권한 없음)
   - 사용자 문구(존댓말 톤 유지)
   - 레이아웃 구조(카드 묶음, 섹션 순서)
3. 가져오지 않을 것 표시: 목업 데이터, 하드코딩 값(포인트 등), MVP 제외 기능(가게·결제·네이버·마을 탭), 클라이언트에서 테이블 직접 조회, 에러를 삼키는 코드, 클라이언트 점수 계산(서버로 이동).

## 2. 데이터 연결 확인

- 화면에 필요한 API가 `packages/api-contract`에 있는지 확인. 없으면 `add-api-endpoint`를 먼저 하도록 제안하고 멈춘다.
- 화면 상태 정의: `Loading / Content / Empty / Error(code)` + 화면 고유 상태.

## 3. 디자인 변환

- 웹 클래스 → 토큰: `rounded-2xl bg-white p-4 shadow-sm` → `ZCard`, `bg-[#F26B12]` 버튼 → `PrimaryButton`, `text-xs text-gray-400` → `type.caption` + `text.tertiary` (`docs/specs/SPEC_06_DESIGN_SYSTEM.md` 5절 대응표).
- 공통 컴포넌트가 없으면 `designsystem/`(Android)·`DesignSystem/`(iOS)에 **양쪽 같은 이름으로** 추가.
- 터치 영역 48dp/44pt, 글자 확대 200% 확인.
- 네비게이션·뒤로가기·시트·키보드는 OS 관례로(웹 모양 복제 금지).

## 4. 구현

- Android: `ui/<feature>/XxxScreen.kt` + `XxxViewModel.kt` + `XxxUiState.kt`, 라우트 이름 = 화면 ID. Compose Preview에 Content/Empty/Error 3종.
- iOS: `Features/<Feature>/XxxView.swift` + `XxxViewModel.swift`, `#Preview` 3종.
- 문구는 `strings.xml` / `Localizable.xcstrings`에 **같은 키 이름**(`home_title` 등).

## 5. 확인과 보고

- Android 단위 테스트(ViewModel 상태 흐름) + lint. 가능하면 에뮬레이터 스크린샷.
- iOS는 Mac에서만 빌드 가능 — 못 했으면 명시.
- 웹 원형과 달라진 점(의도적 변경 목록)을 보고에 적는다.
