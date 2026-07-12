"use client";

import { useState } from "react";
import { X } from "lucide-react";

const RSN_LIST = [
  "일정이 맞지 않아요",
  "이미 다른 분과 연결됐어요",
  "프로필 정보가 부족해요",
  "다른 분을 찾고 있어요",
  "기타",
];

const MSG_MAX = 80;

export default function RejectModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (rjct_rsn: string, rjct_msg: string) => void;
}) {
  const [rjct_rsn, setRjctRsn] = useState(RSN_LIST[0]);
  const [rjct_msg, setRjctMsg] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">거절 사유 남기기</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          거절 사유는 요청자에게 짧은 메시지로 전달돼요.
        </p>

        <label className="mt-5 block text-xs font-medium text-gray-500">거절 사유</label>
        <select
          value={rjct_rsn}
          onChange={(ev_chg) => setRjctRsn(ev_chg.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        >
          {RSN_LIST.map((rsn_item) => (
            <option key={rsn_item} value={rsn_item}>
              {rsn_item}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-medium text-gray-500">전달할 메시지 (선택)</label>
        <textarea
          value={rjct_msg}
          onChange={(ev_chg) => setRjctMsg(ev_chg.target.value.slice(0, MSG_MAX))}
          rows={3}
          maxLength={MSG_MAX}
          placeholder="짧은 메시지를 남겨보세요"
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />
        <p className="mt-1 text-right text-[11px] text-gray-300">
          {rjct_msg.length}/{MSG_MAX}
        </p>

        <button
          type="button"
          onClick={() => onSubmit(rjct_rsn, rjct_msg)}
          className="mt-5 w-full rounded-2xl bg-gray-800 py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          거절 보내기
        </button>
      </div>
    </div>
  );
}
