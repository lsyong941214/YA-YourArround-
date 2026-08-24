/**
 * auth_store.ts
 * 유저 인증/프로필 저장소 - Supabase Auth + public.profiles 테이블 기반
 * - 로그인은 Supabase Auth(이메일+비밀번호)로 수행한다. 이 앱엔 실제 이메일이 없어
 *   login_id를 `${login_id}@${AUTH_EMAIL_DOMAIN}` 형태의 합성 이메일로 변환해서 쓴다
 *   (Supabase 프로젝트의 Authentication > Providers > Email에서 "Confirm email"을
 *   꺼둬야 가입 즉시 로그인이 된다 - 실제 메일함이 없으므로 확인 메일을 받을 수 없음)
 * - user_id는 auth.users.id(uuid)를 그대로 쓴다. profiles.id 하나가 역할(user_role)과
 *   무관하게 이장/주민 식별자를 겸한다.
 *
 * [2026-08-24] "계정 생성"과 "프로필 작성"을 분리했다 (make_acct / make_prof).
 *   이전에는 signup() 하나가 auth.signUp + profiles.insert 를 원자적으로 처리했는데,
 *   소셜 로그인(카카오/네이버/구글)을 붙이면 계정 생성이 provider 콜백에서 일어나고
 *   그 시점엔 프로필을 입력받을 화면이 없다. 그래서
 *     (1) 인증 수단이 무엇이든 auth.users 행만 먼저 만들고,
 *     (2) "세션은 있는데 profiles 행이 없는" 상태(sess_stat() === "onbd")를 온보딩 화면으로 보내
 *         거기서 make_prof() 로 프로필을 만든다
 *   는 구조로 바꿨다. 소셜 로그인은 (1)만 교체하면 되고 온보딩은 그대로 재사용된다.
 *
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

export type AuthRole = "res" | "chief";

export type AuthUser = {
  user_id: string;
  user_name: string;
  user_role: AuthRole;
  birth_dt?: string; // YYYY-MM-DD
  user_age?: number; // birth_dt 에서 파생 - DB에 저장하지 않는다
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

const AUTH_EMAIL_DOMAIN = "jubyeon.local";
const DEF_MATC_MAX = 5;
const TON_LIST = ["#FFB37C", "#8FB8FF", "#FFC98F", "#B5A6FF", "#FF9E9E", "#9FD1C7", "#FFD08F"];

function login_email(login_id: string): string {
  return `${login_id.trim()}@${AUTH_EMAIL_DOMAIN}`;
}

// 생년월일 -> 만 나이. 생일이 아직 안 지났으면 1살 뺀다
export function calc_age(birth_dt?: string | null): number | undefined {
  if (!birth_dt) return undefined;
  const born_at = new Date(birth_dt);
  if (Number.isNaN(born_at.getTime())) return undefined;
  const now_at = new Date();
  let age_val = now_at.getFullYear() - born_at.getFullYear();
  const mon_gap = now_at.getMonth() - born_at.getMonth();
  if (mon_gap < 0 || (mon_gap === 0 && now_at.getDate() < born_at.getDate())) age_val -= 1;
  return age_val >= 0 ? age_val : undefined;
}

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

/**
 * 세션/프로필 상태
 * - "none": 로그인 안 됨            -> /login
 * - "onbd": 로그인은 됐는데 프로필 행이 없음 -> /onbd (최초 로그인 온보딩)
 * - "done": 로그인 + 프로필 모두 있음  -> /home
 * 소셜 로그인을 붙여도 "가입 직후엔 프로필이 없다"는 상태는 동일하므로 이 분기를 그대로 쓴다.
 */
export type SessStat = "none" | "onbd" | "done";

export async function sess_stat(): Promise<SessStat> {
  const { data: sess_data } = await supabase.auth.getUser();
  const auth_user = sess_data.user;
  if (!auth_user) return "none";
  const found = await find_user(auth_user.id);
  return found ? "done" : "onbd";
}

// 상태별 이동 경로 - 로그인/온보딩 화면이 공통으로 쓰는 라우팅 규칙
export function stat_path(stat_val: SessStat): string {
  if (stat_val === "none") return "/login";
  if (stat_val === "onbd") return "/onbd";
  return "/home";
}

// 현재 로그인된 유저 (세션이 없거나 프로필 미작성이면 null)
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

/**
 * (1단계) 계정만 생성한다 - 프로필은 만들지 않는다.
 * 성공하면 세션 상태가 "onbd"가 되고, 호출한 화면은 온보딩(/onbd)으로 보내면 된다.
 * 소셜 로그인을 붙일 때는 이 함수 대신 provider 인증이 같은 자리를 차지한다.
 */
export async function make_acct(
  login_id: string,
  passwd: string
): Promise<{ ok_flag: boolean; err_msg?: string }> {
  const { data: sign_data, error: sign_err } = await supabase.auth.signUp({
    email: login_email(login_id),
    password: passwd,
  });
  if (sign_err || !sign_data.user) {
    return {
      ok_flag: false,
      err_msg:
        sign_err?.message === "User already registered"
          ? "이미 사용 중인 로그인ID예요."
          : sign_err?.message ?? "가입에 실패했어요.",
    };
  }
  return { ok_flag: true };
}

export type ProfInp = {
  user_name: string;
  user_role: AuthRole;
  birth_dt?: string;
  user_job?: string;
  user_mbti?: string;
  user_reg?: string;
  tag_list?: string[];
  user_bio?: string;
  user_img?: string | null;
  phot_list?: string[];
};

/**
 * (2단계) 현재 로그인된 계정에 프로필을 만든다 - 최초 로그인 온보딩에서 호출한다.
 * 계정을 어떤 방식(비밀번호/소셜)으로 만들었는지와 무관하게 동작한다.
 */
export async function make_prof(inp: ProfInp): Promise<{ user?: AuthUser; err_msg?: string }> {
  const { data: sess_data } = await supabase.auth.getUser();
  const auth_user = sess_data.user;
  if (!auth_user) return { err_msg: "로그인이 만료되었어요. 다시 로그인해주세요." };

  const new_row = {
    id: auth_user.id,
    user_name: inp.user_name,
    user_role: inp.user_role,
    birth_dt: inp.birth_dt ?? null,
    user_job: inp.user_job ?? null,
    user_mbti: inp.user_mbti ?? null,
    user_reg: inp.user_reg ?? null,
    tag_list: inp.tag_list ?? [],
    user_bio: inp.user_bio ?? "",
    avatar_url: inp.user_img ?? null,
    photo_urls: inp.phot_list ?? [],
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
  if (patch.birth_dt !== undefined) upd_row.birth_dt = patch.birth_dt || null;
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
