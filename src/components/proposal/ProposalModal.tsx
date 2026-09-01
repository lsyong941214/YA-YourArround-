"use client";

import { X } from "lucide-react";
import { MatcReq } from "@/lib/store/matc_store";
import PhotoCrsl from "./PhotoCrsl";

export default function ProposalModal({
  req_item,
  onClose,
  onAcpt,
  onRjct,
}: {
  req_item: MatcReq;
  onClose: () => void;
  onAcpt: () => void;
  onRjct: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-[#F26B12]">{req_item.jang_name}의 제안</p>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 pt-2">
          <PhotoCrsl
            ini_char={req_item.req_ini}
            ton_hex={req_item.req_ton}
            img_url={req_item.req_img}
            phot_list={req_item.req_phts}
          />
        </div>

        <div className="px-5 pt-4">
          <p className="text-base font-bold text-gray-900">
            {req_item.req_name} <span className="font-normal text-gray-400">{req_item.req_age}</span>
            <span className="font-normal text-gray-400"> · {req_item.req_job}</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {req_item.req_mbti} · {req_item.req_reg}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {req_item.req_tags.map((t_item) => (
              <span
                key={t_item}
                className="rounded-full bg-[#FFF3E9] px-2.5 py-1 text-[11px] font-medium text-[#F26B12]"
              >
                #{t_item}
              </span>
            ))}
          </div>

          {req_item.req_bio && (
            <div className="mt-4 rounded-2xl bg-[#FFF8F3] p-3.5">
              <p className="text-xs font-bold text-gray-900">소개</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{req_item.req_bio}</p>
            </div>
          )}

          {req_item.acpt_cmt && (
            <div className="mt-4 rounded-2xl bg-[#FFF8F3] p-3.5">
              <p className="text-xs font-bold text-gray-900">이장님의 수락 의견</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                &ldquo;{req_item.acpt_cmt}&rdquo;
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 mt-5 space-y-2 border-t border-gray-100 bg-white px-5 pb-6 pt-4">
          <button
            type="button"
            onClick={onAcpt}
            className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
          >
            수락하기
          </button>
          <button
            type="button"
            onClick={onRjct}
            className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
          >
            거절하기
          </button>
        </div>
      </div>
    </div>
  );
}
