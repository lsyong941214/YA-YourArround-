"use client";

import { useState } from "react";
import { X } from "lucide-react";

const CMT_MAX = 60;

export default function AcptModal({
  memb_name,
  onClose,
  onSubmit,
}: {
  memb_name: string;
  onClose: () => void;
  onSubmit: (acpt_cmt: string) => void;
}) {
  const [acpt_cmt, setAcptCmt] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">제안 수락하기</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <label className="mt-4 block text-xs font-medium text-gray-500">
          수락 의견 (선택, {memb_name}님에게 전달돼요)
        </label>
        <textarea
          value={acpt_cmt}
          onChange={(ev_chg) => setAcptCmt(ev_chg.target.value.slice(0, CMT_MAX))}
          rows={2}
          maxLength={CMT_MAX}
          placeholder="두 분이 잘 맞을 것 같아 소개해드려요! 한 번 알아가보세요 😊"
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none placeholder:text-gray-300 focus:border-[#F26B12]"
        />
        <p className="mt-1 text-right text-[11px] text-gray-300">
          {acpt_cmt.length}/{CMT_MAX}
        </p>

        <button
          type="button"
          onClick={() => onSubmit(acpt_cmt)}
          className="mt-4 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          수락하기
        </button>
      </div>
    </div>
  );
}
