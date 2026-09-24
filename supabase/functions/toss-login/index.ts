/**
 * toss-login Edge Function
 * 클라이언트(TossAuth.login())가 받은 authorizationCode를 서버 사이드에서
 * 토스 사용자 식별자로 교환하고, Supabase 세션용 magiclink token_hash를 발급한다.
 * - client_id/client_secret은 반드시 이 함수(서버) 안에서만 쓴다 - 브라우저에 노출 금지
 * - service_role 키도 마찬가지로 이 함수 밖으로 나가지 않는다
 *
 * 배포 전 확인:
 *   1) TOSS_TOKEN_URL / 토큰 교환 요청·응답 형식 - 아래는 표준 OAuth
 *      Authorization Code Grant를 가정한 자리표시자다. 앱인토스 "토스 로그인"
 *      연동 가이드(콘솔 > 토스 로그인 설정)에서 정확한 스펙 확인 후 교체할 것.
 *   2) Supabase 프로젝트에 시크릿 등록:
 *        supabase secrets set TOSS_CLIENT_ID=... TOSS_CLIENT_SECRET=...
 *      (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 Edge Function 런타임에 자동 주입됨)
 *   3) 배포: supabase functions deploy toss-login --no-verify-jwt
 *      (--no-verify-jwt: 로그인 전 호출이라 사용자 JWT가 아직 없음)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TODO: 앱인토스 콘솔의 토스 로그인 설정에서 발급받은 값과 실제 토큰 교환 엔드포인트로 교체
const TOSS_TOKEN_URL = "https://TODO-토스-토큰-교환-엔드포인트-확인필요";
const TOSS_CLIENT_ID = Deno.env.get("TOSS_CLIENT_ID") ?? "";
const TOSS_CLIENT_SECRET = Deno.env.get("TOSS_CLIENT_SECRET") ?? "";

// 토스 사용자 식별자를 Supabase auth.users의 합성 이메일로 매핑한다
// (auth_store.ts의 login_email()과 동일한 패턴 - 실제 이메일이 없는 서비스라 합성 이메일을 쓴다)
const AUTH_EMAIL_DOMAIN = "toss.jubyeon.local";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST만 지원해요." }, 405);

  let authorizationCode: string | undefined;
  try {
    ({ authorizationCode } = await req.json());
  } catch {
    return json({ error: "요청 본문이 올바르지 않아요." }, 400);
  }
  if (!authorizationCode) return json({ error: "authorizationCode가 없어요." }, 400);

  // 1) authorizationCode -> 토스 사용자 식별자 교환
  // TODO: 아래 요청 필드명(grant_type/code/client_id/client_secret)과 응답에서
  // 사용자 식별자를 꺼내는 키(userKey)는 실제 앱인토스 문서 확인 후 정확히 맞출 것
  let toss_user_key: string | undefined;
  try {
    const token_res = await fetch(TOSS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        client_id: TOSS_CLIENT_ID,
        client_secret: TOSS_CLIENT_SECRET,
      }),
    });
    if (!token_res.ok) return json({ error: "토스 인증 서버 요청에 실패했어요." }, 502);
    const token_json = await token_res.json();
    toss_user_key = token_json.userKey ?? token_json.user_key;
  } catch {
    return json({ error: "토스 인증 서버와 통신하지 못했어요." }, 502);
  }
  if (!toss_user_key) return json({ error: "토스 사용자 식별자를 받지 못했어요." }, 502);

  // 2) 토스 식별자 -> Supabase 세션용 magiclink token_hash 발급
  //    (generateLink는 email 사용자가 없으면 새로 만들고, 있으면 그대로 링크만 생성한다)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const email = `toss_${toss_user_key}@${AUTH_EMAIL_DOMAIN}`;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data?.properties?.hashed_token) {
    return json({ error: "세션 발급에 실패했어요." }, 500);
  }

  return json({ token_hash: data.properties.hashed_token });
});
