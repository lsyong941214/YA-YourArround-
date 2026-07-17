"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

const TXT_MAX = 80;

export default function RevwModal({
  jang_name,
  onClose,
  onSubmit,
}: {
  jang_name: string;
  onClose: () => void;
  onSubmit: (scr_val: number, rvw_txt: string) => void;
}) {
  const [scr_val, setScrVal] = useState(0);
  const [rvw_txt, setRvwTxt] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">이장님 평가하기</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          {jang_name}이 주선한 만남이 성사됐어요. 이장님을 평가해주세요.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n_val) => (
            <button
              key={n_val}
              type="button"
              onClick={() => setScrVal(n_val)}
              aria-label={`${n_val}점`}
              className="p-1"
            >
              <Star
                className="h-8 w-8 text-[#F26B12]"
                fill={n_val <= scr_val ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-medium text-gray-500">후기 (선택)</label>
        <textarea
          value={rvw_txt}
          onChange={(ev_chg) => setRvwTxt(ev_chg.target.value.slice(0, TXT_MAX))}
          rows={3}
          maxLength={TXT_MAX}
          placeholder="이장님과의 경험을 남겨주세요"
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none placeholder:text-gray-300 focus:border-[#F26B12]"
        />
        <p className="mt-1 text-right text-[11px] text-gray-300">
          {rvw_txt.length}/{TXT_MAX}
        </p>

        <button
          type="button"
          disabled={scr_val === 0}
          onClick={() => onSubmit(scr_val, rvw_txt)}
          className="mt-4 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          평가 완료
        </button>
      </div>
    </div>
  );
}
