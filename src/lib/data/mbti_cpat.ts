/**
 * mbti_cpat.ts
 * MBTI 16유형 간 궁합(compatibility) 점수표.
 * - 원본 궁합표 이미지의 점수는 아래 3가지 규칙의 조합으로 정확히 재현된다
 *   (3번째 글자 T/F는 점수에 영향이 없다):
 *   1) 1번째 글자(E/I)가 서로 다르면 +14
 *   2) 2번째 글자(N/S)가 같으면 +25
 *   3) 4번째 글자(J/P)가 서로 다르면 +11
 *   기본 점수 50에 위 가산점을 더해 최종 궁합 점수(50~100)가 나온다.
 * - MBTI_CPAT_TBL에 16x16 전체 조합을 미리 계산해 저장해두고 get_mbti_cpat()으로 조회한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자 ("궁합" -> cpat, "등급" -> grad)
 */
import { MBTI_LIST } from "@/lib/data/mbti_list";

function calc_cpat(mbti_a: string, mbti_b: string): number {
  let scor = 50;
  if (mbti_a[0] !== mbti_b[0]) scor += 14; // E/I
  if (mbti_a[1] === mbti_b[1]) scor += 25; // N/S
  if (mbti_a[3] !== mbti_b[3]) scor += 11; // J/P
  return scor;
}

// 16 x 16 궁합 점수표 - MBTI_CPAT_TBL[A][B] (대칭이라 A/B 순서는 상관없다)
export const MBTI_CPAT_TBL: Record<string, Record<string, number>> = Object.fromEntries(
  MBTI_LIST.map((mbti_a) => [
    mbti_a,
    Object.fromEntries(MBTI_LIST.map((mbti_b) => [mbti_b, calc_cpat(mbti_a, mbti_b)])),
  ])
);

// 두 사람의 MBTI로 궁합 점수(50~100)를 조회한다.
export function get_mbti_cpat(mbti_a: string, mbti_b: string): number {
  return MBTI_CPAT_TBL[mbti_a]?.[mbti_b] ?? 50;
}

export type MbtiCpatGrad = "환상의 궁합" | "잘맞는 궁합" | "무난한 궁합" | "노력이 필요한 궁합" | "파국";

// 점수 구간별 등급 (원본 이미지 범례 기준)
export function mbti_cpat_grad(scor: number): MbtiCpatGrad {
  if (scor >= 100) return "환상의 궁합";
  if (scor >= 85) return "잘맞는 궁합";
  if (scor >= 70) return "무난한 궁합";
  if (scor >= 51) return "노력이 필요한 궁합";
  return "파국";
}
