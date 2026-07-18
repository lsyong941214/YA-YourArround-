/**
 * uid_rule.ts
 * 유저 ID 채번 규칙: 날짜(8자, YYYYMMDD) + 일련번호(10자, 0으로 lpad)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - TODO: DB 연동 시 일련번호 부분은 DB 시퀀스/자동증가 컬럼으로 대체하고, prefix 규칙만 유지
 */

const YMD_LEN = 8;
const SEQ_LEN = 10;

export function ymd_of(dt_val: Date): string {
  const y_val = dt_val.getFullYear();
  const m_val = String(dt_val.getMonth() + 1).padStart(2, "0");
  const d_val = String(dt_val.getDate()).padStart(2, "0");
  return `${y_val}${m_val}${d_val}`;
}

export function gen_uid(seq_no: number, ymd_str: string = ymd_of(new Date())): string {
  return ymd_str.padStart(YMD_LEN, "0") + String(seq_no).padStart(SEQ_LEN, "0");
}

export function seq_of_uid(user_id: string): number {
  return Number(user_id.slice(YMD_LEN, YMD_LEN + SEQ_LEN)) || 0;
}
