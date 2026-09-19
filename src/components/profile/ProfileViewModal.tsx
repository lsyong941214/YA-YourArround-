"use client";

import { useState } from "react";
import { Flag, Heart, ShieldOff, X } from "lucide-react";
import PhotoCrsl from "@/components/proposal/PhotoCrsl";
import ReportModal from "@/components/common/ReportModal";
import { AuthUser } from "@/lib/store/auth_store";
import { block_user, report_user, RptRsn } from "@/lib/store/safe_store";

export type ProfileViewData = {
  user_id?: string; // 있어야 신고하기/차단하기 버튼이 뜬다 (내 프로필 보기 등엔 안 넘긴다)
  ini_char: string;
  ton_hex: string;
  img_url?: string | null;
  phot_list?: string[];
  user_name: string;
  user_age?: number;
  user_job?: string;
  user_mbti?: string;
  user_reg?: string;
  user_bio?: string;
  tag_list?: string[];
};

// 실제 유저(AuthUser) -> 프로필 보기 팝업 데이터 변환
export function auth_to_prof(u_item: AuthUser): ProfileViewData {
  return {
    user_id: u_item.user_id,
    ini_char: u_item.ini_char,
    ton_hex: u_item.ton_hex,
    img_url: u_item.user_img,
    phot_list: u_item.phot_list,
    user_name: u_item.user_name,
    user_age: u_item.user_age,
    user_job: u_item.user_job,
    user_mbti: u_item.user_mbti,
    user_reg: u_item.user_reg,
    user_bio: u_item.user_bio,
    tag_list: u_item.tag_list,
  };
}

export default function ProfileViewModal({
  prof_item,
  onClose,
  onHeart,
  liked,
}: {
  prof_item: ProfileViewData;
  onClose: () => void;
  // 넘기면 하단에 큰 하트(연결 요청) 버튼이 함께 뜬다 - 상세 화면 등 요청이 의미 없는
  // 맥락에서는 생략하면 기존처럼 닫기 버튼만 남는다
  onHeart?: () => void;
  liked?: boolean;
}) {
  const [rept_open, setReptOpen] = useState(false);
  const [rept_done, setReptDone] = useState(false);
  const [blkd_flag, setBlkdFlag] = useState(false);
  const [safe_busy, setSafeBusy] = useState(false);

  async function do_report(reason: RptRsn, detail: string) {
    if (!prof_item.user_id) return;
    setSafeBusy(true);
    const { ok_flag } = await report_user(prof_item.user_id, reason, detail);
    setSafeBusy(false);
    setReptOpen(false);
    if (ok_flag) setReptDone(true);
  }

  async function do_block() {
    if (!prof_item.user_id || safe_busy) return;
    if (!window.confirm(`${prof_item.user_name}님을 차단할까요? 이후 연락처/추천 목록에서 보이지 않아요.`)) return;
    setSafeBusy(true);
    const { ok_flag } = await block_user(prof_item.user_id);
    setSafeBusy(false);
    if (ok_flag) setBlkdFlag(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-[#F26B12]">프로필</p>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 pt-2">
          <PhotoCrsl
            ini_char={prof_item.ini_char}
            ton_hex={prof_item.ton_hex}
            img_url={prof_item.img_url}
            phot_list={prof_item.phot_list}
          />
        </div>

        <div className="px-5 pt-4">
          <p className="text-base font-bold text-gray-900">
            {prof_item.user_name}
            {prof_item.user_mbti ? (
              <span className="font-normal text-gray-400"> {prof_item.user_mbti}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            {[
              prof_item.user_age ? `${prof_item.user_age}세` : null,
              prof_item.user_reg,
              prof_item.user_job,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {!!prof_item.tag_list?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prof_item.tag_list.map((t_item) => (
                <span
                  key={t_item}
                  className="rounded-full bg-[#FFF3E9] px-2.5 py-1 text-[11px] font-medium text-[#F26B12]"
                >
                  #{t_item}
                </span>
              ))}
            </div>
          )}

          {prof_item.user_bio && (
            <div className="mt-4 rounded-2xl bg-[#FFF8F3] p-3.5">
              <p className="text-sm leading-relaxed text-gray-600">{prof_item.user_bio}</p>
            </div>
          )}

          {prof_item.user_id && (
            <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
              {rept_done ? (
                <span className="text-[#F26B12]">신고가 접수됐어요.</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setReptOpen(true)}
                  disabled={safe_busy}
                  className="flex items-center gap-1 disabled:opacity-40"
                >
                  <Flag className="h-3.5 w-3.5" /> 신고하기
                </button>
              )}
              {blkd_flag ? (
                <span className="text-gray-400">차단했어요.</span>
              ) : (
                <button
                  type="button"
                  onClick={do_block}
                  disabled={safe_busy}
                  className="flex items-center gap-1 disabled:opacity-40"
                >
                  <ShieldOff className="h-3.5 w-3.5" /> 차단하기
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 px-5 pb-6 pt-5">
          {onHeart && (
            <button
              type="button"
              onClick={onHeart}
              aria-label={liked ? "어떤 방식으로 연결할지 선택해요" : "연결 요청 보내기"}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition active:opacity-90 ${
                liked
                  ? "border border-red-200 bg-red-50 text-red-500"
                  : "bg-[#F26B12] text-white"
              }`}
            >
              <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
              {liked ? "어떤 방식으로 연결할지 선택해요" : "연결 요청 보내기"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>

      {rept_open && (
        <ReportModal
          target_name={prof_item.user_name}
          onClose={() => setReptOpen(false)}
          onSubmit={do_report}
        />
      )}
    </div>
  );
}
