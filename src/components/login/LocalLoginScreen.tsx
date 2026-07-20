"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { JANG_LIST } from "@/lib/data/jang_data";
import {
  AuthRole,
  AuthUser,
  do_login,
  find_by_login,
  list_users,
  login_cred,
  login_new,
} from "@/lib/store/auth_store";

const RESD_OPTS = JANG_LIST.flatMap((j_item) =>
  j_item.resd_list.map((r_item) => ({ jang_id: j_item.jang_id, jang_name: j_item.jang_name, ...r_item }))
);

export default function LocalLoginScreen() {
  const rout_nav = useRouter();
  const file_ref = useRef<HTMLInputElement>(null);
  const [save_list, setSaveList] = useState<AuthUser[]>([]);

  useEffect(() => {
    setSaveList(list_users());
  }, []);

  const [user_name, setUserName] = useState("");
  const [user_role, setUserRole] = useState<AuthRole>("res");
  const [jang_id, setJangId] = useState(JANG_LIST[0].jang_id);
  const [resd_key, setResdKey] = useState("");
  const [user_age, setUserAge] = useState("");
  const [user_job, setUserJob] = useState("");
  const [user_mbti, setUserMbti] = useState("");
  const [user_reg, setUserReg] = useState("");
  const [user_bio, setUserBio] = useState("");
  const [user_img, setUserImg] = useState<string | null>(null);
  const [new_lgid, setNewLgid] = useState("");
  const [new_pass, setNewPass] = useState("");
  const [new_err, setNewErr] = useState("");

  const [lgin_inp, setLginInp] = useState("");
  const [pass_inp, setPassInp] = useState("");
  const [lgin_err, setLginErr] = useState("");

  function go_home() {
    rout_nav.replace("/home");
  }

  function do_swch(user_id: string) {
    do_login(user_id);
    go_home();
  }

  function do_cred_login() {
    if (login_cred(lgin_inp, pass_inp)) {
      go_home();
      return;
    }
    setLginErr("로그인ID 또는 비밀번호가 올바르지 않아요.");
  }

  function do_pick() {
    file_ref.current?.click();
  }

  function do_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_item = ev_chg.target.files?.[0];
    if (!f_item) return;
    setUserImg(URL.createObjectURL(f_item));
  }

  function do_resd_pick(next_key: string) {
    setResdKey(next_key);
    const resd_item = RESD_OPTS.find((r_item) => `${r_item.jang_id}:${r_item.memb_id}` === next_key);
    if (!resd_item) return;
    setUserName(resd_item.memb_name);
    setUserAge(String(resd_item.memb_age));
    setUserJob(resd_item.memb_job);
    setUserMbti(resd_item.memb_mbti);
    setUserReg(resd_item.memb_reg);
  }

  function do_submit() {
    if (!user_name.trim() || !new_lgid.trim() || !new_pass.trim()) return;
    if (find_by_login(new_lgid.trim())) {
      setNewErr("이미 사용 중인 로그인ID예요.");
      return;
    }
    const resd_item = RESD_OPTS.find((r_item) => `${r_item.jang_id}:${r_item.memb_id}` === resd_key);
    login_new({
      login_id: new_lgid.trim(),
      passwd: new_pass.trim(),
      user_name: user_name.trim(),
      user_role,
      jang_id: user_role === "chief" ? jang_id : undefined,
      memb_id: user_role === "res" ? resd_item?.memb_id : undefined,
      user_age: user_age ? Number(user_age) : undefined,
      user_job: user_job || undefined,
      user_mbti: user_mbti || undefined,
      user_reg: user_reg || undefined,
      tag_list: resd_item?.tag_list ?? [],
      user_img,
      user_bio,
    });
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
        실제 로그인 연동 전까지, 텍스트로 계정을 만들어 여러 유저를 테스트할 수 있어요.
      </p>

      <section className="mt-4 px-5">
        <p className="text-xs font-medium text-gray-500">로그인</p>
        <input
          value={lgin_inp}
          onChange={(ev_chg) => {
            setLginInp(ev_chg.target.value);
            setLginErr("");
          }}
          placeholder="로그인ID (예: tkddyd1)"
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
          disabled={!lgin_inp.trim() || !pass_inp.trim()}
          className="mt-2 w-full rounded-xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          로그인
        </button>
        {lgin_err && <p className="mt-1.5 text-xs text-red-400">{lgin_err}</p>}
      </section>

      {save_list.length > 0 && (
        <section className="mt-4 px-5">
          <p className="text-xs font-medium text-gray-500">저장된 계정으로 로그인</p>
          <div className="mt-2 flex flex-col gap-2">
            {save_list.map((u_item) => {
              const jang_found = u_item.jang_id ? JANG_LIST.find((j) => j.jang_id === u_item.jang_id) : undefined;
              const memb_found = u_item.memb_id
                ? RESD_OPTS.some((r) => r.memb_id === u_item.memb_id)
                : false;
              return (
                <button
                  key={u_item.user_id}
                  type="button"
                  onClick={() => do_swch(u_item.user_id)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3 text-left transition active:opacity-80"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: u_item.ton_hex }}
                  >
                    {u_item.ini_char}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">{u_item.user_name}</p>
                    <p className="text-xs text-gray-400">
                      {u_item.user_role === "chief" ? "이장님" : "주민"}
                      {jang_found ? ` · ${jang_found.jang_name}` : ""}
                      {memb_found ? " · 연결된 주민 프로필 있음" : ""}
                    </p>
                    <p className="truncate font-mono text-[11px] text-gray-300">{u_item.login_id}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-5 px-5">
        <p className="text-xs font-medium text-gray-500">새 계정 만들기</p>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={do_pick}
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#FFE9D6] text-xs text-[#F26B12]"
          >
            {user_img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user_img} alt="프로필 미리보기" className="h-full w-full object-cover" />
            ) : (
              "사진 선택"
            )}
          </button>
          <input ref={file_ref} type="file" accept="image/*" className="hidden" onChange={do_file} />
        </div>

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
              placeholder="예) tkddyd5"
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
              placeholder="예) 1234"
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

        {user_role === "chief" ? (
          <>
            <label className="mt-4 block text-xs font-medium text-gray-500">담당 마을</label>
            <select
              value={jang_id}
              onChange={(ev_chg) => setJangId(ev_chg.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            >
              {JANG_LIST.map((j_item) => (
                <option key={j_item.jang_id} value={j_item.jang_id}>
                  {j_item.jang_name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="mt-4 block text-xs font-medium text-gray-500">
              연결된 주민 프로필 (선택 · 요청을 받아보려면 지정하세요)
            </label>
            <select
              value={resd_key}
              onChange={(ev_chg) => do_resd_pick(ev_chg.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            >
              <option value="">선택 안 함</option>
              {RESD_OPTS.map((r_item) => (
                <option key={`${r_item.jang_id}:${r_item.memb_id}`} value={`${r_item.jang_id}:${r_item.memb_id}`}>
                  {r_item.jang_name} - {r_item.memb_name}
                </option>
              ))}
            </select>
          </>
        )}

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
          disabled={!user_name.trim() || !new_lgid.trim() || !new_pass.trim()}
          className="mt-6 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          계정 만들고 로그인
        </button>
      </section>
    </main>
  );
}
