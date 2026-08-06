/**
 * client.ts
 * 브라우저에서 쓰는 단일 Supabase 클라이언트 인스턴스.
 * - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 는 .env.local 에서 채운다
 *   (.env.local.example 참고, anon key는 공개되어도 되는 키지만 프로젝트별 값이라 커밋하지 않는다)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPA_URL || !SUPA_ANON) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. " +
      ".env.local.example 을 .env.local 로 복사하고 Supabase 프로젝트 값을 채워주세요."
  );
}

export const supabase = createClient(SUPA_URL, SUPA_ANON);
