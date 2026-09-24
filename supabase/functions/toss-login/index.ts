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
 * !! 배포 전 반드시 확인 !!
 *   이 API는 client_id/client_secret이 아니라 mTLS(클라이언트 인증서)로 인증한다
 *   ("인증서의 CN으로 미니앱을 식별"). 아래 requestTossApi()가 Deno.createHttpClient로
 *   인증서를 물리는 부분은 Deno API상으로는 맞지만, Supabase Edge Runtime(샌드박스된
 *   Deno 런타임)이 발신(outbound) mTLS를 실제로 지원하는지는 확인되지 않았다 - 반드시
 *   실제 배포 후 로그인 1회를 테스트해볼 것. 지원하지 않는다면 이 함수를 Supabase에서
 *   Node 기반 백엔드(Vercel Functions 등, https.Agent로 mTLS 지원)로 옮겨야 한다.
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

// mTLS 클라이언트 인증서를 물린 fetch. Deno.createHttpClient가 Supabase Edge
// Runtime에서 실제로 동작하는지는 배포 후 확인 필요(위 파일 상단 주석 참고).
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
  // TODO(디버깅용, 원인 확인되면 제거): 500 에러가 나는 정확한 지점을 찾기 위해
  // 최상위를 try/catch로 감싸 에러 메시지/스택을 응답에 그대로 노출한다.
  // 운영에서는 내부 에러 상세를 클라이언트에 노출하면 안 되니, 원인 파악 후 되돌릴 것.
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
    return json(
      {
        debug_error: err instanceof Error ? err.message : String(err),
        debug_stack: err instanceof Error ? err.stack : undefined,
        // 시크릿 자체가 비어있는지(길이 0) 필드명 문제였는지(길이는 정상) 구분용 -
        // 내용은 절대 노출하지 않고 길이만 본다
        debug_cert_len: TOSS_MTLS_CERT.length,
        debug_key_len: TOSS_MTLS_KEY.length,
      },
      500
    );
  }
});
