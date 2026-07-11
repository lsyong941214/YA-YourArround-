/**
 * soc_auth.ts
 * 소셜(카카오/네이버/구글) 로그인 연동 로직 모음
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 * - 아직 각 사에서 발급받은 Client ID/Secret이 없어 실제 인가 요청은 TODO로 남겨두고,
 *   버튼 클릭 → 처리 중 상태 → 완료 흐름만 우선 동작하도록 구성
 */

export type SocProv = "kkao" | "nvr" | "gogl";

function wait_ms(ms_val: number): Promise<void> {
  return new Promise((res_fn) => setTimeout(res_fn, ms_val));
}

// 카카오 로그인
async function kkao_auth(): Promise<void> {
  // TODO: 카카오 개발자 콘솔의 JavaScript 키(Client ID) 발급 후
  //       Kakao SDK(Kakao.Auth.authorize) 연동으로 교체
  await wait_ms(500);
}

// 네이버 로그인
async function nvr_auth(): Promise<void> {
  // TODO: 네이버 개발자 센터의 Client ID/Secret, Redirect URI 발급 후
  //       네이버 로그인 REST API 연동으로 교체
  await wait_ms(500);
}

// 구글 로그인
async function gogl_auth(): Promise<void> {
  // TODO: Google Cloud Console의 OAuth Client ID 발급 후
  //       Google Identity Services(OAuth 2.0) 연동으로 교체
  await wait_ms(500);
}

/**
 * 소셜 로그인 진입 함수
 * prov 값에 맞는 인증 흐름을 호출한다
 */
export async function soc_lgin(prov: SocProv): Promise<void> {
  if (prov === "kkao") return kkao_auth();
  if (prov === "nvr") return nvr_auth();
  return gogl_auth();
}
