# 주변 (Jubyeon) - Web App

내 주변의 사람들과 신뢰로 연결되는 지역 커뮤니티 서비스. Next.js + Tailwind CSS 기반 웹으로 1차 개발 후, 웹앱 형태로 제공합니다.

## 기술 스택
- IDE: Cursor
- Frontend: Next.js (App Router) + Tailwind CSS
- Backend/DB (예정): Supabase
- Icon: lucide-react

## 폴더 구조 (확장자별 대분류)
```
jubyeon-web/
├─ src/
│  ├─ app/          # 라우팅 페이지 (.tsx) - Next.js App Router 필수 위치
│  ├─ components/   # 화면 단위 UI 컴포넌트 (.tsx)
│  ├─ lib/          # 로직/유틸/초기화 함수 (.ts)
│  └─ styles/       # 커스텀 스타일 (.css, 전역 tailwind 설정 외)
├─ public/assets/    # 이미지 등 정적 리소스
├─ docs/             # 변경 이력, 규칙 등 문서 (.md)
└─ (root 설정 파일)  # package.json, tsconfig.json, tailwind.config.ts 등
                      # → Next.js 특성상 config 계열은 반드시 루트에 위치해야 하므로
                      #   대분류상 "설정" 그룹으로 간주하되 물리적 이동은 하지 않습니다.
```

## 명명 규칙
모든 변수/상태명은 `단어_단어_...` 형태, 각 단어는 최대 4자로 제한합니다.
예) `sess_id`, `init_stat`, `step_idx`, `done_flag`, `load_conf`

## 현재 구현 범위 (2/3 페이지)
- `/` (`src/app/page.tsx`) : 접속 시 최초로 뜨는 **로딩 화면**
  - 접속 시 사용자 세션/로컬 정보를 초기화(`clr_stor`)
  - 신규 세션 발급(`make_sid`) → 환경설정 로드(`load_conf`) → 리소스 예열(`warm_asst`)
  - 초기화는 배경에서 진행되며, 화면을 탭하면 바로 `/login` (2번째 화면)으로 이동
  - 하단 도트 4개가 초기화 단계 진행률을 표시

- `/login` (`src/app/login/page.tsx`) : **로그인 화면**
  - 휴대폰 번호 로그인(준비 중), 카카오/네이버/구글 소셜 로그인 버튼 제공
  - 소셜 로그인 로직은 `src/lib/auth/soc_auth.ts`에 정리
    - 각 사 Client ID 발급 전이므로 실제 인가 요청 부분은 TODO로 표시되어 있음
    - 버튼 클릭 → 처리 중 표시 → 완료 시 `/home`으로 이동하는 흐름은 동작함
  - 뒤로가기 시 이전 화면(로딩 화면)으로 이동

- `/home` : 3번째 화면 자리표시 페이지 (다음 단계에서 구현 예정)

## 실행 방법
```bash
npm install
npm run dev
```

## GitHub 업로드 안내
프로젝트 기록용으로 남겨주신 정보(`tkddyd94@gmail.com`)는 GitHub **저장소 URL**이 아니라 이메일 주소 형식이에요.
버전 기록을 위해서는 아래 둘 중 하나가 필요합니다.
1. GitHub 저장소 URL (예: `https://github.com/아이디/jubyeon-web`)
2. 또는 저장소가 아직 없다면, 위 이메일에 연결된 GitHub 계정의 아이디

저장소 URL/아이디를 알려주시면 커밋 메시지 규칙까지 포함한 push 가이드를 이어서 정리해드릴게요.
