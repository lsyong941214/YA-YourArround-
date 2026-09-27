"use client";

/**
 * GuideScreen.tsx
 * 주변 가이드 - 홈 화면 "가이드 투어"에서 들어오는 이용 방법 안내.
 * 역할(주민/이장님)에 따라 실제로 쓰는 화면 흐름이 달라서 탭으로 나눠 단계별 카드로 보여준다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Coins,
  Gift,
  Heart,
  LucideIcon,
  MessageCircle,
  Send,
  Store,
  Ticket,
  Users,
} from "lucide-react";

type GuideTab = "res" | "chief";

type StepItem = {
  icon: LucideIcon;
  titl_txt: string;
  desc_txt: string;
};

const RES_STEPS: StepItem[] = [
  { icon: Ticket, titl_txt: "초대코드 입력", desc_txt: "이장님에게 받은 초대코드를 입력하면 연락처로 연결돼요." },
  { icon: Send, titl_txt: "매칭 신청 보내기", desc_txt: "연결된 이장님께 소개해달라고 매칭을 신청해요." },
  { icon: Users, titl_txt: "이장님의 소개", desc_txt: "이장님이 어울릴 것 같은 이웃을 골라 제안해요." },
  { icon: MessageCircle, titl_txt: "수락하면 채팅 시작", desc_txt: "상대가 수락하면 바로 채팅으로 대화를 시작할 수 있어요." },
  { icon: Gift, titl_txt: "매칭 완료 후 감사 크레딧", desc_txt: "좋은 인연이 됐다면 이장님께 크레딧으로 마음을 표현해요." },
];

const CHIEF_STEPS: StepItem[] = [
  { icon: Ticket, titl_txt: "주민 초대하기", desc_txt: "초대코드를 발급해서 지인을 주변으로 초대해요." },
  { icon: Users, titl_txt: "연결된 주민 관리", desc_txt: "연결된 주민들의 프로필과 신청 현황을 확인해요." },
  { icon: Heart, titl_txt: "매칭 제안하기", desc_txt: "잘 맞을 것 같은 두 주민을 골라 매칭을 이어줘요." },
  { icon: Coins, titl_txt: "매칭 완료 & 크레딧 받기", desc_txt: "매칭이 성사되면 주민에게 감사 크레딧을 받을 수 있어요." },
  { icon: Store, titl_txt: "가게 홍보 등록 (가게 운영 시)", desc_txt: "마이페이지에서 내 가게를 등록하고 심사를 받으면 홈 화면에 노출돼요." },
];

export default function GuideScreen() {
  const rout_nav = useRouter();
  const [tab_val, setTabVal] = useState<GuideTab>("res");

  const step_list = tab_val === "res" ? RES_STEPS : CHIEF_STEPS;

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-10">
      <header className="flex items-center gap-2 px-3 pb-1 pt-6">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-400"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">주변 가이드</h1>
      </header>

      <section className="mx-5 mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setTabVal("res")}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${
            tab_val === "res" ? "bg-[#F26B12] text-white" : "text-gray-400"
          }`}
        >
          주민
        </button>
        <button
          type="button"
          onClick={() => setTabVal("chief")}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${
            tab_val === "chief" ? "bg-[#F26B12] text-white" : "text-gray-400"
          }`}
        >
          이장님
        </button>
      </section>

      <section className="mx-5 mt-5 flex flex-col gap-3">
        {step_list.map((step_it, idx_val) => {
          const StepIcon = step_it.icon;
          return (
            <div key={step_it.titl_txt} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE9D6] text-[#F26B12]">
                  <StepIcon className="h-5 w-5" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F26B12] text-[10px] font-bold text-white">
                  {idx_val + 1}
                </span>
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-[15px] font-bold text-gray-900">{step_it.titl_txt}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{step_it.desc_txt}</p>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
