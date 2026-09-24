"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, Phone, ShieldCheck, Users } from "lucide-react";
import { toss_lgin } from "@/lib/auth/toss_auth";
import { sess_stat, stat_path } from "@/lib/store/auth_store";

export default function LoginScreen() {
  const rout_nav = useRouter();
  const [busy_flag, setBusyFlag] = useState(false);
  const [note_msg, setNoteMsg] = useState("");

  // 이미 로그인돼 있으면 세션 상태에 맞는 화면으로 보낸다.
  // 다른 화면들은 "프로필 없음"도 미로그인으로 보고 /login 으로 돌려보내는데,
  // 그 유저를 여기서 온보딩(/onbd)으로 이어준다.
  useEffect(() => {
    (async () => {
      const stat_val = await sess_stat();
      if (stat_val !== "none") rout_nav.replace(stat_path(stat_val));
    })();
  }, [rout_nav]);

  async function do_toss() {
    if (busy_flag) return;
    setNoteMsg("");
    setBusyFlag(true);
    const { ok_flag, err_msg } = await toss_lgin();
    if (!ok_flag) {
      setNoteMsg(err_msg ?? "로그인에 실패했어요. 다시 시도해주세요.");
      setBusyFlag(false);
      return;
    }
    // 가입 직후라면 프로필이 없으므로 온보딩으로, 기존 유저면 홈으로 간다
    rout_nav.replace(stat_path(await sess_stat()));
  }

  function do_phon() {
    rout_nav.push("/login/local");
  }

  return (
    <main className="flex h-dvh w-full flex-col bg-white px-6 pb-8 pt-5">
      <button
        type="button"
        onClick={() => rout_nav.back()}
        aria-label="뒤로가기"
        className="flex h-9 w-9 items-center justify-center text-gray-400"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <section className="mt-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F26B12]">주변</h1>
        </div>

        <p className="mt-6 text-xl font-bold leading-snug text-gray-900">
          내 주변의 사람들과
          <br />
          <span className="text-[#F26B12]">신뢰</span>로 연결되는 시작
        </p>
        <p className="mt-2 text-sm text-gray-400">실명 인증으로 안전하게 이용하세요</p>
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <button
          type="button"
          onClick={do_phon}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#F26B12] py-4 text-[15px] font-semibold text-white transition active:opacity-90"
        >
          <Phone className="h-5 w-5" strokeWidth={2} />
          휴대폰 번호로 시작하기
        </button>

        <button
          type="button"
          disabled={busy_flag}
          onClick={do_toss}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#0064FF] py-4 text-[15px] font-semibold text-white transition active:opacity-90 disabled:opacity-60"
        >
          <TossIcon className="h-5 w-5" />
          {busy_flag ? "연결하는 중..." : "토스로 시작하기"}
        </button>
      </section>

      <p
        className={`mt-3 text-center text-xs text-[#F26B12] transition-opacity ${
          note_msg ? "opacity-100" : "opacity-0"
        }`}
        role="status"
      >
        {note_msg || " "}
      </p>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-400">
        로그인 시, 서비스 이용약관 및 개인정보 처리방침에
        <br />
        동의하는 것으로 간주합니다.
      </p>

      <section className="mt-auto grid grid-cols-3 gap-2 rounded-2xl bg-[#FFF3E9] px-3 py-4">
        <FeatItem icon={<ShieldCheck className="h-5 w-5 text-[#F26B12]" />} lbl_txt="실명제 기반 신뢰 보장" />
        <FeatItem icon={<Users className="h-5 w-5 text-[#F26B12]" />} lbl_txt="내 주변 사람만 안전하게 연결" />
        <FeatItem icon={<Lock className="h-5 w-5 text-[#F26B12]" />} lbl_txt="개인정보 안심 보호" />
      </section>
    </main>
  );
}

function FeatItem({ icon, lbl_txt }: { icon: React.ReactNode; lbl_txt: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      {icon}
      <span className="text-[10px] leading-tight text-gray-500">{lbl_txt}</span>
    </div>
  );
}

function TossIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.18" />
      <path
        d="M7 12.2c1.8 2.3 3.3 3.5 4.3 3.5.9 0 1.9-1.1 3.2-3.4"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M8.2 9.6c1.1-1.5 2.4-2.3 3.8-2.3s2.6.8 3.8 2.3"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
