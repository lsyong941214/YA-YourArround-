/**
 * invt_store.ts
 * 초대코드 저장소 - Supabase public.invite_codes 테이블 기반
 * - 발급 방향은 "이장이 발급 -> 주민이 입력". 코드 자체가 "이장이 인정한 사람"이라는
 *   인증 수단이라, 코드를 쓴 뒤 별도 승인 단계는 두지 않는다.
 * - 1회용이고 만료는 없다(used_by/used_at 이 채워지면 소진).
 * - 주민의 코드 사용은 반드시 use_invt_code() RPC(SECURITY DEFINER)를 거친다.
 *   주민에게 invite_codes 조회 권한을 주면 코드를 열거해볼 수 있기 때문이다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

// 눈으로 읽고 옮겨 적는 코드라 헷갈리는 글자(0/O, 1/I/L)는 뺀다
const CODE_ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 8;
const MAKE_TRY = 5;

export type InvtItem = {
  code_val: string;
  used_uid?: string;
  used_name?: string;
  used_at?: number;
  made_at: number;
};

type InvtRow = {
  code: string;
  chief_id: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  used?: { user_name: string } | null;
};

function rand_code(): string {
  let code_txt = "";
  for (let i_val = 0; i_val < CODE_LEN; i_val += 1) {
    code_txt += CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)];
  }
  return code_txt;
}

function row_to_invt(row: InvtRow): InvtItem {
  return {
    code_val: row.code,
    used_uid: row.used_by ?? undefined,
    used_name: row.used?.user_name ?? undefined,
    used_at: row.used_at ? new Date(row.used_at).getTime() : undefined,
    made_at: new Date(row.created_at).getTime(),
  };
}

// 보기 좋게 4자씩 끊어서 표시 (저장/입력값은 끊김 없는 8자)
export function code_disp(code_val: string): string {
  return `${code_val.slice(0, 4)}-${code_val.slice(4)}`;
}

/**
 * 이장이 새 초대코드를 발급한다. PK 충돌이 나면 다른 코드로 몇 번 재시도한다.
 */
export async function make_code(chf_uid: string): Promise<{ code_val?: string; err_msg?: string }> {
  for (let try_idx = 0; try_idx < MAKE_TRY; try_idx += 1) {
    const code_val = rand_code();
    const { error } = await supabase.from("invite_codes").insert({ code: code_val, chief_id: chf_uid });
    if (!error) return { code_val };
    // 23505 = unique_violation -> 코드가 겹쳤을 뿐이니 다시 뽑는다
    if (error.code !== "23505") {
      return { err_msg: "초대코드 발급에 실패했어요." };
    }
  }
  return { err_msg: "초대코드 발급에 실패했어요. 잠시 후 다시 시도해주세요." };
}

// 이장이 발급한 코드 목록 (최근 발급 순)
export async function list_code(chf_uid: string): Promise<InvtItem[]> {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("*, used:profiles!invite_codes_used_by_fkey(user_name)")
    .eq("chief_id", chf_uid)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as InvtRow[]).map(row_to_invt);
}

// 아직 쓰이지 않은 내 코드를 폐기한다
export async function drop_code(code_val: string): Promise<boolean> {
  const { error } = await supabase.from("invite_codes").delete().eq("code", code_val);
  return !error;
}

export type UseStat =
  | "ok" // 연결됨
  | "already" // 이미 연결된 이장
  | "bad_code" // 없는 코드
  | "used" // 이미 사용된 코드
  | "self" // 자기가 발급한 코드
  | "not_res" // 주민만 사용할 수 있음
  | "no_auth" // 세션 만료
  | "no_prof" // 프로필 없음
  | "err"; // 그 외 실패

/**
 * 주민이 초대코드를 입력해 이장과 연결한다.
 * 코드 확인 -> 연결 생성 -> 코드 소진이 서버 함수 한 트랜잭션에서 처리된다.
 */
export async function use_invt(code_val: string): Promise<{ stat: UseStat; chf_uid?: string }> {
  const { data, error } = await supabase.rpc("use_invt_code", { code_inp: code_val });
  if (error || !data) return { stat: "err" };
  const res_obj = data as { stat: UseStat; chief_id?: string };
  return { stat: res_obj.stat, chf_uid: res_obj.chief_id };
}

// 코드 사용 결과별 안내 문구
export function use_msg(stat_val: UseStat, chf_name?: string): string {
  if (stat_val === "ok") return `${chf_name ?? "이장님"}과 연결됐어요!`;
  if (stat_val === "already") return `이미 ${chf_name ?? "이 이장님"}과 연결되어 있어요.`;
  if (stat_val === "bad_code") return "없는 초대코드예요. 다시 확인해주세요.";
  if (stat_val === "used") return "이미 사용된 초대코드예요.";
  if (stat_val === "self") return "본인이 발급한 코드는 사용할 수 없어요.";
  if (stat_val === "not_res") return "초대코드는 주민만 사용할 수 있어요.";
  if (stat_val === "no_auth") return "로그인이 만료되었어요. 다시 로그인해주세요.";
  if (stat_val === "no_prof") return "프로필이 없어요. 프로필을 먼저 만들어주세요.";
  return "연결에 실패했어요. 잠시 후 다시 시도해주세요.";
}
