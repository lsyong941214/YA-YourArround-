/**
 * cntc_store.ts
 * 연락처(주민 ↔ 이장) 저장소 - 실제 DB 연동 전까지 localStorage 를 "contacts 테이블"처럼 사용한다
 * - 주민이 이장을 연락처로 저장해두는 관계(res_uid -> chf_uid)를 기록한다
 * - 최초 실행 시 cntc_seed.ts 의 초기 연락처(상용/민정/민지 -> 성연)가 자동으로 적재된다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: 실제 DB 연동 시 이 파일의 함수 시그니처(list_chf_of/list_res_of/add_cntc 등)는
 *   유지한 채 내부 구현만 API/DB 조회 기반으로 교체
 */
import { AuthUser, find_user } from "@/lib/store/auth_store";
import { CNTC_SEED } from "@/lib/data/cntc_seed";

export type CntcItem = {
  res_uid: string;
  chf_uid: string;
  made_at: number;
};

const LIST_KEY = "cntc_list";
const INIT_KEY = "cntc_init";

function is_brws(): boolean {
  return typeof window !== "undefined";
}

// 최초 실행 시 1회 cntc_seed.ts 의 초기 연락처를 적재 (이후에는 절대 재적재하지 않음)
function ensure_seed(): void {
  if (window.localStorage.getItem(INIT_KEY)) return;
  window.localStorage.setItem(INIT_KEY, "1");
  if (!window.localStorage.getItem(LIST_KEY)) {
    save_list(CNTC_SEED);
  }
}

export function list_cntc(): CntcItem[] {
  if (!is_brws()) return [];
  ensure_seed();
  try {
    const raw_str = window.localStorage.getItem(LIST_KEY);
    return raw_str ? (JSON.parse(raw_str) as CntcItem[]) : [];
  } catch {
    return [];
  }
}

function save_list(list_val: CntcItem[]): void {
  if (!is_brws()) return;
  window.localStorage.setItem(LIST_KEY, JSON.stringify(list_val));
}

export function add_cntc(res_uid: string, chf_uid: string): void {
  const list_val = list_cntc();
  if (list_val.some((c_item) => c_item.res_uid === res_uid && c_item.chf_uid === chf_uid)) return;
  list_val.push({ res_uid, chf_uid, made_at: Date.now() });
  save_list(list_val);
}

// 주민(res_uid) 기준 저장된 연락처 - 이장 역할 유저만 반환
export function list_chf_of(res_uid: string): AuthUser[] {
  return list_cntc()
    .filter((c_item) => c_item.res_uid === res_uid)
    .map((c_item) => find_user(c_item.chf_uid))
    .filter((u_item): u_item is AuthUser => !!u_item && u_item.user_role === "chief");
}

// 이장(chf_uid) 기준 연결된 주민 - 주민 역할 유저만 반환
export function list_res_of(chf_uid: string): AuthUser[] {
  return list_cntc()
    .filter((c_item) => c_item.chf_uid === chf_uid)
    .map((c_item) => find_user(c_item.res_uid))
    .filter((u_item): u_item is AuthUser => !!u_item && u_item.user_role === "res");
}
