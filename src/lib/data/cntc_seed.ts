/**
 * cntc_seed.ts
 * 연락처(주민 ↔ 이장) 초기 시드 데이터 - 앱 최초 실행 시 1회 cntc_store 에 적재된다
 * - user_seed.ts 의 실제 계정을 기준으로 연결: 상용/민정/민지(주민) -> 성연(이장)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: Supabase 연동 시 이 배열은 제거하고, contacts 테이블 초기 시드(마이그레이션 스크립트)로 대체
 */
import type { CntcItem } from "@/lib/store/cntc_store";
import { USER_SEED } from "@/lib/data/user_seed";

function uid_of(user_name: string): string {
  return USER_SEED.find((u_item) => u_item.user_name === user_name)!.user_id;
}

const CHF_UID = uid_of("성연");

export const CNTC_SEED: CntcItem[] = [
  { res_uid: uid_of("상용"), chf_uid: CHF_UID, made_at: 1 },
  { res_uid: uid_of("민정"), chf_uid: CHF_UID, made_at: 2 },
  { res_uid: uid_of("민지"), chf_uid: CHF_UID, made_at: 3 },
];
