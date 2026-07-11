# CHANGELOG

## v0.2.0 - 로그인 화면 구현 및 로딩 화면 전환 방식 개선
- 로딩 화면(`src/components/loading/LoadingScreen.tsx`)
  - 초기화 완료 후 일정 시간 대기 후 자동 전환하던 방식 제거
  - 화면 아무 곳이나 탭(클릭/Enter/Space)하면 즉시 로그인 화면으로 이동하도록 변경
  - 초기화(`init_app`)는 배경에서 계속 진행되며, 하단에 "화면을 탭하면 시작해요" 안내 문구 추가
- 로그인 화면(2번째 화면) 신규 구현
  - `src/components/login/LoginScreen.tsx`: 디자인 시안 재현 (뒤로가기, 로고, 신뢰 강조 문구, 실명 인증 안내, 하단 3가지 신뢰 요소 카드)
  - 로그인 수단: 휴대폰 번호(준비 중 안내), 카카오, 네이버, 구글
  - `src/lib/auth/soc_auth.ts`: 소셜 로그인 진입점(`soc_lgin`) 구현
    - 카카오/네이버/구글 각 사 Client ID 발급 전이라 실제 인가 요청은 TODO로 표시
    - 버튼 클릭 → 처리 중 상태 표시 → 완료 시 홈(`/home`)으로 이동하는 흐름은 완성
  - 로그인 실패 시 안내 메시지 노출 처리

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
