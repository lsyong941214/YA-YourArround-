/**
 * sess_init.ts
 * 접속 시 실행되는 초기화 로직 모음
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */

export type InitStep = {
  step_key: string;
  step_lbl: string;
};

export type InitProg = {
  step_idx: number;
  step_list: InitStep[];
  done_flag: boolean;
};

export type InitCbfn = (prog: InitProg) => void;

// 초기화 단계 정의 (화면 하단 도트 4개와 매핑됨)
const STEP_LIST: InitStep[] = [
  { step_key: "clr_stor", step_lbl: "이전 접속정보 초기화" },
  { step_key: "make_sid", step_lbl: "새 세션 발급" },
  { step_key: "load_conf", step_lbl: "환경설정 불러오기" },
  { step_key: "warm_asst", step_lbl: "리소스 준비" },
];

function wait_ms(ms_val: number): Promise<void> {
  return new Promise((res_fn) => setTimeout(res_fn, ms_val));
}

// 1) 로컬/세션 스토리지에 남아있는 이전 접속정보 초기화
// - 로그인 세션(auth_curr)은 매 접속마다 새로 로그인하도록 초기화하지만,
//   유저 정보(auth_users/auth_init)는 "DB 테이블"에 해당하므로 접속과 무관하게 유지한다
function clr_stor(): void {
  if (typeof window === "undefined") return;
  const keep_list = ["theme_pref", "auth_users", "auth_init"];
  Object.keys(window.localStorage).forEach((key_str) => {
    if (!keep_list.includes(key_str)) {
      window.localStorage.removeItem(key_str);
    }
  });
  window.sessionStorage.clear();
}

// 2) 새 세션 아이디 발급
function make_sid(): string {
  const sess_id =
    "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("sess_id", sess_id);
  }
  return sess_id;
}

// 3) 서버/환경 설정 로드 (추후 Supabase 연동 지점)
async function load_conf(): Promise<void> {
  // TODO: Supabase 프로젝트 연동 시 이 위치에서 config fetch
  await wait_ms(350);
}

// 4) 초기 리소스(이미지/폰트 등) 예열
async function warm_asst(): Promise<void> {
  await wait_ms(250);
}

/**
 * 앱 초기화 메인 함수
 * cb_fn 을 통해 진행 상태를 화면에 전달
 */
export async function init_app(cb_fn: InitCbfn): Promise<void> {
  const emit_prog = (idx_val: number, done_val: boolean) => {
    cb_fn({ step_idx: idx_val, step_list: STEP_LIST, done_flag: done_val });
  };

  emit_prog(0, false);
  clr_stor();
  await wait_ms(200);

  emit_prog(1, false);
  make_sid();
  await wait_ms(200);

  emit_prog(2, false);
  await load_conf();

  emit_prog(3, false);
  await warm_asst();

  emit_prog(4, true);
}
