"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, Lock, PartyPopper } from "lucide-react";
import {
  BLND_CARD_CNT,
  BlndPick,
  BlndReq,
  BlndSide,
  find_req,
  pick_list,
  submit_pick,
} from "@/lib/store/blnd_store";

// 1번 카드만 현재 버전에서 실제 문항으로 제공, 2~5번은 "추후 공개됩니다." placeholder
const Q1_A_IMG = "/assets/blnd/q1_a.png";
const Q1_B_IMG = "/assets/blnd/q1_b.png";

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

  const opp_side: BlndSide = side === "req" ? "memb" : "req";
  const my_step = pick_list(cur_item, side).length;
  const opp_step = pick_list(cur_item, opp_side).length;
  const my_done = my_step >= BLND_CARD_CNT;
  const both_done = my_done && opp_step >= BLND_CARD_CNT;

  // 내가 5장을 다 고른 뒤엔, 상대방도 다 골랐는지 주기적으로 확인
  useEffect(() => {
    if (!my_done || both_done) return;
    const timer_id = window.setInterval(() => {
      find_req(blnd_id).then((latest_item) => {
        if (latest_item) setCurItem(latest_item);
      });
    }, 1200);
    return () => window.clearInterval(timer_id);
  }, [my_done, both_done, blnd_id]);

  async function do_pick(pick_val: BlndPick) {
    const updt_item = await submit_pick(blnd_id, side, pick_val);
    if (updt_item) setCurItem(updt_item);
    setPhase("deck");
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
        <h1 className="text-base font-bold text-gray-900">주변인 테스트</h1>
      </header>

      {both_done ? (
        <DoneView />
      ) : my_done ? (
        <WaitView />
      ) : (
        <PlayView
          step_idx={my_step}
          phase={phase}
          onStart={() => setPhase("choice")}
          onPick={do_pick}
        />
      )}
    </main>
  );
}

function PlayView({
  step_idx,
  phase,
  onStart,
  onPick,
}: {
  step_idx: number;
  phase: "deck" | "choice";
  onStart: () => void;
  onPick: (pick_val: BlndPick) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-16">
      <div className="flex gap-2" role="status" aria-label="밸런스 게임 진행 상태">
        {Array.from({ length: BLND_CARD_CNT }).map((_, dot_idx) => (
          <span
            key={dot_idx}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              dot_idx < step_idx ? "w-5 bg-[#6C63E0]" : "bg-[#E3E1FA]"
            }`}
          />
        ))}
      </div>

      {phase === "deck" ? (
        <DeckStack remaining={BLND_CARD_CNT - step_idx} onStart={onStart} />
      ) : (
        <ChoiceCards step_idx={step_idx} onPick={onPick} />
      )}

      <p className="text-center text-xs text-gray-400">
        {phase === "deck"
          ? "가운데 카드를 눌러 다음 문항을 확인해보세요"
          : "마음에 드는 쪽 카드를 골라주세요"}
      </p>
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
  step_idx,
  onPick,
}: {
  step_idx: number;
  onPick: (pick_val: BlndPick) => void;
}) {
  const is_q1 = step_idx === 0;

  return (
    <div className="flex items-center justify-center gap-2">
      {is_q1 ? (
        <ChoiceCard onClick={() => onPick("a")}>
          <img
            src={Q1_A_IMG}
            alt="매일 만나지만 1시간만 데이트"
            className="h-full w-full rounded-3xl object-cover"
          />
        </ChoiceCard>
      ) : (
        <PlaceholderCard onClick={() => onPick("a")} />
      )}

      <span className="z-10 shrink-0 rounded-full bg-[#6C63E0] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
        VS
      </span>

      {is_q1 ? (
        <ChoiceCard onClick={() => onPick("b")}>
          <img
            src={Q1_B_IMG}
            alt="한 달에 한 번 만나서 2박 3일 데이트"
            className="h-full w-full rounded-3xl object-cover"
          />
        </ChoiceCard>
      ) : (
        <PlaceholderCard onClick={() => onPick("b")} />
      )}
    </div>
  );
}

function ChoiceCard({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-56 w-32 shrink-0 overflow-hidden rounded-3xl shadow-md transition active:scale-95"
    >
      {children}
    </button>
  );
}

function PlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-56 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#D8D4F7] bg-[#F1F0FD] px-2 text-center transition active:scale-95"
    >
      <Lock className="h-6 w-6 text-[#B3ACEB]" />
      <span className="text-xs font-bold leading-snug text-[#8C85D6]">추후 공개됩니다.</span>
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
      <p className="text-sm font-bold text-gray-900">상대방의 선택을 기다리는 중 ...</p>
      <p className="text-xs leading-relaxed text-gray-400">
        모든 카드를 다 골랐어요!
        <br />
        상대방이 선택을 마치면 바로 이어서 알려드릴게요.
      </p>
    </div>
  );
}

function DoneView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <PartyPopper className="h-9 w-9 text-[#6C63E0]" />
      <p className="text-sm font-bold text-gray-900">두 분 모두 선택을 마쳤어요!</p>
      <p className="text-xs leading-relaxed text-gray-400">
        성향 점수 결과 화면은 다음 업데이트에서 제공될 예정이에요.
      </p>
    </div>
  );
}
