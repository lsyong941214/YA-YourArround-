"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Pencil } from "lucide-react";
import { find_jang } from "@/lib/data/jang_data";
import { AuthUser, curr_user, do_logout, updt_curr } from "@/lib/store/auth_store";
import ProfEditModal from "@/components/home/ProfEditModal";

export default function MyPageScreen() {
  const rout_nav = useRouter();
  const [user_item, setUserItem] = useState<AuthUser | null | undefined>(undefined);
  const [edit_open, setEditOpen] = useState(false);

  useEffect(() => {
    setUserItem(curr_user());
  }, []);

  function do_out() {
    do_logout();
    rout_nav.replace("/login");
  }

  if (user_item === undefined) {
    return <main className="h-dvh w-full bg-white" />;
  }

  if (!user_item) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">로그인이 필요해요.</p>
        <button
          type="button"
          onClick={() => rout_nav.replace("/login")}
          className="text-sm font-bold text-[#F26B12]"
        >
          로그인하러 가기
        </button>
      </main>
    );
  }

  const jang_item = user_item.jang_id ? find_jang(user_item.jang_id) : undefined;

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-10">
      <header className="flex items-center gap-2 px-4 pb-2 pt-5">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-gray-900">마이페이지</h1>
      </header>

      <section className="mx-5 mt-2 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFE9D6] text-xl font-bold text-[#F26B12]">
          {user_item.user_img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user_item.user_img} alt="프로필 사진" className="h-full w-full object-cover" />
          ) : (
            user_item.ini_char
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-gray-900">{user_item.user_name}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {user_item.user_role === "chief" ? "이장님" : "주민"}
            {jang_item ? ` · ${jang_item.jang_name}` : ""}
          </p>
          {user_item.user_bio && (
            <p className="mt-1 truncate text-xs text-gray-500">{user_item.user_bio}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label="프로필 수정"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF3E9] text-[#F26B12]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </section>

      <section className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">나이</p>
          <p className="mt-1 text-sm font-bold text-gray-900">
            {user_item.user_age ? `${user_item.user_age}세` : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">직업</p>
          <p className="mt-1 text-sm font-bold text-gray-900">{user_item.user_job || "-"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">MBTI</p>
          <p className="mt-1 text-sm font-bold text-gray-900">{user_item.user_mbti || "-"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">지역</p>
          <p className="mt-1 text-sm font-bold text-gray-900">{user_item.user_reg || "-"}</p>
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs text-gray-400">사진첩 앨범</p>
        {user_item.phot_list.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">등록된 사진이 없어요. 프로필 수정에서 추가해보세요.</p>
        ) : (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {user_item.phot_list.map((phot_url, p_idx) => (
              <div key={phot_url + p_idx} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={phot_url} alt="앨범 사진" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-5 mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => rout_nav.push("/login/local")}
          className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
        >
          <span className="text-sm font-bold text-gray-900">다른 계정으로 전환 / 계정 만들기</span>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>

        <button
          type="button"
          onClick={do_out}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </section>

      {edit_open && (
        <ProfEditModal
          init_user={user_item}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => {
            updt_curr(patch);
            setUserItem((prev_item) => (prev_item ? { ...prev_item, ...patch } : prev_item));
            setEditOpen(false);
          }}
        />
      )}
    </main>
  );
}
