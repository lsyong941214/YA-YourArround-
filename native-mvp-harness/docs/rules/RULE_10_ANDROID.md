# apps/android — Android 앱 작업 규칙

`docs/rules/RULE_00_COMMON.md`(공통 규칙)를 먼저 따른다. 이 파일은 Android 전용 규칙이다.

## 스택 (결정 사항)

Kotlin · Jetpack Compose · Material 3 · Navigation Compose · ViewModel · StateFlow · Coroutines · Hilt ·
Ktor Client · Kotlinx Serialization · Room · DataStore · Coil · supabase-kt · FCM · Crashlytics

- minSdk 26(Android 8), target/compileSdk는 출시 시점 Play 요구 버전.
- 라이브러리 버전은 `gradle/libs.versions.toml`에 **고정**. 버전 올리기는 별도 PR.
- supabase-kt는 커뮤니티 유지 라이브러리 → `data/auth`, `data/realtime`, `data/storage` 밖에서 import 금지.

## 패키지 구조 (단일 모듈로 시작)

```
app/src/main/java/<applicationId>/
├─ ui/<feature>/        # FeatureScreen.kt, FeatureViewModel.kt, FeatureUiState.kt
│   (auth, onboarding, home, invite, match, blindtest, chat, safety, settings, webview)
├─ ui/navigation/       # NavHost, 라우트 정의(화면 ID와 같은 이름)
├─ designsystem/        # ZubyeonTheme(토큰 생성물), Z* 공통 컴포넌트
├─ data/<domain>/       # XxxRepository(인터페이스+구현), 원격 DTO, 로컬 Entity
├─ data/api/            # ApiClient(Ktor), 공통 헤더·오류 매핑, Idempotency-Key 생성
├─ data/auth|realtime|storage/  # supabase-kt 래퍼
├─ bridge/              # 웹뷰 브리지(docs/specs/SPEC_05_BRIDGE.md)
└─ core/                # 설정(RemoteConfig), 로깅, 디스패처
```
`applicationId`는 착수 시 확정(`dev`/`pilot` flavor는 접미사 분리).

## 코드 규칙

- 화면 → ViewModel → Repository → ApiClient/Room/DataStore. 화면에서 Repository·SDK 직접 호출 금지.
- ViewModel은 `StateFlow<XxxUiState>` 하나로 상태를 노출하고, 일회성 이벤트는 `Channel`/`SharedFlow`.
- UiState는 `Loading / Content / Empty / Error(code, message, retryable)`를 표현할 수 있어야 한다.
- 네트워크 DTO는 계약(`packages/api-contract`)과 필드명이 같게 `@SerialName("snake_case")`. 모르는 필드 무시(`ignoreUnknownKeys = true`), 모르는 enum은 `UNKNOWN`으로 매핑.
- 상태 변경 요청은 ViewModel에서 작업 단위 `Idempotency-Key`를 만들어 재시도 때 같은 값을 재사용.
- 색·글꼴·간격은 `ZubyeonTheme`의 토큰만. `Color(0xFF...)` 직접 사용 금지.
- 문자열은 `res/values/strings.xml`(한국어). 하드코딩 문자열 금지.
- 계정별 데이터(Room DB 파일, Coil 캐시 디렉터리)는 사용자 ID로 분리하고 로그아웃 시 삭제.
- 토큰은 Keystore 기반 암호화 저장소에만. `SharedPreferences` 평문 저장 금지. 로그에 토큰·개인정보 출력 금지.
- 이미지 업로드 전: 긴 변 1080px 리사이즈, JPEG 압축(≤1MB), EXIF 제거.
- 웹뷰: `WebViewCompat.addWebMessageListener`만 사용, `addJavascriptInterface` 금지, 허용 출처 밖 이동은 Custom Tabs로.
- 뒤로가기는 시스템 제스처/Predictive Back 관례를 따른다.
- 연락처(초대코드 발급, `SPEC_04` 4절): 다중 선택은 `READ_CONTACTS` 런타임 권한 + 앱 내 선택 목록. 권한 요청 전 목적 안내 화면, 거부해도 번호 직접 입력으로 동작. 단건은 권한 없는 `ACTION_PICK`. 읽은 연락처는 Room·DataStore·로그에 남기지 않는다.
- 초대 문자는 `Intent.ACTION_SENDTO`(smsto:)로 OS 문자 앱을 연다. 여러 명이면 번호별로 순서대로 열거나 공유 시트를 쓴다. `SEND_SMS` 권한은 쓰지 않는다(Play 정책 제한).
- 휴대폰 번호는 `libphonenumber`로 정규화·검증 후 서버에 보낸다(서버도 재검증).

## 명령어

```bash
./gradlew assembleDevDebug            # 빌드
./gradlew testDevDebugUnitTest        # 단위 테스트
./gradlew lint ktlintCheck            # 정적 검사
./gradlew installDevDebug             # 에뮬레이터 설치
```
변경 후 최소 `testDevDebugUnitTest`와 `lint`를 돌리고 결과를 보고한다.

## 테스트

- ViewModel: 가짜 Repository + `kotlinx-coroutines-test` + Turbine으로 상태 흐름 검증.
- Repository: MockEngine(Ktor)으로 계약 예제 JSON(`packages/api-contract/examples`)을 응답으로 사용.
- 오류 코드별 UI(`account_restricted` → 제한 화면, `upgrade_required` → 업데이트 안내) 테스트.

## iOS와 맞출 것

화면 ID, 사용자 문구, 로딩·빈·오류 상태, 오류 코드 처리, 이벤트 이름. 다르게 해도 되는 것: 뒤로가기, 키보드, 권한 요청 UI, 시트 동작.
