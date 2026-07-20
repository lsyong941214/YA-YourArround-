"use client";

import { X } from "lucide-react";
import PhotoCrsl from "@/components/proposal/PhotoCrsl";
import { AuthUser } from "@/lib/store/auth_store";

export type ProfileViewData = {
  ini_char: string;
  ton_hex: string;
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
    ini_char: u_item.ini_char,
    ton_hex: u_item.ton_hex,
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
}: {
  prof_item: ProfileViewData;
  onClose: () => void;
}) {
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
          <PhotoCrsl ini_char={prof_item.ini_char} ton_hex={prof_item.ton_hex} phot_list={prof_item.phot_list} />
        </div>

        <div className="px-5 pt-4">
          <p className="text-base font-bold text-gray-900">
            {prof_item.user_name}
            {prof_item.user_age ? <span className="font-normal text-gray-400"> {prof_item.user_age}</span> : null}
            {prof_item.user_job ? (
              <span className="font-normal text-gray-400"> · {prof_item.user_job}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {[prof_item.user_mbti, prof_item.user_reg].filter(Boolean).join(" · ")}
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
              <p className="text-xs font-bold text-gray-900">소개</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{prof_item.user_bio}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-6 pt-5">
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
