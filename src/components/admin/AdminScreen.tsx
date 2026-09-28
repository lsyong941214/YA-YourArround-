"use client";

/**
 * AdminScreen.tsx
 * 신고 처리 화면 (/admin) - 관리자(profiles.is_admin)만 접근 가능
 * - 체크리스트 5번(신고 24시간 이내 대응)/10번(수사기관 협조 시 신고 이력 조회) 대응
 * - 앱 안에는 이 화면으로 들어오는 메뉴가 없다(관리자만 URL로 접근) - is_admin 지정 자체도
 *   SQL로만 가능하다 (supabase/alter_admin.sql 참고)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck, Store, Ticket } from "lucide-react";
import { AcctStat } from "@/lib/store/auth_store";
import {
  add_review_check,
  AdmCoupon,
  AdmReport,
  AdmShop,
  create_coupon,
  is_curr_admin,
  list_coupons_admin,
  list_reports_admin,
  list_review_checks_admin,
  list_shops_admin,
  RptStat,
  set_acct_stat,
  set_coupon_active,
  set_report_stat,
  set_shop_stat,
  update_sub_plan,
} from "@/lib/store/admin_store";
import { RPT_RSN_LBL } from "@/lib/store/safe_store";
import {
  CHECK_TYPE_LBL,
  CHECK_TYPE_LIST,
  CheckResult,
  CheckType,
  list_sub_plans,
  ReviewCheck,
  ShopStat,
  SubDuration,
  SubPlan,
} from "@/lib/store/shop_store";

const SHOP_STAT_LBL: Record<ShopStat, string> = { pending: "대기중", approved: "승인됨", rejected: "반려됨" };
const SHOP_STAT_TONE: Record<ShopStat, string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-600",
  rejected: "bg-red-50 text-red-500",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const STAT_LBL: Record<RptStat, string> = { open: "대기중", in_prog: "처리중", done: "완료" };
const STAT_TONE: Record<RptStat, string> = {
  open: "bg-red-50 text-red-500",
  in_prog: "bg-amber-50 text-amber-600",
  done: "bg-gray-100 text-gray-400",
};
const ACCT_LBL: Record<AcctStat, string> = { actv: "정상", susp: "정지", ban: "영구 차단" };
const ACCT_TONE: Record<AcctStat, string> = {
  actv: "bg-green-50 text-green-600",
  susp: "bg-amber-50 text-amber-600",
  ban: "bg-red-50 text-red-500",
};

function fmt_elapsed(made_at: number): string {
  const diff_ms = Date.now() - made_at;
  const hr_val = Math.floor(diff_ms / (60 * 60 * 1000));
  if (hr_val < 1) return "방금 접수";
  if (hr_val < 24) return `${hr_val}시간 전`;
  return `${Math.floor(hr_val / 24)}일 전`;
}

export default function AdminScreen() {
  const rout_nav = useRouter();
  const [gate_stat, setGateStat] = useState<"chk" | "deny" | "ok">("chk");
  const [tab_val, setTabVal] = useState<"rept" | "shop" | "sub">("rept");
  const [rept_list, setReptList] = useState<AdmReport[]>([]);
  const [shop_list, setShopList] = useState<AdmShop[]>([]);
  const [plan_list, setPlanList] = useState<SubPlan[]>([]);
  const [cpn_list, setCpnList] = useState<AdmCoupon[]>([]);
  const [busy_id, setBusyId] = useState<string | null>(null);
  const [rjct_open_id, setRjctOpenId] = useState<string | null>(null);
  const [rjct_txt, setRjctTxt] = useState("");
  const [new_cpn_code, setNewCpnCode] = useState("");
  const [new_cpn_pct, setNewCpnPct] = useState("100");
  const [new_cpn_max, setNewCpnMax] = useState("");
  const [cpn_err, setCpnErr] = useState("");
  const [cpn_busy, setCpnBusy] = useState(false);
  const [chk_open_id, setChkOpenId] = useState<string | null>(null);
  const [chk_map, setChkMap] = useState<Record<string, ReviewCheck[]>>({});
  const [chk_busy_key, setChkBusyKey] = useState<string | null>(null);
  const [chk_note_map, setChkNoteMap] = useState<Record<string, string>>({});

  async function load_list() {
    setReptList(await list_reports_admin());
  }

  async function load_shop_list() {
    setShopList(await list_shops_admin());
  }

  async function load_sub_data() {
    setPlanList(await list_sub_plans());
    setCpnList(await list_coupons_admin());
  }

  useEffect(() => {
    (async () => {
      const ok_flag = await is_curr_admin();
      if (!ok_flag) {
        setGateStat("deny");
        return;
      }
      setGateStat("ok");
      load_list();
      load_shop_list();
      load_sub_data();
    })();
  }, []);

  async function do_plan_save(duration_months: SubDuration, price: number, is_active: boolean) {
    setBusyId(`plan_${duration_months}`);
    await update_sub_plan(duration_months, price, is_active);
    await load_sub_data();
    setBusyId(null);
  }

  async function do_cpn_toggle(cpn_id: string, is_active: boolean) {
    setBusyId(cpn_id);
    await set_coupon_active(cpn_id, is_active);
    setCpnList((prev) => prev.map((c) => (c.cpn_id === cpn_id ? { ...c, is_active } : c)));
    setBusyId(null);
  }

  async function do_cpn_create() {
    const pct_val = Number(new_cpn_pct);
    if (!new_cpn_code.trim() || !Number.isFinite(pct_val) || pct_val < 1 || pct_val > 100) {
      setCpnErr("코드와 할인율(1~100)을 확인해주세요.");
      return;
    }
    setCpnErr("");
    setCpnBusy(true);
    const { ok_flag, err_msg } = await create_coupon({
      code: new_cpn_code,
      discount_pct: pct_val,
      max_uses: new_cpn_max.trim() ? Number(new_cpn_max) : undefined,
    });
    setCpnBusy(false);
    if (!ok_flag) {
      setCpnErr(err_msg ?? "쿠폰 생성에 실패했어요.");
      return;
    }
    setNewCpnCode("");
    setNewCpnPct("100");
    setNewCpnMax("");
    load_sub_data();
  }

  async function load_checks(shop_id: string) {
    setChkMap((prev) => ({ ...prev, [shop_id]: [] }));
    const list = await list_review_checks_admin(shop_id);
    setChkMap((prev) => ({ ...prev, [shop_id]: list }));
  }

  function toggle_chk(shop_id: string) {
    const next = chk_open_id === shop_id ? null : shop_id;
    setChkOpenId(next);
    if (next && !chk_map[shop_id]) load_checks(shop_id);
  }

  async function do_chk(shop_id: string, check_type: CheckType, result: CheckResult) {
    const key = `${shop_id}:${check_type}`;
    setChkBusyKey(key);
    const ok_flag = await add_review_check(shop_id, check_type, result, chk_note_map[key] ?? "");
    if (ok_flag) {
      await load_checks(shop_id);
      setChkNoteMap((prev) => ({ ...prev, [key]: "" }));
    }
    setChkBusyKey(null);
  }

  async function do_shop_stat(shop_id: string, stat: ShopStat, reason?: string) {
    setBusyId(shop_id);
    const ok_flag = await set_shop_stat(shop_id, stat, reason);
    if (ok_flag) {
      setShopList((prev) =>
        prev.map((s) => (s.shop_id === shop_id ? { ...s, status: stat, reject_reason: reason ?? "" } : s))
      );
      setRjctOpenId(null);
      setRjctTxt("");
    }
    setBusyId(null);
  }

  async function do_rept_stat(rept_id: string, stat: RptStat) {
    setBusyId(rept_id);
    const ok_flag = await set_report_stat(rept_id, stat);
    if (ok_flag) setReptList((prev) => prev.map((r) => (r.rept_id === rept_id ? { ...r, stat } : r)));
    setBusyId(null);
  }

  async function do_acct_stat(rept_id: string, trgt_id: string, stat: AcctStat) {
    setBusyId(rept_id);
    const ok_flag = await set_acct_stat(trgt_id, stat);
    if (ok_flag) {
      setReptList((prev) => prev.map((r) => (r.trgt_id === trgt_id ? { ...r, trgt_stat: stat } : r)));
    }
    setBusyId(null);
  }

  if (gate_stat === "chk") return <main className="min-h-dvh w-full bg-white" />;

  if (gate_stat === "deny") {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-400">이 화면에 접근할 권한이 없어요.</p>
        <button
          type="button"
          onClick={() => rout_nav.replace("/home")}
          className="text-sm font-bold text-[#F26B12]"
        >
          홈으로
        </button>
      </main>
    );
  }

  const open_cnt = rept_list.filter((r) => r.stat === "open").length;
  const overdue_cnt = rept_list.filter((r) => r.stat === "open" && Date.now() - r.made_at > DAY_MS).length;
  const shop_pend_cnt = shop_list.filter((s) => s.status === "pending").length;

  return (
    <main className="min-h-dvh w-full bg-[#FAFAFA] pb-10">
      <header className="bg-white px-5 pb-4 pt-6">
        <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-[#F26B12]" /> 관리자
        </h1>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#FFF3E9] p-1">
          <button
            type="button"
            onClick={() => setTabVal("rept")}
            className={`rounded-lg py-2 text-[11px] font-bold transition ${
              tab_val === "rept" ? "bg-[#F26B12] text-white" : "text-[#F26B12]"
            }`}
          >
            신고 관리 {open_cnt > 0 && `(${open_cnt})`}
          </button>
          <button
            type="button"
            onClick={() => setTabVal("shop")}
            className={`rounded-lg py-2 text-[11px] font-bold transition ${
              tab_val === "shop" ? "bg-[#F26B12] text-white" : "text-[#F26B12]"
            }`}
          >
            가게 심사 {shop_pend_cnt > 0 && `(${shop_pend_cnt})`}
          </button>
          <button
            type="button"
            onClick={() => setTabVal("sub")}
            className={`rounded-lg py-2 text-[11px] font-bold transition ${
              tab_val === "sub" ? "bg-[#F26B12] text-white" : "text-[#F26B12]"
            }`}
          >
            구독 요금 관리
          </button>
        </div>
        {tab_val === "rept" && (
          <div className="mt-3 flex gap-2 text-xs">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-600">
              대기중 {open_cnt}건
            </span>
            {overdue_cnt > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1.5 font-bold text-red-500">
                24시간 초과 {overdue_cnt}건
              </span>
            )}
          </div>
        )}
      </header>

      {tab_val === "shop" && (
        <div className="space-y-3 px-4 pt-4">
          {shop_list.length === 0 && (
            <p className="pt-10 text-center text-xs text-gray-400">등록된 가게 홍보가 없어요.</p>
          )}
          {shop_list.map((s) => (
            <div key={s.shop_id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-900">{s.shop_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SHOP_STAT_TONE[s.status]}`}
                  >
                    {SHOP_STAT_LBL[s.status]}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {s.category} · {s.region} · {s.ownr_name}님
              </p>
              {s.biz_hours && <p className="mt-1 text-xs text-gray-500">영업시간: {s.biz_hours}</p>}
              {s.description && <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{s.description}</p>}
              {s.status === "rejected" && s.reject_reason && (
                <p className="mt-1.5 text-xs text-red-400">반려 사유: {s.reject_reason}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => toggle_chk(s.shop_id)}
                  className="flex items-center gap-0.5 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600"
                >
                  심사 체크리스트
                  {chk_open_id === s.shop_id ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {s.status !== "approved" && (
                  <button
                    type="button"
                    disabled={busy_id === s.shop_id}
                    onClick={() => do_shop_stat(s.shop_id, "approved")}
                    className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-600 disabled:opacity-40"
                  >
                    승인
                  </button>
                )}
                {s.status !== "rejected" && rjct_open_id !== s.shop_id && (
                  <button
                    type="button"
                    disabled={busy_id === s.shop_id}
                    onClick={() => {
                      setRjctOpenId(s.shop_id);
                      setRjctTxt("");
                    }}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-500 disabled:opacity-40"
                  >
                    반려
                  </button>
                )}
              </div>

              {chk_open_id === s.shop_id && (
                <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-3">
                  {CHECK_TYPE_LIST.map((ct) => {
                    const cur = chk_map[s.shop_id]?.find((c) => c.check_type === ct);
                    const key = `${s.shop_id}:${ct}`;
                    return (
                      <div key={ct} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-700">{CHECK_TYPE_LBL[ct]}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              cur?.result === "pass"
                                ? "bg-green-50 text-green-600"
                                : cur?.result === "fail"
                                  ? "bg-red-50 text-red-500"
                                  : cur?.result === "skip"
                                    ? "bg-gray-100 text-gray-400"
                                    : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {cur?.result === "pass"
                              ? "통과"
                              : cur?.result === "fail"
                                ? "미흡"
                                : cur?.result === "skip"
                                  ? "생략"
                                  : "확인중"}
                          </span>
                        </div>
                        {cur?.note && <p className="mt-0.5 text-[10px] text-gray-400">{cur.note}</p>}
                        <div className="mt-1.5 flex gap-1">
                          <input
                            value={chk_note_map[key] ?? ""}
                            onChange={(e) => setChkNoteMap((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder="메모(선택)"
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-800 outline-none focus:border-[#F26B12]"
                          />
                          <button
                            type="button"
                            disabled={chk_busy_key === key}
                            onClick={() => do_chk(s.shop_id, ct, "pass")}
                            className="shrink-0 rounded-lg bg-green-50 px-2 text-[11px] font-bold text-green-600 disabled:opacity-40"
                          >
                            통과
                          </button>
                          <button
                            type="button"
                            disabled={chk_busy_key === key}
                            onClick={() => do_chk(s.shop_id, ct, "fail")}
                            className="shrink-0 rounded-lg bg-red-50 px-2 text-[11px] font-bold text-red-500 disabled:opacity-40"
                          >
                            미흡
                          </button>
                          <button
                            type="button"
                            disabled={chk_busy_key === key}
                            onClick={() => do_chk(s.shop_id, ct, "skip")}
                            className="shrink-0 rounded-lg bg-gray-100 px-2 text-[11px] font-bold text-gray-400 disabled:opacity-40"
                          >
                            생략
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {rjct_open_id === s.shop_id && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={rjct_txt}
                    onChange={(ev_chg) => setRjctTxt(ev_chg.target.value.slice(0, 200))}
                    placeholder="반려 사유를 입력해주세요"
                    className="flex-1 rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-[#F26B12]"
                  />
                  <button
                    type="button"
                    disabled={!rjct_txt.trim() || busy_id === s.shop_id}
                    onClick={() => do_shop_stat(s.shop_id, "rejected", rjct_txt.trim())}
                    className="shrink-0 rounded-xl bg-red-500 px-3 text-xs font-bold text-white disabled:opacity-40"
                  >
                    반려 확정
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab_val === "sub" && (
        <div className="space-y-4 px-4 pt-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">구독 요금표</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              가격을 바꿔도 이미 구독 중인 가게에는 다음 갱신부터 적용돼요.
            </p>
            <div className="mt-3 space-y-2">
              {plan_list.map((p) => (
                <PlanRow
                  key={p.duration_months}
                  plan={p}
                  busy={busy_id === `plan_${p.duration_months}`}
                  onSave={do_plan_save}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <Ticket className="h-4 w-4 text-[#F26B12]" /> 쿠폰 발급
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <input
                value={new_cpn_code}
                onChange={(e) => setNewCpnCode(e.target.value)}
                placeholder="코드"
                className="col-span-2 rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-[#F26B12]"
              />
              <input
                value={new_cpn_pct}
                onChange={(e) => setNewCpnPct(e.target.value)}
                placeholder="할인%"
                inputMode="numeric"
                className="rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-[#F26B12]"
              />
            </div>
            <input
              value={new_cpn_max}
              onChange={(e) => setNewCpnMax(e.target.value)}
              placeholder="최대 사용 횟수 (비우면 무제한)"
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-[#F26B12]"
            />
            {cpn_err && <p className="mt-1.5 text-[11px] text-red-400">{cpn_err}</p>}
            <button
              type="button"
              disabled={cpn_busy}
              onClick={do_cpn_create}
              className="mt-2 w-full rounded-xl bg-[#F26B12] py-2.5 text-xs font-bold text-white disabled:opacity-40"
            >
              쿠폰 만들기
            </button>

            <div className="mt-4 space-y-2">
              {cpn_list.length === 0 && <p className="text-[11px] text-gray-400">발급된 쿠폰이 없어요.</p>}
              {cpn_list.map((c) => (
                <div
                  key={c.cpn_id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900">
                      {c.code} <span className="font-normal text-gray-400">· {c.discount_pct}%</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      사용 {c.used_count}
                      {c.max_uses !== null ? `/${c.max_uses}` : ""}회
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy_id === c.cpn_id}
                    onClick={() => do_cpn_toggle(c.cpn_id, !c.is_active)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 ${
                      c.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {c.is_active ? "사용중" : "중지됨"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab_val === "rept" && (
      <div className="space-y-3 px-4 pt-4">
        {rept_list.length === 0 && (
          <p className="pt-10 text-center text-xs text-gray-400">접수된 신고가 없어요.</p>
        )}
        {rept_list.map((r) => {
          const overdue = r.stat === "open" && Date.now() - r.made_at > DAY_MS;
          return (
            <div
              key={r.rept_id}
              className={`rounded-2xl border bg-white p-4 ${overdue ? "border-red-200" : "border-gray-100"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STAT_TONE[r.stat]}`}>
                    {STAT_LBL[r.stat]}
                  </span>
                  {overdue && <span className="text-[11px] font-bold text-red-500">24시간 초과</span>}
                </div>
                <span className="text-[11px] text-gray-400">{fmt_elapsed(r.made_at)}</span>
              </div>

              <p className="mt-2 text-sm text-gray-900">
                <span className="font-bold">{r.trgt_name}</span>
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ACCT_TONE[r.trgt_stat]}`}
                >
                  {ACCT_LBL[r.trgt_stat]}
                </span>
                <span className="text-gray-400"> · {r.rptr_name}님의 신고</span>
              </p>
              <p className="mt-1 text-xs font-medium text-[#F26B12]">{RPT_RSN_LBL[r.reason]}</p>
              {r.detail && <p className="mt-1 text-xs leading-relaxed text-gray-500">{r.detail}</p>}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.stat === "open" && (
                  <button
                    type="button"
                    disabled={busy_id === r.rept_id}
                    onClick={() => do_rept_stat(r.rept_id, "in_prog")}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                  >
                    처리중으로 표시
                  </button>
                )}
                {r.stat !== "done" && (
                  <button
                    type="button"
                    disabled={busy_id === r.rept_id}
                    onClick={() => do_rept_stat(r.rept_id, "done")}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                  >
                    처리 완료로 표시
                  </button>
                )}
                {r.trgt_stat !== "susp" && (
                  <button
                    type="button"
                    disabled={busy_id === r.rept_id}
                    onClick={() => do_acct_stat(r.rept_id, r.trgt_id, "susp")}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-600 disabled:opacity-40"
                  >
                    대상 정지
                  </button>
                )}
                {r.trgt_stat !== "ban" && (
                  <button
                    type="button"
                    disabled={busy_id === r.rept_id}
                    onClick={() => do_acct_stat(r.rept_id, r.trgt_id, "ban")}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-500 disabled:opacity-40"
                  >
                    대상 영구 차단
                  </button>
                )}
                {r.trgt_stat !== "actv" && (
                  <button
                    type="button"
                    disabled={busy_id === r.rept_id}
                    onClick={() => do_acct_stat(r.rept_id, r.trgt_id, "actv")}
                    className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-600 disabled:opacity-40"
                  >
                    대상 정지 해제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </main>
  );
}

function PlanRow({
  plan,
  busy,
  onSave,
}: {
  plan: SubPlan;
  busy: boolean;
  onSave: (duration_months: SubDuration, price: number, is_active: boolean) => void;
}) {
  const [price_txt, setPriceTxt] = useState(String(plan.price));
  const [active_val, setActiveVal] = useState(plan.is_active);
  const chg_flag = Number(price_txt) !== plan.price || active_val !== plan.is_active;

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-bold text-gray-700">{plan.duration_months}개월</span>
      <input
        value={price_txt}
        onChange={(e) => setPriceTxt(e.target.value)}
        inputMode="numeric"
        className="w-24 rounded-xl border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#F26B12]"
      />
      <span className="text-[11px] text-gray-400">원</span>
      <button
        type="button"
        onClick={() => setActiveVal((v) => !v)}
        className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${
          active_val ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
        }`}
      >
        {active_val ? "노출중" : "숨김"}
      </button>
      <button
        type="button"
        disabled={!chg_flag || busy}
        onClick={() => onSave(plan.duration_months, Number(price_txt) || 0, active_val)}
        className="rounded-full bg-[#F26B12] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-30"
      >
        저장
      </button>
    </div>
  );
}
