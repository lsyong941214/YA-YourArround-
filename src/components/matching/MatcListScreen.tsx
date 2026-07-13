"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { load_list, MatcReq } from "@/lib/store/matc_store";

export default function MatcListScreen() {
  const rout_nav = useRouter();
  const [req_list, setReqList] = useState<MatcReq[]>([]);

  useEffect(() => {
    setReqList(load_list());
  }, []);

  function go_req(req_id: string) {
    rout_nav.push(`/matching/${req_id}`);
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
              onClick={() => go_req(r_item.req_id)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: r_item.ton_hex }}
              >
                {r_item.ini_char}
              </div>
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
    </main>
  );
}

function StatBadge({ stat }: { stat: MatcReq["stat"] }) {
  if (stat === "c_acpt") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
        이장님 수락
      </span>
    );
  }
  if (stat === "r_acpt") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
        연결 성사
      </span>
    );
  }
  if (stat === "c_rjct" || stat === "r_rjct") {
    return (
      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
        거절함
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-[#FFE9D6] px-1.5 py-0.5 text-[10px] font-bold text-[#F26B12]">
      대기중
    </span>
  );
}
