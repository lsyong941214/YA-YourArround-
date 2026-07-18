"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import { MatcReq, sent_list as matc_sent_list } from "@/lib/store/matc_store";
import { BlndReq, sent_list as blnd_sent_list } from "@/lib/store/blnd_store";

type SentItem =
  | { kind: "matc"; item: MatcReq }
  | { kind: "blnd"; item: BlndReq };

export default function SentListScreen() {
  const rout_nav = useRouter();
  const [sent_list, setSentList] = useState<SentItem[]>([]);

  useEffect(() => {
    const user_now = curr_user();
    if (!user_now) return;
    const matc_items: SentItem[] = matc_sent_list(user_now.user_id).map((item) => ({
      kind: "matc",
      item,
    }));
    const blnd_items: SentItem[] = blnd_sent_list(user_now.user_id).map((item) => ({
      kind: "blnd",
      item,
    }));
    setSentList(
      [...matc_items, ...blnd_items].sort((a_item, b_item) => b_item.item.made_at - a_item.item.made_at)
    );
  }, []);

  function go_item(sent_item: SentItem) {
    if (sent_item.kind === "matc") {
      if (sent_item.item.stat === "r_acpt") {
        rout_nav.push(`/matched/${sent_item.item.req_id}`);
      } else {
        rout_nav.push(`/matching/${sent_item.item.req_id}`);
      }
    } else {
      rout_nav.push(`/blind/${sent_item.item.blnd_id}`);
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
        <h1 className="text-base font-bold text-gray-900">매칭 현황</h1>
      </header>

      {sent_list.length === 0 ? (
        <p className="px-5 pt-10 text-center text-sm text-gray-400">아직 진행중인 매칭이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-3 px-5 pt-2">
          {sent_list.map((sent_item) => (
            <button
              key={sent_item.kind === "matc" ? sent_item.item.req_id : sent_item.item.blnd_id}
              type="button"
              onClick={() => go_item(sent_item)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: sent_item.item.ton_hex }}
              >
                {sent_item.item.ini_char}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {sent_item.item.memb_name}님에게{" "}
                    {sent_item.kind === "matc" ? "연결 요청" : "주변인 테스트"}
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
    </main>
  );
}

function StatBadge({ kind, stat }: { kind: "matc" | "blnd"; stat: string }) {
  if (kind === "matc") {
    if (stat === "pend") return <Badge tone="wait">대기중</Badge>;
    if (stat === "c_acpt") return <Badge tone="wait">이장님 수락 · 응답 대기</Badge>;
    if (stat === "r_acpt") return <Badge tone="ok">연결 성사</Badge>;
    return <Badge tone="off">거절됨</Badge>;
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
