"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, PartyPopper, Sparkles } from "lucide-react";
import {
  BlndPick,
  BlndQstn,
  BlndReq,
  BlndSide,
  ensure_game_qstns,
  find_req,
  pick_hist,
  pick_list,
  submit_pick,
} from "@/lib/store/blnd_store";

export default function BlndGameScreen({
  blnd_id,
  item,
  side,
  user_id,
}: {
  blnd_id: string;
  item: BlndReq;
  side: BlndSide;
  user_id: string;
}) {
  const rout_nav = useRouter();
  const [cur_item, setCurItem] = useState(item);
  const [phase, setPhase] = useState<"deck" | "choice">("deck");
  const [qstn_list, setQstnList] = useState<BlndQstn[] | null>(null);
  const [hist_map, setHistMap] = useState<Record<string, BlndPick>>({});

  useEffect(() => {
    ensure_game_qstns(blnd_id).then((dealt) => {
      setQstnList(dealt);
      if (dealt.length > 0) {
        pick_hist(
          user_id,
          dealt.map((q_item) => q_item.qstn_id),
          blnd_id
        ).then(setHistMap);
      }
    });
  }, [blnd_id, user_id]);

  const opp_side: BlndSide = side === "req" ? "memb" : "req";
  const my_step = pick_list(cur_item, side).length;
  const opp_step = pick_list(cur_item, opp_side).length;
  const card_cnt = qstn_list?.length ?? 0;
  const my_done = qstn_list !== null && my_step >= card_cnt;
  const both_done = my_done && opp_step >= card_cnt;

  // 내가 문항을 다 고른 뒤엔, 상대방도 다 골랐는지 주기적으로 확인
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
    const qstn = qstn_list?.[my_step];
    if (!qstn) return;
    const updt_item = await submit_pick(blnd_id, side, user_id, qstn.qstn_id, pick_val);
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

      {qstn_list === null ? (
        <LoadView />
      ) : both_done ? (
        <DoneView />
      ) : my_done ? (
        <WaitView />
      ) : (
        <PlayView
          qstn_list={qstn_list}
          hist_map={hist_map}
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
  qstn_list,
  hist_map,
  step_idx,
  phase,
  onStart,
  onPick,
}: {
  qstn_list: BlndQstn[];
  hist_map: Record<string, BlndPick>;
  step_idx: number;
  phase: "deck" | "choice";
  onStart: () => void;
  onPick: (pick_val: BlndPick) => void;
}) {
  const card_cnt = qstn_list.length;
  const qstn = qstn_list[step_idx];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16">
      <div className="flex max-w-xs flex-wrap justify-center gap-1" role="status" aria-label="밸런스 게임 진행 상태">
        {qstn_list.map((q_item, dot_idx) => (
          <span
            key={q_item.qstn_id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              dot_idx < step_idx ? "w-3.5 bg-[#6C63E0]" : "w-1.5 bg-[#E3E1FA]"
            }`}
          />
        ))}
      </div>

      {phase === "deck" ? (
        <DeckStack remaining={card_cnt - step_idx} onStart={onStart} />
      ) : (
        <ChoiceCards qstn={qstn} hist_pick={hist_map[qstn.qstn_id]} onPick={onPick} />
      )}

      <p className="text-center text-xs text-gray-400">
        {phase === "deck"
          ? "가운데 카드를 눌러 다음 문항을 확인해보세요"
          : "마음에 드는 쪽을 골라주세요"}
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
  qstn,
  hist_pick,
  onPick,
}: {
  qstn: BlndQstn;
  hist_pick?: BlndPick;
  onPick: (pick_val: BlndPick) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] font-bold text-[#6C63E0]">{qstn.topic}</p>
      <div className="flex items-center justify-center gap-2">
        <ChoiceCard
          img={qstn.img_a}
          txt={qstn.txt_a}
          highlight={hist_pick === "a"}
          onClick={() => onPick("a")}
        />
        <span className="z-10 shrink-0 rounded-full bg-[#6C63E0] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          VS
        </span>
        <ChoiceCard
          img={qstn.img_b}
          txt={qstn.txt_b}
          highlight={hist_pick === "b"}
          onClick={() => onPick("b")}
        />
      </div>
      {hist_pick && (
        <p className="text-center text-[11px] font-medium text-[#B7791F]">
          이 문항, 예전에도 골랐던 적이 있어요
        </p>
      )}
    </div>
  );
}

// 카드는 이미지만 담고, 문항 내용은 카드 아래 텍스트로 노출한다 - 주제별 이미지가 아직
// 업로드되지 않은 문항(img가 null)은 카드 자리에 기본 그라디언트만 채워 자연스럽게 대체된다.
// highlight는 이 문항이 다른 게임에서 이미 나왔었고, 그때 이 카드를 골랐던 적이 있다는 표시
function ChoiceCard({
  img,
  txt,
  highlight,
  onClick,
}: {
  img: string | null;
  txt: string;
  highlight: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-32 shrink-0 flex-col items-center gap-2 transition active:scale-95"
    >
      <div
        className={`relative h-56 w-32 overflow-hidden rounded-3xl shadow-md ${
          highlight ? "ring-4 ring-[#F5A623] ring-offset-2" : ""
        }`}
      >
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C9C4F7] to-[#8A82EA]">
            <Heart className="h-7 w-7 fill-white/80 text-white/80" />
          </div>
        )}
        {highlight && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-[#F5A623] px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <Sparkles className="h-2.5 w-2.5" />
            예전 선택
          </span>
        )}
      </div>
      <p className="text-center text-xs font-semibold leading-snug text-gray-700">{txt}</p>
    </button>
  );
}

function LoadView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#6C63E0] [animation-delay:-0.3s]" />
      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#6C63E0] [animation-delay:-0.15s]" />
      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#6C63E0]" />
    </div>
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
