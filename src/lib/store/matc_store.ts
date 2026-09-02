/**
 * matc_store.ts
 * 매칭 요청(신청/수락/거절) 저장소 - Supabase public.match_requests 테이블 기반
 * - 신청자/이장/대상 주민 프로필은 스냅샷으로 저장하지 않고 매번 profiles를 JOIN해서 채운다
 *   (MatcReq의 필드 이름/모양은 기존 localStorage 버전과 동일하게 유지해 화면 쪽 변경을 최소화)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { calc_age } from "@/lib/store/auth_store";
import { supabase } from "@/lib/supabase/client";

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
  memb_bio: string;
  memb_phts: string[];
  tag_list: string[];
  ini_char: string;
  ton_hex: string;
  memb_img: string | null;
  req_name: string;
  req_age: number;
  req_job: string;
  req_mbti: string;
  req_reg: string;
  req_bio: string;
  req_phts: string[];
  req_tags: string[];
  req_ini: string;
  req_ton: string;
  req_img: string | null;
  msg_txt: string;
  stat: MatcStat;
  acpt_cmt?: string;
  rjct_rsn?: string;
  rjct_msg?: string;
  seen_flag?: boolean;
  rvwd_flag?: boolean;
  made_at: number;
};

type ProfRow = {
  user_name: string;
  birth_dt: string | null;
  user_job: string | null;
  user_mbti: string | null;
  user_reg: string | null;
  user_bio: string;
  photo_urls: string[];
  tag_list: string[];
  ini_char: string;
  ton_hex: string;
  avatar_url: string | null;
};

type MatcRow = {
  id: string;
  requester_id: string;
  chief_id: string;
  resident_id: string;
  message: string;
  status: MatcStat;
  accept_comment: string | null;
  reject_reason: string | null;
  reject_message: string | null;
  seen: boolean;
  reviewed: boolean;
  created_at: string;
  requester: ProfRow;
  chief: ProfRow;
  resident: ProfRow;
};

const SEL_JOIN =
  "*, requester:profiles!match_requests_requester_id_fkey(*), chief:profiles!match_requests_chief_id_fkey(*), resident:profiles!match_requests_resident_id_fkey(*)";

function row_to_matc(row: MatcRow): MatcReq {
  return {
    req_id: row.id,
    req_uid: row.requester_id,
    jang_id: row.chief_id,
    jang_name: `${row.chief.user_name} 이장님`,
    memb_id: row.resident_id,
    memb_name: row.resident.user_name,
    memb_age: calc_age(row.resident.birth_dt) ?? 0,
    memb_job: row.resident.user_job ?? "-",
    memb_mbti: row.resident.user_mbti ?? "-",
    memb_reg: row.resident.user_reg ?? "-",
    memb_bio: row.resident.user_bio,
    memb_phts: row.resident.photo_urls ?? [],
    tag_list: row.resident.tag_list ?? [],
    ini_char: row.resident.ini_char,
    ton_hex: row.resident.ton_hex,
    memb_img: row.resident.avatar_url,
    req_name: row.requester.user_name,
    req_age: calc_age(row.requester.birth_dt) ?? 0,
    req_job: row.requester.user_job ?? "-",
    req_mbti: row.requester.user_mbti ?? "-",
    req_reg: row.requester.user_reg ?? "-",
    req_bio: row.requester.user_bio,
    req_phts: row.requester.photo_urls ?? [],
    req_tags: row.requester.tag_list ?? [],
    req_ini: row.requester.ini_char,
    req_ton: row.requester.ton_hex,
    req_img: row.requester.avatar_url,
    msg_txt: row.message,
    stat: row.status,
    acpt_cmt: row.accept_comment ?? undefined,
    rjct_rsn: row.reject_reason ?? undefined,
    rjct_msg: row.reject_message ?? undefined,
    seen_flag: row.seen,
    rvwd_flag: row.reviewed,
    made_at: new Date(row.created_at).getTime(),
  };
}

export type AddReqInp = { req_uid: string; jang_id: string; memb_id: string; msg_txt: string };

export async function add_req(
  inp: AddReqInp
): Promise<{ item?: MatcReq; err_msg?: string }> {
  const { data, error } = await supabase
    .from("match_requests")
    .insert({
      requester_id: inp.req_uid,
      chief_id: inp.jang_id,
      resident_id: inp.memb_id,
      message: inp.msg_txt,
    })
    .select(SEL_JOIN)
    .single();
  if (error || !data) {
    return { err_msg: error?.message ?? "연결 요청에 실패했어요." };
  }
  return { item: row_to_matc(data as unknown as MatcRow) };
}

export async function find_req(req_id: string): Promise<MatcReq | undefined> {
  const { data, error } = await supabase
    .from("match_requests")
    .select(SEL_JOIN)
    .eq("id", req_id)
    .maybeSingle();
  if (error || !data) return undefined;
  return row_to_matc(data as unknown as MatcRow);
}

export type UpdtReqPatch = {
  stat?: MatcStat;
  acpt_cmt?: string;
  rjct_rsn?: string;
  rjct_msg?: string;
  seen_flag?: boolean;
  rvwd_flag?: boolean;
};

export async function updt_req(req_id: string, patch: UpdtReqPatch): Promise<void> {
  const upd_row: Record<string, unknown> = {};
  if (patch.stat !== undefined) upd_row.status = patch.stat;
  if (patch.acpt_cmt !== undefined) upd_row.accept_comment = patch.acpt_cmt;
  if (patch.rjct_rsn !== undefined) upd_row.reject_reason = patch.rjct_rsn;
  if (patch.rjct_msg !== undefined) upd_row.reject_message = patch.rjct_msg;
  if (patch.seen_flag !== undefined) upd_row.seen = patch.seen_flag;
  if (patch.rvwd_flag !== undefined) upd_row.reviewed = patch.rvwd_flag;
  await supabase.from("match_requests").update(upd_row).eq("id", req_id);
}

export async function has_req(jang_id: string, memb_id: string): Promise<boolean> {
  const { data } = await supabase
    .from("match_requests")
    .select("id")
    .eq("chief_id", jang_id)
    .eq("resident_id", memb_id)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function list_by(filters: Record<string, string | string[]>, order_desc = false): Promise<MatcReq[]> {
  let query = supabase.from("match_requests").select(SEL_JOIN);
  for (const [col, val] of Object.entries(filters)) {
    query = Array.isArray(val) ? query.in(col, val) : query.eq(col, val);
  }
  if (order_desc) query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as MatcRow[]).map(row_to_matc);
}

// 특정 이장님(jang_id)에게 들어온 요청 전체 (상태 무관)
export async function jang_list(jang_id: string): Promise<MatcReq[]> {
  return list_by({ chief_id: jang_id }, true);
}

// 특정 이장님(jang_id)이 검토해야 할 대기중 요청
export async function jang_pend_list(jang_id: string): Promise<MatcReq[]> {
  return list_by({ chief_id: jang_id, status: "pend" });
}

export async function jang_pend_cnt(jang_id: string): Promise<number> {
  return (await jang_pend_list(jang_id)).length;
}

// 특정 이장님(jang_id)의 "진행중"(대기중 + 수락 대기중) 요청 - 홈 화면 건수 표시용
export async function jang_prog_cnt(jang_id: string): Promise<number> {
  return (await list_by({ chief_id: jang_id, status: ["pend", "c_acpt"] })).length;
}

// 특정 주민(memb_id)이 아직 확인하지 않은, 이장님이 수락한 제안
export async function memb_prop_list(memb_id: string): Promise<MatcReq[]> {
  return list_by({ resident_id: memb_id, status: "c_acpt" });
}

export async function memb_prop_cnt(memb_id: string): Promise<number> {
  return (await memb_prop_list(memb_id)).filter((r_item) => !r_item.seen_flag).length;
}

export async function mark_seen_memb(memb_id: string): Promise<void> {
  await supabase
    .from("match_requests")
    .update({ seen: true })
    .eq("resident_id", memb_id)
    .eq("status", "c_acpt")
    .eq("seen", false);
}

// 특정 유저(req_uid)가 보낸 요청 전체 (상태 무관)
export async function sent_list(req_uid: string): Promise<MatcReq[]> {
  return list_by({ requester_id: req_uid }, true);
}

// 특정 주민(memb_id)이 "요청받은" 매칭 이력 (이장님 검토 단계인 pend/c_rjct는
// 주민에게 노출된 적이 없는 요청이므로 제외 - c_acpt 이후 단계만 조회)
export async function memb_hist_list(memb_id: string): Promise<MatcReq[]> {
  return list_by({ resident_id: memb_id, status: ["c_acpt", "r_acpt", "r_rjct"] }, true);
}

// 특정 유저(req_uid)가 보낸 요청 중 "진행중"(대기중 + 수락 대기중) 건수 - 홈 화면 매칭 현황 표시용
export async function sent_prog_cnt(req_uid: string): Promise<number> {
  return (await sent_list(req_uid)).filter((r_item) => r_item.stat === "pend" || r_item.stat === "c_acpt").length;
}

// 매칭 요청 단계별 표시 문구/톤
// 대기중(pend) -> 수락 대기중(c_acpt) -> 요청거부(c_rjct/r_rjct) 또는 수락완료(r_acpt)
export function matc_stat_lbl(stat: MatcStat): string {
  if (stat === "pend") return "대기중";
  if (stat === "c_acpt") return "수락 대기중";
  if (stat === "r_acpt") return "수락완료";
  return "요청거부";
}

export function matc_stat_tone(stat: MatcStat): "wait" | "ok" | "off" {
  if (stat === "r_acpt") return "ok";
  if (stat === "c_rjct" || stat === "r_rjct") return "off";
  return "wait";
}

export function matc_is_prog(stat: MatcStat): boolean {
  return stat === "pend" || stat === "c_acpt";
}
