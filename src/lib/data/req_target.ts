/**
 * req_target.ts
 * 연결 요청/주변인 테스트 화면(ReqSendScreen/BlndReqScreen)에서 쓰는 "요청 대상" 조회
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
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

export async function find_req_target(jang_id: string, memb_id: string): Promise<ReqTarget | undefined> {
  const [chf_user, res_user] = await Promise.all([find_user(jang_id), find_user(memb_id)]);
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
