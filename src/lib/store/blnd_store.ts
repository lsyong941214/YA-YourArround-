/**
 * blnd_store.ts
 * "주변인 테스트"(비공개 성향 테스트) 요청 저장소 - Supabase public.blind_test_requests
 * + public.blind_test_picks 테이블 기반
 * - 신청자/이장/대상 주민 프로필은 스냅샷으로 저장하지 않고 매번 profiles를 JOIN해서 채운다
 *   (BlndReq의 필드 이름/모양은 기존 localStorage 버전과 동일하게 유지)
 * - 밸런스 게임 문항 뱅크는 public.blind_test_questions - 카테고리(topic)별로 행만 추가하면
 *   다음 게임부터 자동으로 뽑기 후보에 포함된다
 * - 게임 하나(blnd_id)에 실제로 배정된 문항 10개(카테고리별 2~3개)는
 *   public.blind_test_game_questions 에 고정 저장되어, 신청자/대상 주민이 항상 같은
 *   문항·순서를 본다(ensure_game_qstns)
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

type PickRow = { side: BlndSide; pick: BlndPick; picked_at: string };

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
  "*, requester:profiles!blind_test_requests_requester_id_fkey(*), chief:profiles!blind_test_requests_chief_id_fkey(*), resident:profiles!blind_test_requests_resident_id_fkey(*), blind_test_picks(side, pick, picked_at)";

function picks_of(row: BlndRow, side: BlndSide): BlndPick[] {
  return row.blind_test_picks
    .filter((p_item) => p_item.side === side)
    .sort((a_item, b_item) => a_item.picked_at.localeCompare(b_item.picked_at))
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

// 밸런스 게임 문항 뱅크 전체 조회 (카테고리별 추첨의 재료 - 화면에서 직접 쓰지 않는다)
async function list_qstn_bank(): Promise<BlndQstn[]> {
  const { data, error } = await supabase
    .from("blind_test_questions")
    .select("*")
    .order("seq_no", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as QstnRow[]).map(row_to_qstn);
}

// 한 게임에서 출제할 총 문항 수 / 카테고리(topic)당 문항 수 범위
export const GAME_QSTN_CNT = 10;
const MIN_PER_TOPIC = 2;
const MAX_PER_TOPIC = 3;

function shuffle<T>(list_val: T[]): T[] {
  const next_list = [...list_val];
  for (let i = next_list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next_list[i], next_list[j]] = [next_list[j], next_list[i]];
  }
  return next_list;
}

// 문항 뱅크에서 카테고리(topic)별 2~3개씩, 총 GAME_QSTN_CNT개를 무작위로 뽑는다.
// 카테고리에 문항이 추가되면 다음 뽑기부터 자동으로 후보에 포함된다.
// (카테고리 수가 4~5개 안팎일 때를 기준으로 설계됨 - 카테고리가 아주 많아지면
// MIN_PER_TOPIC을 다 채우지 못할 수 있다)
function draw_qstn_set(bank: BlndQstn[]): BlndQstn[] {
  const by_topic = new Map<string, BlndQstn[]>();
  for (const q_item of bank) {
    const pool = by_topic.get(q_item.topic) ?? [];
    pool.push(q_item);
    by_topic.set(q_item.topic, pool);
  }

  const topics = shuffle([...by_topic.keys()]);
  const topic_cnt = topics.length;
  if (topic_cnt === 0) return [];

  const base_qty = Math.floor(GAME_QSTN_CNT / topic_cnt);
  const extra_qty = GAME_QSTN_CNT % topic_cnt;

  const picked: BlndQstn[] = [];
  topics.forEach((topic, topic_idx) => {
    const pool = shuffle(by_topic.get(topic) ?? []);
    const want_qty = Math.min(MAX_PER_TOPIC, base_qty + (topic_idx < extra_qty ? 1 : 0));
    picked.push(...pool.slice(0, Math.min(want_qty, pool.length)));
  });

  return shuffle(picked).slice(0, GAME_QSTN_CNT);
}

type GameQstnRow = { card_idx: number; question: QstnRow };

// 이미 배정된 게임 문항(카드 순서 포함)을 조회
async function find_game_qstns(blnd_id: string): Promise<BlndQstn[]> {
  const { data, error } = await supabase
    .from("blind_test_game_questions")
    .select("card_idx, question:blind_test_questions(*)")
    .eq("blind_test_id", blnd_id)
    .order("card_idx", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as GameQstnRow[]).map((row) => row_to_qstn(row.question));
}

// 게임(blnd_id)에 배정된 문항 10개를 반환한다. 아직 배정된 적 없으면 카테고리별로 무작위로
// 뽑아 저장한 뒤 반환 - 신청자/대상 주민 중 먼저 들어온 쪽이 뽑기 결과를 저장하고, 나중에
// 들어온 쪽은 저장을 시도하다 기본키 충돌로 실패하면 이미 저장된 결과를 그대로 읽는다.
export async function ensure_game_qstns(blnd_id: string): Promise<BlndQstn[]> {
  const dealt = await find_game_qstns(blnd_id);
  if (dealt.length > 0) return dealt;

  const bank = await list_qstn_bank();
  const drawn = draw_qstn_set(bank);
  if (drawn.length === 0) return [];

  const rows = drawn.map((q_item, idx) => ({
    blind_test_id: blnd_id,
    card_idx: idx + 1,
    question_id: q_item.qstn_id,
  }));
  const { error } = await supabase.from("blind_test_game_questions").insert(rows);
  if (error) return find_game_qstns(blnd_id);
  return drawn;
}

// 밸런스 게임 카드 한 장 선택 결과 저장, 갱신된 항목을 반환
export async function submit_pick(
  blnd_id: string,
  side: BlndSide,
  user_id: string,
  qstn_id: string,
  pick: BlndPick
): Promise<BlndReq | undefined> {
  await supabase
    .from("blind_test_picks")
    .insert({ blind_test_id: blnd_id, side, user_id, question_id: qstn_id, pick });
  return find_req(blnd_id);
}

// 로그인한 유저가 주어진 문항들에 대해 (다른 게임에서) 예전에 무엇을 골랐었는지 조회 -
// 같은 문항이 다시 출제됐을 때 카드에 하이라이트를 주기 위해 쓴다
export async function pick_hist(
  user_id: string,
  qstn_ids: string[],
  excl_blnd_id?: string
): Promise<Record<string, BlndPick>> {
  if (qstn_ids.length === 0) return {};
  const { data, error } = await supabase
    .from("blind_test_picks")
    .select("question_id, pick, blind_test_id")
    .eq("user_id", user_id)
    .in("question_id", qstn_ids);
  if (error || !data) return {};
  const hist_map: Record<string, BlndPick> = {};
  for (const row of data as { question_id: string; pick: BlndPick; blind_test_id: string }[]) {
    if (excl_blnd_id && row.blind_test_id === excl_blnd_id) continue;
    hist_map[row.question_id] = row.pick;
  }
  return hist_map;
}
