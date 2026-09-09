"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, PartyPopper } from "lucide-react";
import {
  BLND_CARD_CNT,
  BlndPick,
  BlndReq,
  BlndSide,
  find_req,
  pick_list,
  sub_blnd,
  submit_actn,
  submit_pick,
} from "@/lib/store/blnd_store";
import { BlndQuestion, find_question } from "@/lib/data/blnd_questions";

export default function BlndGameScreen({
  blnd_id,
  item,
  side,
}: {
  blnd_id: string;
  item: BlndReq;
  side: BlndSide;
}) {
  const rout_nav = useRouter();
  const [cur_item, setCurItem] = useState(item);
  const [phase, setPhase] = useState<"deck" | "choice">("deck");
  // 카드 전환 애니메이션 방향 - "out": 고른 카드가 뒤로 넘어감, "in": 다음 카드가 나타남
  const [trans_dir, setTransDir] = useState<"in" | "out">("in");
  const [err_msg, setErrMsg] = useState("");
  const [end_busy, setEndBusy] = useState(false);
  // 내가 방금 "종료하기"를 눌러 rjct로 바뀐 경우는 상대방용 팝업을 내 화면에 띄우지 않는다
  const ending_ref = useRef(false);

  const opp_side: BlndSide = side === "req" ? "memb" : "req";
  const my_step = pick_list(cur_item, side).length;
  const opp_step = pick_list(cur_item, opp_side).length;
  const my_done = my_step >= BLND_CARD_CNT;
  const both_done = my_done && opp_step >= BLND_CARD_CNT;
  const rjct_flag = cur_item.stat === "rjct" && !ending_ref.current;

  // 상대방이 카드를 고를 때마다 Realtime으로 바로 반영한다 (내가 대기 중이 아니어도 구독해
  // 두면, 마지막 카드를 거의 동시에 고르는 경우에도 "둘 다 완료" 상태가 지연 없이 잡힌다)
  useEffect(() => {
    return sub_blnd(blnd_id, () => {
      find_req(blnd_id).then((latest_item) => {
        if (latest_item) setCurItem(latest_item);
      });
    });
  }, [blnd_id]);

  // Realtime 이벤트를 놓쳤을 때를 대비한 보조 폴링 - 내가 5장을 다 고른 뒤, 상대방도 다
  // 골랐는지 주기적으로 확인
  useEffect(() => {
    if (!my_done || both_done) return;
    const timer_id = window.setInterval(() => {
      find_req(blnd_id).then((latest_item) => {
        if (latest_item) setCurItem(latest_item);
      });
    }, 1200);
    return () => window.clearInterval(timer_id);
  }, [my_done, both_done, blnd_id]);

  const CARD_OUT_MS = 220;

  // 카드를 고르면 "시작할까요?" 화면으로 돌아가지 않고, 고른 카드가 뒤로 넘어가면서
  // 바로 다음 문항의 선택지가 이어서 나타나는 애니메이션으로 전환한다
  async function do_pick(pick_val: BlndPick) {
    setErrMsg("");
    setTransDir("out");
    const [pick_rslt] = await Promise.all([
      submit_pick(blnd_id, side, pick_val),
      new Promise((resolve) => setTimeout(resolve, CARD_OUT_MS)),
    ]);
    if (pick_rslt.item) {
      setCurItem(pick_rslt.item);
    } else {
      console.error("주변인 테스트 카드 선택 저장 실패:", pick_rslt.err_msg);
      setErrMsg("선택을 저장하지 못했어요. 다시 시도해주세요.");
    }
    setTransDir("in");
  }

  // 요청을 받은 주민 쪽에서 진행 중인 주변인 테스트를 종료/거절한다. 누른 본인은 상대방용
  // 팝업 없이 바로 홈으로 돌아간다 (ending_ref로 표시해 실시간 갱신에 의한 팝업을 막는다)
  async function do_end() {
    if (end_busy) return;
    ending_ref.current = true;
    setEndBusy(true);
    await submit_actn(blnd_id, "end");
    rout_nav.push("/home");
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-base font-bold text-gray-900">주변인 테스트</h1>
        {side === "memb" && !both_done && !rjct_flag && (
          <button
            type="button"
            onClick={do_end}
            disabled={end_busy}
            className="text-xs font-bold text-gray-400 disabled:opacity-50"
          >
            종료하기
          </button>
        )}
      </header>

      {both_done ? (
        <DoneView blnd_id={blnd_id} />
      ) : my_done ? (
        <WaitView />
      ) : (
        <PlayView
          step_idx={my_step}
          card_ids={cur_item.card_ids}
          phase={phase}
          trans_dir={trans_dir}
          err_msg={err_msg}
          onStart={() => setPhase("choice")}
          onPick={do_pick}
        />
      )}

      {rjct_flag && <RjctPopup onConfirm={() => rout_nav.push("/home")} />}
    </main>
  );
}

function PlayView({
  step_idx,
  card_ids,
  phase,
  trans_dir,
  err_msg,
  onStart,
  onPick,
}: {
  step_idx: number;
  card_ids: string[];
  phase: "deck" | "choice";
  trans_dir: "in" | "out";
  err_msg: string;
  onStart: () => void;
  onPick: (pick_val: BlndPick) => void;
}) {
  const question = find_question(card_ids[step_idx]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-16">
      <div className="flex gap-1.5" role="status" aria-label="밸런스 게임 진행 상태">
        {Array.from({ length: BLND_CARD_CNT }).map((_, dot_idx) => (
          <span
            key={dot_idx}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              dot_idx < step_idx ? "w-4 bg-[#6C63E0]" : "bg-[#E3E1FA]"
            }`}
          />
        ))}
      </div>

      {phase === "deck" || !question ? (
        <DeckStack remaining={BLND_CARD_CNT - step_idx} onStart={onStart} />
      ) : (
        <div
          key={step_idx}
          className={trans_dir === "out" ? "animate-card-out" : "animate-card-in"}
        >
          <ChoiceCards question={question} onPick={onPick} disabled={trans_dir === "out"} />
        </div>
      )}

      {phase === "choice" && question && (
        <p className="-mt-6 text-xs font-bold text-[#6C63E0]">
          {step_idx + 1}/{BLND_CARD_CNT}
        </p>
      )}

      <p className="text-center text-xs text-gray-400">
        {phase === "deck"
          ? "가운데 카드를 눌러 다음 문항을 확인해보세요"
          : "마음에 드는 쪽 카드를 골라주세요"}
      </p>

      {err_msg && <p className="text-center text-xs font-bold text-red-400">{err_msg}</p>}
    </div>
  );
}

function DeckStack({ remaining, onStart }: { remaining: number; onStart: () => void }) {
  const back_cnt = Math.max(0, remaining - 1);

  return (
    <div className="relative h-64 w-44">
      {Array.from({ length: back_cnt }).map((_, i) => {
        const depth = back_cnt - i;
        const tilt = (i % 2 === 0 ? -1 : 1) * (3 + depth * 2.5);
        return (
          <div
            key={i}
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#B7B1F5] to-[#8A82EA] opacity-80 shadow-sm"
            style={{ transform: `translateY(${depth * 6}px) rotate(${tilt}deg)`, zIndex: i }}
          />
        );
      })}

      <button
        type="button"
        onClick={onStart}
        aria-label="시작할까요?"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-[#8D85F0] to-[#6C63E0] shadow-lg transition active:scale-[0.97]"
      >
        <Heart className="h-8 w-8 fill-white/90 text-white/90" />
        <span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#6C63E0]">
          시작할까요?
        </span>
      </button>
    </div>
  );
}

function ChoiceCards({
  question,
  onPick,
  disabled,
}: {
  question: BlndQuestion;
  onPick: (pick_val: BlndPick) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <ChoiceCard label={question.a_label} img={question.a_img} onClick={() => onPick("a")} disabled={disabled} />

      <span className="z-10 shrink-0 rounded-full bg-[#6C63E0] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
        VS
      </span>

      <ChoiceCard label={question.b_label} img={question.b_img} onClick={() => onPick("b")} disabled={disabled} />
    </div>
  );
}

// 카드에 이미지가 있으면 이미지 위에, 없으면 카드 배경에 하단 문구만 출력한다
function ChoiceCard({
  label,
  img,
  onClick,
  disabled,
}: {
  label: string;
  img?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (!img) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-56 w-32 shrink-0 flex-col items-center justify-end gap-2 rounded-3xl bg-gradient-to-br from-[#B7B1F5] to-[#8A82EA] px-3 pb-4 text-center shadow-md transition active:scale-95 disabled:pointer-events-none"
      >
        <span className="text-sm font-bold leading-snug text-white">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative h-56 w-32 shrink-0 overflow-hidden rounded-3xl shadow-md transition active:scale-95 disabled:pointer-events-none"
    >
      <img src={img} alt={label} className="h-full w-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2.5 pt-6 text-xs font-bold leading-snug text-white">
        {label}
      </span>
    </button>
  );
}

function WaitView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#6C63E0] [animation-delay:-0.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#6C63E0] [animation-delay:-0.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#6C63E0]" />
      </div>
      <p className="text-sm font-bold text-gray-900">상대방의 선택을 기다리고 있어요.</p>
      <p className="text-xs leading-relaxed text-gray-400">
        모든 카드를 다 골랐어요!
        <br />
        상대방이 선택을 마치면 바로 이어서 알려드릴게요.
      </p>
    </div>
  );
}

function DoneView({ blnd_id }: { blnd_id: string }) {
  const rout_nav = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <PartyPopper className="h-9 w-9 text-[#6C63E0]" />
      <p className="text-sm font-bold text-gray-900">두 분 모두 선택을 마쳤어요!</p>
      <button
        type="button"
        onClick={() => rout_nav.push(`/blind/${blnd_id}/result`)}
        className="mt-2 rounded-full bg-[#6C63E0] px-6 py-3 text-sm font-bold text-white shadow-md transition active:opacity-90"
      >
        이제 결과를 보러 갈까요?
      </button>
    </div>
  );
}

// 상대방이 진행 중이던 주변인 테스트를 종료/거절했을 때 뜨는 안내 팝업 - "확인" 하나만 눌러
// 메인 화면(홈)으로 돌아가게 한다
function RjctPopup({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-lg">
        <p className="text-sm font-bold leading-relaxed text-gray-900">
          상대방이 더 이상의 진행을 원치 않는 것 같습니다.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 w-full rounded-2xl bg-[#6C63E0] py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          확인
        </button>
      </div>
    </div>
  );
}
