"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Crown, Users } from "lucide-react";
import { AuthUser, curr_user, find_user } from "@/lib/store/auth_store";
import { list_chf_of, list_res_of } from "@/lib/store/cntc_store";
import { has_req } from "@/lib/store/matc_store";
import ProfileViewModal, { auth_to_prof } from "@/components/profile/ProfileViewModal";
import AvatarCircle from "@/components/common/AvatarCircle";

const NAV_DELAY = 250;

export default function CntcDetail({ uid }: { uid: string }) {
  const rout_nav = useRouter();
  const [user_item, setUserItem] = useState<AuthUser | null | undefined>(undefined);
  const [link_list, setLinkList] = useState<AuthUser[]>([]);
  const [liked_set, setLikedSet] = useState<Set<string>>(new Set());
  const [prof_item, setProfItem] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const found = (await find_user(uid)) ?? null;
      setUserItem(found);
      if (found) {
        const [me_now, raw_list] = await Promise.all([
          curr_user(),
          found.user_role === "chief" ? list_res_of(found.user_id) : list_chf_of(found.user_id),
        ]);
        const next_list = raw_list.filter((l_item) => l_item.user_id !== me_now?.user_id);
        setLinkList(next_list);
        if (found.user_role === "chief") {
          const hit_list = await Promise.all(
            next_list.map((r_item) => has_req(found.user_id, r_item.user_id))
          );
          const next_set = new Set<string>();
          next_list.forEach((r_item, idx_val) => {
            if (hit_list[idx_val]) next_set.add(r_item.user_id);
          });
          setLikedSet(next_set);
        }
      }
    })();
  }, [uid]);

  function do_hert(memb_id: string) {
    if (!user_item) return;
    setLikedSet((prev_set) => new Set(prev_set).add(memb_id));
    setTimeout(() => {
      setProfItem(null);
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

      <button
        type="button"
        onClick={() => setProfItem(user_item)}
        className="mx-5 mt-2 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
      >
        <AvatarCircle
          img_url={user_item.user_img}
          ini_char={user_item.ini_char}
          ton_hex={user_item.ton_hex}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
        />
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
            {user_item.user_age ? `${user_item.user_age}세 · ` : ""}
            {user_item.user_job || "-"} {user_item.user_mbti ? `· ${user_item.user_mbti}` : ""}{" "}
            {user_item.user_reg ? `· ${user_item.user_reg}` : ""}
          </p>
          {user_item.user_bio && (
            <p className="mt-0.5 truncate text-xs text-gray-500">{user_item.user_bio}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      </button>

      <section className="mt-5">
        <h2 className="px-5 text-[15px] font-bold text-gray-900">{link_lbl}</h2>
        {link_list.length === 0 ? (
          <p className="px-5 pt-3 text-xs text-gray-400">
            {user_item.user_role === "chief" ? "아직 연결된 주민이 없어요." : "아직 등록된 연락처가 없어요."}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3 px-5">
            {link_list.map((l_item) => (
              <button
                key={l_item.user_id}
                type="button"
                onClick={() => setProfItem(l_item)}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
              >
                <AvatarCircle
                  img_url={l_item.user_img}
                  ini_char={l_item.ini_char}
                  ton_hex={l_item.ton_hex}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {l_item.user_name}
                    {l_item.user_mbti ? (
                      <span className="font-normal text-gray-400"> {l_item.user_mbti}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {[l_item.user_age ? `${l_item.user_age}세` : null, l_item.user_reg]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {l_item.user_bio && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{l_item.user_bio}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        )}
      </section>

      {prof_item &&
        (() => {
          const hertable =
            user_item.user_role === "chief" &&
            link_list.some((l_item) => l_item.user_id === prof_item.user_id);
          return (
            <ProfileViewModal
              prof_item={auth_to_prof(prof_item)}
              onClose={() => setProfItem(null)}
              onHeart={hertable ? () => do_hert(prof_item.user_id) : undefined}
              liked={liked_set.has(prof_item.user_id)}
            />
          );
        })()}
    </main>
  );
}
