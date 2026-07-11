"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { find_memb } from "@/lib/data/memb_data";

export default function MembDetail({ memb_id }: { memb_id: string }) {
  const rout_nav = useRouter();
  const [note_msg, setNoteMsg] = useState("");
  const memb_item = find_memb(memb_id);

  if (!memb_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">존재하지 않는 프로필이에요.</p>
        <button
          type="button"
          onClick={() => rout_nav.back()}
          className="text-sm font-bold text-[#F26B12]"
        >
          돌아가기
        </button>
      </main>
    );
  }

  function do_req() {
    setNoteMsg("이장님께 요청하기는 다음 업데이트에서 제공될 예정이에요.");
  }

  function do_matc() {
    setNoteMsg("직접 매칭시도는 다음 업데이트에서 제공될 예정이에요.");
  }

  return (
    <main className="flex h-dvh w-full flex-col bg-white">
      <header className="flex items-center px-4 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-40">
        <div
          className="mx-auto flex h-32 w-32 items-center justify-center rounded-full text-4xl font-bold text-white"
          style={{ backgroundColor: memb_item.ton_hex }}
        >
          {memb_item.ini_char}
        </div>

        <h1 className="mt-4 text-center text-xl font-extrabold text-gray-900">
          {memb_item.memb_name}, {memb_item.memb_age}
        </h1>
        <p className="mt-1 text-center text-sm text-gray-400">
          {memb_item.memb_job} · {memb_item.memb_mbti}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {memb_item.tag_list.map((t_item) => (
            <span
              key={t_item}
              className="rounded-full bg-[#FFF3E9] px-3 py-1 text-xs font-medium text-[#F26B12]"
            >
              {t_item}
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#FFF8F3] p-4">
          <p className="text-sm font-bold text-gray-900">소개</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{memb_item.intr_txt}</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 space-y-2 border-t border-gray-100 bg-white px-6 pb-8 pt-4">
        <p
          className={`text-center text-xs text-[#F26B12] transition-opacity ${
            note_msg ? "opacity-100" : "opacity-0"
          }`}
          role="status"
        >
          {note_msg || " "}
        </p>
        <button
          type="button"
          onClick={do_req}
          className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
        >
          이장님께 요청하기
        </button>
        <button
          type="button"
          onClick={do_matc}
          className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
        >
          직접 매칭시도
        </button>
      </div>
    </main>
  );
}
