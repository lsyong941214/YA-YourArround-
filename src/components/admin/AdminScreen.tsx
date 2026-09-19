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
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { AcctStat } from "@/lib/store/auth_store";
import {
  AdmReport,
  is_curr_admin,
  list_reports_admin,
  RptStat,
  set_acct_stat,
  set_report_stat,
} from "@/lib/store/admin_store";
import { RPT_RSN_LBL } from "@/lib/store/safe_store";

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
  const [rept_list, setReptList] = useState<AdmReport[]>([]);
  const [busy_id, setBusyId] = useState<string | null>(null);

  async function load_list() {
    setReptList(await list_reports_admin());
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
    })();
  }, []);

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

  return (
    <main className="min-h-dvh w-full bg-[#FAFAFA] pb-10">
      <header className="bg-white px-5 pb-4 pt-6">
        <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-[#F26B12]" /> 신고 관리
        </h1>
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
      </header>

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
    </main>
  );
}
