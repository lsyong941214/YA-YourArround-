/**
 * auth_store.ts
 * 임시 로그인(세션) 저장소 - 실제 로그인 API 연동 전까지 텍스트 입력으로 계정을 만들고 전환한다
 * - 여러 계정(주민1/주민2/이장2 등)을 만들어두고 로그인/로그아웃으로 오갈 수 있어
 *   "요청 기록/진행중인 매칭이 한 유저로만 보이는" 문제를 해소한다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: 실제 로그인 API 연동 시 이 파일의 함수 시그니처(curr_user/do_logout 등)는 유지한 채
 *   내부 구현만 세션/토큰 기반으로 교체
 */

export type AuthRole = "res" | "chief";

export type AuthUser = {
  user_id: string;
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
  made_at: number;
};

const LIST_KEY = "auth_users";
const CURR_KEY = "auth_curr";

const TON_LIST = ["#FFB37C", "#8FB8FF", "#FFC98F", "#B5A6FF", "#FF9E9E", "#9FD1C7", "#FFD08F"];

function is_brws(): boolean {
  return typeof window !== "undefined";
}

export function list_users(): AuthUser[] {
  if (!is_brws()) return [];
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

export function find_user(user_id: string): AuthUser | undefined {
  return list_users().find((u_item) => u_item.user_id === user_id);
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
  const next_user: AuthUser = {
    user_id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
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
