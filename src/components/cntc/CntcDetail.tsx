"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Crown, Users } from "lucide-react";
import { AuthUser, curr_user, find_user } from "@/lib/store/auth_store";
import { list_chf_of, list_res_of } from "@/lib/store/cntc_store";

export default function CntcDetail({ uid }: { uid: string }) {
  const rout_nav = useRouter();
  const [user_item, setUserItem] = useState<AuthUser | null | undefined>(undefined);
  const [link_list, setLinkList] = useState<AuthUser[]>([]);

  useEffect(() => {
    const found = find_user(uid) ?? null;
    setUserItem(found);
    if (found) {
      const me_uid = curr_user()?.user_id;
      const raw_list = found.user_role === "chief" ? list_res_of(found.user_id) : list_chf_of(found.user_id);
      setLinkList(raw_list.filter((l_item) => l_item.user_id !== me_uid));
    }
  }, [uid]);

  if (user_item === undefined) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!user_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">존재하지 않는 연락처예요.</p>
        <button type="button" onClick={() => rout_nav.back()} className="text-sm font-bold text-[#F26B12]">
          돌아가기
        </button>
      </main>
    );
  }

  const link_lbl = user_item.user_role === "chief" ? "연결된 주민" : "저장된 이장님 연락처";

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
        <h1 className="text-base font-bold text-gray-900">연락처 정보</h1>
      </header>

      <section className="mx-5 mt-2 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: user_item.ton_hex }}
        >
          {user_item.ini_char}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-gray-900">{user_item.user_name}</p>
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#FFF3E9] px-1.5 py-0.5 text-[10px] font-bold text-[#F26B12]">
              {user_item.user_role === "chief" ? (
                <Crown className="h-2.5 w-2.5" />
              ) : (
                <Users className="h-2.5 w-2.5" />
              )}
              {user_item.user_role === "chief" ? "이장님" : "주민"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {user_item.user_bio ||
              `${user_item.user_job || "-"} ${user_item.user_mbti ? `· ${user_item.user_mbti}` : ""}`}
          </p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="px-5 text-[15px] font-bold text-gray-900">{link_lbl}</h2>
        {link_list.length === 0 ? (
          <p className="px-5 pt-3 text-xs text-gray-400">
            {user_item.user_role === "chief" ? "아직 연결된 주민이 없어요." : "아직 등록된 연락처가 없어요."}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3 px-5">
            {link_list.map((l_item) => (
              <div
                key={l_item.user_id}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: l_item.ton_hex }}
                >
                  {l_item.ini_char}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{l_item.user_name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {l_item.user_job || "-"} {l_item.user_mbti ? `· ${l_item.user_mbti}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
