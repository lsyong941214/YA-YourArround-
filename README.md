# 주변 (Jubyeon) - Web App

내 주변의 사람들과 신뢰로 연결되는 지역 커뮤니티 서비스.
Next.js + Tailwind CSS 기반 웹으로 1차 개발 후, 웹앱 형태로 제공합니다.

## 기술 스택
- IDE: Cursor
- Frontend: Next.js (App Router) + Tailwind CSS
- Backend/DB/Auth: Supabase (`@supabase/supabase-js`)
- Icon: lucide-react

## Supabase 설정
1. [supabase.com](https://supabase.com)에서 프로젝트를 생성한다.
2. Project Settings > API에서 Project URL / anon key를 확인해 `.env.local.example`을 `.env.local`로 복사하고 채운다.
3. SQL Editor에서 [supabase/schema.sql](supabase/schema.sql)을 실행해 테이블(`profiles`/`village_contacts`/`match_requests`/`blind_test_requests`/`blind_test_picks`/`chief_reviews`)과 RLS 정책을 생성한다.
4. Authentication > Providers > Email에서 **"Confirm email"을 끈다**
— 이 앱은 로그인ID를 합성 이메일(`{login_id}@jubyeon.local`)로 변환해 쓰기 때문에 실제 메일함이 없다.
켜져 있으면 가입 후 로그인이 막힌다.

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

## 현재 구현 범위 (3/3 페이지)
- `/` (`src/app/page.tsx`) : 접속 시 최초로 뜨는 **로딩 화면**
  - 접속 시 사용자 세션/로컬 정보를 초기화(`clr_stor`)
  - 신규 세션 발급(`make_sid`) → 환경설정 로드(`load_conf`) → 리소스 예열(`warm_asst`)
  - 초기화는 배경에서 진행되며, 화면을 탭하면 바로 `/login` (2번째 화면)으로 이동
  - 하단 도트 4개가 초기화 단계 진행률을 표시

- `/login` (`src/app/login/page.tsx`) : **로그인 화면**
  - 카카오/네이버/구글 소셜 로그인 버튼 제공 (각 사 Client ID 발급 전까지 TODO로 표시)
  - "휴대폰 번호로 시작하기" → 임시 로그인 화면(`/login/local`)으로 연결
  - 뒤로가기 시 이전 화면(로딩 화면)으로 이동
- `/login/local` (`src/app/login/local/page.tsx`) : **임시 로그인** — 실제 로그인 API 연동 전까지 사용
  - `src/lib/store/auth_store.ts`: 이름/역할(주민·이장님)/담당 마을 또는 연결 주민 프로필/나이/직업/MBTI/지역/소개/사진을 텍스트로 입력해 계정 생성, localStorage에 여러 계정을 저장해두고 전환 가능
  - 이장님 역할은 담당 마을(jang_id)을, 주민 역할은 기존 목업 주민 중 하나(memb_id)를 선택해 연결하면 그 주민 앞으로 온 요청을 받아볼 수 있음
  - `curr_user()` / `do_logout()` 등 함수 시그니처는 유지한 채, 추후 실제 로그인 API로 내부 구현만 교체 가능하도록 설계
- `/mypage` (`src/app/mypage/page.tsx`) : **마이페이지** — 내 프로필 확인, 계정 전환, 로그아웃

- `/home` (`src/app/home/page.tsx`) : **홈 대시보드**
  - `src/components/home/HomeScreen.tsx`: 상단 헤더(로고/알림/포인트), 프로필 카드, 내 역할·이장님 연락처 카드, 가이드 투어, 이장님 추천 주민 리스트, 하단 탭바
  - 프로필 사진(작은 연필 버튼) 클릭 시 `ProfEditModal`에서 사진 업로드(로컬 미리보기) + 소개 문구 수정 가능
    - TODO: 실제 서버(Supabase Storage 등) 업로드 연동
  - "내 역할" 카드를 탭하면 주민 ↔ 이장님 전환, 매칭 관련 문구도 함께 변경
  - "이장님 연락처" 카드는 역할과 무관하게 항상 동일하게 노출
  - 가이드 투어 버튼, 하단 탭바는 디자인만 반영되어 있고 동작은 추후 개발 예정
- `/resident/[memb_id]` (`src/app/resident/[memb_id]/page.tsx`) : **주민 상세 프로필**
  - 홈 화면의 "이장님 추천 주민" 카드를 클릭하면 이동
  - `src/components/resident/MembDetail.tsx`: 프로필/소개 정보 + 하단 "이장님께 요청하기" / "직접 매칭시도" 버튼(추후 업데이트 예정 안내)
  - 목업 데이터는 `src/lib/data/memb_data.ts`에서 관리 (실제 서버 연동 전까지 사용)

## 실행 방법
```bash
npm install
npm run dev
```

## GitHub 저장소
[github.com/lsyong941214/YA-YourArround-](https://github.com/lsyong941214/YA-YourArround-)
