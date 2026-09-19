/**
 * admin_store.ts
 * 신고 처리(/admin) 전용 저장소 - Supabase public.reports / public.profiles(is_admin) 기반
 * - is_admin은 앱 안에 켜는 UI가 없다. 최초 관리자는 Supabase SQL Editor에서 직접 지정한다
 *   (supabase/alter_admin.sql 하단 주석 참고)
 * - 일반 AuthUser 타입에는 is_admin을 넣지 않았다 - 신고 처리 화면 밖에서는 몰라도 되는 값이라
 *   관리자 판별/조회 로직을 이 파일 하나로 모아둔다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { AcctStat } from "@/lib/store/auth_store";
import { RptRsn } from "@/lib/store/safe_store";
import { supabase } from "@/lib/supabase/client";

export type RptStat = "open" | "in_prog" | "done";

export type AdmReport = {
  rept_id: string;
  made_at: number;
  reason: RptRsn;
  detail: string;
  stat: RptStat;
  rptr_id: string;
  rptr_name: string;
  trgt_id: string;
  trgt_name: string;
  trgt_stat: AcctStat;
};

type RptRow = {
  id: string;
  reporter_id: string;
  target_id: string;
  reason: RptRsn;
  detail: string;
  status: RptStat;
  created_at: string;
  reporter: { user_name: string } | null;
  target: { user_name: string; acct_stat: AcctStat } | null;
};

// 현재 로그인된 유저가 관리자(is_admin)인지 - 로그인 안 됐으면 false
export async function is_curr_admin(): Promise<boolean> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", me_uid).maybeSingle();
  return !!data?.is_admin;
}

// 전체 신고 목록 - 처리 대기(open)가 오래된 순으로 먼저, 그다음 처리중/완료
export async function list_reports_admin(): Promise<AdmReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, target_id, reason, detail, status, created_at," +
        "reporter:profiles!reports_reporter_id_fkey(user_name)," +
        "target:profiles!reports_target_id_fkey(user_name, acct_stat)"
    )
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  const STAT_ORDER: Record<RptStat, number> = { open: 0, in_prog: 1, done: 2 };
  return (data as unknown as RptRow[])
    .map((row) => ({
      rept_id: row.id,
      made_at: new Date(row.created_at).getTime(),
      reason: row.reason,
      detail: row.detail,
      stat: row.status,
      rptr_id: row.reporter_id,
      rptr_name: row.reporter?.user_name ?? "(탈퇴한 유저)",
      trgt_id: row.target_id,
      trgt_name: row.target?.user_name ?? "(탈퇴한 유저)",
      trgt_stat: row.target?.acct_stat ?? "actv",
    }))
    .sort((a, b) => STAT_ORDER[a.stat] - STAT_ORDER[b.stat] || a.made_at - b.made_at);
}

export async function set_report_stat(rept_id: string, stat: RptStat): Promise<boolean> {
  const { error } = await supabase.from("reports").update({ status: stat }).eq("id", rept_id);
  return !error;
}

export async function set_acct_stat(target_id: string, stat: AcctStat): Promise<boolean> {
  const { error } = await supabase.from("profiles").update({ acct_stat: stat }).eq("id", target_id);
  return !error;
}
