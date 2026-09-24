/**
 * toss-login Edge Function
 * 클라이언트(TossAuth.login())가 받은 authorizationCode/referrer를 서버 사이드에서
 * 토스 "AccessToken 받기" → "사용자 정보 받기" API로 교환해 userKey를 얻고,
 * Supabase 세션용 magiclink token_hash를 발급한다.
 *
 * 참고: 앱인토스 파트너 API(https://apps-in-toss-api.toss.im) OpenAPI 스펙 기준
 * (POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token,
 *  GET  /api-partner/v1/apps-in-toss/user/oauth2/login-me)
 *
 * mTLS 관련: 이 API는 client_id/client_secret이 아니라 mTLS(클라이언트 인증서)로
 * 인증한다("인증서의 CN으로 미니앱을 식별"). Supabase Edge Runtime에서
 * Deno.createHttpClient({ cert, key })로 실제 mTLS 발신이 되는 것까지 배포 테스트로
 * 확인 완료(2026-09-24) - 토스 서버가 정식 비즈니스 에러(errorCode 4050, "인증서버에
 * 등록된 미니앱이 아닙니다")로 정상 응답하는 것까지 확인했다.
 *
 * 배포 절차:
 *   1) 앱인토스 콘솔 > 서버 API 이용하기에서 클라이언트 인증서(cert/key)를 발급받는다
 *   2) 시크릿 등록 (PEM 내용의 개행은 \n으로 이스케이프해서 한 줄로 저장):
 *        supabase secrets set TOSS_MTLS_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
 *        supabase secrets set TOSS_MTLS_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
 *      (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 Edge Function 런타임에 자동 주입됨)
 *   3) 배포: supabase functions deploy toss-login --no-verify-jwt
 *      (--no-verify-jwt: 로그인 전 호출이라 사용자 JWT가 아직 없음)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOSS_API_BASE = "https://apps-in-toss-api.toss.im";
const TOSS_MTLS_CERT = (Deno.env.get("TOSS_MTLS_CERT") ?? "").replace(/\\n/g, "\n");
const TOSS_MTLS_KEY = (Deno.env.get("TOSS_MTLS_KEY") ?? "").replace(/\\n/g, "\n");

// 토스 사용자 식별자(userKey)를 Supabase auth.users의 합성 이메일로 매핑한다
// (auth_store.ts의 login_email()과 동일한 패턴 - 실제 이메일이 없는 서비스라 합성 이메일을 쓴다)
const AUTH_EMAIL_DOMAIN = "toss.jubyeon.local";

type TossEnvelope<T> =
  | { resultType: "SUCCESS"; success: T }
  | { resultType: Exclude<string, "SUCCESS">; error: { errorCode: string; reason: string } };

type GenerateTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  scope: string;
  tokenType: string;
};

type LoginMeResult = {
  userKey: number;
  name?: string;
  phone?: string;
  email?: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// mTLS 클라이언트 인증서를 물린 fetch.
async function requestTossApi<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; accessToken?: string }
): Promise<TossEnvelope<T>> {
  // Deno.createHttpClient의 mTLS 옵션 이름이 버전에 따라 바뀌어서(구버전
  // certChain/privateKey -> 신버전 cert/key), 두 가지 이름을 모두 실어서
  // 어느 런타임 버전이든 인증서가 실제로 실리게 한다(모르는 키는 무시되니 안전).
  const client = Deno.createHttpClient({
    cert: TOSS_MTLS_CERT,
    key: TOSS_MTLS_KEY,
    certChain: TOSS_MTLS_CERT,
    privateKey: TOSS_MTLS_KEY,
  } as Deno.CreateHttpClientOptions);
  try {
    const res = await fetch(`${TOSS_API_BASE}${path}`, {
      method: init.method,
      client,
      headers: {
        "Content-Type": "application/json",
        ...(init.accessToken ? { Authorization: `Bearer ${init.accessToken}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    return (await res.json()) as TossEnvelope<T>;
  } finally {
    client.close();
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST만 지원해요." }, 405);

    let authorizationCode: string | undefined;
    let referrer: string | undefined;
    try {
      ({ authorizationCode, referrer } = await req.json());
    } catch {
      return json({ error: "요청 본문이 올바르지 않아요." }, 400);
    }
    if (!authorizationCode || !referrer) {
      return json({ error: "authorizationCode/referrer가 없어요." }, 400);
    }

    // 1) authorizationCode -> accessToken 교환
    const token_env = await requestTossApi<GenerateTokenResult>(
      "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
      { method: "POST", body: { authorizationCode, referrer } }
    );
    if (token_env.resultType !== "SUCCESS") {
      return json({ error: token_env.error.reason || "토스 인증에 실패했어요." }, 502);
    }

    // 2) accessToken -> 사용자 정보(userKey) 조회
    const me_env = await requestTossApi<LoginMeResult>(
      "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
      { method: "GET", accessToken: token_env.success.accessToken }
    );
    if (me_env.resultType !== "SUCCESS") {
      return json({ error: me_env.error.reason || "사용자 정보 조회에 실패했어요." }, 502);
    }
    const toss_user_key = me_env.success.userKey;

    // 3) userKey -> Supabase 세션용 magiclink token_hash 발급
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
  } catch (err) {
    console.error("toss-login unexpected error:", err);
    return json({ error: "요청 처리 중 오류가 발생했어요." }, 500);
  }
});
