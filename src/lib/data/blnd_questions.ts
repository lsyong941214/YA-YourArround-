/**
 * blnd_questions.ts
 * 주변인 테스트(밸런스 게임)에 쓰이는 질문 은행.
 * - 카테고리(categ)별로 여러 문항을 미리 정의해두고, 실제 테스트 1회당
 *   categ_pick()으로 카테고리별 일부만 랜덤으로 뽑아서 사용한다.
 * - 이미지(a_img/b_img)는 준비된 문항에만 있고, 없는 문항은 하단 문구만 카드에 출력한다.
 */

export type BlndCateg = "daily" | "food" | "trip";

export type BlndQuestion = {
  q_id: string;
  categ: BlndCateg;
  a_label: string;
  b_label: string;
  a_img?: string;
  b_img?: string;
};

// 테스트 1회에 뽑는 문항 수 - 카테고리별 개수는 CATEG_PICK_CNT 참고
export const BLND_QUESTIONS: BlndQuestion[] = [
  // ---- 일상 밸런스게임 ----
  {
    q_id: "daily_01",
    categ: "daily",
    a_label: "매일 만나지만 1시간만 데이트",
    b_label: "한 달에 한 번 만나서 2박 3일 데이트",
    a_img: "/assets/blnd/q1_a.png",
    b_img: "/assets/blnd/q1_b.png",
  },
  {
    q_id: "daily_02",
    categ: "daily",
    a_label: "약속 시간보다 항상 일찍 도착한다",
    b_label: "약속 시간에 딱 맞춰 도착한다",
  },
  {
    q_id: "daily_03",
    categ: "daily",
    a_label: "주말엔 집에서 푹 쉬는 게 좋다",
    b_label: "주말엔 밖에 나가서 활동하는 게 좋다",
  },
  {
    q_id: "daily_04",
    categ: "daily",
    a_label: "연락은 자주, 짧게 주고받는 편",
    b_label: "연락은 가끔, 길게 주고받는 편",
  },
  {
    q_id: "daily_05",
    categ: "daily",
    a_label: "계획을 세우고 그대로 움직여야 마음이 편하다",
    b_label: "즉흥적으로 움직이는 게 더 재밌다",
  },
  {
    q_id: "daily_06",
    categ: "daily",
    a_label: "아침형 인간",
    b_label: "저녁형 인간",
  },
  // ---- 음식 밸런스게임 ----
  {
    q_id: "food_01",
    categ: "food",
    a_label: "맵고 자극적인 음식이 좋다",
    b_label: "슴슴하고 담백한 음식이 좋다",
  },
  {
    q_id: "food_02",
    categ: "food",
    a_label: "같은 맛집을 계속 가는 게 좋다",
    b_label: "매번 새로운 곳을 찾아다니는 게 좋다",
  },
  {
    q_id: "food_03",
    categ: "food",
    a_label: "면 요리파",
    b_label: "밥 요리파",
  },
  {
    q_id: "food_04",
    categ: "food",
    a_label: "디저트는 무조건 챙겨 먹는다",
    b_label: "디저트는 없어도 그만이다",
  },
  {
    q_id: "food_05",
    categ: "food",
    a_label: "혼자 밥 먹는 게 편하다",
    b_label: "같이 밥 먹는 게 좋다",
  },
  {
    q_id: "food_06",
    categ: "food",
    a_label: "배달 음식파",
    b_label: "직접 요리해 먹는 파",
  },
  // ---- 여행지 밸런스게임 ----
  {
    q_id: "trip_01",
    categ: "trip",
    a_label: "바다가 있는 여행지",
    b_label: "산이 있는 여행지",
  },
  {
    q_id: "trip_02",
    categ: "trip",
    a_label: "빡빡한 일정으로 알차게 돌아다니는 여행",
    b_label: "숙소에서 여유롭게 쉬다 오는 여행",
  },
  {
    q_id: "trip_03",
    categ: "trip",
    a_label: "국내 여행",
    b_label: "해외 여행",
  },
  {
    q_id: "trip_04",
    categ: "trip",
    a_label: "계획을 촘촘히 짜서 떠나는 여행",
    b_label: "숙소만 예약하고 즉흥적으로 다니는 여행",
  },
  {
    q_id: "trip_05",
    categ: "trip",
    a_label: "사람 많은 유명 관광지",
    b_label: "한적한 로컬 골목",
  },
  {
    q_id: "trip_06",
    categ: "trip",
    a_label: "캠핑/차박 여행",
    b_label: "호텔/리조트 여행",
  },
];

// 테스트 1회당 카테고리별로 뽑을 문항 수 (합계 = BLND_CARD_CNT)
export const CATEG_PICK_CNT: Record<BlndCateg, number> = {
  daily: 3,
  food: 3,
  trip: 4,
};

function shuffle<T>(arr: T[]): T[] {
  const cpy = [...arr];
  for (let i = cpy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cpy[i], cpy[j]] = [cpy[j], cpy[i]];
  }
  return cpy;
}

// 카테고리별로 CATEG_PICK_CNT개씩 랜덤으로 뽑아 순서를 섞은 뒤 문항 id 목록을 반환한다.
// (신청 시 한 번만 뽑아서 저장 -> 양쪽 참여자가 항상 같은 문항/순서로 진행)
export function pick_categ_ids(): string[] {
  const picked: string[] = [];
  (Object.keys(CATEG_PICK_CNT) as BlndCateg[]).forEach((categ) => {
    const pool = BLND_QUESTIONS.filter((q_item) => q_item.categ === categ);
    picked.push(...shuffle(pool).slice(0, CATEG_PICK_CNT[categ]).map((q_item) => q_item.q_id));
  });
  return shuffle(picked);
}

// 레거시 요청(카테고리 랜덤 선택 도입 전에 만들어져 card_ids가 없는 경우) 대비 고정 기본값
// - 매번 달라지면 양쪽 참여자가 서로 다른 문항을 보게 되므로, 카테고리별 앞쪽 N개를
//   고정 순서로 뽑는다 (랜덤 아님)
export const DEFAULT_CARD_IDS: string[] = (Object.keys(CATEG_PICK_CNT) as BlndCateg[]).flatMap(
  (categ) =>
    BLND_QUESTIONS.filter((q_item) => q_item.categ === categ)
      .slice(0, CATEG_PICK_CNT[categ])
      .map((q_item) => q_item.q_id)
);

const QUESTION_MAP: Record<string, BlndQuestion> = Object.fromEntries(
  BLND_QUESTIONS.map((q_item) => [q_item.q_id, q_item])
);

export function find_question(q_id: string): BlndQuestion | undefined {
  return QUESTION_MAP[q_id];
}
