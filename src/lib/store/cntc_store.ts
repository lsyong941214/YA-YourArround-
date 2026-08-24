/**
 * cntc_store.ts
 * 연락처(주민 ↔ 이장) 저장소 - Supabase public.village_contacts 테이블 기반
 * - 주민이 이장을 연락처로 저장해두는 관계(resident_id -> chief_id)를 기록한다
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

export async function add_cntc(res_uid: string, chf_uid: string): Promise<void> {
  await supabase
    .from("village_contacts")
    .upsert({ resident_id: res_uid, chief_id: chf_uid }, { onConflict: "resident_id,chief_id" });
}

// 주민(res_uid) 기준 저장된 연락처 - 이장 프로필 목록
export async function list_chf_of(res_uid: string): Promise<AuthUser[]> {
  const { data, error } = await supabase
    .from("village_contacts")
    .select("profiles!village_contacts_chief_id_fkey(*)")
    .eq("resident_id", res_uid);
  if (error || !data) return [];
  return data
    .map((row) => row.profiles as unknown as ProfRow)
    .filter((p_row): p_row is ProfRow => !!p_row)
    .map(row_to_user);
}

// 이장(chf_uid) 기준 연결된 주민 - 주민 프로필 목록
export async function list_res_of(chf_uid: string): Promise<AuthUser[]> {
  const { data, error } = await supabase
    .from("village_contacts")
    .select("profiles!village_contacts_resident_id_fkey(*)")
    .eq("chief_id", chf_uid);
  if (error || !data) return [];
  return data
    .map((row) => row.profiles as unknown as ProfRow)
    .filter((p_row): p_row is ProfRow => !!p_row)
    .map(row_to_user);
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
