"use client";

/**
 * OnbdScreen.tsx
 * 최초 로그인(계정 생성 직후) 온보딩 - 내부 계정 프로필을 입력받아 profiles 행을 만든다.
 * - 로그인 수단(로그인ID/비밀번호, 추후 카카오·네이버·구글)과 무관하게 이 화면 하나를 공유한다.
 *   "세션은 있는데 profiles 행이 없는" 상태(sess_stat() === "onbd")면 여기로 들어온다.
 * - 필수: 프로필 사진 / 이름 / 역할 / 생년월일 / MBTI
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { AuthRole, make_prof, sess_stat, stat_path } from "@/lib/store/auth_store";
import { MBTI_LIST } from "@/lib/data/mbti_list";
import { upld_img } from "@/lib/supabase/stor_upld";

const BIO_MAX = 60;

export default function OnbdScreen() {
  const rout_nav = useRouter();

  const [gate_ok, setGateOk] = useState(false);
  const [user_name, setUserName] = useState("");
  const [user_role, setUserRole] = useState<AuthRole>("res");
  const [birth_dt, setBirthDt] = useState("");
  const [mbti_val, setMbtiVal] = useState("");
  const [user_job, setUserJob] = useState("");
  const [user_reg, setUserReg] = useState("");
  const [user_bio, setUserBio] = useState("");
  const [img_url, setImgUrl] = useState<string | null>(null);
  const [img_busy, setImgBusy] = useState(false);
  const [save_busy, setSaveBusy] = useState(false);
  const [err_msg, setErrMsg] = useState("");
  const file_ref = useRef<HTMLInputElement>(null);

  // 로그인 안 됐거나 이미 프로필이 있으면 여기 있을 이유가 없다
  useEffect(() => {
    (async () => {
      const stat_val = await sess_stat();
      if (stat_val !== "onbd") {
        rout_nav.replace(stat_path(stat_val));
        return;
      }
      setGateOk(true);
    })();
  }, [rout_nav]);

  async function do_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_item = ev_chg.target.files?.[0];
    ev_chg.target.value = "";
    if (!f_item) return;
    setErrMsg("");
    setImgBusy(true);
    const { img_url: up_url, err_msg: up_err } = await upld_img(f_item, "avat");
    setImgBusy(false);
    if (!up_url) {
      setErrMsg(up_err ?? "사진 업로드에 실패했어요.");
      return;
    }
    setImgUrl(up_url);
  }

  const done_flag =
    !!img_url && !!user_name.trim() && !!birth_dt && !!mbti_val && !img_busy && !save_busy;

  async function do_save() {
    if (!done_flag) return;
    setErrMsg("");
    setSaveBusy(true);
    const { user, err_msg: mk_err } = await make_prof({
      user_name: user_name.trim(),
      user_role,
      birth_dt,
      user_mbti: mbti_val,
      user_job: user_job.trim() || undefined,
      user_reg: user_reg.trim() || undefined,
      user_bio: user_bio.trim(),
      user_img: img_url,
    });
    setSaveBusy(false);
    if (!user) {
      setErrMsg(mk_err ?? "프로필 저장에 실패했어요.");
      return;
    }
    rout_nav.replace("/home");
  }

  if (!gate_ok) {
    return <main className="min-h-dvh w-full bg-white" />;
  }

  return (
    <main className="min-h-dvh w-full bg-white pb-10">
      <header className="px-5 pb-1 pt-8">
        <h1 className="text-xl font-bold leading-snug text-gray-900">
          주변에서 쓸<br />
          <span className="text-[#F26B12]">내 프로필</span>을 만들어주세요
        </h1>
        <p className="mt-2 text-xs text-gray-400">
          이웃에게 보여지는 정보예요. 나중에 마이페이지에서 바꿀 수 있어요.
        </p>
      </header>

      {/* 프로필 사진 (필수) */}
      <section className="mt-6 flex flex-col items-center">
        <button
          type="button"
          onClick={() => file_ref.current?.click()}
          disabled={img_busy}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#FFE9D6] text-[#F26B12]"
        >
          {img_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img_url} alt="프로필 사진" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-7 w-7" />
          )}
          {img_busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-bold text-white">
              올리는 중...
            </span>
          )}
        </button>
        <input ref={file_ref} type="file" accept="image/*" className="hidden" onChange={do_file} />
        <p className="mt-2 text-[11px] text-gray-400">프로필 사진 (필수)</p>
      </section>

      <section className="mt-6 px-5">
        <label className="block text-xs font-medium text-gray-500">이름 *</label>
        <input
          value={user_name}
          onChange={(ev_chg) => setUserName(ev_chg.target.value)}
          placeholder="예) 김주변"
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <label className="mt-4 block text-xs font-medium text-gray-500">역할 *</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setUserRole("res")}
            className={`rounded-xl border py-2.5 text-sm font-bold transition ${
              user_role === "res"
                ? "border-[#F26B12] bg-[#FFF3E9] text-[#F26B12]"
                : "border-gray-200 text-gray-400"
            }`}
          >
            주민
          </button>
          <button
            type="button"
            onClick={() => setUserRole("chief")}
            className={`rounded-xl border py-2.5 text-sm font-bold transition ${
              user_role === "chief"
                ? "border-[#F26B12] bg-[#FFF3E9] text-[#F26B12]"
                : "border-gray-200 text-gray-400"
            }`}
          >
            이장님
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">생년월일 *</label>
            <input
              value={birth_dt}
              onChange={(ev_chg) => setBirthDt(ev_chg.target.value)}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">MBTI *</label>
            <select
              value={mbti_val}
              onChange={(ev_chg) => setMbtiVal(ev_chg.target.value)}
              className={`mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[#F26B12] ${
                mbti_val ? "text-gray-800" : "text-gray-400"
              }`}
            >
              <option value="">선택</option>
              {MBTI_LIST.map((mbti_it) => (
                <option key={mbti_it} value={mbti_it}>
                  {mbti_it}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">직업</label>
            <input
              value={user_job}
              onChange={(ev_chg) => setUserJob(ev_chg.target.value)}
              placeholder="예) 디자이너"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">지역</label>
            <input
              value={user_reg}
              onChange={(ev_chg) => setUserReg(ev_chg.target.value)}
              placeholder="예) 서울"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-gray-500">소개 문구</label>
        <textarea
          value={user_bio}
          onChange={(ev_chg) => setUserBio(ev_chg.target.value.slice(0, BIO_MAX))}
          rows={3}
          maxLength={BIO_MAX}
          placeholder="나를 소개하는 한 마디를 남겨보세요"
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />
        <p className="mt-1 text-right text-[11px] text-gray-300">
          {user_bio.length}/{BIO_MAX}
        </p>

        {err_msg && <p className="mt-2 text-xs text-red-400">{err_msg}</p>}

        <button
          type="button"
          onClick={do_save}
          disabled={!done_flag}
          className="mt-5 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          {save_busy ? "저장 중..." : "주변 시작하기"}
        </button>
      </section>
    </main>
  );
}
