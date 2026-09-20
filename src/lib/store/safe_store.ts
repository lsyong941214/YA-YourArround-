/**
 * safe_store.ts
 * 신고/차단 저장소 - Supabase public.reports / public.user_blocks 테이블 기반
 * - 신고는 접수만 한다(24시간 대응 등 실제 처리는 운영 절차 영역이라 이 앱 밖)
 * - 차단은 즉시 반영된다 - 연락처/추천 목록 등에서 차단한 상대를 걸러내는 데 쓴다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

export type RptRsn = "fake_prof" | "illegal_ad" | "abuse" | "spam" | "etc";

export const RPT_RSN_LBL: Record<RptRsn, string> = {
  fake_prof: "허위 프로필 · 도용 사진",
  illegal_ad: "불법 광고(조건 만남 등)",
  abuse: "욕설 · 괴롭힘",
  spam: "스팸 · 광고성 메시지",
  etc: "기타",
};

export async function report_user(
  target_id: string,
  reason: RptRsn,
  detail = ""
): Promise<{ ok_flag: boolean; err_msg?: string }> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return { ok_flag: false, err_msg: "로그인이 필요해요." };
  if (me_uid === target_id) return { ok_flag: false, err_msg: "본인은 신고할 수 없어요." };

  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: me_uid, target_id, reason, detail: detail.trim() });
  if (error) return { ok_flag: false, err_msg: "신고 접수에 실패했어요." };
  return { ok_flag: true };
}

export async function block_user(target_id: string): Promise<{ ok_flag: boolean; err_msg?: string }> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return { ok_flag: false, err_msg: "로그인이 필요해요." };
  if (me_uid === target_id) return { ok_flag: false, err_msg: "본인은 차단할 수 없어요." };

  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: me_uid, blocked_id: target_id }, { onConflict: "blocker_id,blocked_id" });
  if (error) return { ok_flag: false, err_msg: "차단에 실패했어요." };
  return { ok_flag: true };
}

export async function unblock_user(target_id: string): Promise<{ ok_flag: boolean }> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return { ok_flag: false };
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", me_uid)
    .eq("blocked_id", target_id);
  return { ok_flag: !error };
}

// 내가 차단한 상대 id 목록 - 연락처/추천 목록 등에서 이 목록에 있는 상대를 걸러내는 데 쓴다
export async function list_blkd_ids(): Promise<string[]> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return [];
  const { data, error } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", me_uid);
  if (error || !data) return [];
  return data.map((row) => row.blocked_id as string);
}

export async function is_blkd(target_id: string): Promise<boolean> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return false;
  const { data } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .eq("blocker_id", me_uid)
    .eq("blocked_id", target_id)
    .maybeSingle();
  return !!data;
}

// 나와 target_id 사이에 어느 한쪽이라도 차단했는지 (양방향) - user_blocks RLS는 "내가 차단한
// 목록"만 조회를 허용해서 "상대가 나를 차단했는지"는 직접 조회할 수 없다. is_blkd_pair
// RPC(SECURITY DEFINER, supabase/alter_blck_pair.sql)로 양쪽을 한번에 확인한다. 매칭 추천/
// 주변인 테스트 요청 대상 조회(req_target.ts)에서 차단된 상대를 걸러내는 데 쓴다.
export async function is_blkd_pair(target_id: string): Promise<boolean> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return false;
  const { data, error } = await supabase.rpc("is_blkd_pair", { a_id: me_uid, b_id: target_id });
  if (error) return false;
  return !!data;
}
