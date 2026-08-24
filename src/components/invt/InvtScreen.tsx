"use client";

/**
 * InvtScreen.tsx
 * 초대코드 화면 - 역할에 따라 갈라진다.
 *  - 이장: 1회용 초대코드를 발급하고, 발급한 코드 목록/사용 여부를 본다. 복사해서 지인에게 전달.
 *  - 주민: 받은 초대코드를 입력해 이장과 연결한다.
 * 코드를 쥐고 있다는 것 자체가 "이장이 인정한 사람"이라는 인증이라, 사용 후 별도 승인은 없다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Copy, Plus, Trash2 } from "lucide-react";
import { AuthUser, curr_user, find_user } from "@/lib/store/auth_store";
import {
  InvtItem,
  code_disp,
  drop_code,
  list_code,
  make_code,
  use_invt,
  use_msg,
} from "@/lib/store/invt_store";

export default function InvtScreen() {
  const rout_nav = useRouter();

  const [me_item, setMeItem] = useState<AuthUser | null>(null);
  const [code_list, setCodeList] = useState<InvtItem[]>([]);
  const [busy_flag, setBusyFlag] = useState(false);
  const [copy_code, setCopyCode] = useState("");
  const [note_msg, setNoteMsg] = useState("");
  const [err_msg, setErrMsg] = useState("");

  const [inp_code, setInpCode] = useState("");
  const [done_flag, setDoneFlag] = useState(false);

  const load_code = useCallback(async (chf_uid: string) => {
    setCodeList(await list_code(chf_uid));
  }, []);

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      if (!user_now) {
        rout_nav.replace("/login");
        return;
      }
      setMeItem(user_now);
      if (user_now.user_role === "chief") await load_code(user_now.user_id);
    })();
  }, [rout_nav, load_code]);

  // ---- 이장: 발급 / 폐기 / 복사 ----
  async function do_make() {
    if (!me_item || busy_flag) return;
    setErrMsg("");
    setBusyFlag(true);
    const { err_msg: mk_err } = await make_code(me_item.user_id);
    if (mk_err) setErrMsg(mk_err);
    await load_code(me_item.user_id);
    setBusyFlag(false);
  }

  async function do_copy(code_val: string) {
    try {
      await navigator.clipboard.writeText(code_val);
      setCopyCode(code_val);
      setTimeout(() => setCopyCode(""), 1500);
    } catch {
      setErrMsg("복사에 실패했어요. 코드를 길게 눌러 직접 복사해주세요.");
    }
  }

  async function do_drop(code_val: string) {
    if (!me_item || busy_flag) return;
    setBusyFlag(true);
    await drop_code(code_val);
    await load_code(me_item.user_id);
    setBusyFlag(false);
  }

  // ---- 주민: 코드 입력 ----
  async function do_use() {
    const trim_code = inp_code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (trim_code.length === 0 || busy_flag) return;
    setErrMsg("");
    setNoteMsg("");
    setBusyFlag(true);
    const { stat, chf_uid } = await use_invt(trim_code);
    const chf_item = chf_uid ? await find_user(chf_uid) : undefined;
    setBusyFlag(false);
    const msg_txt = use_msg(stat, chf_item ? `${chf_item.user_name} 이장님` : undefined);
    if (stat === "ok" || stat === "already") {
      setDoneFlag(true);
      setNoteMsg(msg_txt);
      return;
    }
    setErrMsg(msg_txt);
  }

  if (!me_item) {
    return <main className="min-h-dvh w-full bg-[#FFF8F3]" />;
  }

  const is_chief = me_item.user_role === "chief";

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-10">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">
          {is_chief ? "주민 초대하기" : "초대코드 입력"}
        </h1>
      </header>

      <p className="px-5 pb-4 text-xs text-gray-400">
        {is_chief
          ? "초대코드를 만들어 아는 주민에게 전달해주세요. 코드는 한 명만 사용할 수 있어요."
          : "이장님께 받은 초대코드를 입력하면 연결돼요."}
      </p>

      {is_chief ? (
        <section className="px-5">
          <button
            type="button"
            onClick={do_make}
            disabled={busy_flag}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            새 초대코드 만들기
          </button>

          {err_msg && <p className="mt-2 text-xs text-red-400">{err_msg}</p>}

          {code_list.length === 0 ? (
            <p className="pt-10 text-center text-sm text-gray-400">아직 만든 초대코드가 없어요.</p>
          ) : (
            <div className="mt-5 flex flex-col gap-2">
              {code_list.map((c_item) => {
                const used_flag = !!c_item.used_uid;
                return (
                  <div
                    key={c_item.code_val}
                    className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ${
                      used_flag ? "opacity-60" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-mono text-lg font-bold tracking-widest ${
                          used_flag ? "text-gray-400 line-through" : "text-gray-900"
                        }`}
                      >
                        {code_disp(c_item.code_val)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">
                        {used_flag
                          ? `${c_item.used_name ?? "주민"}님이 사용함`
                          : "아직 사용되지 않음"}
                      </p>
                    </div>

                    {used_flag ? null : (
                      <>
                        <button
                          type="button"
                          onClick={() => do_copy(c_item.code_val)}
                          aria-label="초대코드 복사"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#F26B12]"
                        >
                          {copy_code === c_item.code_val ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => do_drop(c_item.code_val)}
                          disabled={busy_flag}
                          aria-label="초대코드 폐기"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="px-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="block text-xs font-medium text-gray-500">초대코드</label>
            <input
              value={inp_code}
              onChange={(ev_chg) => {
                setInpCode(ev_chg.target.value.toUpperCase());
                setErrMsg("");
              }}
              placeholder="ABCD-2345"
              autoCapitalize="characters"
              autoComplete="off"
              disabled={done_flag}
              className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-center font-mono text-lg font-bold tracking-widest text-gray-800 outline-none focus:border-[#F26B12] disabled:bg-gray-50"
            />
            {err_msg && <p className="mt-2 text-xs text-red-400">{err_msg}</p>}
            {note_msg && <p className="mt-2 text-xs font-bold text-[#F26B12]">{note_msg}</p>}

            {done_flag ? (
              <button
                type="button"
                onClick={() => rout_nav.replace("/chief")}
                className="mt-4 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
              >
                연결된 이장님 보기
              </button>
            ) : (
              <button
                type="button"
                onClick={do_use}
                disabled={inp_code.replace(/[^A-Za-z0-9]/g, "").length === 0 || busy_flag}
                className="mt-4 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
              >
                {busy_flag ? "연결하는 중..." : "연결하기"}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
