"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mark_seen_memb, memb_prop_list, MatcReq, updt_req } from "@/lib/store/matc_store";
import { BlndReq, mark_seen_memb as mark_blnd_seen, memb_pend_list } from "@/lib/store/blnd_store";
import { curr_user } from "@/lib/store/auth_store";
import ProposalModal from "./ProposalModal";

export default function ProposalListScreen() {
  const rout_nav = useRouter();
  const [prop_list, setPropList] = useState<MatcReq[]>([]);
  const [blnd_list, setBlndList] = useState<BlndReq[]>([]);
  const [sel_id, setSelId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      if (!user_now) return;
      const memb_id = user_now.user_id;
      await Promise.all([mark_seen_memb(memb_id), mark_blnd_seen(memb_id)]);
      const [prop_now, blnd_now] = await Promise.all([memb_prop_list(memb_id), memb_pend_list(memb_id)]);
      setPropList(prop_now);
      setBlndList(blnd_now);
    })();
  }, []);

  const sel_item = prop_list.find((r_item) => r_item.req_id === sel_id) ?? null;

  async function do_acpt() {
    if (!sel_item) return;
    await updt_req(sel_item.req_id, { stat: "r_acpt" });
    rout_nav.push(`/matched/${sel_item.req_id}`);
  }

  async function do_rjct() {
    if (!sel_item) return;
    await updt_req(sel_item.req_id, { stat: "r_rjct" });
    setPropList((prev_list) => prev_list.filter((r_item) => r_item.req_id !== sel_item.req_id));
    setSelId(null);
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
        <h1 className="text-base font-bold text-gray-900">받은 제안함</h1>
      </header>

      {prop_list.length === 0 && blnd_list.length === 0 ? (
        <p className="px-5 pt-10 text-center text-sm text-gray-400">
          아직 받은 제안이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-5 pt-2">
          {prop_list.map((r_item) => (
            <button
              key={r_item.req_id}
              type="button"
              onClick={() => setSelId(r_item.req_id)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: r_item.req_ton }}
              >
                {r_item.req_ini}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {r_item.req_name}님이 연결을 제안했어요
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{r_item.jang_name}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          ))}

          {blnd_list.map((b_item) => (
            <button
              key={b_item.blnd_id}
              type="button"
              onClick={() => rout_nav.push(`/blind/${b_item.blnd_id}`)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: b_item.req_ton }}
              >
                {b_item.req_ini}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {b_item.req_name}님이 주변인 테스트를 요청했어요
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{b_item.jang_name}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}

      {sel_item && (
        <ProposalModal
          req_item={sel_item}
          onClose={() => setSelId(null)}
          onAcpt={do_acpt}
          onRjct={do_rjct}
        />
      )}
    </main>
  );
}
