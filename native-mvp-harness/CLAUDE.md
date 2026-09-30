# 주변 네이티브 MVP — Claude Code 진입점

Claude Code는 이 이름(`CLAUDE.md`)의 파일만 자동으로 읽는다. 실제 규칙은 카테고리별 문서에 있고, 이 파일은 목차 역할만 한다.

## 항상 적용 (자동 로드)

@docs/rules/RULE_00_COMMON.md

## 영역별 규칙 — 해당 폴더를 작업할 때 먼저 읽는다

- `apps/android` → `docs/rules/RULE_10_ANDROID.md`
- `apps/ios` → `docs/rules/RULE_11_IOS.md`
- `apps/web` → `docs/rules/RULE_20_WEBVIEW.md`
- `apps/admin` → `docs/rules/RULE_21_ADMIN.md`
- `supabase` → `docs/rules/RULE_30_BACKEND.md`

## 설계 기준 — 필요할 때 읽는다

`docs/specs/SPEC_01_ARCHITECTURE.md` ~ `SPEC_07_QA_RELEASE.md` (목록은 RULE_00_COMMON.md 4절)
