"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Users, Sparkles } from "lucide-react";
import { init_app, InitProg } from "@/lib/init/sess_init";

// 다음 화면 경로 (2번째 페이지: 로그인)
const NEXT_PATH = "/login";

export default function LoadingScreen() {
  const rout_nav = useRouter();
  const [prog_st, setProgSt] = useState<InitProg>({
    step_idx: 0,
    step_list: [],
    done_flag: false,
  });

  useEffect(() => {
    let live_flag = true;

    // 초기화는 백그라운드에서 계속 진행하되, 완료돼도 자동으로는 넘어가지 않는다.
    // 화면 전환은 사용자가 아무 곳이나 탭했을 때(go_next)만 일어난다.
    init_app((prog_val) => {
      if (live_flag) setProgSt(prog_val);
    });

    return () => {
      live_flag = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go_next() {
    rout_nav.replace(NEXT_PATH);
  }

  function on_key(ev_key: React.KeyboardEvent) {
    if (ev_key.key === "Enter" || ev_key.key === " ") {
      ev_key.preventDefault();
      go_next();
    }
  }

  const dot_cnt = 4;

  return (
    <main
      role="button"
      tabIndex={0}
      aria-label="탭하여 계속하기"
      onClick={go_next}
      onKeyDown={on_key}
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-gradient-to-b from-[#FF9D5C] via-[#FB8A3C] to-[#F26B12] cursor-pointer select-none"
    >
      {/* 상단 로고 영역 */}
      <section className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex items-center gap-1">
          <h1 className="text-5xl font-extrabold tracking-tight text-white">주변</h1>
        </div>

        <p className="mt-6 text-lg font-medium leading-relaxed text-white/95">
          내 주변의 사람들과
          <br />더 가까워지는 시작
        </p>
        <p className="mt-2 text-sm text-white/75">함께 만드는 우리만의 커뮤니티</p>

        {/* 사람 실루엣 일러스트 (경량 SVG) */}
        <svg
          viewBox="0 0 320 160"
          className="mt-10 w-full max-w-xs"
          aria-hidden="true"
        >
          {[
            { cx_val: 40, tone: "#FFD9B3" },
            { cx_val: 120, tone: "#FFE7CC" },
            { cx_val: 200, tone: "#FFCFA0" },
            { cx_val: 280, tone: "#FFE1BE" },
          ].map((p_item) => (
            <g key={p_item.cx_val}>
              <circle cx={p_item.cx_val} cy="55" r="22" fill={p_item.tone} />
              <rect
                x={p_item.cx_val - 26}
                y="80"
                width="52"
                height="70"
                rx="20"
                fill={p_item.tone}
                opacity="0.9"
              />
            </g>
          ))}
        </svg>
      </section>

      {/* 하단 특징 아이콘 + 초기화 진행 도트 */}
      <section className="flex flex-col items-center gap-6 pb-10">
        <div className="flex w-full justify-center gap-10 text-white/90">
          <FeatItem icon={<ShieldCheck className="h-6 w-6" />} lbl_txt="신뢰 기반 연결" />
          <FeatItem icon={<Users className="h-6 w-6" />} lbl_txt="다양한 모임과 활동" />
          <FeatItem icon={<Sparkles className="h-6 w-6" />} lbl_txt="소중한 인연의 시작" />
        </div>

        {/* 초기화 단계 도트: 완료된 단계만큼 채워짐 */}
        <div className="flex gap-2" role="status" aria-label="초기화 진행 상태">
          {Array.from({ length: dot_cnt }).map((_, dot_idx) => (
            <span
              key={dot_idx}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                dot_idx < prog_st.step_idx
                  ? "w-5 bg-white"
                  : "bg-white/40"
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-white/70">
          {prog_st.done_flag
            ? "준비가 끝났어요"
            : prog_st.step_list[prog_st.step_idx]?.step_lbl ?? "시작하는 중..."}
        </p>
        <p className="text-[11px] font-medium text-white/85">화면을 탭하면 시작해요</p>
      </section>
    </main>
  );
}

function FeatItem({ icon, lbl_txt }: { icon: React.ReactNode; lbl_txt: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {icon}
      <span className="max-w-[70px] text-[11px] leading-tight text-white/80">{lbl_txt}</span>
    </div>
  );
}
