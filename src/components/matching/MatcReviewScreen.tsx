"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info, Star } from "lucide-react";
import { find_req, MatcReq, updt_req } from "@/lib/store/matc_store";
import RateModal from "./RateModal";
import RejectModal from "./RejectModal";

export default function MatcReviewScreen({ req_id }: { req_id: string }) {
  const rout_nav = useRouter();
  const [req_item, setReqItem] = useState<MatcReq | undefined | null>(null);
  const [rate_open, setRateOpen] = useState(false);
  const [rjct_open, setRjctOpen] = useState(false);

  useEffect(() => {
    setReqItem(find_req(req_id) ?? undefined);
  }, [req_id]);

  function do_acpt(rate_val: number, acpt_cmt: string) {
    updt_req(req_id, { stat: "c_acpt", rate_val, acpt_cmt, seen_flag: false });
    setReqItem(find_req(req_id));
    setRateOpen(false);
  }

  function do_rjct(rjct_rsn: string, rjct_msg: string) {
    updt_req(req_id, { stat: "c_rjct", rjct_rsn, rjct_msg });
    setReqItem(find_req(req_id));
    setRjctOpen(false);
  }

  if (req_item === null) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!req_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">존재하지 않는 요청이에요.</p>
        <button
          type="button"
          onClick={() => rout_nav.back()}
          className="text-sm font-bold text-[#F26B12]"
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
        <h1 className="text-base font-bold text-gray-900">이장님 연결 제안</h1>
      </header>

      <div className="flex-1 px-5 pt-2">
        <div className="rounded-2xl bg-[#FFF3E9] p-4">
          <p className="text-xs font-bold text-[#F26B12]">요청받은 제안</p>
          <p className="mt-1 text-sm font-bold text-gray-900">
            {req_item.req_name}님이 {req_item.memb_name}님과의 연결을 요청했어요!
          </p>
        </div>

        <p className="mt-5 text-xs font-medium text-gray-500">신청자 정보</p>
        <PersonCard
          ini_char={req_item.req_ini}
          ton_hex={req_item.req_ton}
          memb_name={req_item.req_name}
          memb_age={req_item.req_age}
          memb_job={req_item.req_job}
          memb_mbti={req_item.req_mbti}
          memb_reg={req_item.req_reg}
          tag_list={req_item.req_tags}
        />

        <p className="mt-4 text-xs font-medium text-gray-500">연결 희망 주민</p>
        <PersonCard
          ini_char={req_item.ini_char}
          ton_hex={req_item.ton_hex}
          memb_name={req_item.memb_name}
          memb_age={req_item.memb_age}
          memb_job={req_item.memb_job}
          memb_mbti={req_item.memb_mbti}
          memb_reg={req_item.memb_reg}
          tag_list={req_item.tag_list}
        />

        {req_item.msg_txt && (
          <div className="mt-4 rounded-2xl bg-[#FFF8F3] p-4">
            <p className="text-xs font-bold text-gray-900">신청자 메시지</p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">&ldquo;{req_item.msg_txt}&rdquo;</p>
          </div>
        )}

        {req_item.stat === "pend" ? (
          <div className="mt-4 space-y-1.5">
            <p className="flex items-start gap-1.5 text-[11px] text-gray-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              제안을 수락하면 서로의 프로필을 확인할 수 있고, 대화도 시작할 수 있어요.
            </p>
            <p className="flex items-start gap-1.5 text-[11px] text-gray-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              거절하셔도 상대방은 알 수 없어요.
            </p>
          </div>
        ) : req_item.stat === "c_acpt" ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">수락했어요 · 주민 응답 대기중</p>
            <div className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n_val) => (
                <Star
                  key={n_val}
                  className="h-4 w-4 text-emerald-600"
                  fill={n_val <= (req_item.rate_val ?? 0) ? "currentColor" : "none"}
                />
              ))}
            </div>
          </div>
        ) : req_item.stat === "r_acpt" ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">연결이 성사됐어요! 🎉</p>
          </div>
        ) : req_item.stat === "r_rjct" ? (
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-700">주민이 제안을 거절했어요</p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-700">거절한 요청이에요</p>
            <p className="mt-1 text-xs text-gray-500">사유: {req_item.rjct_rsn}</p>
            {req_item.rjct_msg && (
              <p className="mt-1 text-xs text-gray-500">&ldquo;{req_item.rjct_msg}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      {req_item.stat === "pend" && (
        <div className="fixed inset-x-0 bottom-0 space-y-2 border-t border-gray-100 bg-white px-5 pb-8 pt-4">
          <button
            type="button"
            onClick={() => setRateOpen(true)}
            className="w-full rounded-2xl bg-[#F26B12] py-3.5 text-sm font-bold text-white transition active:opacity-90"
          >
            수락하기
          </button>
          <button
            type="button"
            onClick={() => setRjctOpen(true)}
            className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
          >
            거절하기
          </button>
        </div>
      )}

      {rate_open && (
        <RateModal
          req_name={req_item.req_name}
          memb_name={req_item.memb_name}
          onClose={() => setRateOpen(false)}
          onSubmit={do_acpt}
        />
      )}
      {rjct_open && <RejectModal onClose={() => setRjctOpen(false)} onSubmit={do_rjct} />}
    </main>
  );
}

function PersonCard({
  ini_char,
  ton_hex,
  memb_name,
  memb_age,
  memb_job,
  memb_mbti,
  memb_reg,
  tag_list,
}: {
  ini_char: string;
  ton_hex: string;
  memb_name: string;
  memb_age: number;
  memb_job: string;
  memb_mbti: string;
  memb_reg: string;
  tag_list: string[];
}) {
  return (
    <div className="mt-1 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#FFF8F3] p-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
        style={{ backgroundColor: ton_hex }}
      >
        {ini_char}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">
          {memb_name} <span className="font-normal text-gray-400">{memb_age}</span>
          <span className="font-normal text-gray-400"> · {memb_job}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {memb_mbti} · {memb_reg}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{tag_list.join(", ")}</p>
      </div>
    </div>
  );
}
