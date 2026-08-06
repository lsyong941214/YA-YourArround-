/**
 * auth_store.ts
 * 유저 인증/프로필 저장소 - Supabase Auth + public.profiles 테이블 기반
 * - 로그인은 Supabase Auth(이메일+비밀번호)로 수행한다. 이 앱엔 실제 이메일이 없어
 *   login_id를 `${login_id}@${AUTH_EMAIL_DOMAIN}` 형태의 합성 이메일로 변환해서 쓴다
 *   (Supabase 프로젝트의 Authentication > Providers > Email에서 "Confirm email"을
 *   꺼둬야 가입 즉시 로그인이 된다 - 실제 메일함이 없으므로 확인 메일을 받을 수 없음)
 * - user_id는 더 이상 자체 채번(uid_rule.ts)이 아니라 auth.users.id(uuid) 그대로 쓴다.
 *   jang_id/memb_id(둘 다 "자기 자신의 user_id"를 가리키던 필드)는 제거 - profiles.id
 *   하나가 역할(user_role)과 무관하게 이장/주민 식별자를 겸한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

export type AuthRole = "res" | "chief";

export type AuthUser = {
  user_id: string;
  user_name: string;
  user_role: AuthRole;
  user_age?: number;
  user_job?: string;
  user_mbti?: string;
  user_reg?: string;
  tag_list: string[];
  user_img: string | null;
  phot_list: string[];
  user_bio: string;
  ini_char: string;
  ton_hex: string;
  matc_done: number;
  matc_max: number;
  made_at: number;
};

type ProfRow = {
  id: string;
  user_name: string;
  user_role: AuthRole;
  user_age: number | null;
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

const AUTH_EMAIL_DOMAIN = "jubyeon.local";
const DEF_MATC_MAX = 5;
const TON_LIST = ["#FFB37C", "#8FB8FF", "#FFC98F", "#B5A6FF", "#FF9E9E", "#9FD1C7", "#FFD08F"];

function login_email(login_id: string): string {
  return `${login_id.trim()}@${AUTH_EMAIL_DOMAIN}`;
}

function row_to_user(row: ProfRow): AuthUser {
  return {
    user_id: row.id,
    user_name: row.user_name,
    user_role: row.user_role,
    user_age: row.user_age ?? undefined,
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

function pick_ton(seed_txt: string): string {
  let hash_val = 0;
  for (let i_val = 0; i_val < seed_txt.length; i_val += 1) {
    hash_val = (hash_val + seed_txt.charCodeAt(i_val)) % TON_LIST.length;
  }
  return TON_LIST[hash_val];
}

export async function find_user(user_id: string): Promise<AuthUser | undefined> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user_id).maybeSingle();
  if (error || !data) return undefined;
  return row_to_user(data as ProfRow);
}

// 현재 로그인된 유저 (세션 없으면 null)
export async function curr_user(): Promise<AuthUser | null> {
  const { data: sess_data } = await supabase.auth.getUser();
  const auth_user = sess_data.user;
  if (!auth_user) return null;
  const found = await find_user(auth_user.id);
  return found ?? null;
}

// 로그인ID + 비밀번호로 로그인 - 실패 시 false
export async function login_cred(login_id: string, passwd: string): Promise<boolean> {
  const trim_id = login_id.trim();
  if (!trim_id || !passwd) return false;
  const { error } = await supabase.auth.signInWithPassword({
    email: login_email(trim_id),
    password: passwd,
  });
  return !error;
}

export async function do_logout(): Promise<void> {
  await supabase.auth.signOut();
}

export type SignupInp = {
  login_id: string;
  passwd: string;
  user_name: string;
  user_role: AuthRole;
  user_age?: number;
  user_job?: string;
  user_mbti?: string;
  user_reg?: string;
  tag_list?: string[];
  user_bio?: string;
};

// 회원가입 - Auth 계정 생성 + profiles 행 동시 생성. 실패 시 err_msg를 채워 반환
export async function signup(inp: SignupInp): Promise<{ user?: AuthUser; err_msg?: string }> {
  const { data: sign_data, error: sign_err } = await supabase.auth.signUp({
    email: login_email(inp.login_id),
    password: inp.passwd,
  });
  if (sign_err || !sign_data.user) {
    return {
      err_msg:
        sign_err?.message === "User already registered"
          ? "이미 사용 중인 로그인ID예요."
          : sign_err?.message ?? "가입에 실패했어요.",
    };
  }

  const new_row = {
    id: sign_data.user.id,
    user_name: inp.user_name,
    user_role: inp.user_role,
    user_age: inp.user_age ?? null,
    user_job: inp.user_job ?? null,
    user_mbti: inp.user_mbti ?? null,
    user_reg: inp.user_reg ?? null,
    tag_list: inp.tag_list ?? [],
    user_bio: inp.user_bio ?? "",
    ini_char: inp.user_name.slice(0, 1) || "?",
    ton_hex: pick_ton(inp.user_name + Date.now()),
    matc_done: 0,
    matc_max: DEF_MATC_MAX,
  };
  const { data: prof_data, error: prof_err } = await supabase
    .from("profiles")
    .insert(new_row)
    .select("*")
    .single();
  if (prof_err || !prof_data) {
    return { err_msg: "프로필 생성에 실패했어요." };
  }
  return { user: row_to_user(prof_data as ProfRow) };
}

// 현재 로그인된 유저 프로필 일부 수정
export async function updt_curr(patch: Partial<AuthUser>): Promise<void> {
  const { data: sess_data } = await supabase.auth.getUser();
  const auth_user = sess_data.user;
  if (!auth_user) return;

  const upd_row: Record<string, unknown> = {};
  if (patch.user_name !== undefined) upd_row.user_name = patch.user_name;
  if (patch.user_role !== undefined) upd_row.user_role = patch.user_role;
  if (patch.user_age !== undefined) upd_row.user_age = patch.user_age;
  if (patch.user_job !== undefined) upd_row.user_job = patch.user_job;
  if (patch.user_mbti !== undefined) upd_row.user_mbti = patch.user_mbti;
  if (patch.user_reg !== undefined) upd_row.user_reg = patch.user_reg;
  if (patch.tag_list !== undefined) upd_row.tag_list = patch.tag_list;
  if (patch.user_img !== undefined) upd_row.avatar_url = patch.user_img;
  if (patch.phot_list !== undefined) upd_row.photo_urls = patch.phot_list;
  if (patch.user_bio !== undefined) upd_row.user_bio = patch.user_bio;
  if (patch.matc_done !== undefined) upd_row.matc_done = patch.matc_done;
  if (patch.matc_max !== undefined) upd_row.matc_max = patch.matc_max;

  await supabase.from("profiles").update(upd_row).eq("id", auth_user.id);
}
