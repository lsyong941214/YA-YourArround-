"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Handshake, X } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import { get_mbti_cpat } from "@/lib/data/mbti_cpat";
import { BLND_CATEG_LBL, BlndCateg, BlndQuestion, find_question } from "@/lib/data/blnd_questions";
import AvatarCircle from "@/components/common/AvatarCircle";
import {
  BlndActn,
  BlndPick,
  BlndReq,
  BlndTier,
  BLND_TIER_MSG,
  blnd_tier,
  blnd_tier_actn,
  blnd_tier_end_ok,
  both_picked,
  calc_pick_scor,
  calc_rslt_scor,
  find_req,
  side_of,
  sub_blnd,
  submit_actn,
} from "@/lib/store/blnd_store";

const TIER_TAG: Record<BlndTier, string> = {
  oppo: "반전 매력",
  rvw: "다름 발견",
  ok: "괜찮은 케미",
  good: "찰떡 궁합",
  best: "천생연분",
};

export default function BlndRsltScreen({ blnd_id }: { blnd_id: string }) {
  const rout_nav = useRouter();
  const [item, setItem] = useState<BlndReq | undefined | null>(null);
  const [my_user, setMyUser] = useState<{ user_id: string } | null | undefined>(undefined);
  const [busy_flag, setBusyFlag] = useState(false);
  const [picks_open, setPicksOpen] = useState(false);

  useEffect(() => {
    find_req(blnd_id).then((found) => setItem(found ?? undefined));
    curr_user().then(setMyUser);
  }, [blnd_id]);

  const my_side = item && my_user ? side_of(item, my_user) : null;
  const my_actn = item && my_side ? (my_side === "req" ? item.req_actn : item.memb_actn) : null;
  const opp_actn = item && my_side ? (my_side === "req" ? item.memb_actn : item.req_actn) : null;
  const rslt_open = !!item && item.stat === "acpt" && !!my_actn && !opp_actn;

  // 상대방이 결과 화면에서 행동(연락하기/확인요청/종료하기)을 고르면 Realtime으로 바로 반영한다
  useEffect(() => {
    return sub_blnd(blnd_id, () => {
      find_req(blnd_id).then((next) => {
        if (next) setItem(next);
      });
    });
  }, [blnd_id]);

  // Realtime 이벤트를 놓쳤을 때를 대비한 보조 폴링 - 아직 결과가 확정 안 됐는데 이미 내
  // 결정은 냈고, 상대 결정을 기다리는 중이면 주기적으로 다시 확인
  useEffect(() => {
    if (!rslt_open) return;
    const timer_id = window.setInterval(() => {
      find_req(blnd_id).then((next) => {
        if (next) setItem(next);
      });
    }, 1500);
    return () => window.clearInterval(timer_id);
  }, [rslt_open, blnd_id]);

  // 아직 둘 다 게임을 안 끝냈으면 결과를 볼 수 없다 - 게임 화면으로 돌려보낸다
  useEffect(() => {
    if (item && !both_picked(item)) {
      rout_nav.replace(`/blind/${blnd_id}`);
    }
  }, [item, blnd_id, rout_nav]);

  async function do_actn(actn: BlndActn) {
    if (busy_flag) return;
    setBusyFlag(true);
    const next_item = await submit_actn(blnd_id, actn);
    if (next_item) setItem(next_item);
    setBusyFlag(false);
  }

  if (item === null || my_user === undefined) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!item || !my_side || !both_picked(item)) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">결과를 확인할 수 없어요.</p>
        <button
          type="button"
          onClick={() => rout_nav.push("/home")}
          className="text-sm font-bold text-[#6C63E0]"
        >
          홈으로
        </button>
      </main>
    );
  }

  const mbti_scor = get_mbti_cpat(item.req_mbti, item.memb_mbti);
  const pick_scor = calc_pick_scor(item);
  const rslt_scor = calc_rslt_scor(item);
  const tier = blnd_tier(rslt_scor);

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white pb-10">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.push("/home")}
          aria-label="홈으로"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">주변인 테스트 결과서</h1>
      </header>

      <div className="flex flex-1 flex-col items-center px-6 pt-2 text-center">
        <div className="mt-3 flex items-center gap-4">
          <PersonMini
            img_url={item.req_img}
            ini_char={item.req_ini}
            ton_hex={item.req_ton}
            name={item.req_name}
            mbti={item.req_mbti}
          />
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F0FD] text-[#6C63E0]">
            <Handshake className="h-4 w-4" />
          </div>
          <PersonMini
            img_url={item.memb_img}
            ini_char={item.ini_char}
            ton_hex={item.ton_hex}
            name={item.memb_name}
            mbti={item.memb_mbti}
          />
        </div>

        <div className="mt-6 flex flex-col items-center">
          <span className="rounded-full bg-[#F1F0FD] px-3 py-1 text-xs font-bold text-[#6C63E0]">
            {TIER_TAG[tier]}
          </span>
          <p className="mt-2 text-5xl font-extrabold text-[#6C63E0]">
            {rslt_scor}
            <span className="text-lg font-bold text-gray-300">점</span>
          </p>
        </div>

        <div className="mt-6 w-full space-y-4 rounded-2xl bg-[#F8F8FC] p-4">
          <ScorRow label="MBTI 궁합" scor={mbti_scor} />
          <ScorRow label="선택지 일치도" scor={pick_scor} />
        </div>

        <button
          type="button"
          onClick={() => setPicksOpen(true)}
          className="mt-3 w-full rounded-2xl border border-[#E3E1FA] py-2.5 text-xs font-bold text-[#6C63E0] transition active:opacity-90"
        >
          주제별 선택 결과 보기
        </button>

        <div className="mt-8 w-full">
          {item.stat === "rjct" ? (
            <EndedPanel onHome={() => rout_nav.push("/home")} />
          ) : item.stat === "done" ? (
            <DonePanel item={item} />
          ) : my_actn ? (
            <WaitPanel tier={tier} />
          ) : (
            <DecisionPanel tier={tier} busy_flag={busy_flag} onActn={do_actn} />
          )}
        </div>

        <p className="mt-6 text-base font-bold leading-snug text-gray-900">{BLND_TIER_MSG[tier]}</p>
      </div>

      {picks_open && <PicksModal item={item} onClose={() => setPicksOpen(false)} />}
    </main>
  );
}

function PersonMini({
  img_url,
  ini_char,
  ton_hex,
  name,
  mbti,
}: {
  img_url?: string | null;
  ini_char: string;
  ton_hex: string;
  name: string;
  mbti: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <AvatarCircle
        img_url={img_url}
        ini_char={ini_char}
        ton_hex={ton_hex}
        className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
      />
      <p className="max-w-[22vw] truncate text-xs font-bold text-gray-900">{name}</p>
      <span className="rounded-full bg-[#F1F0FD] px-2 py-0.5 text-[10px] font-bold text-[#6C63E0]">{mbti}</span>
    </div>
  );
}

function ScorRow({ label, scor }: { label: string; scor: number }) {
  const pct = Math.max(0, Math.min(100, scor));
  // 채워진 막대 폭이 너무 좁으면 점수 글자가 안에 안 들어가므로, 그럴 땐 막대 바깥(오른쪽)에 표기한다
  const label_inside = pct >= 22;

  return (
    <div>
      <p className="text-sm font-bold text-gray-600">{label}</p>
      <div className="relative mt-1.5 h-8 w-full overflow-hidden rounded-full bg-[#E3E1FA]">
        <div
          className="h-full rounded-full bg-[#6C63E0] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        <span
          className={`absolute inset-y-0 flex items-center text-sm font-extrabold ${
            label_inside ? "right-3 text-white" : "text-[#6C63E0]"
          }`}
          style={label_inside ? undefined : { left: `calc(${pct}% + 8px)` }}
        >
          {scor}점
        </span>
      </div>
    </div>
  );
}

function DecisionPanel({
  tier,
  busy_flag,
  onActn,
}: {
  tier: BlndTier;
  busy_flag: boolean;
  onActn: (actn: BlndActn) => void;
}) {
  const main_actn = blnd_tier_actn(tier);
  const end_ok = blnd_tier_end_ok(tier);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onActn(main_actn)}
        disabled={busy_flag}
        className="w-full rounded-2xl bg-[#6C63E0] py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-60"
      >
        {main_actn === "rvw" ? "이장님에게 확인요청" : "연락하기"}
      </button>
      {end_ok && (
        <button
          type="button"
          onClick={() => onActn("end")}
          disabled={busy_flag}
          className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90 disabled:opacity-60"
        >
          종료하기
        </button>
      )}
    </div>
  );
}

function WaitPanel({ tier }: { tier: BlndTier }) {
  return (
    <div className="rounded-2xl bg-[#F1F0FD] p-5 text-center">
      <p className="text-sm font-bold text-gray-900">상대방의 결정을 기다리고 있어요.</p>
      <p className="mt-1 text-xs text-gray-400">
        {tier === "rvw"
          ? "이장님에게 확인요청을 보냈어요. 상대방도 요청하면 이장님 확인 없이 바로 매칭돼요."
          : "상대방이 결정하면 바로 알려드릴게요."}
      </p>
    </div>
  );
}

function EndedPanel({ onHome }: { onHome: () => void }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-5 text-center">
      <p className="text-sm font-bold text-gray-700">매칭이 종료됐어요</p>
      <p className="mt-1 text-xs text-gray-400">한쪽이 종료하기를 선택해서 이 매칭은 끝났어요.</p>
      <button
        type="button"
        onClick={onHome}
        className="mt-4 w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition active:opacity-90"
      >
        홈으로
      </button>
    </div>
  );
}

function DonePanel({ item }: { item: BlndReq }) {
  const rout_nav = useRouter();
  // 둘 다 "이장님에게 확인요청"을 골라 이장님 검토 없이 바로 매칭된 경우만 이 문구/버튼을
  // 보여준다 - 둘 다 "연락하기"를 고른 경우는 아래 분기로 별도 안내
  const both_rvw = item.req_actn === "rvw" && item.memb_actn === "rvw";

  if (both_rvw) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-center">
        <p className="text-sm font-bold text-emerald-700">이장님 확인 없이 바로 매칭이 시작됐어요!</p>
        <p className="mt-1 text-xs text-emerald-600">두 분 다 확인요청을 보내서 바로 연결됐어요.</p>
        <button
          type="button"
          onClick={() => rout_nav.push(`/matched/${item.link_mtc_id}`)}
          className="mt-4 w-full rounded-2xl bg-[#6C63E0] py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          매칭 화면으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-emerald-50 p-5 text-center">
      <p className="text-sm font-bold text-emerald-700">두 분 다 연락하기를 선택했어요!</p>
      <p className="mt-1 text-xs text-emerald-600">이제 직접 연락해서 좋은 만남을 이어가 보세요.</p>
      {item.link_mtc_id && (
        <button
          type="button"
          onClick={() => rout_nav.push(`/chat/${item.link_mtc_id}`)}
          className="mt-4 w-full rounded-2xl bg-[#6C63E0] py-3 text-sm font-bold text-white transition active:opacity-90"
        >
          연락하기
        </button>
      )}
    </div>
  );
}

// 10문항을 카테고리(주제)별로 묶어, 각 문항에서 신청자/대상 주민이 어느 쪽을 골랐는지
// 보여주는 팝업 - "주제별 선택 결과 보기" 버튼으로 연다
function PicksModal({ item, onClose }: { item: BlndReq; onClose: () => void }) {
  const req_picks = item.req_picks ?? [];
  const memb_picks = item.memb_picks ?? [];

  const rows = item.card_ids
    .map((q_id, idx) => ({
      q_id,
      question: find_question(q_id),
      req_pick: req_picks[idx] as BlndPick | undefined,
      memb_pick: memb_picks[idx] as BlndPick | undefined,
    }))
    .filter((r_item): r_item is typeof r_item & { question: BlndQuestion } => !!r_item.question);

  const grouped = (Object.keys(BLND_CATEG_LBL) as BlndCateg[])
    .map((categ) => ({ categ, rows: rows.filter((r_item) => r_item.question.categ === categ) }))
    .filter((g_item) => g_item.rows.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85dvh] w-full max-w-sm flex-col rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-bold text-gray-900">주제별 선택 결과</p>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {grouped.map((g_item) => (
            <div key={g_item.categ}>
              <p className="mb-2 text-xs font-bold text-[#6C63E0]">{BLND_CATEG_LBL[g_item.categ]}</p>
              <div className="space-y-2">
                {g_item.rows.map((r_item) => (
                  <PickQRow
                    key={r_item.q_id}
                    req_name={item.req_name}
                    memb_name={item.memb_name}
                    question={r_item.question}
                    req_pick={r_item.req_pick}
                    memb_pick={r_item.memb_pick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PickQRow({
  req_name,
  memb_name,
  question,
  req_pick,
  memb_pick,
}: {
  req_name: string;
  memb_name: string;
  question: BlndQuestion;
  req_pick?: BlndPick;
  memb_pick?: BlndPick;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-3">
      <PickOption
        label={question.a_label}
        names={[req_pick === "a" ? req_name : null, memb_pick === "a" ? memb_name : null]}
      />
      <p className="my-1 text-center text-[10px] font-bold text-gray-300">VS</p>
      <PickOption
        label={question.b_label}
        names={[req_pick === "b" ? req_name : null, memb_pick === "b" ? memb_name : null]}
      />
    </div>
  );
}

function PickOption({ label, names }: { label: string; names: (string | null)[] }) {
  const picked_by = names.filter((n_val): n_val is string => !!n_val);
  const active = picked_by.length > 0;

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
        active ? "bg-[#F1F0FD]" : ""
      }`}
    >
      <span className={`text-xs leading-snug ${active ? "font-bold text-gray-900" : "text-gray-400"}`}>
        {label}
      </span>
      {active && (
        <span className="shrink-0 text-[10px] font-bold text-[#6C63E0]">{picked_by.join(", ")}</span>
      )}
    </div>
  );
}
