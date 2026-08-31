/**
 * blnd_store.ts
 * "주변인 테스트"(비공개 성향 테스트) 요청 저장소 - Supabase public.blind_test_requests
 * + public.blind_test_picks 테이블 기반
 * - 신청자/이장/대상 주민 프로필은 스냅샷으로 저장하지 않고 매번 profiles를 JOIN해서 채운다
 *   (BlndReq의 필드 이름/모양은 기존 localStorage 버전과 동일하게 유지)
 * - 밸런스 게임 문항은 public.blind_test_questions에서 조회한다(list_qstn) - 문항 수가
 *   코드에 고정되어 있지 않아, 문항을 늘리려면 테이블에 행만 추가하면 된다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자 ("블라인드" -> blnd)
 */
import { calc_age } from "@/lib/store/auth_store";
import { supabase } from "@/lib/supabase/client";

export type BlndStat = "pend" | "acpt" | "rjct";

// 밸런스 게임 카드 선택지 (a = 첫번째 카드, b = 두번째 카드)
export type BlndPick = "a" | "b";

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

type ProfRow = {
  user_name: string;
  birth_dt: string | null;
  user_job: string | null;
  user_mbti: string | null;
  user_reg: string | null;
  tag_list: string[];
  ini_char: string;
  ton_hex: string;
};

type PickRow = { side: BlndSide; card_idx: number; pick: BlndPick };

type BlndRow = {
  id: string;
  requester_id: string;
  chief_id: string;
  resident_id: string;
  message: string;
  status: BlndStat;
  seen: boolean;
  created_at: string;
  requester: ProfRow;
  chief: ProfRow;
  resident: ProfRow;
  blind_test_picks: PickRow[];
};

const SEL_JOIN =
  "*, requester:profiles!blind_test_requests_requester_id_fkey(*), chief:profiles!blind_test_requests_chief_id_fkey(*), resident:profiles!blind_test_requests_resident_id_fkey(*), blind_test_picks(side, card_idx, pick)";

function picks_of(row: BlndRow, side: BlndSide): BlndPick[] {
  return row.blind_test_picks
    .filter((p_item) => p_item.side === side)
    .sort((a_item, b_item) => a_item.card_idx - b_item.card_idx)
    .map((p_item) => p_item.pick);
}

function row_to_blnd(row: BlndRow): BlndReq {
  return {
    blnd_id: row.id,
    req_uid: row.requester_id,
    jang_id: row.chief_id,
    jang_name: `${row.chief.user_name} 이장님`,
    memb_id: row.resident_id,
    memb_name: row.resident.user_name,
    memb_age: calc_age(row.resident.birth_dt) ?? 0,
    memb_job: row.resident.user_job ?? "-",
    memb_mbti: row.resident.user_mbti ?? "-",
    memb_reg: row.resident.user_reg ?? "-",
    tag_list: row.resident.tag_list ?? [],
    ini_char: row.resident.ini_char,
    ton_hex: row.resident.ton_hex,
    req_name: row.requester.user_name,
    req_age: calc_age(row.requester.birth_dt) ?? 0,
    req_job: row.requester.user_job ?? "-",
    req_mbti: row.requester.user_mbti ?? "-",
    req_reg: row.requester.user_reg ?? "-",
    req_tags: row.requester.tag_list ?? [],
    req_ini: row.requester.ini_char,
    req_ton: row.requester.ton_hex,
    msg_txt: row.message,
    stat: row.status,
    seen_flag: row.seen,
    req_picks: picks_of(row, "req"),
    memb_picks: picks_of(row, "memb"),
    made_at: new Date(row.created_at).getTime(),
  };
}

export type AddBlndInp = { req_uid: string; jang_id: string; memb_id: string; msg_txt: string };

export async function add_req(inp: AddBlndInp): Promise<BlndReq | undefined> {
  const { data, error } = await supabase
    .from("blind_test_requests")
    .insert({
      requester_id: inp.req_uid,
      chief_id: inp.jang_id,
      resident_id: inp.memb_id,
      message: inp.msg_txt,
    })
    .select(SEL_JOIN)
    .single();
  if (error || !data) return undefined;
  return row_to_blnd(data as unknown as BlndRow);
}

export async function find_req(blnd_id: string): Promise<BlndReq | undefined> {
  const { data, error } = await supabase
    .from("blind_test_requests")
    .select(SEL_JOIN)
    .eq("id", blnd_id)
    .maybeSingle();
  if (error || !data) return undefined;
  return row_to_blnd(data as unknown as BlndRow);
}

export type UpdtBlndPatch = { stat?: BlndStat; seen_flag?: boolean };

export async function updt_req(blnd_id: string, patch: UpdtBlndPatch): Promise<void> {
  const upd_row: Record<string, unknown> = {};
  if (patch.stat !== undefined) upd_row.status = patch.stat;
  if (patch.seen_flag !== undefined) upd_row.seen = patch.seen_flag;
  await supabase.from("blind_test_requests").update(upd_row).eq("id", blnd_id);
}

async function list_by(filters: Record<string, string>, order_desc = false): Promise<BlndReq[]> {
  let query = supabase.from("blind_test_requests").select(SEL_JOIN);
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val);
  }
  if (order_desc) query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as BlndRow[]).map(row_to_blnd);
}

// 특정 주민(memb_id)이 받은 대기중 주변인 테스트 요청
export async function memb_pend_list(memb_id: string): Promise<BlndReq[]> {
  return list_by({ resident_id: memb_id, status: "pend" });
}

export async function memb_pend_cnt(memb_id: string): Promise<number> {
  return (await memb_pend_list(memb_id)).filter((b_item) => !b_item.seen_flag).length;
}

export async function mark_seen_memb(memb_id: string): Promise<void> {
  await supabase
    .from("blind_test_requests")
    .update({ seen: true })
    .eq("resident_id", memb_id)
    .eq("status", "pend")
    .eq("seen", false);
}

// 특정 유저(req_uid)가 보낸 주변인 테스트 요청 전체
export async function sent_list(req_uid: string): Promise<BlndReq[]> {
  return list_by({ requester_id: req_uid }, true);
}

// 특정 주민(memb_id)이 "요청받은" 주변인 테스트 전체 (상태 무관 - 이장님 검토 단계 없이
// 요청이 바로 주민에게 전달되므로 pend 포함 전체를 노출)
export async function memb_list(memb_id: string): Promise<BlndReq[]> {
  return list_by({ resident_id: memb_id }, true);
}

// 로그인한 유저가 이 요청에서 요청자(req)인지 요청받은 주민(memb)인지 판별
export function side_of(
  item: BlndReq,
  user: { user_id: string } | null | undefined
): BlndSide | null {
  if (!user) return null;
  if (user.user_id === item.req_uid) return "req";
  if (user.user_id === item.memb_id) return "memb";
  return null;
}

export function pick_list(item: BlndReq, side: BlndSide): BlndPick[] {
  return (side === "req" ? item.req_picks : item.memb_picks) ?? [];
}

// 밸런스 게임 카드 한 장 선택 결과 저장, 갱신된 항목을 반환
export async function submit_pick(blnd_id: string, side: BlndSide, pick: BlndPick): Promise<BlndReq | undefined> {
  const item_now = await find_req(blnd_id);
  if (!item_now) return undefined;
  const card_idx = pick_list(item_now, side).length + 1;
  await supabase.from("blind_test_picks").insert({ blind_test_id: blnd_id, side, card_idx, pick });
  return find_req(blnd_id);
}

// 밸런스 게임 문항 한 장 (카드 이미지는 선택, 준비되기 전까지 null일 수 있음)
export type BlndQstn = {
  qstn_id: string;
  seq_no: number;
  topic: string;
  txt_a: string;
  txt_b: string;
  img_a: string | null;
  img_b: string | null;
};

type QstnRow = {
  id: string;
  seq_no: number;
  topic: string;
  prompt_a: string;
  prompt_b: string;
  image_a: string | null;
  image_b: string | null;
};

function row_to_qstn(row: QstnRow): BlndQstn {
  return {
    qstn_id: row.id,
    seq_no: row.seq_no,
    topic: row.topic,
    txt_a: row.prompt_a,
    txt_b: row.prompt_b,
    img_a: row.image_a,
    img_b: row.image_b,
  };
}

// 밸런스 게임 문항 전체를 출제 순서대로 조회
export async function list_qstn(): Promise<BlndQstn[]> {
  const { data, error } = await supabase
    .from("blind_test_questions")
    .select("*")
    .order("seq_no", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as QstnRow[]).map(row_to_qstn);
}
