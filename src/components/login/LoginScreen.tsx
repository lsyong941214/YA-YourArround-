"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, Phone, ShieldCheck, Users } from "lucide-react";
import { soc_lgin, SocProv } from "@/lib/auth/soc_auth";
import { sess_stat, stat_path } from "@/lib/store/auth_store";

export default function LoginScreen() {
  const rout_nav = useRouter();
  const [busy_prov, setBusyProv] = useState<SocProv | null>(null);
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

  async function do_soc(prov: SocProv) {
    if (busy_prov) return;
    setNoteMsg("");
    setBusyProv(prov);
    try {
      await soc_lgin(prov);
      // 가입 직후라면 프로필이 없으므로 온보딩으로, 기존 유저면 홈으로 간다
      rout_nav.replace(stat_path(await sess_stat()));
    } catch {
      setNoteMsg("로그인에 실패했어요. 다시 시도해주세요.");
      setBusyProv(null);
    }
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
          disabled={busy_prov !== null}
          onClick={() => do_soc("kkao")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#FEE500] py-4 text-[15px] font-semibold text-[#191919] transition active:opacity-90 disabled:opacity-60"
        >
          <KkaoIcon className="h-5 w-5" />
          {busy_prov === "kkao" ? "연결하는 중..." : "카카오로 계속하기"}
        </button>

        <button
          type="button"
          disabled={busy_prov !== null}
          onClick={() => do_soc("nvr")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#03C75A] py-4 text-[15px] font-semibold text-white transition active:opacity-90 disabled:opacity-60"
        >
          <NvrIcon className="h-5 w-5" />
          {busy_prov === "nvr" ? "연결하는 중..." : "네이버로 계속하기"}
        </button>

        <button
          type="button"
          disabled={busy_prov !== null}
          onClick={() => do_soc("gogl")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-4 text-[15px] font-semibold text-gray-800 transition active:opacity-90 disabled:opacity-60"
        >
          <GoglIcon className="h-5 w-5" />
          {busy_prov === "gogl" ? "연결하는 중..." : "Google로 계속하기"}
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

function KkaoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 4C6.98 4 3 7.13 3 11c0 2.42 1.6 4.55 4.02 5.8-.18.66-.65 2.4-.75 2.77-.12.46.17.45.35.33.14-.1 2.28-1.55 3.2-2.18.38.05.77.08 1.18.08 5.02 0 9-3.13 9-7s-3.98-7-9-7Z"
        fill="#391B1B"
      />
    </svg>
  );
}

function NvrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M6 5h4.2l4.1 6.3V5H18v14h-4.2l-4.1-6.3V19H6V5Z" fill="white" />
    </svg>
  );
}

function GoglIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M23.04 12.27c0-.82-.07-1.42-.22-2.05H12.24v3.72h6.19c-.12 1.03-.8 2.58-2.31 3.62l-.02.14 3.36 2.6.23.02c2.14-1.97 3.35-4.87 3.35-8.05Z"
        fill="#4285F4"
      />
      <path
        d="M12.24 23.5c3.04 0 5.6-1 7.46-2.72l-3.56-2.76c-.95.66-2.23 1.13-3.9 1.13-2.98 0-5.5-1.97-6.4-4.7l-.13.01-3.49 2.7-.05.13c1.85 3.67 5.66 6.21 10.07 6.21Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.45c-.23-.68-.36-1.4-.36-2.15s.13-1.47.35-2.15l-.01-.14-3.53-2.74-.12.06A11.44 11.44 0 0 0 .74 12.3c0 1.87.45 3.63 1.24 5.19l3.86-3.04Z"
        fill="#FBBC05"
      />
      <path
        d="M12.24 5.45c2.12 0 3.55.91 4.37 1.67l3.19-3.11C17.83 2.24 15.28 1.1 12.24 1.1c-4.41 0-8.22 2.54-10.07 6.21l3.85 3.04c.91-2.73 3.43-4.9 6.22-4.9Z"
        fill="#EA4335"
      />
    </svg>
  );
}
