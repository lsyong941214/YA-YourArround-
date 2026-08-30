/**
 * cntc_store.ts
 * 연락처(주민 ↔ 이장) 저장소 - Supabase public.village_contacts 테이블 기반
 * - 주민이 이장을 연락처로 저장해두는 관계(resident_id -> chief_id)를 기록한다
 * - [2026-08-24] 이 파일은 조회 전용이다. 연결 **생성**은 초대코드를 통해서만 이뤄지며
 *   invt_store.use_invt() -> use_invt_code() RPC 가 담당한다. 예전의 add_cntc()(주민이
 *   아무 이장에게나 바로 upsert)는 제거했고, 이를 허용하던 RLS 정책도 함께 내렸다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { AuthUser, calc_age } from "@/lib/store/auth_store";
import { supabase } from "@/lib/supabase/client";

export type CntcItem = {
  res_uid: string;
  chf_uid: string;
  made_at: number;
};

type ProfRow = {
  id: string;
  user_name: string;
  user_role: "res" | "chief";
  birth_dt: string | null;
  user_job: string | null;
  user_mbti: string | null;
  user_reg: string | null;
  tag_list: string[];
  avatar_url: string | null;
  photo_urls: string[];
  user_bio: string;
  ini_char: string;
  ton_hex: string;
  matc_done: number;
  matc_max: number;
  created_at: string;
};

function row_to_user(row: ProfRow): AuthUser {
  return {
    user_id: row.id,
    user_name: row.user_name,
    user_role: row.user_role,
    birth_dt: row.birth_dt ?? undefined,
    user_age: calc_age(row.birth_dt),
    user_job: row.user_job ?? undefined,
    user_mbti: row.user_mbti ?? undefined,
    user_reg: row.user_reg ?? undefined,
    tag_list: row.tag_list ?? [],
    user_img: row.avatar_url,
    phot_list: row.photo_urls ?? [],
    user_bio: row.user_bio,
    ini_char: row.ini_char,
    ton_hex: row.ton_hex,
    matc_done: row.matc_done,
    matc_max: row.matc_max,
    made_at: new Date(row.created_at).getTime(),
  };
}

// village_contacts 조회 + 상대방 프로필을 2단계로 나눠 가져온다.
// (기존엔 .select("profiles!village_contacts_xxx_fkey(*)")로 한 번에 JOIN했는데,
// PostgREST가 관계를 못 찾으면 - 예: alter_invt.sql 적용 후 스키마 캐시가 아직
// 갱신되지 않은 경우 - 에러를 그대로 삼켜 "연결이 하나도 없음"과 구분되지 않았다.
// 2단계로 나누면 어느 단계가 실패했는지 콘솔에서 바로 보이고, 관계명 해석에도 기대지 않는다.)
async function profs_of(id_list: string[]): Promise<ProfRow[]> {
  if (id_list.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("id", id_list);
  if (error) {
    console.error("[cntc_store] profiles 조회 실패:", error.message);
    return [];
  }
  return (data ?? []) as ProfRow[];
}

// 주민(res_uid) 기준 저장된 연락처 - 이장 프로필 목록
export async function list_chf_of(res_uid: string): Promise<AuthUser[]> {
  const { data, error } = await supabase
    .from("village_contacts")
    .select("chief_id")
    .eq("resident_id", res_uid);
  if (error) {
    console.error("[cntc_store] list_chf_of 조회 실패:", error.message);
    return [];
  }
  const prof_list = await profs_of((data ?? []).map((row) => row.chief_id));
  return prof_list.map(row_to_user);
}

// 이장(chf_uid) 기준 연결된 주민 - 주민 프로필 목록
export async function list_res_of(chf_uid: string): Promise<AuthUser[]> {
  const { data, error } = await supabase
    .from("village_contacts")
    .select("resident_id")
    .eq("chief_id", chf_uid);
  if (error) {
    console.error("[cntc_store] list_res_of 조회 실패:", error.message);
    return [];
  }
  const prof_list = await profs_of((data ?? []).map((row) => row.resident_id));
  return prof_list.map(row_to_user);
}

// 주민(res_uid)-이장(chf_uid) 연락처가 이미 있는지
export async function has_cntc(res_uid: string, chf_uid: string): Promise<boolean> {
  const { data } = await supabase
    .from("village_contacts")
    .select("resident_id")
    .eq("resident_id", res_uid)
    .eq("chief_id", chf_uid)
    .maybeSingle();
  return !!data;
}
