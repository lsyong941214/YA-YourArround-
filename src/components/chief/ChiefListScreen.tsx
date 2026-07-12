"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Star, Users } from "lucide-react";
import { JANG_LIST } from "@/lib/data/jang_data";

export default function ChiefListScreen() {
  const rout_nav = useRouter();

  function go_jang(jang_id: string) {
    rout_nav.push(`/chief/${jang_id}`);
  }

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-8">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">이장님 연락처</h1>
      </header>

      <p className="px-5 pb-3 text-xs text-gray-400">
        연락처에 등록된 이장님을 선택하면 해당 마을의 주민 목록을 볼 수 있어요.
      </p>

      <div className="flex flex-col gap-3 px-5">
        {JANG_LIST.map((j_item) => (
          <button
            key={j_item.jang_id}
            type="button"
            onClick={() => go_jang(j_item.jang_id)}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ backgroundColor: j_item.ton_hex }}
            >
              {j_item.ini_char}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-gray-900">{j_item.jang_name}</p>
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                  {j_item.trust_scr}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-400">{j_item.tagl_txt}</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
                <Users className="h-3.5 w-3.5 text-[#F26B12]" />
                활동 주민 {j_item.resd_cnt}명 · 연결 성사 {j_item.matc_cnt}쌍
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
          </button>
        ))}
      </div>
    </main>
  );
}
