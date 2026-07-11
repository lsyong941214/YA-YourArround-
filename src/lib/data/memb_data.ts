/**
 * memb_data.ts
 * 이장님 추천 주민 목업 데이터 (실제 서버 연동 전까지 사용)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: Supabase 연동 시 실제 주민 테이블 조회로 교체
 */

export type MembInfo = {
  memb_id: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  tag_list: string[];
  intr_txt: string;
  ini_char: string;
  ton_hex: string;
};

export const MEMB_LIST: MembInfo[] = [
  {
    memb_id: "m1",
    memb_name: "주원",
    memb_age: 29,
    memb_job: "마케팅",
    memb_mbti: "ENFJ",
    tag_list: ["#여행좋아", "#운동"],
    intr_txt: "새로운 사람 만나는 걸 좋아하는 마케터예요. 주말엔 주로 등산이나 러닝을 해요.",
    ini_char: "주",
    ton_hex: "#FFB37C",
  },
  {
    memb_id: "m2",
    memb_name: "서연",
    memb_age: 27,
    memb_job: "디자이너",
    memb_mbti: "INFJ",
    tag_list: ["#책좋아", "#감성적인"],
    intr_txt: "차분한 대화를 좋아하는 디자이너예요. 동네 카페 탐방이 취미예요.",
    ini_char: "서",
    ton_hex: "#FFC98F",
  },
  {
    memb_id: "m3",
    memb_name: "민호",
    memb_age: 30,
    memb_job: "기획자",
    memb_mbti: "ISTP",
    tag_list: ["#영화", "#맛집탐방"],
    intr_txt: "영화와 맛집 얘기라면 언제든 환영이에요. 편하게 말 걸어주세요.",
    ini_char: "민",
    ton_hex: "#FFA766",
  },
];

export function find_memb(memb_id: string): MembInfo | undefined {
  return MEMB_LIST.find((m_item) => m_item.memb_id === memb_id);
}
