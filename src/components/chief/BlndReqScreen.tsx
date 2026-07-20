"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info } from "lucide-react";
import { find_req_target } from "@/lib/data/req_target";
import { AuthUser, curr_user } from "@/lib/store/auth_store";
import { add_req } from "@/lib/store/blnd_store";

const MSG_MAX = 80;

const INFO_LIST = [
  "주변에서 자체적으로 개발한 밸런스 게임 및 성향도 파악 테스트입니다.",
  "이장님에게 소개 요청을 직접적으로 알리고 싶지 않은 경우 해당 주민과 성향이 맞는지 확인할 수 있습니다.",
  "일정 점수 이상 성향도가 일치하면 바로 대화를 시작할 수 있지만, 일정 점수 미만이라면 서로 고민해 볼 시간이 주어집니다.",
  "테스트 결과는 당사자들만 확인할 수 있습니다.",
];

export default function BlndReqScreen({
  jang_id,
  memb_id,
}: {
  jang_id: string;
  memb_id: string;
}) {
  const rout_nav = useRouter();
  const resd_item = find_req_target(jang_id, memb_id);

  const [msg_txt, setMsgTxt] = useState("");
  const [busy_flag, setBusyFlag] = useState(false);
  const [me_item, setMeItem] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const user_now = curr_user();
    if (!user_now) {
      rout_nav.replace("/login");
      return;
    }
    setMeItem(user_now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resd_item || me_item === undefined) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!me_item) {
    return null;
  }

  function do_send() {
    if (busy_flag || !me_item) return;
    setBusyFlag(true);
    add_req({
      req_uid: me_item.user_id,
      jang_id,
      jang_name: resd_item!.jang_name,
      memb_id: resd_item!.memb_id,
      memb_name: resd_item!.memb_name,
      memb_age: resd_item!.memb_age,
      memb_job: resd_item!.memb_job,
      memb_mbti: resd_item!.memb_mbti,
      memb_reg: resd_item!.memb_reg,
      tag_list: resd_item!.tag_list,
      ini_char: resd_item!.ini_char,
      ton_hex: resd_item!.ton_hex,
      req_name: me_item.user_name,
      req_age: me_item.user_age ?? 0,
      req_job: me_item.user_job ?? "-",
      req_mbti: me_item.user_mbti ?? "-",
      req_reg: me_item.user_reg ?? "-",
      req_tags: me_item.tag_list,
      req_ini: me_item.ini_char,
      req_ton: me_item.ton_hex,
      msg_txt,
    });
    rout_nav.replace("/home");
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white pb-28">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">주변인 테스트 신청</h1>
      </header>

      <div className="flex-1 px-6 pt-6">
        <p className="text-center text-lg font-bold leading-snug text-gray-900">
          <span className="text-[#6C63E0]">{resd_item.memb_name}</span>님에게
          <br />
          <span className="text-[#6C63E0]">&ldquo;주변인 테스트&rdquo;</span>를 요청합니다!
        </p>

        <div className="mt-6 rounded-2xl bg-[#F1F0FD] p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#6C63E0]">
            <Info className="h-4 w-4" />
            주변인 테스트란?
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {INFO_LIST.map((txt_item) => (
              <li key={txt_item} className="flex gap-1.5 text-xs leading-relaxed text-gray-600">
                <span className="shrink-0 text-[#6C63E0]">•</span>
                {txt_item}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-xs font-medium text-gray-500">한마디 (선택)</p>
        <div className="mt-1 rounded-2xl border border-gray-200 p-3">
          <textarea
            value={msg_txt}
            onChange={(ev_chg) => setMsgTxt(ev_chg.target.value.slice(0, MSG_MAX))}
            rows={3}
            maxLength={MSG_MAX}
            placeholder="상대방에게 전하고 싶은 한마디를 남겨보세요"
            className="w-full resize-none text-sm text-gray-800 outline-none placeholder:text-gray-300"
          />
          <p className="mt-1 text-right text-[11px] text-gray-300">
            {msg_txt.length}/{MSG_MAX}
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 grid grid-cols-2 gap-3 border-t border-gray-100 bg-white px-5 pb-8 pt-4">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
        >
          취소하기
        </button>
        <button
          type="button"
          onClick={do_send}
          disabled={busy_flag}
          className="w-full rounded-2xl bg-[#6C63E0] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-60"
        >
          요청하기
        </button>
      </div>
    </main>
  );
}
