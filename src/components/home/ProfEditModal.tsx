"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { AuthUser } from "@/lib/store/auth_store";

const BIO_MAX = 60;
const PHOT_MAX = 6;

type Props = {
  init_user: AuthUser;
  onClose: () => void;
  onSave: (patch: Partial<AuthUser>) => void;
};

export default function ProfEditModal({ init_user, onClose, onSave }: Props) {
  const [prev_img, setPrevImg] = useState<string | null>(init_user.user_img);
  const [bio_txt, setBioTxt] = useState(init_user.user_bio);
  const [age_txt, setAgeTxt] = useState(init_user.user_age ? String(init_user.user_age) : "");
  const [job_txt, setJobTxt] = useState(init_user.user_job ?? "");
  const [mbti_txt, setMbtiTxt] = useState(init_user.user_mbti ?? "");
  const [reg_txt, setRegTxt] = useState(init_user.user_reg ?? "");
  const [phot_list, setPhotList] = useState<string[]>(init_user.phot_list);
  const file_ref = useRef<HTMLInputElement>(null);
  const album_ref = useRef<HTMLInputElement>(null);

  function do_pick() {
    file_ref.current?.click();
  }

  function do_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_item = ev_chg.target.files?.[0];
    if (!f_item) return;
    // TODO: 실제 서버(Supabase Storage 등) 업로드 연동 전까지는 로컬 미리보기만 제공
    setPrevImg(URL.createObjectURL(f_item));
  }

  function do_album_pick() {
    album_ref.current?.click();
  }

  function do_album_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_list = Array.from(ev_chg.target.files ?? []);
    if (f_list.length === 0) return;
    setPhotList((prev_list) => [...prev_list, ...f_list.map((f_item) => URL.createObjectURL(f_item))].slice(0, PHOT_MAX));
    ev_chg.target.value = "";
  }

  function do_album_del(idx_val: number) {
    setPhotList((prev_list) => prev_list.filter((_, p_idx) => p_idx !== idx_val));
  }

  function do_save() {
    onSave({
      user_img: prev_img,
      user_bio: bio_txt,
      user_age: age_txt ? Number(age_txt) : undefined,
      user_job: job_txt || undefined,
      user_mbti: mbti_txt || undefined,
      user_reg: reg_txt || undefined,
      phot_list,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
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
          <input ref={file_ref} type="file" accept="image/*" className="hidden" onChange={do_file} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">나이</label>
            <input
              value={age_txt}
              onChange={(ev_chg) => setAgeTxt(ev_chg.target.value.replace(/[^0-9]/g, ""))}
              placeholder="예) 28"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">직업</label>
            <input
              value={job_txt}
              onChange={(ev_chg) => setJobTxt(ev_chg.target.value)}
              placeholder="예) 디자이너"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">MBTI</label>
            <input
              value={mbti_txt}
              onChange={(ev_chg) => setMbtiTxt(ev_chg.target.value.toUpperCase())}
              placeholder="예) INFJ"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">지역</label>
            <input
              value={reg_txt}
              onChange={(ev_chg) => setRegTxt(ev_chg.target.value)}
              placeholder="예) 서울"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-gray-500">소개 문구</label>
        <textarea
          value={bio_txt}
          onChange={(ev_chg) => setBioTxt(ev_chg.target.value.slice(0, BIO_MAX))}
          rows={3}
          maxLength={BIO_MAX}
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
          placeholder="나를 소개하는 한 마디를 남겨보세요"
        />
        <p className="mt-1 text-right text-[11px] text-gray-300">
          {bio_txt.length}/{BIO_MAX}
        </p>

        <label className="mt-2 block text-xs font-medium text-gray-500">
          사진첩 앨범 ({phot_list.length}/{PHOT_MAX})
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {phot_list.map((phot_url, p_idx) => (
            <div key={phot_url + p_idx} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={phot_url} alt="앨범 사진" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => do_album_del(p_idx)}
                aria-label="사진 삭제"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {phot_list.length < PHOT_MAX && (
            <button
              type="button"
              onClick={do_album_pick}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 text-[11px] text-gray-400"
            >
              + 추가
            </button>
          )}
          <input
            ref={album_ref}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={do_album_file}
          />
        </div>

        <button
          type="button"
          onClick={do_save}
          className="mt-5 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
