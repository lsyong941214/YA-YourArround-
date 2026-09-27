"use client";

/**
 * ShopManageScreen.tsx
 * 내 가게 홍보 등록/관리 화면 (/shop) - 이장님만 접근 가능(DB의 shop_promo_role_chk 트리거로도
 * 재검증된다). 이장당 1건만 등록 가능해서 등록/수정이 같은 폼을 공유한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, ChevronLeft } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import { my_shop_promo, save_shop_promo, SHOP_CATEG_LIST, ShopPromo } from "@/lib/store/shop_store";
import { upld_img } from "@/lib/supabase/stor_upld";
import { BAD_WORD_MSG, has_bad_word } from "@/lib/text_filt";

const DESC_MAX = 120;

const STAT_LBL: Record<ShopPromo["status"], string> = {
  pending: "심사 대기중",
  approved: "승인됨 · 홈 화면에 노출 중",
  rejected: "반려됨",
};
const STAT_TONE: Record<ShopPromo["status"], string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-600",
  rejected: "bg-red-50 text-red-500",
};

export default function ShopManageScreen() {
  const rout_nav = useRouter();
  const [gate_stat, setGateStat] = useState<"chk" | "deny" | "ok">("chk");
  const [my_shop, setMyShop] = useState<ShopPromo | null>(null);

  const [shop_name, setShopName] = useState("");
  const [categ_val, setCategVal] = useState<string>(SHOP_CATEG_LIST[0]);
  const [region_val, setRegionVal] = useState("");
  const [biz_hours, setBizHours] = useState("");
  const [desc_txt, setDescTxt] = useState("");
  const [biz_reg_no, setBizRegNo] = useState("");
  const [img_url, setImgUrl] = useState<string | null>(null);
  const [img_busy, setImgBusy] = useState(false);
  const [save_busy, setSaveBusy] = useState(false);
  const [err_msg, setErrMsg] = useState("");
  const [done_msg, setDoneMsg] = useState("");
  const file_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      if (!user_now || user_now.user_role !== "chief") {
        setGateStat("deny");
        return;
      }
      setGateStat("ok");
      const shop_now = await my_shop_promo();
      if (shop_now) {
        setMyShop(shop_now);
        setShopName(shop_now.shop_name);
        setCategVal(shop_now.category);
        setRegionVal(shop_now.region);
        setBizHours(shop_now.biz_hours);
        setDescTxt(shop_now.description);
        setBizRegNo(shop_now.biz_reg_no ?? "");
        setImgUrl(shop_now.img_url);
      }
    })();
  }, []);

  async function do_file(ev_chg: React.ChangeEvent<HTMLInputElement>) {
    const f_item = ev_chg.target.files?.[0];
    ev_chg.target.value = "";
    if (!f_item) return;
    setErrMsg("");
    setImgBusy(true);
    const { img_url: up_url, err_msg: up_err } = await upld_img(f_item, "shop");
    setImgBusy(false);
    if (!up_url) {
      setErrMsg(up_err ?? "사진 업로드에 실패했어요.");
      return;
    }
    setImgUrl(up_url);
  }

  const done_flag = !!shop_name.trim() && !!region_val.trim() && !img_busy && !save_busy;

  async function do_save() {
    if (!done_flag) return;
    setErrMsg("");
    setDoneMsg("");
    if (has_bad_word(desc_txt)) {
      setErrMsg(BAD_WORD_MSG);
      return;
    }
    setSaveBusy(true);
    const { ok_flag, err_msg: sv_err } = await save_shop_promo({
      shop_name: shop_name.trim(),
      category: categ_val,
      region: region_val.trim(),
      biz_hours: biz_hours.trim(),
      description: desc_txt.trim(),
      img_url,
      biz_reg_no: biz_reg_no.trim() || null,
    });
    setSaveBusy(false);
    if (!ok_flag) {
      setErrMsg(sv_err ?? "가게 등록에 실패했어요.");
      return;
    }
    const shop_now = await my_shop_promo();
    setMyShop(shop_now);
    setDoneMsg("등록했어요. 관리자 심사 후 홈 화면에 노출돼요.");
  }

  if (gate_stat === "chk") return <main className="min-h-dvh w-full bg-white" />;

  if (gate_stat === "deny") {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-400">가게 홍보 등록은 이장님만 할 수 있어요.</p>
        <button
          type="button"
          onClick={() => rout_nav.replace("/mypage")}
          className="text-sm font-bold text-[#F26B12]"
        >
          마이페이지로
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full bg-white pb-10">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">내 가게 홍보 등록</h1>
      </header>

      {my_shop && (
        <div className="mx-5 mt-1 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STAT_TONE[my_shop.status]}`}>
            {STAT_LBL[my_shop.status]}
          </span>
        </div>
      )}
      {my_shop?.status === "rejected" && my_shop.reject_reason && (
        <p className="mx-5 mt-2 text-xs leading-relaxed text-red-400">반려 사유: {my_shop.reject_reason}</p>
      )}

      <section className="mt-4 flex flex-col items-center">
        <button
          type="button"
          onClick={() => file_ref.current?.click()}
          disabled={img_busy}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-[#FFE9D6] text-[#F26B12]"
        >
          {img_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img_url} alt="가게 사진" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-7 w-7" />
          )}
          {img_busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-bold text-white">
              올리는 중...
            </span>
          )}
        </button>
        <input ref={file_ref} type="file" accept="image/*" className="hidden" onChange={do_file} />
        <p className="mt-2 text-[11px] text-gray-400">가게 사진</p>
      </section>

      <section className="mt-4 px-5">
        <label className="block text-xs font-medium text-gray-500">가게명 *</label>
        <input
          value={shop_name}
          onChange={(ev_chg) => setShopName(ev_chg.target.value)}
          placeholder="예) 주변 분식"
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">업종 *</label>
            <select
              value={categ_val}
              onChange={(ev_chg) => setCategVal(ev_chg.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            >
              {SHOP_CATEG_LIST.map((categ_it) => (
                <option key={categ_it} value={categ_it}>
                  {categ_it}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">위치(지역) *</label>
            <input
              value={region_val}
              onChange={(ev_chg) => setRegionVal(ev_chg.target.value)}
              placeholder="예) 서울 마포구"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
            />
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-gray-500">영업시간</label>
        <input
          value={biz_hours}
          onChange={(ev_chg) => setBizHours(ev_chg.target.value)}
          placeholder="예) 매일 11:00 - 21:00"
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <label className="mt-4 block text-xs font-medium text-gray-500">사업자등록번호 (선택)</label>
        <input
          value={biz_reg_no}
          onChange={(ev_chg) => setBizRegNo(ev_chg.target.value)}
          placeholder="예) 000-00-00000"
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />

        <label className="mt-4 block text-xs font-medium text-gray-500">한줄 소개</label>
        <textarea
          value={desc_txt}
          onChange={(ev_chg) => setDescTxt(ev_chg.target.value.slice(0, DESC_MAX))}
          rows={3}
          maxLength={DESC_MAX}
          placeholder="우리 가게를 소개해주세요"
          className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />
        <p className="mt-1 text-right text-[11px] text-gray-300">
          {desc_txt.length}/{DESC_MAX}
        </p>

        {err_msg && <p className="mt-2 text-xs text-red-400">{err_msg}</p>}
        {done_msg && <p className="mt-2 text-xs text-green-600">{done_msg}</p>}

        <button
          type="button"
          onClick={do_save}
          disabled={!done_flag}
          className="mt-5 w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-40"
        >
          {save_busy ? "저장 중..." : my_shop ? "수정해서 다시 심사받기" : "등록하기"}
        </button>
      </section>
    </main>
  );
}
