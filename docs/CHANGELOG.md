# CHANGELOG

## v0.1.0 - 로딩(스플래시) 화면 구현
- 프로젝트 초기 골격 생성 (Next.js + Tailwind CSS, App Router)
- 확장자별 폴더 대분류 구조 확정 (`src/app`, `src/components`, `src/lib`, `src/styles`, `docs`, `public/assets`)
- 1번째 화면(접속 시 로딩 화면) 구현
  - `src/components/loading/LoadingScreen.tsx`: 디자인 시안 재현 (그라디언트 배경, 로고, 태그라인, 일러스트, 특징 아이콘, 진행 도트)
  - `src/lib/init/sess_init.ts`: 접속 시 초기화 로직
    - 이전 로컬/세션 정보 초기화(`clr_stor`)
    - 신규 세션 ID 발급(`make_sid`)
    - 환경설정 로드(`load_conf`, Supabase 연동 지점 TODO 표시)
    - 리소스 예열(`warm_asst`)
    - 초기화 완료 시 `/login`으로 자동 전환
  - 초기화 4단계를 화면 하단 도트 인디케이터로 시각화
- 2·3번째 화면 라우트(`/login`, `/home`) 자리표시 페이지만 우선 생성 (다음 단계에서 구현 예정)
