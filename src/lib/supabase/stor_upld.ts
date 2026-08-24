/**
 * stor_upld.ts
 * 프로필 사진 / 사진첩 앨범 이미지를 Supabase Storage(prof-img 버킷)에 올린다.
 * - 경로 규칙: `{auth.uid()}/{kind}_{timestamp}_{rand}.{ext}`
 *   첫 폴더명을 uid로 고정해야 storage 정책("본인 폴더에만 쓰기")이 통과된다
 *   (supabase/schema.sql 의 prof_img_* 정책 참고).
 * - 버킷이 public 이라 업로드 후 공개 URL을 그대로 profiles.avatar_url / photo_urls 에 저장한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

const BUCK_ID = "prof-img";
const SIZE_MAX = 5 * 1024 * 1024; // 5MB

export type ImgKind = "avat" | "albm";

function file_ext(file_nm: string): string {
  const dot_idx = file_nm.lastIndexOf(".");
  if (dot_idx < 0) return "jpg";
  return file_nm.slice(dot_idx + 1).toLowerCase() || "jpg";
}

/**
 * 이미지 1장 업로드 후 공개 URL을 돌려준다. 실패하면 err_msg 를 채워 반환한다.
 */
export async function upld_img(
  file_it: File,
  kind_val: ImgKind
): Promise<{ img_url?: string; err_msg?: string }> {
  if (!file_it.type.startsWith("image/")) {
    return { err_msg: "이미지 파일만 올릴 수 있어요." };
  }
  if (file_it.size > SIZE_MAX) {
    return { err_msg: "이미지 용량은 5MB까지만 가능해요." };
  }

  const { data: sess_data } = await supabase.auth.getUser();
  const auth_user = sess_data.user;
  if (!auth_user) return { err_msg: "로그인이 만료되었어요. 다시 로그인해주세요." };

  const rand_txt = Math.random().toString(36).slice(2, 8);
  const path_txt = `${auth_user.id}/${kind_val}_${Date.now()}_${rand_txt}.${file_ext(file_it.name)}`;

  const { error: upld_err } = await supabase.storage
    .from(BUCK_ID)
    .upload(path_txt, file_it, { cacheControl: "3600", upsert: false });
  if (upld_err) {
    return { err_msg: "사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요." };
  }

  const { data: url_data } = supabase.storage.from(BUCK_ID).getPublicUrl(path_txt);
  return { img_url: url_data.publicUrl };
}

/**
 * 여러 장을 순서대로 업로드한다. 일부만 성공하면 성공한 것만 돌려주고 err_msg 도 함께 준다.
 */
export async function upld_many(
  file_list: File[],
  kind_val: ImgKind
): Promise<{ url_list: string[]; err_msg?: string }> {
  const url_list: string[] = [];
  let err_msg: string | undefined;
  for (const file_it of file_list) {
    const { img_url, err_msg: one_err } = await upld_img(file_it, kind_val);
    if (img_url) url_list.push(img_url);
    else err_msg = one_err;
  }
  return { url_list, err_msg };
}
