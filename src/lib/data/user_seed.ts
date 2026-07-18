/**
 * user_seed.ts
 * 유저 초기 시드 데이터 - 앱 최초 실행 시 1회 auth_store 의 유저 목록에 적재된다
 * - uid_rule.ts 의 채번 규칙(날짜 8자 + 일련번호 10자)에 따라 생성 순서대로 user_id 부여
 *   순서: 상용(주민) -> 민정(주민) -> 민지(주민) -> 성연(이장)
 * - 로그인ID는 tkddyd1~tkddyd4 순서대로, 비밀번호는 전부 1234 로 통일
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: Supabase 연동 시 이 배열은 제거하고, users 테이블에 대한 초기 시드(마이그레이션 스크립트)로 대체
 *   (passwd 도 이때 평문이 아닌 해시값으로 저장하도록 교체)
 */
import type { AuthUser } from "@/lib/store/auth_store";
import { gen_uid } from "@/lib/data/uid_rule";

// 시드 데이터가 발급된 기준일 (이후 신규 계정은 실제 생성일 기준으로 채번됨)
const SEED_YMD = "20260718";
const SEED_BASE_MS = new Date(2026, 6, 18, 9, 0, 0).getTime();
const SEED_PASS = "1234";

function seed_user(seq_no: number, base: Omit<AuthUser, "user_id" | "login_id" | "passwd" | "made_at">): AuthUser {
  return {
    ...base,
    user_id: gen_uid(seq_no, SEED_YMD),
    login_id: `tkddyd${seq_no}`,
    passwd: SEED_PASS,
    made_at: SEED_BASE_MS + seq_no,
  };
}

export const USER_SEED: AuthUser[] = [
  seed_user(1, {
    user_name: "상용",
    user_role: "res",
    tag_list: [],
    user_img: null,
    user_bio: "",
    ini_char: "상",
    ton_hex: "#FFB37C",
  }),
  seed_user(2, {
    user_name: "민정",
    user_role: "res",
    tag_list: [],
    user_img: null,
    user_bio: "",
    ini_char: "민",
    ton_hex: "#8FB8FF",
  }),
  seed_user(3, {
    user_name: "민지",
    user_role: "res",
    tag_list: [],
    user_img: null,
    user_bio: "",
    ini_char: "민",
    ton_hex: "#B5A6FF",
  }),
  seed_user(4, {
    user_name: "성연",
    user_role: "chief",
    tag_list: [],
    user_img: null,
    user_bio: "",
    ini_char: "성",
    ton_hex: "#7AC77E",
  }),
];
