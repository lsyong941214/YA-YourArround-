/**
 * auth_store.ts
 * 유저 정보 저장소 - 실제 DB(Supabase 등) 연동 전까지 localStorage 를 "users 테이블"처럼 사용한다
 * - user_id 는 uid_rule.ts 의 채번 규칙(날짜 8자 + 일련번호 10자)으로 발급되며,
 *   최초 실행 시 user_seed.ts 의 초기 유저(상용/민정/민지/성연)가 자동으로 적재된다
 * - 로그인은 user_id(내부 식별자)가 아닌 login_id/passwd(로그인ID/비밀번호)로 수행한다
 * - 여러 계정(주민1/주민2/이장2 등)을 만들어두고 로그인/로그아웃으로 오갈 수 있어
 *   "요청 기록/진행중인 매칭이 한 유저로만 보이는" 문제를 해소한다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: 실제 로그인 API/DB 연동 시 이 파일의 함수 시그니처(curr_user/do_login/login_cred 등)는
 *   유지한 채 내부 구현만 서버 세션/DB 조회 기반으로 교체 (passwd 평문 저장/비교도 이때 해시 비교로 교체)
 */
import { gen_uid, ymd_of } from "@/lib/data/uid_rule";
import { USER_SEED } from "@/lib/data/user_seed";

export type AuthRole = "res" | "chief";

export type AuthUser = {
  user_id: string;
  login_id: string;
  passwd: string;
  user_name: string;
  user_role: AuthRole;
  jang_id?: string;
  memb_id?: string;
  user_age?: number;
  user_job?: string;
  user_mbti?: string;
  user_reg?: string;
  tag_list: string[];
  user_img: string | null;
  user_bio: string;
  ini_char: string;
  ton_hex: string;
  matc_done: number;
  matc_max: number;
  made_at: number;
};

const DEF_MATC_MAX = 5;

const LIST_KEY = "auth_users";
const CURR_KEY = "auth_curr";
const INIT_KEY = "auth_init";

const TON_LIST = ["#FFB37C", "#8FB8FF", "#FFC98F", "#B5A6FF", "#FF9E9E", "#9FD1C7", "#FFD08F"];

function is_brws(): boolean {
  return typeof window !== "undefined";
}

// 최초 실행 시 1회 user_seed.ts 의 초기 유저를 적재 (이후에는 절대 재적재하지 않음)
function ensure_seed(): void {
  if (window.localStorage.getItem(INIT_KEY)) return;
  window.localStorage.setItem(INIT_KEY, "1");
  if (!window.localStorage.getItem(LIST_KEY)) {
    save_list(USER_SEED);
  }
}

export function list_users(): AuthUser[] {
  if (!is_brws()) return [];
  ensure_seed();
  try {
    const raw_str = window.localStorage.getItem(LIST_KEY);
    return raw_str ? (JSON.parse(raw_str) as AuthUser[]) : [];
  } catch {
    return [];
  }
}

function save_list(list_val: AuthUser[]): void {
  if (!is_brws()) return;
  window.localStorage.setItem(LIST_KEY, JSON.stringify(list_val));
}

// 같은 날짜(ymd_str)에 발급된 user_id 중 가장 큰 일련번호 다음 번호를 반환
function next_seq(ymd_str: string): number {
  const seq_list = list_users()
    .map((u_item) => u_item.user_id)
    .filter((id_str) => id_str.startsWith(ymd_str))
    .map((id_str) => Number(id_str.slice(8, 18)) || 0);
  return (seq_list.length ? Math.max(...seq_list) : 0) + 1;
}

export function find_user(user_id: string): AuthUser | undefined {
  return list_users().find((u_item) => u_item.user_id === user_id);
}

export function find_by_login(login_id: string): AuthUser | undefined {
  return list_users().find((u_item) => u_item.login_id === login_id);
}

export function curr_user(): AuthUser | null {
  if (!is_brws()) return null;
  const curr_id = window.localStorage.getItem(CURR_KEY);
  if (!curr_id) return null;
  return find_user(curr_id) ?? null;
}

export function do_login(user_id: string): void {
  if (!is_brws()) return;
  window.localStorage.setItem(CURR_KEY, user_id);
}

// 로그인ID/비밀번호로 로그인 - 일치하는 계정이 없으면 false 를 반환하고 로그인하지 않는다
export function login_cred(login_id: string, passwd: string): boolean {
  const trim_id = login_id.trim();
  if (!trim_id || !passwd) return false;
  const user_hit = find_by_login(trim_id);
  if (!user_hit || user_hit.passwd !== passwd) return false;
  do_login(user_hit.user_id);
  return true;
}

export function do_logout(): void {
  if (!is_brws()) return;
  window.localStorage.removeItem(CURR_KEY);
}

function pick_ton(seed_txt: string): string {
  let hash_val = 0;
  for (let i_val = 0; i_val < seed_txt.length; i_val += 1) {
    hash_val = (hash_val + seed_txt.charCodeAt(i_val)) % TON_LIST.length;
  }
  return TON_LIST[hash_val];
}

export function login_new(inp: {
  login_id: string;
  passwd: string;
  user_name: string;
  user_role: AuthRole;
  jang_id?: string;
  memb_id?: string;
  user_age?: number;
  user_job?: string;
  user_mbti?: string;
  user_reg?: string;
  tag_list?: string[];
  user_img?: string | null;
  user_bio?: string;
}): AuthUser {
  const ymd_now = ymd_of(new Date());
  const next_user: AuthUser = {
    user_id: gen_uid(next_seq(ymd_now), ymd_now),
    login_id: inp.login_id,
    passwd: inp.passwd,
    user_name: inp.user_name,
    user_role: inp.user_role,
    jang_id: inp.jang_id,
    memb_id: inp.memb_id,
    user_age: inp.user_age,
    user_job: inp.user_job,
    user_mbti: inp.user_mbti,
    user_reg: inp.user_reg,
    tag_list: inp.tag_list ?? [],
    user_img: inp.user_img ?? null,
    user_bio: inp.user_bio ?? "",
    ini_char: inp.user_name.slice(0, 1) || "?",
    ton_hex: pick_ton(inp.user_name + Date.now()),
    matc_done: 0,
    matc_max: DEF_MATC_MAX,
    made_at: Date.now(),
  };
  const list_val = list_users();
  list_val.unshift(next_user);
  save_list(list_val);
  do_login(next_user.user_id);
  return next_user;
}

export function updt_curr(patch: Partial<AuthUser>): void {
  const user_now = curr_user();
  if (!user_now) return;
  const list_val = list_users().map((u_item) =>
    u_item.user_id === user_now.user_id ? { ...u_item, ...patch } : u_item
  );
  save_list(list_val);
}
