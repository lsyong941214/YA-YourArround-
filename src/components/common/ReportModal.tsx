"use client";

/**
 * ReportModal.tsx
 * 신고 사유 선택 팝업 - ProfileViewModal의 "신고하기"에서 연다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useState } from "react";
import { RPT_RSN_LBL, RptRsn } from "@/lib/store/safe_store";

const RSN_LIST = Object.keys(RPT_RSN_LBL) as RptRsn[];

export default function ReportModal({
  target_name,
  onClose,
  onSubmit,
}: {
  target_name: string;
  onClose: () => void;
  onSubmit: (reason: RptRsn, detail: string) => void;
}) {
  const [rsn_val, setRsnVal] = useState<RptRsn | null>(null);
  const [detail_txt, setDetailTxt] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <h3 className="text-base font-bold text-gray-900">{target_name}님 신고하기</h3>
        <p className="mt-1 text-xs text-gray-400">신고 사유를 선택해주세요.</p>

        <div className="mt-4 space-y-2">
          {RSN_LIST.map((rsn_it) => (
            <button
              key={rsn_it}
              type="button"
              onClick={() => setRsnVal(rsn_it)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                rsn_val === rsn_it
                  ? "border-[#F26B12] bg-[#FFF3E9] text-[#F26B12]"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {RPT_RSN_LBL[rsn_it]}
            </button>
          ))}
        </div>

        <textarea
          value={detail_txt}
          onChange={(ev_chg) => setDetailTxt(ev_chg.target.value.slice(0, 300))}
          rows={3}
          maxLength={300}
          placeholder="상세 내용(선택)"
          className="mt-3 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!rsn_val}
            onClick={() => rsn_val && onSubmit(rsn_val, detail_txt)}
            className="flex-1 rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
}
