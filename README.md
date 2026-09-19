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
   - 이미 예전 버전(문항 5개 고정)의 `schema.sql`을 실행해둔 프로젝트라면
     [supabase/alter_blnd_categ.sql](supabase/alter_blnd_categ.sql)을 실행한다 — 주변인 테스트 문항이
     카테고리별(일상/음식/여행지) 랜덤 10개로 늘어나면서 `blind_test_requests.card_ids` 컬럼 추가와
     `blind_test_picks.card_idx` 상한(5 → 10) 확장이 필요하다.
   - 이미 예전 버전(결과서 화면 도입 전)의 `schema.sql`을 실행해둔 프로젝트라면
     [supabase/alter_blnd_rslt.sql](supabase/alter_blnd_rslt.sql)을 실행한다 — 주변인 테스트 결과서
     화면(연락하기/이장님 확인요청/종료하기)에 필요한 `blind_test_requests.req_actn`/`memb_actn`/
     `link_mtc_id` 컬럼과 `status` 값 `done` 추가, 상태 전이를 처리하는
     `blnd_submit_actn()` 함수를 만든다.
   - 밸런스 게임 카드 선택 시 `null value in column "question_id" of relation
     "blind_test_picks" violates not-null constraint` 오류가 뜬다면
     [supabase/alter_blnd_picks_qid.sql](supabase/alter_blnd_picks_qid.sql)을 실행한다 — 배포된
     프로젝트의 `blind_test_picks` 테이블이 문항을 `blind_test_questions`라는 별도 테이블로
     관리하는 예전 설계(`question_id`/`user_id` 컬럼, `(blind_test_id, side, question_id)`
     기본키)로 남아있어서, 지금 앱 코드가 기대하는 `(blind_test_id, side, card_idx)` 기본키와
     달라 카드를 고를 때마다 저장이 막히던 문제를 고친다.
   - 이미 예전 버전(주변인 테스트 진행 상태를 폴링으로만 확인하던)의 `schema.sql`을 실행해둔
     프로젝트라면 [supabase/alter_blnd_rtme.sql](supabase/alter_blnd_rtme.sql)을 실행한다 —
     `blind_test_requests`/`blind_test_picks` 두 테이블을 `supabase_realtime` publication에
     추가해, 상대방의 수락·거절/카드 선택/결과 화면 행동이 새로고침 없이 바로 반영되게 한다.
     이 파일을 실행하지 않으면 화면은 기존처럼 몇 초 간격 폴링으로만 갱신된다(실시간까지는 아니지만
     동작 자체는 그대로 유지됨).
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면
     [supabase/alter_revw_scop.sql](supabase/alter_revw_scop.sql)을 실행한다 — 이장님 리뷰
     작성 정책(`reviews_insert_own`)이 `reviewer_id = 본인` 확인만 하고 그 사람이 실제 해당
     `match_request_id`의 당사자(신청자/대상 주민)인지는 검증하지 않아서, 매칭과 무관한
     사람도 다른 사람의 `match_request_id`(UUID)만 알면 임의의 이장에게 가짜 리뷰를 남길 수
     있었던 문제를 고친다 (로컬 테스트 환경에서 직접 재현 후 확인).
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면
     [supabase/alter_matc_intg.sql](supabase/alter_matc_intg.sql)을 실행한다 — 홈 화면
     "내 역할" 토글로 같은 계정이 res/chief 역할을 자유롭게 오갈 수 있는데도, 지금까지는
     `match_requests`/`blind_test_requests`에 자기매칭(신청자=대상 주민)이나 역할이 맞지
     않는 행(예: `chief_id`가 실제로는 `res` 역할)이 들어가는 걸 막는 장치가 전혀 없어서,
     매칭 결과 화면에서 `TypeError`로 "Application error"가 뜨는 문제로 이어질 수 있었다.
     이 파일은 먼저 그런 행이 이미 있는지 점검하는 조회 쿼리를 실행한 뒤(있다면 CHECK 제약
     추가가 실패하므로 결과를 보고 먼저 정리), 자기매칭을 막는 CHECK 제약과 역할을
     검증하는 트리거를 추가한다.
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면
     [supabase/alter_blnd_ctct_mtc.sql](supabase/alter_blnd_ctct_mtc.sql)을 실행한다 —
     주변인 테스트 결과서 화면에서 둘 다 "연락하기"를 고른 경우, 예전에는
     `blind_test_requests.status`만 `done`으로 바뀔 뿐 채팅으로 이어질 `match_requests`가
     전혀 만들어지지 않았다. 결과서 화면에 채팅으로 바로 연결되는 "연락하기" 버튼이
     생기면서, 이제 둘 다 확인요청(`rvw`)을 고른 경우와 동일하게 `match_requests`를
     `r_acpt` 상태로 직접 만들도록 `blnd_submit_actn()`을 수정한다(함수 재정의라 몇 번
     실행해도 안전하다). **이 마이그레이션 적용 전에 이미 `done`이 된(둘 다 연락하기를
     고른) 기존 건에는 소급 적용되지 않아** 그 건들은 "연락하기" 버튼이 안 보인다.
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면
     [supabase/alter_rept_blck.sql](supabase/alter_rept_blck.sql)을 실행한다 — 신고
     (`reports`)/차단(`user_blocks`) 테이블을 추가한다. 프로필 보기 팝업의 "신고하기"/
     "차단하기" 버튼과 연락처 목록의 차단 필터링이 이 테이블 없이는 동작하지 않는다.
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면(위 `alter_rept_blck.sql`을 먼저
     적용한 뒤) [supabase/alter_acct_stat.sql](supabase/alter_acct_stat.sql)을 실행한다 —
     `profiles.acct_stat`(정상/정지/영구차단) 컬럼과, 서로 다른 신고자 3명 이상이 같은
     계정을 신고하면 자동으로 정지시키는 `reports_auto_susp` 트리거를 추가한다. 로그인 시
     `sess_stat()`이 정지/차단 계정을 안내 화면(`/suspended`)으로 보내는 것도 이 컬럼이
     있어야 동작한다.
   - 이미 예전 버전의 `schema.sql`을 실행해둔 프로젝트라면(위 `alter_rept_blck.sql`을 먼저
     적용한 뒤) [supabase/alter_admin.sql](supabase/alter_admin.sql)을 실행한다 —
     `profiles.is_admin` 플래그와, 관리자가 전체 신고를 조회·처리하고(`reports`) 대상 계정의
     `acct_stat`을 바꿀 수 있게 하는 RLS 정책을 추가한다. 신고 처리 화면(`/admin`)은 이게
     없으면 아무것도 보여줄 권한이 없다. **최초 관리자 지정은 앱에 UI가 없어 파일 하단
     주석의 SQL을 직접 실행해야 한다** (`update profiles set is_admin = true where id = ...`).
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
  - 프로필 사진(작은 연필 버튼) 클릭 시 `ProfEditModal`에서 사진 업로드 + 소개 문구 수정 가능
    - 사진은 로컬 미리보기가 아니라 Supabase Storage(`prof-img` 버킷)에 실제 업로드되고,
      공개 URL이 `profiles.avatar_url`에 저장된다 (`src/lib/supabase/stor_upld.ts`)
  - "내 역할" 카드를 탭하면 주민 ↔ 이장님 전환, 매칭 관련 문구도 함께 변경
  - "이장님 연락처" 카드는 역할과 무관하게 항상 동일하게 노출
  - 가이드 투어 버튼, 하단 탭바는 디자인만 반영되어 있고 동작은 추후 개발 예정
- `/invt` (`src/app/invt/page.tsx`) : **초대코드** — 주민과 이장을 연결하는 유일한 경로
  - 이장: 1회용 초대코드 발급 / 복사 / 폐기, 사용 여부 확인
  - 주민: 받은 코드를 입력해 이장과 연결
  - 코드를 가지고 있다는 것 자체가 이장의 승인이라, 사용 후 별도 수락 단계는 없음
- `/chat/[req_id]` (`src/app/chat/[req_id]/page.tsx`) : **채팅** — 연결 성사된 두 사람의 실시간 대화
  - `src/components/chat/ChatScreen.tsx`: 매칭 성사 화면(`/matched/[req_id]`)의 "채팅 시작하기"에서 진입
  - `chat_messages` 테이블 + Supabase Realtime, 이장은 대화 당사자가 아니라 접근 불가(RLS)
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
- **주변인 테스트 실시간 업데이트 / 진행 중 종료·거절**: 요청 수락/거절, 카드 선택, 결과
  화면 행동(연락하기/확인요청/종료하기), 그리고 게임 진행 중 주민(`memb`) 쪽 "종료하기"
  버튼(`blnd_submit_actn` RPC, 상태 `rjct` 전환 + 상대방에게 "상대방이 더 이상의 진행을
  원치 않는 것 같습니다." 팝업)까지 — **2026-09-10에 로컬 Postgres에 `schema.sql`을 그대로
  적용한 시뮬레이션 환경에서 RLS 정책과 `blnd_submit_actn()`/`use_invt_code()` 함수의 상태
  전이 로직 자체는 케이스별로 직접 실행 검증 완료** (그 과정에서 `chief_reviews` 리뷰 작성
  권한이 너무 느슨했던 버그와 `schema.sql` 말미의 문법 오류를 발견해 수정함 — 아래 커밋 참고).
  다만 이 검증은 DB 레이어에 한정된다: **Supabase Auth 실제 로그인, Storage 실제 업로드,
  Realtime 이벤트가 실제 브라우저까지 도달해 화면이 갱신되는지, 종료/거절 팝업과 홈 이동
  라우팅 같은 프론트엔드 동작은 아직 실제 환경에서 확인 전**이다 — 로컬 `npm run dev` +
  실제 브라우저로 두 계정 동시 접속해 확인해보는 걸 권한다.
- **메시징(채팅) 시스템**: `npm run build`(타입체크) 통과에 더해, **2026-09-13에 로컬 Postgres에
  `schema.sql`을 그대로 적용한 시뮬레이션 환경에서 `chat_messages` RLS 정책을 케이스별로 직접
  실행 검증 완료** — (1) 신청자/대상 주민은 서로의 메시지를 정상적으로 주고받음, (2) 이장 계정은
  같은 매칭의 채팅을 조회해도 0건만 보임(대화 비공개 확인), (3) 무관한 제3자는 조회·작성 모두
  거부됨, (4) 본인이 아닌 sender_id로 메시지를 위장해 보내는 시도 거부됨, (5) 아직 매칭
  성사(`r_acpt`) 전(`pend`)인 매칭방에는 당사자여도 메시지 작성이 거부됨, (6) 빈 메시지·2000자
  초과 메시지는 체크 제약으로 거부됨 — 총 9개 케이스 모두 의도한 대로 동작함을 확인.
  다만 이 검증도 DB 레이어에 한정된다: **Realtime 이벤트가 실제 브라우저까지 도달해 채팅창이
  갱신되는지, 실제 두 계정으로 메시지를 주고받는 UI 동작은 아직 실제 Supabase 환경에서 확인
  전**이다 — 실제 프로젝트에 `supabase/alter_chat_msgs.sql`을 적용한 뒤 `npm run dev` +
  두 계정 동시 접속으로 확인해보는 걸 권한다.

## TODO (다음 작업 예정)
- 소셜 로그인(카카오/네이버/구글) 실제 연동 — 각 사 Client ID 발급 후 `/login`의 로그인 버튼을
  실제 OAuth 흐름으로 교체 (현재는 로그인ID/비밀번호 임시 로그인(`/login/local`)만 동작)
- ~~메시징(채팅) 시스템 구현~~ (2026-09-11 구현 완료, 아래 "확인 필요" 참고)
  - 채팅 알림(새 메시지 배지/푸시 등)은 아직 없음 — 필요하면 후속 작업으로
- **서비스 출시 체크리스트 대응** (2026-09-18, 앱인토스 개발자센터 체크리스트 기준) —
  항목별 현재 상태와 세부 TODO는 [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) 참고
  - ✅ 연령 검증(만 19세 미만 가입 차단, 온보딩), 금칙어(불법 광고 의심 문구) 필터링(소개글/
    채팅), 신고·차단 MVP(프로필 보기 팝업의 "신고하기"/"차단하기", 차단 시 연락처 목록에서
    숨김), 반복 신고 자동 정지 + 계정 정지/영구 차단 안내 화면(`/suspended`), 신고 처리
    관리자 화면(`/admin` — 대기중/24시간 초과 신고 확인, 처리중·완료 표시, 대상 계정 정지/
    영구차단/정지해제) 구현 완료 — DB는 `supabase/alter_rept_blck.sql` →
    `supabase/alter_acct_stat.sql` → `supabase/alter_admin.sql` 순서로 실행 필요(위
    "Supabase 설정" 참고). `/admin`은 `profiles.is_admin`이 SQL로 직접 켜진 계정만 들어갈 수
    있고, 앱 메뉴 어디에도 이 화면으로 가는 링크는 없음(URL로만 접근)
  - ❌ 남은 항목: 수사기관 협조 시 채팅 원문까지 조회하는 절차(지금 `/admin`은 신고
    이력·계정 상태만 다룸, 채팅 내용은 여전히 SQL 직접 조회), AI 기반 이미지 검증, 결제
    환불 절차 — 세부는 LAUNCH_CHECKLIST.md 참고

## 메시징(채팅) 시스템 (2026-09-11)
- 매칭 성사(`match_requests.status = 'r_acpt'`) 후 `MatchedScreen.tsx`의 "채팅 시작하기" →
  `/chat/[req_id]` (`ChatScreen.tsx`)로 이동해 실시간 채팅
- `public.chat_messages` 테이블(`supabase/schema.sql`, 델타는 `supabase/alter_chat_msgs.sql`) +
  Supabase Realtime(`chat_store.ts`의 `sub_chat`)로 새 메시지를 폴링 없이 즉시 수신
- 이장은 매칭을 중개할 뿐 채팅 당사자가 아니므로, RLS가 `status = 'r_acpt'`이고
  `auth.uid()`가 신청자(`requester_id`)/대상 주민(`resident_id`) 중 하나일 때만 조회·작성을
  허용한다 — 이장은 대화 내용을 볼 수 없음

## 실행 방법
```bash
npm install
npm run dev
```

## GitHub 저장소
[github.com/lsyong941214/YA-YourArround-](https://github.com/lsyong941214/YA-YourArround-)
