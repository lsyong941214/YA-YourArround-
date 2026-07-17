/**
 * matc_store.ts
 * 매칭 요청(신청/수락/거절) 로컬 저장소
 * - 로그인/DB 연동 전까지 localStorage로 데모 (역할 전환만으로 신청자/이장님 화면을 오갈 수 있게 함)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: Supabase 연동 시 실제 매칭 요청 테이블 CRUD로 교체
 */

// pend: 이장님 검토 대기 / c_acpt: 이장님 수락(주민 응답 대기) / c_rjct: 이장님 거절
// r_acpt: 주민 수락(연결 성사) / r_rjct: 주민 거절
export type MatcStat = "pend" | "c_acpt" | "c_rjct" | "r_acpt" | "r_rjct";

export type MatcReq = {
  req_id: string;
  req_uid: string;
  jang_id: string;
  jang_name: string;
  memb_id: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  memb_reg: string;
  tag_list: string[];
  ini_char: string;
  ton_hex: string;
  req_name: string;
  req_age: number;
  req_job: string;
  req_mbti: string;
  req_reg: string;
  req_tags: string[];
  req_ini: string;
  req_ton: string;
  msg_txt: string;
  stat: MatcStat;
  acpt_cmt?: string;
  rjct_rsn?: string;
  rjct_msg?: string;
  seen_flag?: boolean;
  rvwd_flag?: boolean;
  made_at: number;
};

const STOR_KEY = "matc_list";

function is_brws(): boolean {
  return typeof window !== "undefined";
}

export function load_list(): MatcReq[] {
  if (!is_brws()) return [];
  try {
    const raw_str = window.localStorage.getItem(STOR_KEY);
    return raw_str ? (JSON.parse(raw_str) as MatcReq[]) : [];
  } catch {
    return [];
  }
}

function save_list(list_val: MatcReq[]): void {
  if (!is_brws()) return;
  window.localStorage.setItem(STOR_KEY, JSON.stringify(list_val));
}

export function add_req(inp: Omit<MatcReq, "req_id" | "stat" | "made_at">): MatcReq {
  const next_req: MatcReq = {
    ...inp,
    req_id: "req_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    stat: "pend",
    made_at: Date.now(),
  };
  const list_val = load_list();
  list_val.unshift(next_req);
  save_list(list_val);
  return next_req;
}

export function find_req(req_id: string): MatcReq | undefined {
  return load_list().find((r_item) => r_item.req_id === req_id);
}

export function updt_req(req_id: string, patch: Partial<MatcReq>): void {
  const list_val = load_list().map((r_item) =>
    r_item.req_id === req_id ? { ...r_item, ...patch } : r_item
  );
  save_list(list_val);
}

export function has_req(jang_id: string, memb_id: string): boolean {
  return load_list().some((r_item) => r_item.jang_id === jang_id && r_item.memb_id === memb_id);
}

// 특정 이장님(jang_id)이 검토해야 할 대기중 요청
export function jang_pend_list(jang_id: string): MatcReq[] {
  return load_list().filter((r_item) => r_item.jang_id === jang_id && r_item.stat === "pend");
}

export function jang_pend_cnt(jang_id: string): number {
  return jang_pend_list(jang_id).length;
}

// 특정 주민(memb_id)이 아직 확인하지 않은, 이장님이 수락한 제안
export function memb_prop_list(memb_id: string): MatcReq[] {
  return load_list().filter((r_item) => r_item.memb_id === memb_id && r_item.stat === "c_acpt");
}

export function memb_prop_cnt(memb_id: string): number {
  return memb_prop_list(memb_id).filter((r_item) => !r_item.seen_flag).length;
}

export function mark_seen_memb(memb_id: string): void {
  const list_val = load_list().map((r_item) =>
    r_item.memb_id === memb_id && r_item.stat === "c_acpt" && !r_item.seen_flag
      ? { ...r_item, seen_flag: true }
      : r_item
  );
  save_list(list_val);
}

// 특정 유저(req_uid)가 보낸 요청 전체 (상태 무관)
export function sent_list(req_uid: string): MatcReq[] {
  return load_list()
    .filter((r_item) => r_item.req_uid === req_uid)
    .sort((a_item, b_item) => b_item.made_at - a_item.made_at);
}
