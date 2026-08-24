"use client";

/**
 * LocalLoginScreen.tsx
 * 임시 로그인/계정 만들기 - 실제 소셜 로그인 연동 전까지 로그인ID/비밀번호로 사용한다.
 * - [2026-08-24] 계정 생성과 프로필 작성을 분리했다. 이 화면은 계정(로그인ID/비밀번호)만
 *   만들고, 이름·생년월일·MBTI·사진 같은 내부 프로필은 온보딩 화면(/onbd)에서 받는다.
 *   소셜 로그인이 붙어도 온보딩 화면은 그대로 재사용된다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { login_cred, make_acct, sess_stat, stat_path } from "@/lib/store/auth_store";

export default function LocalLoginScreen() {
  const rout_nav = useRouter();

  const [lgin_inp, setLginInp] = useState("");
  const [pass_inp, setPassInp] = useState("");
  const [lgin_err, setLginErr] = useState("");
  const [lgin_busy, setLginBusy] = useState(false);

  const [new_lgid, setNewLgid] = useState("");
  const [new_pass, setNewPass] = useState("");
  const [new_err, setNewErr] = useState("");
  const [new_busy, setNewBusy] = useState(false);

  // 로그인/가입 이후 갈 곳은 세션 상태가 정한다 (프로필 없으면 온보딩, 있으면 홈)
  async function go_next() {
    rout_nav.replace(stat_path(await sess_stat()));
  }

  async function do_cred_login() {
    setLginBusy(true);
    const ok_val = await login_cred(lgin_inp, pass_inp);
    if (!ok_val) {
      setLginBusy(false);
      setLginErr("로그인ID 또는 비밀번호가 올바르지 않아요.");
      return;
    }
    await go_next();
  }

  async function do_make_acct() {
    if (!new_lgid.trim() || !new_pass.trim()) return;
    setNewBusy(true);
    const { ok_flag, err_msg } = await make_acct(new_lgid.trim(), new_pass.trim());
    if (!ok_flag) {
      setNewBusy(false);
      setNewErr(err_msg ?? "가입에 실패했어요.");
      return;
    }
    // 계정만 생겼고 프로필은 아직 없다 -> 온보딩으로
    await go_next();
  }

  return (
    <main className="min-h-dvh w-full bg-white pb-10">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">임시 로그인</h1>
      </header>

      <p className="px-5 text-xs text-gray-400">
        휴대폰 번호 로그인 연동 전까지, 로그인ID/비밀번호로 계정을 만들고 로그인할 수 있어요.
      </p>

      <section className="mt-4 px-5">
        <p className="text-xs font-medium text-gray-500">로그인</p>
        <input
          value={lgin_inp}
          onChange={(ev_chg) => {
            setLginInp(ev_chg.target.value);
            setLginErr("");
          }}
          placeholder="로그인ID"
          autoCapitalize="none"
          className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />
        <input
          value={pass_inp}
          onChange={(ev_chg) => {
            setPassInp(ev_chg.target.value);
            setLginErr("");
          }}
          type="password"
          placeholder="비밀번호"
          className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />
        <button
          type="button"
          onClick={do_cred_login}
          disabled={!lgin_inp.trim() || !pass_inp.trim() || lgin_busy}
          className="mt-2 w-full rounded-xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          {lgin_busy ? "로그인 중..." : "로그인"}
        </button>
        {lgin_err && <p className="mt-1.5 text-xs text-red-400">{lgin_err}</p>}
      </section>

      <section className="mt-8 px-5">
        <p className="text-xs font-medium text-gray-500">새 계정 만들기</p>
        <p className="mt-1 text-[11px] text-gray-400">
          계정을 만들면 프로필(사진·생년월일·MBTI 등) 입력 화면으로 이어져요.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">로그인ID</label>
            <input
              value={new_lgid}
              onChange={(ev_chg) => {
                setNewLgid(ev_chg.target.value);
                setNewErr("");
              }}
              placeholder="예) jubyeon5"
              autoCapitalize="none"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">비밀번호</label>
            <input
              value={new_pass}
              onChange={(ev_chg) => {
                setNewPass(ev_chg.target.value);
                setNewErr("");
              }}
              type="password"
              placeholder="6자 이상"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
        </div>
        {new_err && <p className="mt-1.5 text-xs text-red-400">{new_err}</p>}

        <button
          type="button"
          onClick={do_make_acct}
          disabled={!new_lgid.trim() || !new_pass.trim() || new_busy}
          className="mt-4 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          {new_busy ? "계정 만드는 중..." : "계정 만들고 프로필 입력하기"}
        </button>
      </section>
    </main>
  );
}
