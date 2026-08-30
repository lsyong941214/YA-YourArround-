"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PLHD_CNT = 3;

export default function PhotoCrsl({
  ini_char,
  ton_hex,
  phot_list,
  avat_url,
}: {
  ini_char: string;
  ton_hex: string;
  phot_list?: string[];
  avat_url?: string | null;
}) {
  const scrl_ref = useRef<HTMLDivElement>(null);
  const [idx_val, setIdxVal] = useState(0);

  // 사진첩 앨범이 비어 있어도 프로필 사진(avat_url)은 있을 수 있으니 그걸 먼저 보여준다.
  // 둘 다 없을 때만 이니셜 그라디언트로 대체한다.
  const slds = phot_list && phot_list.length > 0 ? phot_list : avat_url ? [avat_url] : [];
  const has_phot = slds.length > 0;
  const sld_cnt = has_phot ? slds.length : PLHD_CNT;

  function on_scrl() {
    const el_ref = scrl_ref.current;
    if (!el_ref || el_ref.clientWidth === 0) return;
    setIdxVal(Math.round(el_ref.scrollLeft / el_ref.clientWidth));
  }

  function go_idx(next_idx: number) {
    const el_ref = scrl_ref.current;
    if (!el_ref) return;
    el_ref.scrollTo({ left: next_idx * el_ref.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrl_ref}
        onScroll={on_scrl}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
      >
        {has_phot
          ? slds.map((phot_url, s_idx) => (
              <div key={phot_url + s_idx} className="h-52 w-full shrink-0 snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={phot_url} alt="프로필 사진" className="h-full w-full object-cover" />
              </div>
            ))
          : Array.from({ length: PLHD_CNT }).map((_, s_idx) => (
              <div
                key={s_idx}
                className="flex h-52 w-full shrink-0 snap-center items-center justify-center text-6xl font-bold text-white"
                style={{
                  background: `linear-gradient(${125 + s_idx * 45}deg, ${ton_hex}, ${ton_hex}99)`,
                }}
              >
                {ini_char}
              </div>
            ))}
      </div>

      <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
        {Array.from({ length: sld_cnt }).map((_, d_idx) => (
          <span
            key={d_idx}
            className={`h-1.5 w-1.5 rounded-full ${d_idx === idx_val ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>

      {idx_val > 0 && (
        <button
          type="button"
          onClick={() => go_idx(idx_val - 1)}
          aria-label="이전 사진"
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {idx_val < sld_cnt - 1 && (
        <button
          type="button"
          onClick={() => go_idx(idx_val + 1)}
          aria-label="다음 사진"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
