/**
 * jang_data.ts
 * 이장님(마을 리더) 및 각 이장님이 보유한 주민 목업 데이터
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자 ("이장" -> jang)
 * - TODO: Supabase 연동 시 실제 이장님/주민 테이블 조회로 교체
 */

export type JangResid = {
  memb_id: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  memb_reg: string;
  tag_list: string[];
  ini_char: string;
  ton_hex: string;
};

export type JangInfo = {
  jang_id: string;
  jang_name: string;
  trust_scr: number;
  tagl_txt: string;
  matc_cnt: number;
  resd_cnt: number;
  ini_char: string;
  ton_hex: string;
  resd_list: JangResid[];
};

export const JANG_LIST: JangInfo[] = [
  {
    jang_id: "j1",
    jang_name: "초록마을 이장님",
    trust_scr: 4.8,
    tagl_txt: "따뜻한 인연이 자라나는 초록마을 🌿",
    matc_cnt: 12,
    resd_cnt: 28,
    ini_char: "초",
    ton_hex: "#7AC77E",
    resd_list: [
      {
        memb_id: "r1",
        memb_name: "지우",
        memb_age: 27,
        memb_job: "디자이너",
        memb_mbti: "ENFP",
        memb_reg: "서울",
        tag_list: ["여행", "카페 탐방", "영화보기"],
        ini_char: "지",
        ton_hex: "#FFB37C",
      },
      {
        memb_id: "r2",
        memb_name: "민수",
        memb_age: 29,
        memb_job: "개발자",
        memb_mbti: "ISTP",
        memb_reg: "경기",
        tag_list: ["운동", "코딩", "음악 감상"],
        ini_char: "민",
        ton_hex: "#8FB8FF",
      },
      {
        memb_id: "r3",
        memb_name: "서연",
        memb_age: 26,
        memb_job: "마케터",
        memb_mbti: "INFJ",
        memb_reg: "서울",
        tag_list: ["독서", "요가", "브런치"],
        ini_char: "서",
        ton_hex: "#FFC98F",
      },
      {
        memb_id: "r4",
        memb_name: "준호",
        memb_age: 28,
        memb_job: "회계사",
        memb_mbti: "ESTJ",
        memb_reg: "서울",
        tag_list: ["등산", "골프", "자기계발"],
        ini_char: "준",
        ton_hex: "#B5A6FF",
      },
      {
        memb_id: "r5",
        memb_name: "예린",
        memb_age: 25,
        memb_job: "간호사",
        memb_mbti: "ISFJ",
        memb_reg: "경기",
        tag_list: ["요리", "반려동물", "드라마"],
        ini_char: "예",
        ton_hex: "#FF9E9E",
      },
    ],
  },
  {
    jang_id: "j2",
    jang_name: "은빛마을 이장님",
    trust_scr: 4.6,
    tagl_txt: "조용하고 편안한 은빛마을 이야기",
    matc_cnt: 7,
    resd_cnt: 19,
    ini_char: "은",
    ton_hex: "#9FB4C7",
    resd_list: [
      {
        memb_id: "r6",
        memb_name: "하늘",
        memb_age: 31,
        memb_job: "일러스트레이터",
        memb_mbti: "INFP",
        memb_reg: "인천",
        tag_list: ["그림", "산책", "고양이"],
        ini_char: "하",
        ton_hex: "#9FD1C7",
      },
      {
        memb_id: "r7",
        memb_name: "도윤",
        memb_age: 30,
        memb_job: "PM",
        memb_mbti: "ENTJ",
        memb_reg: "서울",
        tag_list: ["러닝", "커피", "책"],
        ini_char: "도",
        ton_hex: "#FFD08F",
      },
    ],
  },
  {
    jang_id: "j3",
    jang_name: "햇살마을 이장님",
    trust_scr: 4.9,
    tagl_txt: "밝고 활기찬 사람들이 모이는 햇살마을",
    matc_cnt: 21,
    resd_cnt: 35,
    ini_char: "햇",
    ton_hex: "#FFC24B",
    resd_list: [
      {
        memb_id: "r8",
        memb_name: "채원",
        memb_age: 27,
        memb_job: "요가강사",
        memb_mbti: "ESFJ",
        memb_reg: "서울",
        tag_list: ["요가", "여행", "베이킹"],
        ini_char: "채",
        ton_hex: "#FFAFAF",
      },
      {
        memb_id: "r9",
        memb_name: "지훈",
        memb_age: 33,
        memb_job: "셰프",
        memb_mbti: "ISFP",
        memb_reg: "경기",
        tag_list: ["요리", "와인", "캠핑"],
        ini_char: "지",
        ton_hex: "#B7D98A",
      },
    ],
  },
];

export function find_jang(jang_id: string): JangInfo | undefined {
  return JANG_LIST.find((j_item) => j_item.jang_id === jang_id);
}
