/**
 * Avatar.tsx
 * 유저 아바타 공용 컴포넌트 - 실제 프로필 사진(user_img)이 있으면 그것을, 없으면
 * 이니셜 원(ini_char/ton_hex)을 보여준다.
 * - 여러 화면이 "사진이 있어도 항상 이니셜 원만 그리는" 버그를 갖고 있어 공용화했다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
export default function Avatar({
  img_url,
  ini_char,
  ton_hex,
  size_cls = "h-14 w-14",
  txt_cls = "text-xl",
}: {
  img_url?: string | null;
  ini_char: string;
  ton_hex: string;
  size_cls?: string;
  txt_cls?: string;
}) {
  if (img_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={img_url}
        alt="프로필 사진"
        className={`${size_cls} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`flex ${size_cls} shrink-0 items-center justify-center rounded-full font-bold text-white ${txt_cls}`}
      style={{ backgroundColor: ton_hex }}
    >
      {ini_char}
    </div>
  );
}
