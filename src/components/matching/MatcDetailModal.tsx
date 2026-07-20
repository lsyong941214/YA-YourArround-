"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MatcReq, updt_req } from "@/lib/store/matc_store";
import AcptModal from "./AcptModal";
import RejectModal from "./RejectModal";

export default function MatcDetailModal({
  req_item,
  onClose,
  onChanged,
}: {
  req_item: MatcReq;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [acpt_open, setAcptOpen] = useState(false);
  const [rjct_open, setRjctOpen] = useState(false);

  function do_acpt(acpt_cmt: string) {
    updt_req(req_item.req_id, { stat: "c_acpt", acpt_cmt, seen_flag: false });
    setAcptOpen(false);
    onChanged();
    onClose();
  }

  function do_rjct(rjct_rsn: string, rjct_msg: string) {
    updt_req(req_item.req_id, { stat: "c_rjct", rjct_rsn, rjct_msg });
    setRjctOpen(false);
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-[#F26B12]">요청받은 제안</p>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 pt-2">
          <p className="text-sm font-bold text-gray-900">
            {req_item.req_name}님이 {req_item.memb_name}님과의 연결을 요청했어요!
          </p>

          <p className="mt-4 text-xs font-medium text-gray-500">신청자 정보</p>
          <PersonCard
            ini_char={req_item.req_ini}
            ton_hex={req_item.req_ton}
            memb_name={req_item.req_name}
            memb_age={req_item.req_age}
            memb_job={req_item.req_job}
            memb_mbti={req_item.req_mbti}
            memb_reg={req_item.req_reg}
            tag_list={req_item.req_tags}
          />

          <p className="mt-3 text-xs font-medium text-gray-500">연결 희망 주민</p>
          <PersonCard
            ini_char={req_item.ini_char}
            ton_hex={req_item.ton_hex}
            memb_name={req_item.memb_name}
            memb_age={req_item.memb_age}
            memb_job={req_item.memb_job}
            memb_mbti={req_item.memb_mbti}
            memb_reg={req_item.memb_reg}
            tag_list={req_item.tag_list}
          />

          {req_item.msg_txt && (
            <div className="mt-3 rounded-2xl bg-[#FFF8F3] p-3.5">
              <p className="text-xs font-bold text-gray-900">신청자의 한마디</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">&ldquo;{req_item.msg_txt}&rdquo;</p>
            </div>
          )}

          {req_item.stat === "c_acpt" && (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3.5">
              <p className="text-sm font-bold text-emerald-700">수락했어요 · 주민 응답 대기중</p>
              {req_item.acpt_cmt && (
                <p className="mt-1 text-xs text-emerald-600">&ldquo;{req_item.acpt_cmt}&rdquo;</p>
              )}
            </div>
          )}
        </div>

        {req_item.stat === "pend" && (
          <div className="sticky bottom-0 mt-5 space-y-2 border-t border-gray-100 bg-white px-5 pb-6 pt-4">
            <button
              type="button"
              onClick={() => setAcptOpen(true)}
              className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
            >
              수락하기
            </button>
            <button
              type="button"
              onClick={() => setRjctOpen(true)}
              className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
            >
              거절하기
            </button>
          </div>
        )}
      </div>

      {acpt_open && (
        <AcptModal memb_name={req_item.memb_name} onClose={() => setAcptOpen(false)} onSubmit={do_acpt} />
      )}
      {rjct_open && <RejectModal onClose={() => setRjctOpen(false)} onSubmit={do_rjct} />}
    </div>
  );
}

function PersonCard({
  ini_char,
  ton_hex,
  memb_name,
  memb_age,
  memb_job,
  memb_mbti,
  memb_reg,
  tag_list,
}: {
  ini_char: string;
  ton_hex: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  memb_reg: string;
  tag_list: string[];
}) {
  return (
    <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FFF8F3] p-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
        style={{ backgroundColor: ton_hex }}
      >
        {ini_char}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">
          {memb_name} <span className="font-normal text-gray-400">{memb_age}</span>
          <span className="font-normal text-gray-400"> · {memb_job}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {memb_mbti} · {memb_reg}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{tag_list.join(", ")}</p>
      </div>
    </div>
  );
}
