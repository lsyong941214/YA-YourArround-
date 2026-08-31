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
3. SQL Editor에서 [supabase/schema.sql](supabase/schema.sql)을 실행해 테이블(`profiles`/`village_contacts`/`match_requests`/`blind_test_requests`/`blind_test_picks`/`blind_test_questions`/`chief_reviews`)과 RLS 정책, 그리고 프로필 사진용 Storage 버킷(`prof-img`)과 정책을 생성한다.
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면, 전체를 다시 돌리지 말고
     [supabase/alter_onbd.sql](supabase/alter_onbd.sql),
     [supabase/alter_invt.sql](supabase/alter_invt.sql),
     [supabase/alter_blnd.sql](supabase/alter_blnd.sql)을 차례로 실행한다
     (`profiles.user_age` → `profiles.birth_dt` 교체 + `prof-img` 버킷/정책 추가).
     **나이만으로는 생년월일을 복원할 수 없어 기존 계정의 나이 값은 보존되지 않는다** —
     기존 테스트 계정은 생년월일이 비게 되니 필요하면 손으로 채워 넣을 것.
   - `alter_invt.sql`은 초대코드 테이블(`invite_codes`)과 `use_invt_code()` 함수를 만들고,
     주민이 아무 이장에게나 직접 연결할 수 있던 옛 정책(`contacts_insert_resident`)을 내린다.
   - `alter_blnd.sql`은 밸런스 게임 문항 뱅크(`blind_test_questions`) 테이블을 만들고
     문항 20개를 시드로 채운 뒤, `blind_test_picks.card_idx`의 상한(5) 제약을 없앤다.
   - `alter_blnd_game.sql`은 게임별 문항 배정 테이블(`blind_test_game_questions`)을 추가하고,
     `blind_test_picks`를 `question_id`/`user_id` 기준으로 재구성한다(기존 픽 데이터는 보존되지 않음).
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
- `/login/local` (`src/app/login/local/page.tsx`) : **임시 로그인** — 실제 소셜 로그인 API 연동 전까지 사용
  - 로그인ID/비밀번호로 로그인하거나 새 계정을 만든다. 계정 생성은 **계정(인증)만** 만들고,
    프로필 입력은 온보딩 화면(`/onbd`)으로 넘긴다
  - 인증은 Supabase Auth를 쓰며, 실제 메일함이 없어 로그인ID를 합성 이메일(`{login_id}@jubyeon.local`)로 변환해 사용
- `/onbd` (`src/app/onbd/page.tsx`) : **최초 로그인 온보딩** — 내부 계정 프로필 작성
  - 필수: 프로필 사진 / 이름 / 역할(주민·이장님) / 생년월일 / MBTI, 선택: 직업 / 지역 / 소개
  - 사진은 Supabase Storage(`prof-img` 버킷)에 실제 업로드된다
  - 로그인 수단(로그인ID·비밀번호, 추후 카카오/네이버/구글)과 무관하게 이 화면 하나를 공유한다.
    `sess_stat()`이 `"onbd"`(세션은 있는데 `profiles` 행이 없음)인 유저가 이리로 들어온다
- `/mypage` (`src/app/mypage/page.tsx`) : **마이페이지** — 내 프로필 확인, 계정 전환, 로그아웃

- `/home` (`src/app/home/page.tsx`) : **홈 대시보드**
  - `src/components/home/HomeScreen.tsx`: 상단 헤더(로고/알림/포인트), 프로필 카드, 내 역할·이장님 연락처 카드, 가이드 투어, 연결된 주민(이장일 때) 리스트, 하단 탭바
  - 프로필 사진(작은 연필 버튼) 클릭 시 `ProfEditModal`에서 사진 업로드(Supabase Storage 실연동) + 소개 문구 수정 가능
  - "내 역할" 카드를 탭하면 주민 ↔ 이장님 전환, 매칭 관련 문구도 함께 변경
  - "이장님 연락처" 카드는 역할과 무관하게 항상 동일하게 노출, 탭하면 `/chief`로 이동
  - 가이드 투어 버튼, 하단 탭바는 디자인만 반영되어 있고 동작은 추후 개발 예정
- `/invt` (`src/app/invt/page.tsx`) : **초대코드** — 주민과 이장을 연결하는 유일한 경로
  - 이장: 1회용 초대코드 발급 / 복사 / 폐기, 사용 여부 확인
  - 주민: 받은 코드를 입력해 이장과 연결
  - 코드를 가지고 있다는 것 자체가 이장의 승인이라, 사용 후 별도 수락 단계는 없음
- `/chief` (`src/app/chief/page.tsx`) : **연락처 목록** — 역할에 따라 "연결된 주민"(이장) / "이장님 연락처"(주민)를 실제 연결(`village_contacts`) 기준으로 표시
- `/cntc/[uid]` (`src/app/cntc/[uid]/page.tsx`) : **연락처 상세** — 해당 유저 프로필, 그 유저 기준 연결된 상대방 목록, (이장일 때) "성공한 만남" 카드로 `/chief/[jang_id]/reviews`(이장님 리뷰 목록) 진입
- `/chief/[jang_id]/request/[memb_id]`, `/chief/[jang_id]/blind/[memb_id]` : 연결 요청 보내기 / 주변인 테스트 신청 화면
- `/blind/[blnd_id]` (`src/app/blind/[blnd_id]/page.tsx`) : **주변인 테스트** — 수락/거절, 수락 후 밸런스 게임(`BlndGameScreen.tsx`) 진행
  - 문항 뱅크(`blind_test_questions`)에서 카테고리(topic)별로 2~3개씩, 총 10개를 무작위로 뽑아 한 게임에 고정 배정한다(`blind_test_game_questions`, `ensure_game_qstns`) — 신청자/대상 주민 둘 다 같은 문항·순서를 본다
  - 카드에는 이미지만, 문항 텍스트는 카드 아래에 별도로 노출. 문항별 이미지(`image_a`/`image_b`)가 아직 없으면 기본 그라디언트 카드로 자연스럽게 대체, 준비되는 대로 테이블만 채우면 바로 반영됨
  - 같은 문항이 다른 게임에서 다시 나오면, 예전에 골랐던 카드에 하이라이트(`pick_hist`)가 표시됨

## 실행 방법
```bash
npm install
npm run dev
```

## GitHub 저장소
[github.com/lsyong941214/YA-YourArround-](https://github.com/lsyong941214/YA-YourArround-)
