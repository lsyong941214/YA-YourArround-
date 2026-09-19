"use client";

/**
 * SuspScreen.tsx
 * 계정 정지(susp)/영구 차단(ban) 안내 화면
 * - sess_stat() === "susp"인 유저가 로그인 직후 여기로 보내진다 (auth_store.stat_path)
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { curr_user_any, do_logout, stat_path } from "@/lib/store/auth_store";

export default function SuspScreen() {
  const rout_nav = useRouter();
  const [acct_stat, setAcctStat] = useState<"susp" | "ban" | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const user_now = await curr_user_any();
      if (!user_now) {
        rout_nav.replace("/login");
        return;
      }
      // 이미 정상(actv)으로 풀렸다면 여기 있을 이유가 없다
      if (user_now.acct_stat === "actv") {
        rout_nav.replace(stat_path("done"));
        return;
      }
      setAcctStat(user_now.acct_stat);
    })();
  }, [rout_nav]);

  async function do_signout() {
    await do_logout();
    rout_nav.replace("/login");
  }

  if (acct_stat === undefined) {
    return <main className="min-h-dvh w-full bg-white" />;
  }

  const is_ban = acct_stat === "ban";

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <ShieldAlert className="h-12 w-12 text-red-400" />
      <h1 className="text-lg font-bold text-gray-900">
        {is_ban ? "이용이 영구적으로 제한된 계정이에요" : "이용이 일시적으로 정지된 계정이에요"}
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-gray-500">
        {is_ban
          ? "반복된 신고 등 이용 규칙 위반이 확인되어 서비스를 더 이상 이용할 수 없어요."
          : "신고가 누적되어 검토가 끝날 때까지 서비스 이용이 제한돼요. 검토 결과에 따라 정지가 풀릴 수 있어요."}
      </p>
      <button
        type="button"
        onClick={do_signout}
        className="mt-4 rounded-2xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition active:opacity-90"
      >
        로그아웃
      </button>
    </main>
  );
}
