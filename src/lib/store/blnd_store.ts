/**
 * blnd_store.ts
 * "주변인 테스트"(비공개 성향 테스트) 요청 로컬 저장소
 * - 로그인/DB 연동 전까지 localStorage로 데모
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자 ("블라인드" -> blnd)
 * - TODO: Supabase 연동 시 실제 주변인 테스트 요청 테이블 CRUD로 교체
 */

export type BlndStat = "pend" | "acpt" | "rjct";

export type BlndReq = {
  blnd_id: string;
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
  stat: BlndStat;
  seen_flag?: boolean;
  made_at: number;
};

const STOR_KEY = "blnd_list";

function is_brws(): boolean {
  return typeof window !== "undefined";
}

export function load_list(): BlndReq[] {
  if (!is_brws()) return [];
  try {
    const raw_str = window.localStorage.getItem(STOR_KEY);
    return raw_str ? (JSON.parse(raw_str) as BlndReq[]) : [];
  } catch {
    return [];
  }
}

function save_list(list_val: BlndReq[]): void {
  if (!is_brws()) return;
  window.localStorage.setItem(STOR_KEY, JSON.stringify(list_val));
}

export function add_req(inp: Omit<BlndReq, "blnd_id" | "stat" | "made_at">): BlndReq {
  const next_req: BlndReq = {
    ...inp,
    blnd_id: "bl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    stat: "pend",
    seen_flag: false,
    made_at: Date.now(),
  };
  const list_val = load_list();
  list_val.unshift(next_req);
  save_list(list_val);
  return next_req;
}

export function find_req(blnd_id: string): BlndReq | undefined {
  return load_list().find((b_item) => b_item.blnd_id === blnd_id);
}

export function updt_req(blnd_id: string, patch: Partial<BlndReq>): void {
  const list_val = load_list().map((b_item) =>
    b_item.blnd_id === blnd_id ? { ...b_item, ...patch } : b_item
  );
  save_list(list_val);
}

export function pend_cnt(): number {
  return load_list().filter((b_item) => b_item.stat === "pend" && !b_item.seen_flag).length;
}

export function mark_seen_all(): void {
  const list_val = load_list().map((b_item) =>
    b_item.stat === "pend" && !b_item.seen_flag ? { ...b_item, seen_flag: true } : b_item
  );
  save_list(list_val);
}
