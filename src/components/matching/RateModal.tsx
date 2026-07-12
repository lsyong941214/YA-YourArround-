"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

export default function RateModal({
  req_name,
  onClose,
  onSubmit,
}: {
  req_name: string;
  onClose: () => void;
  onSubmit: (rate_val: number) => void;
}) {
  const [rate_val, setRateVal] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">요청자 평가하기</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          {req_name}님에 대한 신뢰도를 별점으로 평가해주세요. 평가 내용은 주민에게 함께 전달돼요.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n_val) => (
            <button
              key={n_val}
              type="button"
              onClick={() => setRateVal(n_val)}
              aria-label={`${n_val}점`}
              className="p-1"
            >
              <Star
                className="h-8 w-8 text-[#F26B12]"
                fill={n_val <= rate_val ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={rate_val === 0}
          onClick={() => onSubmit(rate_val)}
          className="mt-6 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          평가 완료하고 수락하기
        </button>
      </div>
    </div>
  );
}
