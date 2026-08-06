"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Crown, Users } from "lucide-react";
import { AuthUser, curr_user } from "@/lib/store/auth_store";
import { list_chf_of, list_res_of } from "@/lib/store/cntc_store";

export default function ChiefListScreen() {
  const rout_nav = useRouter();
  const [is_chief, setIsChief] = useState(false);
  const [cntc_list, setCntcList] = useState<AuthUser[]>([]);

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      if (!user_now) return;
      const chf_role = user_now.user_role === "chief";
      setIsChief(chf_role);
      setCntcList(await (chf_role ? list_res_of(user_now.user_id) : list_chf_of(user_now.user_id)));
    })();
  }, []);

  function go_uid(uid_val: string) {
    rout_nav.push(`/cntc/${uid_val}`);
  }

  const ttl_txt = is_chief ? "연결된 주민" : "이장님 연락처";
  const desc_txt = is_chief
    ? "나와 연결된 주민 목록이에요."
    : "저장된 이장님 연락처예요.";
  const empt_txt = is_chief ? "아직 연결된 주민이 없어요." : "아직 등록된 연락처가 없어요.";

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-8">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">{ttl_txt}</h1>
      </header>

      <p className="px-5 pb-3 text-xs text-gray-400">{desc_txt}</p>

      {cntc_list.length === 0 ? (
        <p className="px-5 pt-10 text-center text-sm text-gray-400">{empt_txt}</p>
      ) : (
        <div className="flex flex-col gap-3 px-5">
          {cntc_list.map((u_item) => (
            <button
              key={u_item.user_id}
              type="button"
              onClick={() => go_uid(u_item.user_id)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ backgroundColor: u_item.ton_hex }}
              >
                {u_item.ini_char}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-gray-900">{u_item.user_name}</p>
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#FFF3E9] px-1.5 py-0.5 text-[10px] font-bold text-[#F26B12]">
                    {u_item.user_role === "chief" ? (
                      <Crown className="h-2.5 w-2.5" />
                    ) : (
                      <Users className="h-2.5 w-2.5" />
                    )}
                    {u_item.user_role === "chief" ? "이장님" : "주민"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {u_item.user_bio || `${u_item.user_job || "-"} ${u_item.user_mbti ? `· ${u_item.user_mbti}` : ""}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
