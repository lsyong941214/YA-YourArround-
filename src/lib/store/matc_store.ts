/**
 * matc_store.ts
 * 매칭 요청(신청/수락/거절) 로컬 저장소
 * - 로그인/DB 연동 전까지 localStorage로 데모 (역할 전환만으로 신청자/이장님 화면을 오갈 수 있게 함)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: Supabase 연동 시 실제 매칭 요청 테이블 CRUD로 교체
 */

export type MatcStat = "pend" | "acpt" | "rjct";

export type MatcReq = {
  req_id: string;
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
  rate_val?: number;
  rjct_rsn?: string;
  rjct_msg?: string;
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

export function pend_cnt(): number {
  return load_list().filter((r_item) => r_item.stat === "pend").length;
}

export function has_req(jang_id: string, memb_id: string): boolean {
  return load_list().some((r_item) => r_item.jang_id === jang_id && r_item.memb_id === memb_id);
}
