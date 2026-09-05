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
3. SQL Editor에서 [supabase/schema.sql](supabase/schema.sql)을 실행해 테이블(`profiles`/`village_contacts`/`match_requests`/`blind_test_requests`/`blind_test_picks`/`chief_reviews`)과 RLS 정책, 그리고 프로필 사진용 Storage 버킷(`prof-img`)과 정책을 생성한다.
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면, 전체를 다시 돌리지 말고
     [supabase/alter_onbd.sql](supabase/alter_onbd.sql)과
     [supabase/alter_invt.sql](supabase/alter_invt.sql)만 차례로 실행한다
     (`profiles.user_age` → `profiles.birth_dt` 교체 + `prof-img` 버킷/정책 추가).
     **나이만으로는 생년월일을 복원할 수 없어 기존 계정의 나이 값은 보존되지 않는다** —
     기존 테스트 계정은 생년월일이 비게 되니 필요하면 손으로 채워 넣을 것.
   - `alter_invt.sql`은 초대코드 테이블(`invite_codes`)과 `use_invt_code()` 함수를 만들고,
     주민이 아무 이장에게나 직접 연결할 수 있던 옛 정책(`contacts_insert_resident`)을 내린다.
   - 주변인 테스트 신청 시 `column blind_test_picks_1.card_idx does not exist` 오류가 뜬다면
     [supabase/alter_blnd_picks.sql](supabase/alter_blnd_picks.sql)을 실행한다 — 배포된 프로젝트의
     `blind_test_picks` 테이블에 `card_idx` 컬럼이 빠져 있어(스키마가 완전히 적용되지 못한 것으로
     보임) 요청 생성 자체가 실패하던 문제를 고친다.
4. Authentication > Providers > Email에서 **"Confirm email"을 끈다**
— 이 앱은 로그인ID를 합성 이메일(`{login_id}@jubyeon.local`)로 변환해 쓰기 때문에 실제 메일함이 없다.
켜져 있으면 가입 후 로그인이 막힌다.

## 폴더 구조 (확장자별 대분류)
```
jubyeon-web/
├─ src/
│  ├─ app/          # 라우팅 페이지 (.tsx) - Next.js App Router 필수 위치
│  │                # `app/(main)/`는 URL에 영향 없는 라우트 그룹 - 로그인 이후 하단 탭바가
│  │                # 항상 보여야 하는 목록/대시보드 화면(홈/연락처 목록/매칭 목록/매칭 현황/
│  │                # 제안함/마이페이지)만 이 안에 두고, 상세·액션 화면(이장님 상세, 요청 보내기,
│  │                # 수락·거절, 밸런스 게임 등)은 그대로 `app/` 바로 아래에 둬 탭바 없이 유지한다
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
- `/login/local` (`src/app/login/local/page.tsx`) : **임시 로그인** — 실제 소셜 로그인 API 연동 전까지 사용
  - 로그인ID/비밀번호로 로그인하거나 새 계정을 만든다. 계정 생성은 **계정(인증)만** 만들고,
    프로필 입력은 온보딩 화면(`/onbd`)으로 넘긴다
  - 인증은 Supabase Auth를 쓰며, 실제 메일함이 없어 로그인ID를 합성 이메일(`{login_id}@jubyeon.local`)로 변환해 사용
- `/onbd` (`src/app/onbd/page.tsx`) : **최초 로그인 온보딩** — 내부 계정 프로필 작성
  - 필수: 프로필 사진 / 이름 / 역할(주민·이장님) / 생년월일 / MBTI, 선택: 직업 / 지역 / 소개
  - 사진은 Supabase Storage(`prof-img` 버킷)에 실제 업로드된다
  - 로그인 수단(로그인ID·비밀번호, 추후 카카오/네이버/구글)과 무관하게 이 화면 하나를 공유한다.
    `sess_stat()`이 `"onbd"`(세션은 있는데 `profiles` 행이 없음)인 유저가 이리로 들어온다
- `/mypage` (`src/app/(main)/mypage/page.tsx`) : **마이페이지** — 내 프로필 확인, 계정 전환, 로그아웃

- `/home` (`src/app/(main)/home/page.tsx`) : **홈 대시보드**
  - `src/components/home/HomeScreen.tsx`: 상단 헤더(로고/알림/포인트), 프로필 카드, 내 역할·이장님 연락처 카드, 가이드 투어, 이장님 추천 주민 리스트, 하단 탭바
  - 프로필 사진(작은 연필 버튼) 클릭 시 `ProfEditModal`에서 사진 업로드(로컬 미리보기) + 소개 문구 수정 가능
    - TODO: 실제 서버(Supabase Storage 등) 업로드 연동
  - "내 역할" 카드를 탭하면 주민 ↔ 이장님 전환, 매칭 관련 문구도 함께 변경
  - "이장님 연락처" 카드는 역할과 무관하게 항상 동일하게 노출
  - 가이드 투어 버튼, 하단 탭바는 디자인만 반영되어 있고 동작은 추후 개발 예정
- `/invt` (`src/app/invt/page.tsx`) : **초대코드** — 주민과 이장을 연결하는 유일한 경로
  - 이장: 1회용 초대코드 발급 / 복사 / 폐기, 사용 여부 확인
  - 주민: 받은 코드를 입력해 이장과 연결
  - 코드를 가지고 있다는 것 자체가 이장의 승인이라, 사용 후 별도 수락 단계는 없음
- `/resident/[memb_id]` (`src/app/resident/[memb_id]/page.tsx`) : **주민 상세 프로필**
  - 홈 화면의 "이장님 추천 주민" 카드를 클릭하면 이동
  - `src/components/resident/MembDetail.tsx`: 프로필/소개 정보 + 하단 "이장님께 요청하기" / "직접 매칭시도" 버튼(추후 업데이트 예정 안내)
  - 목업 데이터는 `src/lib/data/memb_data.ts`에서 관리 (실제 서버 연동 전까지 사용)

## 확인 필요 (실제 Supabase 환경에서 재검증)
- **밸런스 게임(주변인 테스트) 진행 중 앱 종료 후 이어하기**: 코드를 다시 따라가 보니 재진입 시
  `find_req()`로 저장된 픽을 다시 불러와 `pick_list().length`만큼 진행 단계(`step_idx`)를
  복원하는 구조라 설계상 문제는 없어 보이고, "돌아갈 진입점"도 매칭 현황(`/sent`)에서 받은/보낸
  주변인 테스트 항목을 누르면 `/blind/[blnd_id]`로 이동해 그대로 이어지도록 이미 구현돼 있다
  (이번에 하단 탭바가 전역 고정되면서 이 진입점 자체도 어느 화면에서나 갈 수 있게 됨).
  다만 이 저장소는 실제 Supabase 프로젝트에 붙어 있어 로그인 계정으로 직접 시나리오를
  재현해야 확실히 검증되므로, 앱 종료 후 재접속했을 때 실제로 이어지는지 한 번 확인해보면 좋겠다.

## TODO (다음 작업 예정)
- (현재 없음 - README를 다시 훑어보고 다음 작업을 정할 것)

## 실행 방법
```bash
npm install
npm run dev
```

## GitHub 저장소
[github.com/lsyong941214/YA-YourArround-](https://github.com/lsyong941214/YA-YourArround-)
