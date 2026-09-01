"use client";

/**
 * AvatarCircle.tsx
 * 프로필 사진(user_img 등)이 있으면 실제 사진을, 없으면 이니셜(ini_char) 원형을 보여준다.
 * className에는 기존 이니셜 원형에 쓰던 크기/폰트 클래스를 그대로 넘기면 된다
 * (h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white 등).
 */
export default function AvatarCircle({
  img_url,
  ini_char,
  ton_hex,
  className = "",
}: {
  img_url?: string | null;
  ini_char: string;
  ton_hex: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={img_url ? undefined : { backgroundColor: ton_hex }}
    >
      {img_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img_url} alt="프로필 사진" className="h-full w-full object-cover" />
      ) : (
        ini_char
      )}
    </div>
  );
}
