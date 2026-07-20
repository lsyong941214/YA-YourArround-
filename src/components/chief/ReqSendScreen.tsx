"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ChevronLeft, Info } from "lucide-react";
import { find_req_target } from "@/lib/data/req_target";
import { AuthUser, curr_user } from "@/lib/store/auth_store";
import { add_req } from "@/lib/store/matc_store";

const MSG_MAX = 100;

export default function ReqSendScreen({
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
      memb_bio: resd_item!.memb_bio,
      memb_phts: resd_item!.memb_phts,
      tag_list: resd_item!.tag_list,
      ini_char: resd_item!.ini_char,
      ton_hex: resd_item!.ton_hex,
      req_name: me_item.user_name,
      req_age: me_item.user_age ?? 0,
      req_job: me_item.user_job ?? "-",
      req_mbti: me_item.user_mbti ?? "-",
      req_reg: me_item.user_reg ?? "-",
      req_bio: me_item.user_bio,
      req_phts: me_item.phot_list,
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
        <h1 className="text-base font-bold text-gray-900">연결 요청 보내기</h1>
      </header>

      <div className="flex-1 px-5 pt-2">
        <p className="text-xs font-medium text-gray-500">내 정보 (신청자)</p>
        <PersonCard
          ini_char={me_item.ini_char}
          ton_hex={me_item.ton_hex}
          memb_name={me_item.user_name}
          memb_age={me_item.user_age ?? 0}
          memb_job={me_item.user_job ?? "-"}
          memb_mbti={me_item.user_mbti ?? "-"}
          memb_reg={me_item.user_reg ?? "-"}
          tag_list={me_item.tag_list}
        />

        <div className="flex justify-center py-2">
          <ArrowDown className="h-5 w-5 text-gray-300" />
        </div>

        <p className="text-xs font-medium text-gray-500">연결 희망 주민</p>
        <PersonCard
          ini_char={resd_item.ini_char}
          ton_hex={resd_item.ton_hex}
          memb_name={resd_item.memb_name}
          memb_age={resd_item.memb_age}
          memb_job={resd_item.memb_job}
          memb_mbti={resd_item.memb_mbti}
          memb_reg={resd_item.memb_reg}
          tag_list={resd_item.tag_list}
        />

        <p className="mt-5 text-xs font-medium text-gray-500">이장님께 메시지 (선택)</p>
        <div className="mt-1 rounded-2xl border border-gray-200 p-3">
          <textarea
            value={msg_txt}
            onChange={(ev_chg) => setMsgTxt(ev_chg.target.value.slice(0, MSG_MAX))}
            rows={3}
            maxLength={MSG_MAX}
            placeholder={`${resd_item.memb_name}님과 가치관이 잘 맞을 것 같아 연결을 부탁드려요!`}
            className="w-full resize-none text-sm text-gray-800 outline-none placeholder:text-gray-300"
          />
          <p className="mt-1 text-right text-[11px] text-gray-300">
            {msg_txt.length}/{MSG_MAX}
          </p>
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="flex items-start gap-1.5 text-[11px] text-gray-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            연결 요청은 이장님께만 전달됩니다.
          </p>
          <p className="flex items-start gap-1.5 text-[11px] text-gray-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            이장님의 승인 후 상대방에게 제안이 전달돼요.
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 grid grid-cols-2 gap-3 border-t border-gray-100 bg-white px-5 pb-8 pt-4">
        <button
          type="button"
          onClick={do_send}
          disabled={busy_flag}
          className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-60"
        >
          연결 요청 보내기
        </button>
        <button
          type="button"
          onClick={() => rout_nav.push(`/chief/${jang_id}/blind/${memb_id}`)}
          className="w-full rounded-2xl bg-[#6C63E0] py-3.5 text-sm font-bold text-white transition active:opacity-90"
        >
          주변인 테스트
        </button>
      </div>
    </main>
  );
}

function PersonCard({
  ini_char,
  ton_hex,
  memb_name,
  memb_age,
  memb_job,
  memb_mbti,
  memb_reg,
  tag_list,
}: {
  ini_char: string;
  ton_hex: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  memb_reg: string;
  tag_list: string[];
}) {
  return (
    <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FFF8F3] p-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
        style={{ backgroundColor: ton_hex }}
      >
        {ini_char}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">
          {memb_name} <span className="font-normal text-gray-400">{memb_age}</span>
          <span className="font-normal text-gray-400"> · {memb_job}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {memb_mbti} · {memb_reg}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{tag_list.join(", ")}</p>
      </div>
    </div>
  );
}
