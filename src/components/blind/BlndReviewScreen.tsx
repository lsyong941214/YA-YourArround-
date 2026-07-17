"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BlndReq, find_req, updt_req } from "@/lib/store/blnd_store";

export default function BlndReviewScreen({ blnd_id }: { blnd_id: string }) {
  const rout_nav = useRouter();
  const [blnd_item, setBlndItem] = useState<BlndReq | undefined | null>(null);

  useEffect(() => {
    setBlndItem(find_req(blnd_id) ?? undefined);
  }, [blnd_id]);

  function do_acpt() {
    updt_req(blnd_id, { stat: "acpt" });
    setBlndItem(find_req(blnd_id));
  }

  function do_rjct() {
    updt_req(blnd_id, { stat: "rjct" });
    setBlndItem(find_req(blnd_id));
  }

  if (blnd_item === null) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!blnd_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">존재하지 않는 요청이에요.</p>
        <button
          type="button"
          onClick={() => rout_nav.back()}
          className="text-sm font-bold text-[#6C63E0]"
        >
          돌아가기
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white pb-28">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">주변인 테스트 요청</h1>
      </header>

      <div className="flex-1 px-5 pt-2">
        <div className="rounded-2xl bg-[#F1F0FD] p-4">
          <p className="text-xs font-bold text-[#6C63E0]">받은 요청</p>
          <p className="mt-1 text-sm font-bold text-gray-900">
            {blnd_item.req_name}님이 주변인 테스트를 요청했어요!
          </p>
        </div>

        <p className="mt-5 text-xs font-medium text-gray-500">요청자 정보</p>
        <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ backgroundColor: blnd_item.req_ton }}
          >
            {blnd_item.req_ini}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">
              {blnd_item.req_name}
              {blnd_item.req_age ? (
                <span className="font-normal text-gray-400"> {blnd_item.req_age}</span>
              ) : null}
              {blnd_item.req_job && (
                <span className="font-normal text-gray-400"> · {blnd_item.req_job}</span>
              )}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {blnd_item.req_mbti} {blnd_item.req_reg ? `· ${blnd_item.req_reg}` : ""}
            </p>
          </div>
        </div>

        {blnd_item.msg_txt && (
          <div className="mt-4 rounded-2xl bg-[#FAFAFA] p-4">
            <p className="text-xs font-bold text-gray-900">한마디</p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">&ldquo;{blnd_item.msg_txt}&rdquo;</p>
          </div>
        )}

        {blnd_item.stat === "acpt" && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">수락했어요!</p>
            <p className="mt-1 text-xs text-emerald-600">
              밸런스 게임으로 서로의 성향을 알아가는 기능은 다음 업데이트에서 제공될 예정이에요.
            </p>
          </div>
        )}
        {blnd_item.stat === "rjct" && (
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-700">거절한 요청이에요</p>
          </div>
        )}
      </div>

      {blnd_item.stat === "pend" && (
        <div className="fixed inset-x-0 bottom-0 space-y-2 border-t border-gray-100 bg-white px-5 pb-8 pt-4">
          <button
            type="button"
            onClick={do_acpt}
            className="w-full rounded-2xl bg-[#6C63E0] py-3.5 text-sm font-bold text-white transition active:opacity-90"
          >
            수락하기
          </button>
          <button
            type="button"
            onClick={do_rjct}
            className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
          >
            거절하기
          </button>
        </div>
      )}
    </main>
  );
}
