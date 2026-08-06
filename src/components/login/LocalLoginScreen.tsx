"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AuthRole, login_cred, signup } from "@/lib/store/auth_store";

export default function LocalLoginScreen() {
  const rout_nav = useRouter();

  const [lgin_inp, setLginInp] = useState("");
  const [pass_inp, setPassInp] = useState("");
  const [lgin_err, setLginErr] = useState("");
  const [lgin_busy, setLginBusy] = useState(false);

  const [user_name, setUserName] = useState("");
  const [user_role, setUserRole] = useState<AuthRole>("res");
  const [user_age, setUserAge] = useState("");
  const [user_job, setUserJob] = useState("");
  const [user_mbti, setUserMbti] = useState("");
  const [user_reg, setUserReg] = useState("");
  const [user_bio, setUserBio] = useState("");
  const [new_lgid, setNewLgid] = useState("");
  const [new_pass, setNewPass] = useState("");
  const [new_err, setNewErr] = useState("");
  const [new_busy, setNewBusy] = useState(false);

  function go_home() {
    rout_nav.replace("/home");
  }

  async function do_cred_login() {
    setLginBusy(true);
    const ok_val = await login_cred(lgin_inp, pass_inp);
    setLginBusy(false);
    if (ok_val) {
      go_home();
      return;
    }
    setLginErr("로그인ID 또는 비밀번호가 올바르지 않아요.");
  }

  async function do_submit() {
    if (!user_name.trim() || !new_lgid.trim() || !new_pass.trim()) return;
    setNewBusy(true);
    const { user, err_msg } = await signup({
      login_id: new_lgid.trim(),
      passwd: new_pass.trim(),
      user_name: user_name.trim(),
      user_role,
      user_age: user_age ? Number(user_age) : undefined,
      user_job: user_job || undefined,
      user_mbti: user_mbti || undefined,
      user_reg: user_reg || undefined,
      user_bio,
    });
    setNewBusy(false);
    if (!user) {
      setNewErr(err_msg ?? "가입에 실패했어요.");
      return;
    }
    go_home();
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

      <section className="mt-5 px-5">
        <p className="text-xs font-medium text-gray-500">새 계정 만들기</p>

        <label className="mt-4 block text-xs font-medium text-gray-500">이름</label>
        <input
          value={user_name}
          onChange={(ev_chg) => setUserName(ev_chg.target.value)}
          placeholder="예) 주민1"
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
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

        <label className="mt-4 block text-xs font-medium text-gray-500">역할</label>
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
            <label className="block text-xs font-medium text-gray-500">나이</label>
            <input
              value={user_age}
              onChange={(ev_chg) => setUserAge(ev_chg.target.value.replace(/[^0-9]/g, ""))}
              placeholder="예) 28"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
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
            <label className="block text-xs font-medium text-gray-500">MBTI</label>
            <input
              value={user_mbti}
              onChange={(ev_chg) => setUserMbti(ev_chg.target.value.toUpperCase())}
              placeholder="예) INFJ"
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
        <input
          value={user_bio}
          onChange={(ev_chg) => setUserBio(ev_chg.target.value)}
          placeholder="예) 오늘도 좋은 인연을 만들어보세요."
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <button
          type="button"
          onClick={do_submit}
          disabled={!user_name.trim() || !new_lgid.trim() || !new_pass.trim() || new_busy}
          className="mt-6 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          {new_busy ? "계정 만드는 중..." : "계정 만들고 로그인"}
        </button>
      </section>
    </main>
  );
}
