"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { find_jang } from "@/lib/data/jang_data";
import { avg_scr, jang_revw_list, RevwItem } from "@/lib/store/revw_store";

export default function ChiefReviews({ jang_id }: { jang_id: string }) {
  const rout_nav = useRouter();
  const jang_item = find_jang(jang_id);
  const [revw_list, setRevwList] = useState<RevwItem[]>([]);
  const [scr_val, setScrVal] = useState(0);

  useEffect(() => {
    setRevwList(jang_revw_list(jang_id));
    setScrVal(avg_scr(jang_id));
  }, [jang_id]);

  if (!jang_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">존재하지 않는 이장님이에요.</p>
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
        <h1 className="text-base font-bold text-gray-900">성공한 만남</h1>
      </header>

      <section className="mx-5 mt-2 rounded-2xl bg-white p-5 text-center shadow-sm">
        <p className="text-xs text-gray-400">{jang_item.jang_name}의 평점</p>
        <p className="mt-1 text-3xl font-extrabold text-gray-900">{scr_val || "-"}</p>
        <div className="mt-1 flex justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n_val) => (
            <Star
              key={n_val}
              className="h-4 w-4 text-[#F26B12]"
              fill={n_val <= Math.round(scr_val) ? "currentColor" : "none"}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">후기 {revw_list.length}개</p>
      </section>

      <section className="mt-4 flex flex-col gap-3 px-5">
        {revw_list.length === 0 ? (
          <p className="pt-10 text-center text-sm text-gray-400">아직 등록된 후기가 없어요.</p>
        ) : (
          revw_list.map((r_item) => (
            <div key={r_item.revw_id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: r_item.rvwr_ton }}
                >
                  {r_item.rvwr_ini}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{r_item.rvwr_name}</p>
                  <div className="mt-0.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n_val) => (
                      <Star
                        key={n_val}
                        className="h-3 w-3 text-[#F26B12]"
                        fill={n_val <= r_item.scr_val ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{r_item.rvw_txt}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
