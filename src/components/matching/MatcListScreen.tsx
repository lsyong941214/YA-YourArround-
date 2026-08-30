"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { jang_list, matc_is_prog, matc_stat_lbl, matc_stat_tone, MatcReq } from "@/lib/store/matc_store";
import { curr_user } from "@/lib/store/auth_store";
import Avatar from "@/components/common/Avatar";
import MatcDetailModal from "./MatcDetailModal";

export default function MatcListScreen() {
  const rout_nav = useRouter();
  const [req_list, setReqList] = useState<MatcReq[]>([]);
  const [sel_id, setSelId] = useState<string | null>(null);
  const [jang_id, setJangId] = useState<string | undefined>(undefined);

  async function refresh(jid: string | undefined) {
    setReqList(jid ? await jang_list(jid) : []);
  }

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      const jid = user_now?.user_role === "chief" ? user_now.user_id : undefined;
      setJangId(jid);
      refresh(jid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sel_item = req_list.find((r_item) => r_item.req_id === sel_id) ?? null;

  function go_req(r_item: MatcReq) {
    if (matc_is_prog(r_item.stat)) {
      setSelId(r_item.req_id);
    } else {
      rout_nav.push(`/matching/${r_item.req_id}`);
    }
  }

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-8">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">진행중인 매칭</h1>
      </header>

      {req_list.length === 0 ? (
        <p className="px-5 pt-10 text-center text-sm text-gray-400">
          아직 들어온 매칭 요청이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-5 pt-2">
          {req_list.map((r_item) => (
            <button
              key={r_item.req_id}
              type="button"
              onClick={() => go_req(r_item)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <Avatar
                img_url={r_item.memb_img}
                ini_char={r_item.ini_char}
                ton_hex={r_item.ton_hex}
                size_cls="h-12 w-12"
                txt_cls="text-base"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {r_item.req_name}님 → {r_item.memb_name}님
                  </p>
                  <StatBadge stat={r_item.stat} />
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-400">{r_item.jang_name}</p>
                {r_item.msg_txt && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">&ldquo;{r_item.msg_txt}&rdquo;</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}

      {sel_item && (
        <MatcDetailModal
          req_item={sel_item}
          onClose={() => setSelId(null)}
          onChanged={() => refresh(jang_id)}
        />
      )}
    </main>
  );
}

function StatBadge({ stat }: { stat: MatcReq["stat"] }) {
  const tone_cls =
    matc_stat_tone(stat) === "ok"
      ? "bg-emerald-50 text-emerald-600"
      : matc_stat_tone(stat) === "off"
        ? "bg-gray-100 text-gray-500"
        : "bg-[#FFE9D6] text-[#F26B12]";
  return (
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tone_cls}`}>
      {matc_stat_lbl(stat)}
    </span>
  );
}
