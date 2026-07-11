"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  init_img: string | null;
  init_bio: string;
  onClose: () => void;
  onSave: (next_img: string | null, next_bio: string) => void;
};

export default function ProfEditModal({ init_img, init_bio, onClose, onSave }: Props) {
  const [prev_img, setPrevImg] = useState<string | null>(init_img);
  const [bio_txt, setBioTxt] = useState(init_bio);
  const file_ref = useRef<HTMLInputElement>(null);

  function do_pick() {
    file_ref.current?.click();
  }

  function do_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_item = ev_chg.target.files?.[0];
    if (!f_item) return;
    // TODO: 실제 서버(Supabase Storage 등) 업로드 연동 전까지는 로컬 미리보기만 제공
    const next_url = URL.createObjectURL(f_item);
    setPrevImg(next_url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">프로필 수정</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={do_pick}
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#FFE9D6] text-xs font-medium text-[#F26B12]"
          >
            {prev_img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prev_img} alt="프로필 미리보기" className="h-full w-full object-cover" />
            ) : (
              "사진 선택"
            )}
          </button>
          <input
            ref={file_ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={do_file}
          />
        </div>

        <label className="mt-5 block text-xs font-medium text-gray-500">소개 문구</label>
        <textarea
          value={bio_txt}
          onChange={(ev_chg) => setBioTxt(ev_chg.target.value)}
          rows={3}
          maxLength={60}
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
          placeholder="나를 소개하는 한 마디를 남겨보세요"
        />

        <button
          type="button"
          onClick={() => onSave(prev_img, bio_txt)}
          className="mt-5 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
