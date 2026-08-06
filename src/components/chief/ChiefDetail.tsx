"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronLeft, Heart, Star, Users } from "lucide-react";
import { find_jang } from "@/lib/data/jang_data";
import { has_req } from "@/lib/store/matc_store";

const NAV_DELAY = 250;

export default function ChiefDetail({ jang_id }: { jang_id: string }) {
  const rout_nav = useRouter();
  const jang_item = find_jang(jang_id);
  const [liked_set, setLikedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!jang_item) return;
    (async () => {
      const hit_list = await Promise.all(
        jang_item.resd_list.map((r_item) => has_req(jang_id, r_item.memb_id))
      );
      const next_set = new Set<string>();
      jang_item.resd_list.forEach((r_item, idx_val) => {
        if (hit_list[idx_val]) next_set.add(r_item.memb_id);
      });
      setLikedSet(next_set);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jang_id]);

  // TODO: 알림 화면 연동
  function do_bell() {}

  // TODO: "연결 내역" 탭 콘텐츠 구현
  function do_tab() {}

  // TODO: 이장님에게 직접 요청하는 플로우 구현
  function do_req_jang() {}

  function do_hert(memb_id: string) {
    setLikedSet((prev_set) => new Set(prev_set).add(memb_id));
    setTimeout(() => {
      rout_nav.push(`/chief/${jang_id}/request/${memb_id}`);
    }, NAV_DELAY);
  }

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
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-28">
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => rout_nav.back()}
            aria-label="뒤로가기"
            className="flex h-9 w-9 items-center justify-center text-gray-500"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-bold text-gray-900">이장님 연락처</h1>
        </div>
        <button type="button" onClick={do_bell} aria-label="알림" className="pr-1 text-gray-500">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* 이장님 프로필 */}
      <section className="flex items-center gap-3 px-5 pt-2">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: jang_item.ton_hex }}
        >
          {jang_item.ini_char}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-base font-bold text-gray-900">{jang_item.jang_name}</p>
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
              <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
              신뢰도 {jang_item.trust_scr}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-gray-400">{jang_item.tagl_txt}</p>
        </div>
      </section>

      {/* 통계 카드 */}
      <section className="mt-4 grid grid-cols-2 gap-3 px-5">
        <button
          type="button"
          onClick={() => rout_nav.push(`/chief/${jang_id}/reviews`)}
          className="rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
        >
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="h-3.5 w-3.5 text-[#F26B12]" />
            성공한 만남
          </div>
          <p className="mt-1 text-lg font-extrabold text-gray-900">{jang_item.matc_cnt}쌍</p>
        </button>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="h-3.5 w-3.5 text-[#F26B12]" />
            등록된 주민
          </div>
          <p className="mt-1 text-lg font-extrabold text-gray-900">{jang_item.resd_cnt}명</p>
        </div>
      </section>

      {/* 탭 */}
      <section className="mt-5 flex gap-6 border-b border-gray-100 px-5">
        <button
          type="button"
          onClick={do_tab}
          className="border-b-2 border-gray-900 pb-2 text-sm font-bold text-gray-900"
        >
          공개된 주민 목록
        </button>
        <button type="button" onClick={do_tab} className="pb-2 text-sm text-gray-400">
          연결 내역
        </button>
      </section>

      {/* 주민 목록 */}
      <section className="divide-y divide-gray-100 px-5">
        {jang_item.resd_list.map((r_item) => (
          <div key={r_item.memb_id} className="flex items-center gap-3 py-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ backgroundColor: r_item.ton_hex }}
            >
              {r_item.ini_char}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">
                {r_item.memb_name} <span className="font-normal text-gray-400">{r_item.memb_age}</span>
                <span className="font-normal text-gray-400"> · {r_item.memb_job}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {r_item.memb_mbti} · {r_item.memb_reg}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">{r_item.tag_list.join(", ")}</p>
            </div>
            <button
              type="button"
              onClick={() => do_hert(r_item.memb_id)}
              aria-label={`${r_item.memb_name}님과 연결 요청`}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:opacity-80 ${
                liked_set.has(r_item.memb_id)
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-gray-200 text-gray-300"
              }`}
            >
              <Heart
                className="h-4 w-4"
                fill={liked_set.has(r_item.memb_id) ? "currentColor" : "none"}
              />
            </button>
          </div>
        ))}
      </section>

      {/* 하단 고정 버튼 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white px-5 pb-8 pt-4">
        <button
          type="button"
          onClick={do_req_jang}
          className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
        >
          이장님에게 새로운 만남 요청하기
        </button>
      </div>
    </main>
  );
}
