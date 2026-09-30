# apps/ios — iOS 앱 작업 규칙

`docs/rules/RULE_00_COMMON.md`(공통 규칙)를 먼저 따른다. 이 파일은 iOS 전용 규칙이다.

## 스택 (결정 사항)

Swift · SwiftUI · async/await · URLSession · Codable · SwiftData · Keychain · supabase-swift · FCM(APNs 연결) · Crashlytics

- 최소 iOS 17. 의존성은 Swift Package Manager, 버전 **고정**(`exact` 또는 `upToNextMinor`).
- supabase-swift는 `Data/Auth`, `Data/Realtime`, `Data/Storage` 밖에서 import 금지.

## 폴더 구조

```
Zubyeon/
├─ App/                 # ZubyeonApp.swift, AppRouter(화면 ID 기반), 환경 설정
├─ Features/<Feature>/  # FeatureView.swift, FeatureViewModel.swift
│   (Auth, Onboarding, Home, Invite, Match, BlindTest, Chat, Safety, Settings, WebView)
├─ DesignSystem/        # Theme(토큰 생성물), Z* 공통 View·ButtonStyle
├─ Data/<Domain>/       # XxxRepository protocol + 구현, DTO, SwiftData 모델
├─ Data/API/            # APIClient(URLSession), 공통 헤더·오류 매핑, Idempotency-Key
├─ Data/Auth|Realtime|Storage/  # supabase-swift 래퍼
├─ Bridge/              # WKWebView 브리지(docs/specs/SPEC_05_BRIDGE.md)
└─ Core/                # RemoteConfig, 로깅
```
Scheme/Configuration: `Dev`, `Pilot`(번들 ID·API 주소 분리). 번들 ID는 착수 시 확정.

## 코드 규칙

- View → ViewModel(`@Observable`, `@MainActor`) → Repository protocol → APIClient/SwiftData/Keychain.
- ViewModel 상태는 `enum ViewState { loading, content(T), empty, error(APIError) }` 형태로 로딩·빈·오류를 표현.
- DTO는 `Codable` + `CodingKeys`로 `snake_case` 매핑(`keyDecodingStrategy = .convertFromSnakeCase` 허용). 모르는 enum은 `.unknown`으로 디코딩(커스텀 `init(from:)`), 디코딩 실패로 화면 전체가 죽지 않게.
- 상태 변경 요청은 작업 단위 `Idempotency-Key`를 ViewModel에서 만들고 재시도 때 재사용.
- 색·글꼴·간격은 `Theme` 토큰만. `Color(hex:)` 직접 사용 금지. Dynamic Type 대응.
- 문자열은 `Localizable.xcstrings`(한국어). 하드코딩 금지.
- 토큰은 Keychain(`AfterFirstUnlockThisDeviceOnly`). `UserDefaults`에 토큰·개인정보 저장 금지.
- 계정별 SwiftData 저장소·이미지 캐시를 분리하고 로그아웃 시 삭제.
- 이미지 업로드 전: 긴 변 1080px, JPEG ≤1MB, 메타데이터(위치 포함) 제거.
- 웹뷰: `WKScriptMessageHandlerWithReply`, 메인 프레임·허용 출처만, 외부 링크는 `SFSafariViewController`/시스템 브라우저.
- Apple 로그인은 `AuthenticationServices` 네이티브, OAuth 공급자는 `ASWebAuthenticationSession`.
- 연락처(초대코드 발급, `SPEC_04` 4절): `CNContactPickerViewController` 다중 선택 — 연락처 권한 요청 없이 사용자가 고른 항목만 받는다. `CNContactStore` 전체 조회 금지. 읽은 연락처는 저장·로그 금지.
- 초대 문자는 `MFMessageComposeViewController`(여러 수신자 가능)로 사용자가 직접 보낸다. 불가 기기는 공유 시트.
- 휴대폰 번호 정규화·검증 후 서버 전송(서버도 재검증).

## 명령어 (Mac 필요)

```bash
xcodebuild -scheme Zubyeon-Dev -destination 'platform=iOS Simulator,name=iPhone 15' build
xcodebuild -scheme Zubyeon-Dev -destination 'platform=iOS Simulator,name=iPhone 15' test
swiftlint
```
클라우드/리눅스 환경에서는 iOS 빌드를 돌릴 수 없다. 그 경우 "iOS 빌드 미검증"이라고 명시하고, 코드 리뷰 수준 확인만 했다고 보고한다.

## 테스트

- ViewModel: 가짜 Repository로 상태 전이 검증(XCTest 또는 Swift Testing).
- APIClient: `URLProtocol` 스텁에 계약 예제 JSON 사용.
- 오류 코드별 화면 분기 테스트.

## Android와 맞출 것

화면 ID, 사용자 문구, 로딩·빈·오류 상태, 오류 코드 처리, 이벤트 이름. OS 관례를 따를 것: 스와이프 뒤로가기, 키보드, 권한 요청, 시트.
