"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import {
  matc_stat_lbl,
  matc_stat_tone,
  MatcReq,
  memb_hist_list,
  sent_list as matc_sent_list,
  updt_req,
} from "@/lib/store/matc_store";
import {
  BlndReq,
  memb_list as blnd_memb_list,
  sent_list as blnd_sent_list,
} from "@/lib/store/blnd_store";
import SentPeekModal from "./SentPeekModal";
import BlndSentPeekModal from "./BlndSentPeekModal";
import ProposalModal from "@/components/proposal/ProposalModal";
import AvatarCircle from "@/components/common/AvatarCircle";

type SentDir = "sent" | "recv";

type SentItem =
  | { kind: "matc"; dir: SentDir; item: MatcReq }
  | { kind: "blnd"; dir: SentDir; item: BlndReq };

export default function SentListScreen() {
  const rout_nav = useRouter();
  const [sent_list, setSentList] = useState<SentItem[]>([]);
  const [sel_id, setSelId] = useState<string | null>(null);
  const [blnd_sel_id, setBlndSelId] = useState<string | null>(null);

  async function load_all() {
    const user_now = await curr_user();
    if (!user_now) return;

    const [sent_matc, sent_blnd, recv_matc, recv_blnd] = await Promise.all([
      matc_sent_list(user_now.user_id),
      blnd_sent_list(user_now.user_id),
      memb_hist_list(user_now.user_id),
      blnd_memb_list(user_now.user_id),
    ]);
    const list_val: SentItem[] = [
      ...sent_matc.map((item): SentItem => ({ kind: "matc", dir: "sent", item })),
      ...sent_blnd.map((item): SentItem => ({ kind: "blnd", dir: "sent", item })),
      ...recv_matc.map((item): SentItem => ({ kind: "matc", dir: "recv", item })),
      ...recv_blnd.map((item): SentItem => ({ kind: "blnd", dir: "recv", item })),
    ];
    setSentList(list_val.sort((a_item, b_item) => b_item.item.made_at - a_item.item.made_at));
  }

  useEffect(() => {
    load_all();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sel_entry = sent_list.find(
    (s_item): s_item is Extract<SentItem, { kind: "matc" }> =>
      s_item.kind === "matc" && s_item.item.req_id === sel_id
  );
  const need_decision = sel_entry?.dir === "recv" && sel_entry.item.stat === "c_acpt";

  const blnd_sel_entry = sent_list.find(
    (s_item): s_item is Extract<SentItem, { kind: "blnd" }> =>
      s_item.kind === "blnd" && s_item.item.blnd_id === blnd_sel_id
  );

  function go_item(sent_item: SentItem) {
    if (sent_item.kind === "blnd") {
      // 요청자(sent) 쪽은 아직 상대가 결정하지 않았거나(pend) 거절한(rjct) 경우
      // 수락/거절 화면 대신 자신이 보낸 요청 내용만 읽기 전용으로 확인
      if (sent_item.dir === "sent" && sent_item.item.stat !== "acpt") {
        setBlndSelId(sent_item.item.blnd_id);
        return;
      }
      rout_nav.push(`/blind/${sent_item.item.blnd_id}`);
      return;
    }
    if (sent_item.item.stat === "r_acpt") {
      rout_nav.push(`/matched/${sent_item.item.req_id}`);
      return;
    }
    setSelId(sent_item.item.req_id);
  }

  async function do_acpt() {
    if (!sel_entry) return;
    await updt_req(sel_entry.item.req_id, { stat: "r_acpt" });
    setSelId(null);
    rout_nav.push(`/matched/${sel_entry.item.req_id}`);
  }

  async function do_rjct() {
    if (!sel_entry) return;
    await updt_req(sel_entry.item.req_id, { stat: "r_rjct" });
    setSelId(null);
    load_all();
  }

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-24">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">매칭 현황</h1>
      </header>

      {sent_list.length === 0 ? (
        <p className="px-5 pt-10 text-center text-sm text-gray-400">아직 진행중인 매칭이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-3 px-5 pt-2">
          {sent_list.map((sent_item) => (
            <button
              key={`${sent_item.kind}-${sent_item.dir}-${
                sent_item.kind === "matc" ? sent_item.item.req_id : sent_item.item.blnd_id
              }`}
              type="button"
              onClick={() => go_item(sent_item)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <AvatarCircle
                img_url={sent_item.dir === "sent" ? sent_item.item.memb_img : sent_item.item.req_img}
                ini_char={sent_item.dir === "sent" ? sent_item.item.ini_char : sent_item.item.req_ini}
                ton_hex={sent_item.dir === "sent" ? sent_item.item.ton_hex : sent_item.item.req_ton}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {sent_item.dir === "sent"
                      ? `${sent_item.item.memb_name}님에게 ${sent_item.kind === "matc" ? "연결 요청" : "주변인 테스트"}`
                      : `${sent_item.item.req_name}님으로부터 ${sent_item.kind === "matc" ? "연결 요청" : "주변인 테스트"}`}
                  </p>
                  <StatBadge kind={sent_item.kind} stat={sent_item.item.stat} />
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-400">{sent_item.item.jang_name}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}

      {sel_entry && need_decision && (
        <ProposalModal
          req_item={sel_entry.item}
          onClose={() => setSelId(null)}
          onAcpt={do_acpt}
          onRjct={do_rjct}
        />
      )}
      {sel_entry && !need_decision && (
        <SentPeekModal req_item={sel_entry.item} dir={sel_entry.dir} onClose={() => setSelId(null)} />
      )}
      {blnd_sel_entry && (
        <BlndSentPeekModal req_item={blnd_sel_entry.item} onClose={() => setBlndSelId(null)} />
      )}
    </main>
  );
}

function StatBadge({ kind, stat }: { kind: "matc" | "blnd"; stat: string }) {
  if (kind === "matc") {
    const tone_cls =
      matc_stat_tone(stat as MatcReq["stat"]) === "ok"
        ? "bg-emerald-50 text-emerald-600"
        : matc_stat_tone(stat as MatcReq["stat"]) === "off"
          ? "bg-gray-100 text-gray-500"
          : "bg-[#FFE9D6] text-[#F26B12]";
    return (
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tone_cls}`}>
        {matc_stat_lbl(stat as MatcReq["stat"])}
      </span>
    );
  }
  if (stat === "pend") return <Badge tone="wait">대기중</Badge>;
  if (stat === "acpt") return <Badge tone="ok">수락됨</Badge>;
  return <Badge tone="off">거절됨</Badge>;
}

function Badge({ tone, children }: { tone: "wait" | "ok" | "off"; children: React.ReactNode }) {
  const tone_cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "off"
        ? "bg-gray-100 text-gray-500"
        : "bg-[#FFE9D6] text-[#F26B12]";
  return (
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tone_cls}`}>
      {children}
    </span>
  );
}
