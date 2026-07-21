"use client";

import { X } from "lucide-react";
import { BlndReq } from "@/lib/store/blnd_store";

const STAT_LBL: Record<BlndReq["stat"], string> = {
  pend: "수락 대기중",
  acpt: "수락됨",
  rjct: "거절됨",
};

export default function BlndSentPeekModal({
  req_item,
  onClose,
}: {
  req_item: BlndReq;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-[#6C63E0]">{STAT_LBL[req_item.stat]}</p>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <p className="text-xs font-medium text-gray-500">요청한 주민</p>
          <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#F1F0FD] p-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ backgroundColor: req_item.ton_hex }}
            >
              {req_item.ini_char}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">
                {req_item.memb_name}
                {req_item.memb_age ? (
                  <span className="font-normal text-gray-400"> {req_item.memb_age}</span>
                ) : null}
                {req_item.memb_job && (
                  <span className="font-normal text-gray-400"> · {req_item.memb_job}</span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {req_item.memb_mbti} {req_item.memb_reg ? `· ${req_item.memb_reg}` : ""}
              </p>
              {req_item.tag_list.length > 0 && (
                <p className="mt-0.5 truncate text-xs text-gray-400">{req_item.tag_list.join(", ")}</p>
              )}
            </div>
          </div>

          {req_item.msg_txt && (
            <div className="mt-3 rounded-2xl bg-[#FFF8F3] p-3.5">
              <p className="text-xs font-bold text-gray-900">내가 남긴 한마디</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">&ldquo;{req_item.msg_txt}&rdquo;</p>
            </div>
          )}

          {req_item.stat === "rjct" && (
            <div className="mt-3 rounded-2xl bg-gray-50 p-3.5">
              <p className="text-sm font-bold text-gray-700">주민이 요청을 거절했어요</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
