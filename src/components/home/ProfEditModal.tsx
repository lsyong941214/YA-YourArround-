"use client";

/**
 * ProfEditModal.tsx
 * 프로필 수정 모달 (홈 화면 프로필 사진의 연필 버튼)
 * - [2026-08-24] 나이 직접 입력 -> 생년월일 입력으로 교체(나이는 생년월일에서 파생 계산),
 *   사진/앨범은 로컬 미리보기 대신 Supabase Storage 실제 업로드로 교체했다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { AuthUser, calc_age } from "@/lib/store/auth_store";
import { MBTI_LIST } from "@/lib/data/mbti_list";
import { upld_img, upld_many } from "@/lib/supabase/stor_upld";

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
  const [birth_dt, setBirthDt] = useState(init_user.birth_dt ?? "");
  const [job_txt, setJobTxt] = useState(init_user.user_job ?? "");
  const [mbti_txt, setMbtiTxt] = useState(init_user.user_mbti ?? "");
  const [reg_txt, setRegTxt] = useState(init_user.user_reg ?? "");
  const [phot_list, setPhotList] = useState<string[]>(init_user.phot_list);
  const [img_busy, setImgBusy] = useState(false);
  const [err_msg, setErrMsg] = useState("");
  const file_ref = useRef<HTMLInputElement>(null);
  const album_ref = useRef<HTMLInputElement>(null);

  function do_pick() {
    file_ref.current?.click();
  }

  async function do_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_item = ev_chg.target.files?.[0];
    ev_chg.target.value = "";
    if (!f_item) return;
    setErrMsg("");
    setImgBusy(true);
    const { img_url, err_msg: up_err } = await upld_img(f_item, "avat");
    setImgBusy(false);
    if (!img_url) {
      setErrMsg(up_err ?? "사진 업로드에 실패했어요.");
      return;
    }
    setPrevImg(img_url);
  }

  function do_album_pick() {
    album_ref.current?.click();
  }

  async function do_album_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_list = Array.from(ev_chg.target.files ?? []);
    ev_chg.target.value = "";
    if (f_list.length === 0) return;
    setErrMsg("");
    setImgBusy(true);
    const room_cnt = Math.max(0, PHOT_MAX - phot_list.length);
    const { url_list, err_msg: up_err } = await upld_many(f_list.slice(0, room_cnt), "albm");
    setImgBusy(false);
    if (up_err) setErrMsg(up_err);
    if (url_list.length > 0) {
      setPhotList((prev_list) => [...prev_list, ...url_list].slice(0, PHOT_MAX));
    }
  }

  function do_album_del(idx_val: number) {
    setPhotList((prev_list) => prev_list.filter((_, p_idx) => p_idx !== idx_val));
  }

  function do_save() {
    if (!prev_img) {
      setErrMsg("프로필 사진은 필수예요.");
      return;
    }
    onSave({
      user_img: prev_img,
      user_bio: bio_txt,
      birth_dt: birth_dt || undefined,
      // 나이는 DB에 저장하지 않는 파생값이지만, 호출한 화면이 patch를 그대로 머지해서
      // 다시 그리므로 여기서 같이 계산해 넘긴다 (updt_curr 는 이 필드를 무시한다)
      user_age: calc_age(birth_dt),
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
            disabled={img_busy}
            className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#FFE9D6] text-xs font-medium text-[#F26B12]"
          >
            {prev_img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prev_img} alt="프로필 미리보기" className="h-full w-full object-cover" />
            ) : (
              "사진 선택"
            )}
            {img_busy && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-bold text-white">
                올리는 중...
              </span>
            )}
          </button>
          <input ref={file_ref} type="file" accept="image/*" className="hidden" onChange={do_file} />
        </div>
        <p className="mx-auto mt-2 max-w-[220px] text-center text-[11px] leading-relaxed text-[#F26B12]">
          얼굴이 명확하게 보이는 사진을 프로필로 선택하면 매칭 확률을 더 높일 수 있습니다!
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">생년월일</label>
            <input
              value={birth_dt}
              onChange={(ev_chg) => setBirthDt(ev_chg.target.value)}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
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
            <select
              value={mbti_txt}
              onChange={(ev_chg) => setMbtiTxt(ev_chg.target.value)}
              className={`mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[#F26B12] ${
                mbti_txt ? "text-gray-800" : "text-gray-400"
              }`}
            >
              <option value="">선택</option>
              {MBTI_LIST.map((mbti_it) => (
                <option key={mbti_it} value={mbti_it}>
                  {mbti_it}
                </option>
              ))}
            </select>
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
              disabled={img_busy}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 text-[11px] text-gray-400 disabled:opacity-40"
            >
              {img_busy ? "올리는 중" : "+ 추가"}
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

        {err_msg && <p className="mt-2 text-xs text-red-400">{err_msg}</p>}

        <button
          type="button"
          onClick={do_save}
          disabled={img_busy || !prev_img}
          className="mt-5 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
