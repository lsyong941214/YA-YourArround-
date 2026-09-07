"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Handshake } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import { get_mbti_cpat } from "@/lib/data/mbti_cpat";
import AvatarCircle from "@/components/common/AvatarCircle";
import BlndEndConfirmModal from "./BlndEndConfirmModal";
import {
  BlndActn,
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
  const [end_confirm_flag, setEndConfirmFlag] = useState(false);

  useEffect(() => {
    find_req(blnd_id).then((found) => setItem(found ?? undefined));
    curr_user().then(setMyUser);
  }, [blnd_id]);

  const my_side = item && my_user ? side_of(item, my_user) : null;
  const my_actn = item && my_side ? (my_side === "req" ? item.req_actn : item.memb_actn) : null;
  const opp_actn = item && my_side ? (my_side === "req" ? item.memb_actn : item.req_actn) : null;
  const rslt_open = !!item && item.stat === "acpt" && !!my_actn && !opp_actn;

  // 아직 결과가 확정 안 됐는데 이미 내 결정은 냈고, 상대 결정을 기다리는 중이면 주기적으로 다시 확인
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
          <AvatarCircle
            img_url={item.req_img}
            ini_char={item.req_ini}
            ton_hex={item.req_ton}
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F0FD] text-[#6C63E0]">
            <Handshake className="h-4 w-4" />
          </div>
          <AvatarCircle
            img_url={item.memb_img}
            ini_char={item.ini_char}
            ton_hex={item.ton_hex}
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          />
        </div>
        <p className="mt-3 text-sm font-bold text-gray-900">
          {item.req_name}님 &amp; {item.memb_name}님
        </p>

        <div className="mt-6 flex flex-col items-center">
          <span className="rounded-full bg-[#F1F0FD] px-3 py-1 text-xs font-bold text-[#6C63E0]">
            {TIER_TAG[tier]}
          </span>
          <p className="mt-2 text-5xl font-extrabold text-[#6C63E0]">
            {rslt_scor}
            <span className="text-lg font-bold text-gray-300">점</span>
          </p>
        </div>

        <div className="mt-6 w-full space-y-3 rounded-2xl bg-[#F8F8FC] p-4">
          <ScorRow label="MBTI 궁합" scor={mbti_scor} />
          <ScorRow label="선택지 일치도" scor={pick_scor} />
        </div>

        <p className="mt-8 text-base font-bold leading-snug text-gray-900">{BLND_TIER_MSG[tier]}</p>

        <div className="mt-8 w-full">
          {item.stat === "rjct" ? (
            <EndedPanel onHome={() => rout_nav.push("/home")} />
          ) : item.stat === "done" ? (
            <DonePanel item={item} onHome={() => rout_nav.push("/home")} />
          ) : my_actn ? (
            <WaitPanel tier={tier} />
          ) : (
            <DecisionPanel
              tier={tier}
              // 요청받은 주민(memb) 쪽만 결과에서 매칭을 종료할 수 있다 - 요청한 쪽(req)은 불가
              end_ok={my_side === "memb" && blnd_tier_end_ok(tier)}
              busy_flag={busy_flag}
              onActn={do_actn}
              onEndClick={() => setEndConfirmFlag(true)}
            />
          )}
        </div>
      </div>

      {end_confirm_flag && (
        <BlndEndConfirmModal
          busy_flag={busy_flag}
          onClose={() => setEndConfirmFlag(false)}
          onConfirm={async () => {
            setEndConfirmFlag(false);
            await do_actn("end");
          }}
        />
      )}
    </main>
  );
}

function ScorRow({ label, scor }: { label: string; scor: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gray-600">{label}</span>
        <span className="font-bold text-[#6C63E0]">{scor}점</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E3E1FA]">
        <div
          className="h-full rounded-full bg-[#6C63E0] transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, scor))}%` }}
        />
      </div>
    </div>
  );
}

function DecisionPanel({
  tier,
  end_ok,
  busy_flag,
  onActn,
  onEndClick,
}: {
  tier: BlndTier;
  end_ok: boolean;
  busy_flag: boolean;
  onActn: (actn: BlndActn) => void;
  onEndClick: () => void;
}) {
  const main_actn = blnd_tier_actn(tier);

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
          onClick={onEndClick}
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

function DonePanel({ item, onHome }: { item: BlndReq; onHome: () => void }) {
  const rout_nav = useRouter();

  if (item.link_mtc_id) {
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
