/**
 * revw_store.ts
 * 이장님이 주선한 매칭이 최종 연결 성사됐을 때, 주민이 남기는 이장님 리뷰(점수+후기)
 * - 로그인/DB 연동 전까지 localStorage로 데모, 최초 로드시 이장님별 임의 시드 리뷰 3개를 채워둔다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: Supabase 연동 시 실제 리뷰 테이블 CRUD로 교체
 */

export type RevwItem = {
  revw_id: string;
  jang_id: string;
  rvwr_name: string;
  rvwr_ini: string;
  rvwr_ton: string;
  scr_val: number;
  rvw_txt: string;
  made_at: number;
};

const STOR_KEY = "revw_list";

const SEED_LIST: RevwItem[] = [
  {
    revw_id: "sd_j1_1",
    jang_id: "j1",
    rvwr_name: "여름",
    rvwr_ini: "여",
    rvwr_ton: "#FFB37C",
    scr_val: 5,
    rvw_txt: "이장님 덕분에 좋은 분을 만났어요! 정말 감사합니다 😊",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 20,
  },
  {
    revw_id: "sd_j1_2",
    jang_id: "j1",
    rvwr_name: "도현",
    rvwr_ini: "도",
    rvwr_ton: "#8FB8FF",
    scr_val: 4,
    rvw_txt: "친절하게 잘 챙겨주셔서 편하게 만남을 가질 수 있었어요.",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 14,
  },
  {
    revw_id: "sd_j1_3",
    jang_id: "j1",
    rvwr_name: "하은",
    rvwr_ini: "하",
    rvwr_ton: "#FFC98F",
    scr_val: 5,
    rvw_txt: "세심하게 신경써주셔서 좋은 인연이 됐어요.",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    revw_id: "sd_j2_1",
    jang_id: "j2",
    rvwr_name: "유진",
    rvwr_ini: "유",
    rvwr_ton: "#9FD1C7",
    scr_val: 4,
    rvw_txt: "차분하게 잘 이어주셔서 좋았어요.",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 18,
  },
  {
    revw_id: "sd_j2_2",
    jang_id: "j2",
    rvwr_name: "성민",
    rvwr_ini: "성",
    rvwr_ton: "#B5A6FF",
    scr_val: 3,
    rvw_txt: "나쁘지 않았지만 조금 더 자세한 소개가 있었으면 좋았을 것 같아요.",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    revw_id: "sd_j2_3",
    jang_id: "j2",
    rvwr_name: "나연",
    rvwr_ini: "나",
    rvwr_ton: "#FF9E9E",
    scr_val: 5,
    rvw_txt: "정말 잘 맞는 분을 소개해주셨어요!",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    revw_id: "sd_j3_1",
    jang_id: "j3",
    rvwr_name: "준영",
    rvwr_ini: "준",
    rvwr_ton: "#FFAFAF",
    scr_val: 5,
    rvw_txt: "활기찬 분위기 속에서 좋은 만남이었어요!",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 16,
  },
  {
    revw_id: "sd_j3_2",
    jang_id: "j3",
    rvwr_name: "소율",
    rvwr_ini: "소",
    rvwr_ton: "#B7D98A",
    scr_val: 4,
    rvw_txt: "친근하게 다가와주셔서 편했습니다.",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
  {
    revw_id: "sd_j3_3",
    jang_id: "j3",
    rvwr_name: "재현",
    rvwr_ini: "재",
    rvwr_ton: "#FFD08F",
    scr_val: 5,
    rvw_txt: "믿고 소개받을 수 있어서 좋았어요.",
    made_at: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
];

function is_brws(): boolean {
  return typeof window !== "undefined";
}

function do_seed(): void {
  if (!is_brws()) return;
  if (window.localStorage.getItem(STOR_KEY)) return;
  window.localStorage.setItem(STOR_KEY, JSON.stringify(SEED_LIST));
}

export function load_revw_list(): RevwItem[] {
  if (!is_brws()) return [];
  do_seed();
  try {
    const raw_str = window.localStorage.getItem(STOR_KEY);
    return raw_str ? (JSON.parse(raw_str) as RevwItem[]) : [];
  } catch {
    return [];
  }
}

export function add_revw(inp: Omit<RevwItem, "revw_id" | "made_at">): void {
  const list_val = load_revw_list();
  list_val.unshift({
    ...inp,
    revw_id: "rv_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    made_at: Date.now(),
  });
  window.localStorage.setItem(STOR_KEY, JSON.stringify(list_val));
}

export function jang_revw_list(jang_id: string): RevwItem[] {
  return load_revw_list()
    .filter((r_item) => r_item.jang_id === jang_id)
    .sort((a_item, b_item) => b_item.made_at - a_item.made_at);
}

export function avg_scr(jang_id: string): number {
  const list_val = jang_revw_list(jang_id);
  if (list_val.length === 0) return 0;
  const sum_val = list_val.reduce((acc_val, r_item) => acc_val + r_item.scr_val, 0);
  return Math.round((sum_val / list_val.length) * 10) / 10;
}
