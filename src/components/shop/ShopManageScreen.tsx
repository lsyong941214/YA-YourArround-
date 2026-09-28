"use client";

/**
 * ShopManageScreen.tsx
 * 내 가게 홍보 등록/관리 화면 (/shop) - 이장님만 접근 가능(DB의 shop_promo_role_chk 트리거로도
 * 재검증된다). 이장당 1건만 등록 가능해서 등록/수정이 같은 폼을 공유한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, Circle, Ticket, XCircle } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import {
  CHECK_TYPE_LBL,
  list_sub_plans,
  my_review_checks,
  my_shop_promo,
  my_shop_subscription,
  redeem_coupon,
  ReviewCheck,
  save_shop_promo,
  SHOP_CATEG_LIST,
  ShopPromo,
  ShopSub,
  SubDuration,
  SubPlan,
  SUB_DURATIONS,
} from "@/lib/store/shop_store";
import { upld_img } from "@/lib/supabase/stor_upld";
import { BAD_WORD_MSG, has_bad_word } from "@/lib/text_filt";

const DESC_MAX = 120;

const STAT_LBL: Record<ShopPromo["status"], string> = {
  pending: "심사 대기중",
  approved: "승인됨",
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

  const [plan_list, setPlanList] = useState<SubPlan[]>([]);
  const [sub_item, setSubItem] = useState<ShopSub | null>(null);
  const [dur_val, setDurVal] = useState<SubDuration>(1);
  const [cpn_code, setCpnCode] = useState("");
  const [cpn_busy, setCpnBusy] = useState(false);
  const [cpn_msg, setCpnMsg] = useState("");
  const [check_list, setCheckList] = useState<ReviewCheck[]>([]);

  async function load_sub(shop_id: string) {
    setSubItem(await my_shop_subscription(shop_id));
    setCheckList(await my_review_checks(shop_id));
  }

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      if (!user_now || user_now.user_role !== "chief") {
        setGateStat("deny");
        return;
      }
      setGateStat("ok");
      setPlanList(await list_sub_plans());
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
        await load_sub(shop_now.shop_id);
      }
    })();
  }, []);

  async function do_redeem() {
    if (!my_shop || !cpn_code.trim()) return;
    setCpnMsg("");
    setCpnBusy(true);
    const { ok_flag, msg } = await redeem_coupon(my_shop.shop_id, cpn_code, dur_val);
    setCpnBusy(false);
    setCpnMsg(msg);
    if (ok_flag) {
      setCpnCode("");
      await load_sub(my_shop.shop_id);
    }
  }

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

  const done_flag =
    !!shop_name.trim() && !!region_val.trim() && !!biz_reg_no.trim() && !img_busy && !save_busy;

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
      biz_reg_no: biz_reg_no.trim(),
    });
    setSaveBusy(false);
    if (!ok_flag) {
      setErrMsg(sv_err ?? "가게 등록에 실패했어요.");
      return;
    }
    const shop_now = await my_shop_promo();
    setMyShop(shop_now);
    if (shop_now) await load_sub(shop_now.shop_id);
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

      {my_shop && check_list.length > 0 && <CheckSection check_list={check_list} />}

      {my_shop && (
        <SubSection
          plan_list={plan_list}
          sub_item={sub_item}
          dur_val={dur_val}
          setDurVal={setDurVal}
          cpn_code={cpn_code}
          setCpnCode={setCpnCode}
          cpn_busy={cpn_busy}
          cpn_msg={cpn_msg}
          onRedeem={do_redeem}
        />
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

        <label className="mt-4 block text-xs font-medium text-gray-500">사업자등록번호 *</label>
        <input
          value={biz_reg_no}
          onChange={(ev_chg) => setBizRegNo(ev_chg.target.value)}
          placeholder="예) 000-00-00000"
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-[#F26B12]"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
          입점 심사(사업자 실체 확인)에 필요해요. 동일 사업자번호로는 한 계정만 등록할 수 있어요.
        </p>

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

// 심사 체크리스트 현황 - 관리자가 항목별로 기록한 결과를 읽기 전용으로 보여준다(반려 사유처럼
// 투명하게). 아직 기록이 없는 항목은 표시하지 않는다(전부 pending인 접수 직후엔 섹션 자체가 숨음).
function CheckSection({ check_list }: { check_list: ReviewCheck[] }) {
  return (
    <div className="mx-5 mt-2 rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-900">심사 체크리스트</p>
      <div className="mt-2 space-y-1.5">
        {check_list.map((c) => (
          <div key={c.check_type} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{CHECK_TYPE_LBL[c.check_type]}</span>
            <span
              className={`flex items-center gap-1 font-bold ${
                c.result === "pass"
                  ? "text-green-600"
                  : c.result === "fail"
                    ? "text-red-500"
                    : "text-gray-400"
              }`}
            >
              {c.result === "pass" && <CheckCircle2 className="h-3.5 w-3.5" />}
              {c.result === "fail" && <XCircle className="h-3.5 w-3.5" />}
              {(c.result === "pending" || c.result === "skip") && <Circle className="h-3.5 w-3.5" />}
              {c.result === "pass" ? "통과" : c.result === "fail" ? "미흡" : c.result === "skip" ? "생략" : "확인중"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 구독 현황 + (결제 연동 전까지 유일한 활성화 수단인) 쿠폰 코드 입력
function SubSection({
  plan_list,
  sub_item,
  dur_val,
  setDurVal,
  cpn_code,
  setCpnCode,
  cpn_busy,
  cpn_msg,
  onRedeem,
}: {
  plan_list: SubPlan[];
  sub_item: ShopSub | null;
  dur_val: SubDuration;
  setDurVal: (d: SubDuration) => void;
  cpn_code: string;
  setCpnCode: (v: string) => void;
  cpn_busy: boolean;
  cpn_msg: string;
  onRedeem: () => void;
}) {
  const sub_active = !!sub_item && !sub_item.cancelled && sub_item.ends_at > Date.now();
  const cur_plan = sub_item ? plan_list.find((p) => p.duration_months === sub_item.duration_months) : undefined;
  const price_chg =
    sub_active && sub_item && !sub_item.coupon_id && cur_plan && cur_plan.price !== sub_item.price_applied;

  return (
    <div className="mx-5 mt-2 rounded-2xl border border-gray-100 p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <Ticket className="h-4 w-4 text-[#F26B12]" /> 홍보 구독
      </p>

      {sub_active && sub_item ? (
        <>
          <p className="mt-2 text-xs text-gray-600">
            {sub_item.duration_months}개월 · {sub_item.price_applied.toLocaleString()}원 · 만료{" "}
            {new Date(sub_item.ends_at).toLocaleDateString("ko-KR")}
          </p>
          {price_chg && cur_plan && (
            <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
              다음 갱신부터 요금이 {cur_plan.price.toLocaleString()}원으로 변경돼요.
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
          구독이 있어야 홈 화면에 노출돼요. 정식 결제는 준비 중이라, 지금은 쿠폰 코드로만 구독을
          활성화할 수 있어요.
        </p>
      )}

      {!sub_active && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {SUB_DURATIONS.map((d) => {
              const p_item = plan_list.find((p) => p.duration_months === d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurVal(d)}
                  className={`rounded-xl border py-2 text-center transition ${
                    dur_val === d ? "border-[#F26B12] bg-[#FFF3E9]" : "border-gray-200"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900">{d}개월</p>
                  <p className="text-[10px] text-gray-400">{(p_item?.price ?? 0).toLocaleString()}원</p>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            <input
              value={cpn_code}
              onChange={(e) => setCpnCode(e.target.value)}
              placeholder="쿠폰 코드"
              className="flex-1 rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-[#F26B12]"
            />
            <button
              type="button"
              disabled={!cpn_code.trim() || cpn_busy}
              onClick={onRedeem}
              className="shrink-0 rounded-xl bg-[#F26B12] px-4 text-xs font-bold text-white disabled:opacity-40"
            >
              적용
            </button>
          </div>
          {cpn_msg && <p className="mt-1.5 text-[11px] text-gray-500">{cpn_msg}</p>}
        </>
      )}
    </div>
  );
}
