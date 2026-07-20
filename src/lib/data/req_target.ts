/**
 * req_target.ts
 * 연결 요청/주변인 테스트 화면(ReqSendScreen/BlndReqScreen)에서 쓰는 "요청 대상" 조회
 * - 기존 목업 마을(jang_data.ts) 기반 주민, 실제 연락처(cntc_store) 기반 주민 모두를 지원한다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { find_jang } from "@/lib/data/jang_data";
import { find_user } from "@/lib/store/auth_store";

export type ReqTarget = {
  jang_name: string;
  memb_id: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  memb_reg: string;
  memb_bio: string;
  memb_phts: string[];
  tag_list: string[];
  ini_char: string;
  ton_hex: string;
};

export function find_req_target(jang_id: string, memb_id: string): ReqTarget | undefined {
  const jang_item = find_jang(jang_id);
  const resd_item = jang_item?.resd_list.find((r_item) => r_item.memb_id === memb_id);
  if (jang_item && resd_item) {
    return {
      jang_name: jang_item.jang_name,
      memb_id: resd_item.memb_id,
      memb_name: resd_item.memb_name,
      memb_age: resd_item.memb_age,
      memb_job: resd_item.memb_job,
      memb_mbti: resd_item.memb_mbti,
      memb_reg: resd_item.memb_reg,
      memb_bio: "",
      memb_phts: [],
      tag_list: resd_item.tag_list,
      ini_char: resd_item.ini_char,
      ton_hex: resd_item.ton_hex,
    };
  }

  const chf_user = find_user(jang_id);
  const res_user = find_user(memb_id);
  if (chf_user && res_user) {
    return {
      jang_name: `${chf_user.user_name} 이장님`,
      memb_id: res_user.user_id,
      memb_name: res_user.user_name,
      memb_age: res_user.user_age ?? 0,
      memb_job: res_user.user_job ?? "-",
      memb_mbti: res_user.user_mbti ?? "-",
      memb_reg: res_user.user_reg ?? "-",
      memb_bio: res_user.user_bio,
      memb_phts: res_user.phot_list,
      tag_list: res_user.tag_list,
      ini_char: res_user.ini_char,
      ton_hex: res_user.ton_hex,
    };
  }

  return undefined;
}
