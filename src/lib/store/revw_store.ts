/**
 * revw_store.ts
 * 이장님이 주선한 매칭이 최종 연결 성사됐을 때, 주민이 남기는 이장님 리뷰(점수+후기)
 * - Supabase public.chief_reviews 테이블 기반. 리뷰어 이름/이니셜/색은 스냅샷으로 저장하지
 *   않고 profiles를 JOIN해서 채운다 (RevwItem 모양은 기존 localStorage 버전과 동일하게 유지)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

export type RevwItem = {
  revw_id: string;
  jang_id: string;
  rvwr_name: string;
  rvwr_ini: string;
  rvwr_ton: string;
  rvwr_img: string | null;
  scr_val: number;
  rvw_txt: string;
  made_at: number;
};

type RevwRow = {
  id: string;
  chief_id: string;
  score: number;
  review_text: string;
  created_at: string;
  reviewer: { user_name: string; ini_char: string; ton_hex: string; avatar_url: string | null };
};

const SEL_JOIN =
  "*, reviewer:profiles!chief_reviews_reviewer_id_fkey(user_name, ini_char, ton_hex, avatar_url)";

function row_to_revw(row: RevwRow): RevwItem {
  return {
    revw_id: row.id,
    jang_id: row.chief_id,
    rvwr_name: row.reviewer.user_name,
    rvwr_ini: row.reviewer.ini_char,
    rvwr_ton: row.reviewer.ton_hex,
    rvwr_img: row.reviewer.avatar_url,
    scr_val: row.score,
    rvw_txt: row.review_text,
    made_at: new Date(row.created_at).getTime(),
  };
}

export type AddRevwInp = {
  jang_id: string;
  reviewer_id: string;
  match_request_id: string;
  scr_val: number;
  rvw_txt: string;
};

export async function add_revw(inp: AddRevwInp): Promise<void> {
  await supabase.from("chief_reviews").insert({
    chief_id: inp.jang_id,
    reviewer_id: inp.reviewer_id,
    match_request_id: inp.match_request_id,
    score: inp.scr_val,
    review_text: inp.rvw_txt,
  });
}

export async function jang_revw_list(jang_id: string): Promise<RevwItem[]> {
  const { data, error } = await supabase
    .from("chief_reviews")
    .select(SEL_JOIN)
    .eq("chief_id", jang_id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as RevwRow[]).map(row_to_revw);
}

export async function avg_scr(jang_id: string): Promise<number> {
  const list_val = await jang_revw_list(jang_id);
  if (list_val.length === 0) return 0;
  const sum_val = list_val.reduce((acc_val, r_item) => acc_val + r_item.scr_val, 0);
  return Math.round((sum_val / list_val.length) * 10) / 10;
}
