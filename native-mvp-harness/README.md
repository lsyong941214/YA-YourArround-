# native-mvp-harness

「주변 앱 개발 기술 결정서 v1.0」(2026-09-30)과 기존 웹(이 저장소)의 흐름·디자인을 바탕으로 만든
**네이티브 MVP 모노레포용 하네스 문서 묶음**이다. 새 모노레포를 만들면 이 폴더 안의 내용을 **루트에 그대로 복사**한다.

## 파일 이름 규칙

`카테고리_번호_대상.md` — RULE(작업 규칙) / SPEC(설계 기준) / SKILL(반복 작업 절차)

| 카테고리 | 파일 | 내용 |
|---|---|---|
| **RULE** 작업 규칙 | `docs/rules/RULE_00_COMMON.md` | 공통 규칙(범위, 절대 규칙, 명명, 작업 방식) |
| | `docs/rules/RULE_10_ANDROID.md` | Android(Kotlin·Compose) |
| | `docs/rules/RULE_11_IOS.md` | iOS(Swift·SwiftUI) |
| | `docs/rules/RULE_20_WEBVIEW.md` | 공용 웹뷰·공개 웹 |
| | `docs/rules/RULE_21_ADMIN.md` | 관리자 웹 |
| | `docs/rules/RULE_30_BACKEND.md` | Supabase 백엔드 |
| **SPEC** 설계 기준 | `docs/specs/SPEC_01_ARCHITECTURE.md` | 구조, 화면 ID·분류, 변경 관리 |
| | `docs/specs/SPEC_02_DOMAIN_MODEL.md` | 용어, 역할, 상태 전이, 점수 |
| | `docs/specs/SPEC_03_API_CONTRACT.md` | API 계약 규칙, 오류 코드 |
| | `docs/specs/SPEC_04_AUTH_SESSION.md` | 로그인, 세션, 권한 |
| | `docs/specs/SPEC_05_BRIDGE.md` | 앱↔웹뷰 브리지 |
| | `docs/specs/SPEC_06_DESIGN_SYSTEM.md` | 디자인 토큰, 컴포넌트 대응 |
| | `docs/specs/SPEC_07_QA_RELEASE.md` | 테스트, 배포, 운영 |
| **SKILL** 반복 절차 | `.claude/skills/add-api-endpoint/SKILL.md` | API 추가 |
| | `.claude/skills/port-screen/SKILL.md` | 웹 화면 → 네이티브 |
| | `.claude/skills/add-bridge-command/SKILL.md` | 브리지 명령 추가 |
| | `.claude/skills/supabase-migration/SKILL.md` | DB 마이그레이션 |

## 이름을 바꿀 수 없는 파일 2종

- `CLAUDE.md`(루트 1개): Claude Code가 자동으로 읽는 유일한 파일명. 내용은 RULE 문서를 불러오는 목차뿐이다.
- `SKILL.md`: Claude Code 스킬은 `.claude/skills/<스킬 이름>/SKILL.md` 형식이어야 인식된다. 구분은 폴더 이름으로 한다.

`[정책 확인]` 표시는 결정서 11장 "착수 전 팀 확인사항"에 해당하는 미결정 항목이다.
