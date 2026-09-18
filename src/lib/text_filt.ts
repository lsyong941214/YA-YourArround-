/**
 * text_filt.ts
 * 소개글/채팅 메시지에서 불법 광고(조건 만남, 성매매 등) 의심 문구를 걸러내는 1차 키워드 필터.
 * - AI 기반 탐지는 아니고, 명백한 금칙어를 즉시 차단하는 최소 수준의 방어선이다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */

// 공백/특수문자를 끼워 필터를 우회하는 걸 어렵게 하려고, 검사 전에 텍스트에서 그런 문자를 제거한다
const STRIP_RE = /[\s._\-*~^!@#$%&+=|/\\[\](){}<>'"?,:;]/g;

const BAD_WORD_LIST = [
  "조건만남",
  "조건만녀",
  "조건해요",
  "성매매",
  "원조교제",
  "스폰서",
  "스폰구함",
  "데이트비",
  "용돈줄게",
  "용돈주는",
  "애인대행",
  "출장마사지",
  "몸캠",
  "va이트", // "va" 자리엔 실제 은어가 들어가는 경우가 많아 부분 문자열로 남겨둠
];

function normalize(txt: string): string {
  return txt.toLowerCase().replace(STRIP_RE, "");
}

// 정규화된 텍스트에서 금칙어를 찾는다. 매칭된 원본 키워드를 돌려준다(없으면 undefined)
export function find_bad_word(txt: string): string | undefined {
  const norm_txt = normalize(txt);
  if (!norm_txt) return undefined;
  return BAD_WORD_LIST.find((word) => norm_txt.includes(normalize(word)));
}

export function has_bad_word(txt: string): boolean {
  return !!find_bad_word(txt);
}

export const BAD_WORD_MSG = "불법 광고로 의심되는 표현이 포함되어 있어요. 문구를 확인해주세요.";
