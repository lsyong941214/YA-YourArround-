---
name: supabase-chrome
description: "이 저장소(YA-YourArround-, '주변')에서 Supabase 스키마/RLS/함수 변경이 필요할 때 사용한다. schema.sql을 고치거나 새 alter_*.sql 델타 파일을 만든 뒤, 그걸 사람에게 넘겨 '대시보드에서 직접 실행해주세요'라고 하는 대신, Playwright로 조작하는 Chrome을 통해 Supabase 대시보드 SQL Editor에 직접 들어가 SQL을 실행한다. RLS 정책 추가/수정, 새 테이블/함수/트리거, 마이그레이션 적용, Storage 버킷/정책 설정처럼 'Supabase SQL Editor에서 실행해야 하는' 모든 변경에 트리거된다. 단순 코드/타입 변경(components, store 등 .ts/.tsx)에는 사용하지 않는다."
---

# Supabase 변경을 Chrome 자동화로 직접 적용하기

## 언제 쓰나
`supabase/schema.sql`을 고치거나 `supabase/alter_*.sql` 델타 파일을 새로 만드는 등, **Supabase
대시보드의 SQL Editor에서 실행해야 실제로 반영되는 변경**을 만들 때마다 이 스킬을 따른다.
지금까지는 SQL 파일만 만들어서 사용자에게 "SQL Editor에서 실행해주세요"라고 안내하고 끝냈는데,
앞으로는 그 실행 자체를 이 스킬이 대신한다.

코드만 바뀌는 작업(컴포넌트, store 등)에는 필요 없다. `.env.local`이 없어서 프로젝트 ref를 모를
때, 또는 SQL 자체가 없을 때도 해당 없음.

## 전제 조건 (매번 실행 전에 확인)
1. **Playwright가 이 환경에 있는지 확인한다.**
   ```bash
   node -e "require.resolve('playwright')" 2>/dev/null && echo OK || echo MISSING
   ```
   `MISSING`이면 이 스킬 전용으로 격리해서 설치한다 (프로젝트의 `package.json`을 건드리지 않는다 -
   이 앱과 무관한 도구성 의존성이라 뒤섞으면 안 된다):
   ```bash
   mkdir -p ~/.cache/claude-skills/jubyeon-supabase
   npm install --prefix ~/.cache/claude-skills/jubyeon-supabase playwright
   NODE_PATH=~/.cache/claude-skills/jubyeon-supabase/node_modules npx --prefix ~/.cache/claude-skills/jubyeon-supabase playwright install chromium
   ```
   이미 이 원격 실행 환경(Claude Code 클라우드 세션)이라면 Chromium이 `/opt/pw-browsers`에
   이미 설치돼 있고 `playwright` 전역 모듈도 있을 수 있다 - 먼저 위 확인 명령으로 존재 여부부터
   본다.

2. **`.env.local`이 있는지 확인한다.** `NEXT_PUBLIC_SUPABASE_URL`에서 project ref(서브도메인)를
   읽어 대시보드 URL을 만든다. 없으면 사용자에게 project ref를 물어본다.

## 실행 절차
1. 적용할 SQL을 파일로 먼저 저장한다 (`supabase/alter_*.sql` 등 - 지금까지 해오던 대로, 파일은
   항상 남긴다. 자동화는 "그 파일을 대신 실행해주는 것"이지 파일을 안 만들어도 된다는 뜻이 아니다).
2. 스크립트를 실행한다:
   ```bash
   NODE_PATH=$(npm root -g) node .claude/skills/supabase-chrome/scripts/apply-sql.cjs \
     --sql-file supabase/alter_cntc_visib.sql
   ```
   (전역에 없고 격리 설치했다면 `NODE_PATH=~/.cache/claude-skills/jubyeon-supabase/node_modules`로
   바꾼다.)
3. 스크립트의 종료 코드로 분기한다:
   - **0**: SQL을 실행하고 스크린샷을 남겼다는 뜻. **반드시 그 스크린샷을 Read 도구로 직접 열어
     눈으로 확인한다** - "Success. No rows returned" 같은 성공 표시인지, 에러 배너인지 스스로
     판단할 것. 종료 코드 0은 "스크립트가 끝까지 돌았다"는 뜻이지 "SQL이 성공했다"는 보장이
     아니다.
   - **2 (NETWORK_BLOCKED)**: 이 세션이 supabase.com에 네트워크로 못 나간다 (특히 클라우드
     세션의 egress 정책 때문일 수 있음 - 실제로 한 번 확인됨). 자동화를 포기하고, 기존 방식대로
     SQL 파일 경로를 알려주며 사용자에게 대시보드에서 직접 실행해달라고 안내한다.
   - **3 (LOGIN_NEEDED_HEADLESS)**: 로그인이 필요한데 화면을 띄울 수 없는 세션이다. 사용자에게
     "로컬 Claude Code(맥 터미널)에서 이 스크립트를 한 번 실행해서 로그인을 완료해두면, 그
     프로필이 이후 클라우드 세션에서도 재사용된다" — 단, 프로필은 **환경(로컬 디스크)마다
     별개**이므로 클라우드 컨테이너는 세션이 끝나면 프로필도 사라진다는 점을 함께 안내한다.
     이 경우도 최종 폴백은 SQL 파일을 직접 실행해달라고 안내하는 것.
   - **그 외**: 에러 메시지를 그대로 사용자에게 보여주고, 무엇이 실패했는지 설명한다.
4. 성공을 스크린샷으로 확인했으면, 그 사실과 실행한 SQL 요약을 사용자에게 보고한다. 실패했으면
   추측하지 말고 실제 에러 메시지/스크린샷을 근거로 설명한다.

## 로컬(맥) vs 클라우드 세션 차이
- **로컬(사용자 맥에서 도는 Claude Code)**: 실제 화면이 있으므로 스크립트가 `headless: false`로
  진짜 Chrome 창을 띄운다. 최초 1회 그 창에서 사용자가 직접 로그인하면, 로그인 세션은
  `~/.cache/claude-skills/jubyeon-supabase/chrome-profile`에 저장돼 다음 실행부터 자동
  재사용된다.
- **클라우드(claude.ai/code 웹) 세션**: 컨테이너가 매번 새로 뜨고 세션 종료 시 사라지는
  일회성 환경이라, 브라우저 프로필이 다음 세션까지 이어진다는 보장이 없다. 게다가 환경의
  네트워크 정책에 따라 `supabase.com` 자체가 막혀 있을 수 있다 (실제로 한 번 확인된 사례:
  이 세션은 egress 정책상 supabase.com에 아예 접근이 안 됐다). 이런 세션에서는 위 2/3번
  종료 코드로 자연히 폴백되니 억지로 우회하려 하지 말고 곧바로 "SQL 파일을 대시보드에서
  직접 실행해주세요"로 안내한다.

## 하지 말아야 할 것
- **비밀번호/2FA 코드를 채팅으로 받아 입력하지 않는다.** 로그인은 항상 사람이 실제로 뜬 브라우저
  창에서 직접 한다 - Claude는 절대 로그인 폼에 자격증명을 입력하지 않는다.
- 스크린샷 확인 없이 "성공했다"고 보고하지 않는다.
- 파괴적인 SQL(DROP TABLE, TRUNCATE, 컬럼 삭제 등)은 실행 전에 반드시 사용자에게 한 번 더
  확인받는다 - 이 스킬은 실행 방법을 자동화하는 것이지, 위험한 변경의 승인 절차까지 생략하는
  것은 아니다.
- Supabase SQL Editor의 실제 DOM 구조(Monaco 에디터 등)는 Supabase가 UI를 바꾸면 달라질 수
  있다. 스크립트가 셀렉터를 못 찾고 실패하면, 먼저 스크린샷으로 현재 화면을 확인하고 셀렉터를
  갱신할 것 - 무작정 재시도하지 않는다.
