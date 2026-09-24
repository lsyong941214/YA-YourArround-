/**
 * toss_auth.ts
 * 토스 로그인 연동
 * - TossAuth.login()으로 authorizationCode를 받는다(클라이언트에서는 이 코드밖에 못 받는다).
 * - authorizationCode를 실제 사용자 식별자로 교환하는 과정은 토스 client_secret이 필요해서
 *   반드시 서버(Supabase Edge Function `toss-login`)에서만 한다 - 클라이언트는 절대 하지 않는다.
 * - Edge Function이 돌려준 magiclink token_hash로 세션을 확립한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { TossAuth } from "@apps-in-toss/web-framework";
import { supabase } from "@/lib/supabase/client";

type TossLoginResult = { token_hash?: string; error?: string };

export async function toss_lgin(): Promise<{ ok_flag: boolean; err_msg?: string }> {
  let authorizationCode: string;
  try {
    ({ authorizationCode } = await TossAuth.login());
  } catch {
    return { ok_flag: false, err_msg: "토스 로그인이 취소됐어요." };
  }

  const { data, error } = await supabase.functions.invoke<TossLoginResult>("toss-login", {
    body: { authorizationCode },
  });
  if (error || !data?.token_hash) {
    return { ok_flag: false, err_msg: data?.error ?? "토스 로그인에 실패했어요." };
  }

  const { error: otp_err } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: "magiclink",
  });
  if (otp_err) return { ok_flag: false, err_msg: "세션 생성에 실패했어요." };

  return { ok_flag: true };
}
