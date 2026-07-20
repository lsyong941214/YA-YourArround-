"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Crown, Heart, Users } from "lucide-react";
import { AuthUser, curr_user, find_user } from "@/lib/store/auth_store";
import { list_chf_of, list_res_of } from "@/lib/store/cntc_store";
import { has_req } from "@/lib/store/matc_store";

const NAV_DELAY = 250;

export default function CntcDetail({ uid }: { uid: string }) {
  const rout_nav = useRouter();
  const [user_item, setUserItem] = useState<AuthUser | null | undefined>(undefined);
  const [link_list, setLinkList] = useState<AuthUser[]>([]);
  const [liked_set, setLikedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const found = find_user(uid) ?? null;
    setUserItem(found);
    if (found) {
      const me_uid = curr_user()?.user_id;
      const raw_list = found.user_role === "chief" ? list_res_of(found.user_id) : list_chf_of(found.user_id);
      const next_list = raw_list.filter((l_item) => l_item.user_id !== me_uid);
      setLinkList(next_list);
      if (found.user_role === "chief") {
        const next_set = new Set<string>();
        next_list.forEach((r_item) => {
          if (has_req(found.user_id, r_item.user_id)) next_set.add(r_item.user_id);
        });
        setLikedSet(next_set);
      }
    }
  }, [uid]);

  function do_hert(memb_id: string) {
    if (!user_item) return;
    setLikedSet((prev_set) => new Set(prev_set).add(memb_id));
    setTimeout(() => {
      rout_nav.push(`/chief/${user_item.user_id}/request/${memb_id}`);
    }, NAV_DELAY);
  }

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
                {user_item.user_role === "chief" && (
                  <button
                    type="button"
                    onClick={() => do_hert(l_item.user_id)}
                    aria-label={`${l_item.user_name}님과 연결 요청`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:opacity-80 ${
                      liked_set.has(l_item.user_id)
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-gray-200 text-gray-300"
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={liked_set.has(l_item.user_id) ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
