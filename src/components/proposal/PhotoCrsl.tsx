"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLD_CNT = 3;

export default function PhotoCrsl({ ini_char, ton_hex }: { ini_char: string; ton_hex: string }) {
  const scrl_ref = useRef<HTMLDivElement>(null);
  const [idx_val, setIdxVal] = useState(0);

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
        {Array.from({ length: SLD_CNT }).map((_, s_idx) => (
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
        {Array.from({ length: SLD_CNT }).map((_, d_idx) => (
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
      {idx_val < SLD_CNT - 1 && (
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
