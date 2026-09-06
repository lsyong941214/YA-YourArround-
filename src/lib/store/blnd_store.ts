/**
 * blnd_store.ts
 * "주변인 테스트"(비공개 성향 테스트) 요청 저장소 - Supabase public.blind_test_requests
 * + public.blind_test_picks 테이블 기반
 * - 신청자/이장/대상 주민 프로필은 스냅샷으로 저장하지 않고 매번 profiles를 JOIN해서 채운다
 *   (BlndReq의 필드 이름/모양은 기존 localStorage 버전과 동일하게 유지)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자 ("블라인드" -> blnd)
 */
import { calc_age } from "@/lib/store/auth_store";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_CARD_IDS, pick_categ_ids } from "@/lib/data/blnd_questions";
import { get_mbti_cpat } from "@/lib/data/mbti_cpat";

// pend: 상대 응답 대기 / acpt: 수락(게임 진행중~결과 대기) / rjct: 거절 또는 한쪽이 결과에서
// 종료하기를 눌러 끝남 / done: 결과에서 서로 연락하기로 했거나(둘 다 ctct), 이장님 확인 없이
// 바로 매칭이 시작된 경우(둘 다 rvw)
export type BlndStat = "pend" | "acpt" | "rjct" | "done";

// 밸런스 게임 카드 선택지 (a = 첫번째 카드, b = 두번째 카드)
export type BlndPick = "a" | "b";

// 밸런스 게임 총 카드 수 - 질문 은행(blnd_questions.ts)에서 카테고리별로 뽑은 문항 합계
export const BLND_CARD_CNT = 10;

// 결과 화면에서 참여자가 고르는 행동
// ctct: 연락하기(직접 연락) / rvw: 이장님에게 확인요청 / end: 종료하기(매칭 종료)
export type BlndActn = "ctct" | "rvw" | "end";

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
  memb_img: string | null;
  req_name: string;
  req_age: number;
  req_job: string;
  req_mbti: string;
  req_reg: string;
  req_tags: string[];
  req_ini: string;
  req_ton: string;
  req_img: string | null;
  msg_txt: string;
  stat: BlndStat;
  seen_flag?: boolean;
  req_picks?: BlndPick[];
  memb_picks?: BlndPick[];
  card_ids: string[];
  req_actn?: BlndActn | null;
  memb_actn?: BlndActn | null;
  link_mtc_id?: string | null;
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
  avatar_url: string | null;
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
  card_ids: string[] | null;
  req_actn: BlndActn | null;
  memb_actn: BlndActn | null;
  link_mtc_id: string | null;
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
    memb_img: row.resident.avatar_url,
    req_name: row.requester.user_name,
    req_age: calc_age(row.requester.birth_dt) ?? 0,
    req_job: row.requester.user_job ?? "-",
    req_mbti: row.requester.user_mbti ?? "-",
    req_reg: row.requester.user_reg ?? "-",
    req_tags: row.requester.tag_list ?? [],
    req_ini: row.requester.ini_char,
    req_ton: row.requester.ton_hex,
    req_img: row.requester.avatar_url,
    msg_txt: row.message,
    stat: row.status,
    seen_flag: row.seen,
    req_picks: picks_of(row, "req"),
    memb_picks: picks_of(row, "memb"),
    card_ids: row.card_ids?.length === BLND_CARD_CNT ? row.card_ids : DEFAULT_CARD_IDS,
    req_actn: row.req_actn,
    memb_actn: row.memb_actn,
    link_mtc_id: row.link_mtc_id,
    made_at: new Date(row.created_at).getTime(),
  };
}

export type AddBlndInp = { req_uid: string; jang_id: string; memb_id: string; msg_txt: string };

export async function add_req(
  inp: AddBlndInp
): Promise<{ item?: BlndReq; err_msg?: string }> {
  const { data, error } = await supabase
    .from("blind_test_requests")
    .insert({
      requester_id: inp.req_uid,
      chief_id: inp.jang_id,
      resident_id: inp.memb_id,
      message: inp.msg_txt,
      card_ids: pick_categ_ids(),
    })
    .select(SEL_JOIN)
    .single();
  if (error || !data) {
    return { err_msg: error?.message ?? "주변인 테스트 요청에 실패했어요." };
  }
  return { item: row_to_blnd(data as unknown as BlndRow) };
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

// 특정 유저(req_uid)가 보낸 주변인 테스트 중 "진행중"(상대가 아직 응답 전) 건수 - 하단 탭바 배지 표시용
// - 주변인 테스트는 이장님 검토 단계가 없어 pend 하나만 진행중 상태
export async function sent_prog_cnt(req_uid: string): Promise<number> {
  return (await sent_list(req_uid)).filter((b_item) => b_item.stat === "pend").length;
}

// 특정 유저(req_uid)가 보낸 주변인 테스트 중 "매칭 시도로 소진된"(거절되지 않은) 건수
// - 대기중/수락됨은 계속 소진 상태로 남고, 거절(rjct)된 건만 다시 남은 횟수로 돌아온다
export async function sent_used_cnt(req_uid: string): Promise<number> {
  return (await sent_list(req_uid)).filter((b_item) => b_item.stat !== "rjct").length;
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
// - insert 실패(에러)를 그냥 무시하면 카드가 저장되지 않았는데도 화면은 성공한 것처럼 다음
//   단계로 넘어가려다가, 다시 조회한 결과가 그대로라 같은 문항이 반복되는 것처럼 보이게 된다.
//   그래서 에러 메시지를 그대로 돌려주고, 호출부(BlndGameScreen)에서 실패를 알 수 있게 한다.
export async function submit_pick(
  blnd_id: string,
  side: BlndSide,
  pick: BlndPick
): Promise<{ item?: BlndReq; err_msg?: string }> {
  const item_now = await find_req(blnd_id);
  if (!item_now) return { err_msg: "주변인 테스트 정보를 불러오지 못했어요." };
  const card_idx = pick_list(item_now, side).length + 1;
  const { error } = await supabase
    .from("blind_test_picks")
    .insert({ blind_test_id: blnd_id, side, card_idx, pick });
  if (error) {
    return { err_msg: error.message };
  }
  return { item: await find_req(blnd_id) };
}

// 두 사람이 밸런스 게임을 모두 마쳤는지 (결과 화면 진입 가능 여부)
export function both_picked(item: BlndReq): boolean {
  return pick_list(item, "req").length >= BLND_CARD_CNT && pick_list(item, "memb").length >= BLND_CARD_CNT;
}

// `/blind/[blnd_id]`에서 정적 안내(수락/거절 대기, 사전 거절) 대신 게임·결과 화면으로
// 바로 들어가야 하는 상태인지 - 게임이 한 번이라도 시작됐으면(수락 이후) 계속 이쪽으로 취급한다
export function game_go(item: BlndReq): boolean {
  return item.stat === "acpt" || item.stat === "done" || both_picked(item);
}

// 선택지 일치 점수 (일치 문항 1개당 10점, 최대 100점)
export function calc_pick_scor(item: BlndReq): number {
  const req_pk = item.req_picks ?? [];
  const memb_pk = item.memb_picks ?? [];
  const cnt = Math.min(req_pk.length, memb_pk.length, BLND_CARD_CNT);
  let match_cnt = 0;
  for (let i = 0; i < cnt; i += 1) {
    if (req_pk[i] === memb_pk[i]) match_cnt += 1;
  }
  return match_cnt * 10;
}

// 최종 결과 점수 = (MBTI 궁합 점수 / 2) + (선택지 일치 점수 / 2), 100점 만점
export function calc_rslt_scor(item: BlndReq): number {
  const mbti_scor = get_mbti_cpat(item.req_mbti, item.memb_mbti);
  const pick_scor = calc_pick_scor(item);
  return Math.round(mbti_scor / 2 + pick_scor / 2);
}

export type BlndTier = "oppo" | "rvw" | "ok" | "good" | "best";

// 점수 구간별 결과 등급
export function blnd_tier(scor: number): BlndTier {
  if (scor <= 20) return "oppo";
  if (scor <= 50) return "rvw";
  if (scor <= 70) return "ok";
  if (scor <= 90) return "good";
  return "best";
}

export const BLND_TIER_MSG: Record<BlndTier, string> = {
  oppo: "오히려 반대라서 끌리는데요? 연락 해볼까요?",
  rvw: "두 분은 취향이 많이 다르신 것 같아요. 이장님에게 확인요청 해볼까요?",
  ok: "통하는게 많아요, 메시지 해볼까요?",
  good: "정말 잘 맞는 두 분, 이제는 직접 연락해보세요!",
  best: "천생연분인데요!? 좋은 만남 기대할게요!",
};

// 등급별로 "종료하기" 버튼이 노출되는지 (아주 잘 맞는 등급은 종료 버튼이 없다)
export function blnd_tier_end_ok(tier: BlndTier): boolean {
  return tier !== "good" && tier !== "best";
}

// 등급별로 결과 화면에서 고를 수 있는 행동(종료 제외) - "rvw" 등급만 이장님 확인요청, 나머지는 연락하기
export function blnd_tier_actn(tier: BlndTier): Extract<BlndActn, "ctct" | "rvw"> {
  return tier === "rvw" ? "rvw" : "ctct";
}

// 결과 화면에서 "연락하기/이장님에게 확인요청/종료하기"를 고른다.
// 서버(Postgres 함수 blnd_submit_actn)에서 상태 전이를 원자적으로 처리한다:
// - 한쪽이라도 종료 -> 매칭 종료(rjct), 이장님께 이미 전달된 확인요청이 있으면 취소
// - 확인요청(rvw): 첫 요청은 이장님에게 1건 전달(match_requests 생성), 둘 다 요청하면 이장님
//   전달 없이 바로 매칭 시작(done)
// - 연락하기(ctct): 둘 다 연락하기를 고르면 매칭 종료 없이 바로 결과 확정(done)
export async function submit_actn(blnd_id: string, actn: BlndActn): Promise<BlndReq | undefined> {
  await supabase.rpc("blnd_submit_actn", { p_blnd_id: blnd_id, p_actn: actn });
  return find_req(blnd_id);
}
