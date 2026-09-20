"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BlndReq, find_req, game_go, side_of, sub_blnd, updt_req } from "@/lib/store/blnd_store";
import { curr_user } from "@/lib/store/auth_store";
import BlndGameScreen from "./BlndGameScreen";

export default function BlndReviewScreen({ blnd_id }: { blnd_id: string }) {
  const rout_nav = useRouter();
  const [blnd_item, setBlndItem] = useState<BlndReq | undefined | null>(null);

  const [my_user, setMyUser] = useState<{ user_id: string } | null | undefined>(undefined);
  // 게임 화면(BlndGameScreen)에 한 번 들어갔으면, 진행 중 상대방이 종료/거절해서 상태가
  // rjct로 바뀌어도 이 화면(정적 안내)으로 되돌아오지 않고 게임 화면이 계속 떠 있게 한다 -
  // 그래야 게임 화면 쪽 "상대방이 더 이상의 진행을 원치 않는 것 같습니다" 팝업을 볼 수 있다
  const [game_ent, setGameEnt] = useState(false);

  useEffect(() => {
    find_req(blnd_id).then((found) => setBlndItem(found ?? undefined));
    curr_user().then(setMyUser);
  }, [blnd_id]);

  // 게임 화면(BlndGameScreen)으로 넘어가면 그쪽이 같은 blnd_id로 자기 realtime 구독을 새로
  // 갖는다 - 이 화면(부모)은 그 시점부터 렌더링만 위임할 뿐 그대로 마운트된 상태로 남아있어서,
  // 여기서도 계속 구독을 들고 있으면 같은 토픽(`blnd_${blnd_id}`)에 두 번째 `.on()`을
  // 호출하게 돼 supabase-js가 "cannot add postgres_changes callbacks ... after subscribe()"
  // 예외를 던지고, 처리되지 않은 채 화면이 통째로 죽는다. 그래서 게임 화면으로 넘어간 뒤에는
  // 이 화면에서 구독을 갖지 않는다(정적 안내를 보여주는 동안에만 필요)
  const show_game = game_ent || (blnd_item ? game_go(blnd_item) : false);

  // 상대방이 수락/거절하면 새로고침 없이 바로 반영한다 (카드 선택/게임 진행 이후는
  // BlndGameScreen이 자기 구독으로 처리함)
  useEffect(() => {
    if (show_game) return;
    return sub_blnd(blnd_id, () => {
      find_req(blnd_id).then((found) => {
        if (found) setBlndItem(found);
      });
    });
  }, [blnd_id, show_game]);

  useEffect(() => {
    if (blnd_item && game_go(blnd_item)) setGameEnt(true);
  }, [blnd_item]);

  async function do_acpt() {
    await updt_req(blnd_id, { stat: "acpt" });
    setBlndItem(await find_req(blnd_id));
  }

  async function do_rjct() {
    await updt_req(blnd_id, { stat: "rjct" });
    setBlndItem(await find_req(blnd_id));
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

  if (show_game) {
    const my_side = side_of(blnd_item, my_user);
    if (my_side) {
      return <BlndGameScreen blnd_id={blnd_id} item={blnd_item} side={my_side} />;
    }
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
            <p className="mt-1 text-xs text-emerald-600">두 분이 밸런스 게임으로 성향을 알아가는 중이에요.</p>
          </div>
        )}
        {blnd_item.stat === "done" && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">결과 확인이 끝났어요</p>
            <p className="mt-1 text-xs text-emerald-600">두 분이 주변인 테스트 결과를 확인하고 다음 단계로 진행했어요.</p>
          </div>
        )}
        {blnd_item.stat === "rjct" && (
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-700">거절되었거나 종료된 요청이에요</p>
          </div>
        )}
      </div>

      {blnd_item.stat === "pend" && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] space-y-2 border-t border-gray-100 bg-white px-5 pb-8 pt-4">
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
