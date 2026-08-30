"use client";

import { X } from "lucide-react";
import { MatcReq, matc_stat_lbl } from "@/lib/store/matc_store";
import PhotoCrsl from "@/components/proposal/PhotoCrsl";
import Avatar from "@/components/common/Avatar";

export default function SentPeekModal({
  req_item,
  dir = "sent",
  onClose,
}: {
  req_item: MatcReq;
  dir?: "sent" | "recv";
  onClose: () => void;
}) {
  const oppo =
    dir === "sent"
      ? {
          ini_char: req_item.ini_char,
          ton_hex: req_item.ton_hex,
          img_url: req_item.memb_img,
          name: req_item.memb_name,
          age: req_item.memb_age,
          job: req_item.memb_job,
          mbti: req_item.memb_mbti,
          reg: req_item.memb_reg,
          bio: req_item.memb_bio,
          phts: req_item.memb_phts,
          tags: req_item.tag_list,
          lbl_txt: "상대 주민 프로필",
        }
      : {
          ini_char: req_item.req_ini,
          ton_hex: req_item.req_ton,
          img_url: req_item.req_img,
          name: req_item.req_name,
          age: req_item.req_age,
          job: req_item.req_job,
          mbti: req_item.req_mbti,
          reg: req_item.req_reg,
          bio: req_item.req_bio,
          phts: req_item.req_phts,
          tags: req_item.req_tags,
          lbl_txt: "신청자 프로필",
        };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-[#F26B12]">{matc_stat_lbl(req_item.stat)}</p>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 pt-2">
          <PhotoCrsl
            ini_char={oppo.ini_char}
            ton_hex={oppo.ton_hex}
            phot_list={oppo.phts}
            avat_url={oppo.img_url}
          />
        </div>

        <div className="px-5 pt-3">
          <p className="text-xs font-medium text-gray-500">{oppo.lbl_txt}</p>
          <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FFF8F3] p-3">
            <Avatar
              img_url={oppo.img_url}
              ini_char={oppo.ini_char}
              ton_hex={oppo.ton_hex}
              size_cls="h-12 w-12"
              txt_cls="text-base"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">
                {oppo.name} <span className="font-normal text-gray-400">{oppo.age}</span>
                <span className="font-normal text-gray-400"> · {oppo.job}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {oppo.mbti} · {oppo.reg}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">{oppo.tags.join(", ")}</p>
            </div>
          </div>

          {oppo.bio && (
            <div className="mt-3 rounded-2xl bg-[#FFF8F3] p-3.5">
              <p className="text-xs font-bold text-gray-900">소개</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{oppo.bio}</p>
            </div>
          )}

          {(req_item.stat === "c_rjct" || req_item.stat === "r_rjct") && (
            <div className="mt-3 rounded-2xl bg-gray-50 p-3.5">
              <p className="text-sm font-bold text-gray-700">
                {dir === "recv"
                  ? "내가 거절한 제안이에요"
                  : req_item.stat === "r_rjct"
                    ? "주민이 제안을 거절했어요"
                    : "이장님이 요청을 거절했어요"}
              </p>
              {req_item.rjct_rsn && <p className="mt-1 text-xs text-gray-500">사유: {req_item.rjct_rsn}</p>}
              {req_item.rjct_msg && (
                <p className="mt-1 text-xs text-gray-500">&ldquo;{req_item.rjct_msg}&rdquo;</p>
              )}
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
