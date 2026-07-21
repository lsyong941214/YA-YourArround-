/**
 * blnd_store.ts
 * "주변인 테스트"(비공개 성향 테스트) 요청 로컬 저장소
 * - 로그인/DB 연동 전까지 localStorage로 데모
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자 ("블라인드" -> blnd)
 * - TODO: Supabase 연동 시 실제 주변인 테스트 요청 테이블 CRUD로 교체
 */

export type BlndStat = "pend" | "acpt" | "rjct";

// 밸런스 게임 카드 선택지 (a = 첫번째 카드, b = 두번째 카드)
export type BlndPick = "a" | "b";

// 밸런스 게임 총 카드 수 (현재 버전: 1번 카드만 실제 문항, 2~5번은 "추후 공개" placeholder)
export const BLND_CARD_CNT = 5;

export type BlndReq = {
  blnd_id: string;
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
  stat: BlndStat;
  seen_flag?: boolean;
  req_picks?: BlndPick[];
  memb_picks?: BlndPick[];
  made_at: number;
};

export type BlndSide = "req" | "memb";

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

// 특정 주민(memb_id)이 받은 대기중 주변인 테스트 요청
export function memb_pend_list(memb_id: string): BlndReq[] {
  return load_list().filter((b_item) => b_item.memb_id === memb_id && b_item.stat === "pend");
}

export function memb_pend_cnt(memb_id: string): number {
  return memb_pend_list(memb_id).filter((b_item) => !b_item.seen_flag).length;
}

export function mark_seen_memb(memb_id: string): void {
  const list_val = load_list().map((b_item) =>
    b_item.memb_id === memb_id && b_item.stat === "pend" && !b_item.seen_flag
      ? { ...b_item, seen_flag: true }
      : b_item
  );
  save_list(list_val);
}

// 특정 유저(req_uid)가 보낸 주변인 테스트 요청 전체
export function sent_list(req_uid: string): BlndReq[] {
  return load_list()
    .filter((b_item) => b_item.req_uid === req_uid)
    .sort((a_item, b_item) => b_item.made_at - a_item.made_at);
}

// 특정 주민(memb_id)이 "요청받은" 주변인 테스트 전체 (상태 무관 - 이장님 검토 단계 없이
// 요청이 바로 주민에게 전달되므로 pend 포함 전체를 노출)
export function memb_list(memb_id: string): BlndReq[] {
  return load_list()
    .filter((b_item) => b_item.memb_id === memb_id)
    .sort((a_item, b_item) => b_item.made_at - a_item.made_at);
}

// 로그인한 유저가 이 요청에서 요청자(req)인지 요청받은 주민(memb)인지 판별
export function side_of(
  item: BlndReq,
  user: { user_id: string; memb_id?: string } | null | undefined
): BlndSide | null {
  if (!user) return null;
  if (user.user_id === item.req_uid) return "req";
  if (user.memb_id && user.memb_id === item.memb_id) return "memb";
  return null;
}

export function pick_list(item: BlndReq, side: BlndSide): BlndPick[] {
  return (side === "req" ? item.req_picks : item.memb_picks) ?? [];
}

// 밸런스 게임 카드 한 장 선택 결과 저장, 갱신된 항목을 반환
export function submit_pick(blnd_id: string, side: BlndSide, pick: BlndPick): BlndReq | undefined {
  let updt_item: BlndReq | undefined;
  const key = side === "req" ? "req_picks" : "memb_picks";
  const list_val = load_list().map((b_item) => {
    if (b_item.blnd_id !== blnd_id) return b_item;
    updt_item = { ...b_item, [key]: [...(b_item[key] ?? []), pick] };
    return updt_item;
  });
  save_list(list_val);
  return updt_item;
}
