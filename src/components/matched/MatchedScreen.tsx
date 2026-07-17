"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Handshake, Home } from "lucide-react";
import { find_req, MatcReq, updt_req } from "@/lib/store/matc_store";
import { add_revw } from "@/lib/store/revw_store";
import RevwModal from "./RevwModal";

export default function MatchedScreen({ req_id }: { req_id: string }) {
  const rout_nav = useRouter();
  const [req_item, setReqItem] = useState<MatcReq | undefined | null>(null);
  const [revw_open, setRevwOpen] = useState(false);

  useEffect(() => {
    const next_item = find_req(req_id) ?? undefined;
    setReqItem(next_item);
    if (next_item && next_item.stat === "r_acpt" && !next_item.rvwd_flag) {
      setRevwOpen(true);
    }
  }, [req_id]);

  function do_revw(scr_val: number, rvw_txt: string) {
    if (!req_item) return;
    add_revw({
      jang_id: req_item.jang_id,
      rvwr_name: req_item.memb_name,
      rvwr_ini: req_item.ini_char,
      rvwr_ton: req_item.ton_hex,
      scr_val,
      rvw_txt,
    });
    updt_req(req_id, { rvwd_flag: true });
    setReqItem(find_req(req_id));
    setRevwOpen(false);
  }

  // TODO: 프로필 다시 보기 상세 뷰 연동
  function do_prof() {}

  // TODO: 채팅 기능 연동
  function do_chat() {}

  if (req_item === null) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!req_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">존재하지 않는 연결이에요.</p>
        <button
          type="button"
          onClick={() => rout_nav.push("/home")}
          className="text-sm font-bold text-[#F26B12]"
        >
          홈으로
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white">
      <header className="flex items-center justify-between px-4 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => rout_nav.push("/home")}
          aria-label="홈으로"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <Home className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center px-6 pt-2 text-center">
        <h1 className="text-xl font-extrabold text-gray-900">연결 성사! 🎉</h1>

        <div className="mt-8 flex items-center gap-5">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: req_item.req_ton }}
          >
            {req_item.req_ini}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF3E9] text-[#F26B12]">
            <Handshake className="h-5 w-5" />
          </div>
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: req_item.ton_hex }}
          >
            {req_item.ini_char}
          </div>
        </div>

        <p className="mt-6 text-base font-bold text-gray-900">
          {req_item.req_name}님과 {req_item.memb_name}님이 연결되었어요!
        </p>
        <p className="mt-1 text-sm text-gray-400">두 분의 새로운 인연을 응원합니다</p>

        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <PersonMini
            ini_char={req_item.req_ini}
            ton_hex={req_item.req_ton}
            memb_name={req_item.req_name}
            memb_age={req_item.req_age}
            memb_job={req_item.req_job}
            onView={do_prof}
          />
          <PersonMini
            ini_char={req_item.ini_char}
            ton_hex={req_item.ton_hex}
            memb_name={req_item.memb_name}
            memb_age={req_item.memb_age}
            memb_job={req_item.memb_job}
            onView={do_prof}
          />
        </div>

        <p className="mt-8 text-sm text-gray-500">이제 대화를 시작해보세요</p>
      </div>

      <div className="space-y-2 px-6 pb-8 pt-4">
        <button
          type="button"
          onClick={do_prof}
          className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
        >
          프로필 다시 보기
        </button>
        <button
          type="button"
          onClick={do_chat}
          className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
        >
          채팅 시작하기
        </button>
      </div>

      {revw_open && (
        <RevwModal
          jang_name={req_item.jang_name}
          onClose={() => setRevwOpen(false)}
          onSubmit={do_revw}
        />
      )}
    </main>
  );
}

function PersonMini({
  ini_char,
  ton_hex,
  memb_name,
  memb_age,
  memb_job,
  onView,
}: {
  ini_char: string;
  ton_hex: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  onView: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#FFF8F3] p-3 text-center">
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: ton_hex }}
      >
        {ini_char}
      </div>
      <p className="mt-2 text-xs font-bold text-gray-900">
        {memb_name} <span className="font-normal text-gray-400">{memb_age}</span>
      </p>
      <p className="text-[11px] text-gray-400">{memb_job}</p>
      <button
        type="button"
        onClick={onView}
        className="mt-2 w-full rounded-lg bg-[#F26B12] py-1.5 text-[11px] font-bold text-white transition active:opacity-90"
      >
        프로필 보기
      </button>
    </div>
  );
}
