# 프로젝트 공통 개발 규칙

1. **GitHub 기록**: 모든 개발 내역은 GitHub 저장소에 기록해 이력 관리한다.
2. **버전 관리 텍스트**: 매 개선 사항마다 요약 텍스트(CHANGELOG)를 남긴다. → `docs/CHANGELOG.md`
3. **폴더 대분류**: 파일은 확장자 기준 공통 대분류 폴더로 관리한다.
   - `.tsx`(라우팅) → `src/app`
   - `.tsx`(컴포넌트) → `src/components`
   - `.ts`(로직) → `src/lib`
   - `.css` → `src/styles`
   - `.md` → `docs`
   - 이미지 등 → `public/assets`
4. **명명 규칙**: 변수/상태명은 `단어_단어_...` 형태로 의미가 드러나게 짓고, 각 단어는 최대 4자.
   - 예: `sess_id`, `init_stat`, `step_idx`, `done_flag`
