"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Crown, Heart, Home, Pencil, Send, User, Users } from "lucide-react";
import { MEMB_LIST } from "@/lib/data/memb_data";
import { jang_pend_cnt, memb_prop_cnt } from "@/lib/store/matc_store";
import { memb_pend_cnt } from "@/lib/store/blnd_store";
import { AuthRole, AuthUser, curr_user, updt_curr } from "@/lib/store/auth_store";
import ProfEditModal from "./ProfEditModal";

const CHIEF_CNT = 8;
const INTRO_CNT = 12;
const RES_MATC = "3/5회";

export default function HomeScreen() {
  const rout_nav = useRouter();

  const [me_item, setMeItem] = useState<AuthUser | null | undefined>(undefined);
  const [user_role, setUserRole] = useState<AuthRole>("res");
  const [edit_open, setEditOpen] = useState(false);
  const [pend_val, setPendVal] = useState(0);
  const [prop_val, setPropVal] = useState(0);

  useEffect(() => {
    const user_now = curr_user();
    if (!user_now) {
      rout_nav.replace("/login");
      return;
    }
    setMeItem(user_now);
    setUserRole(user_now.user_role);
    setPendVal(user_now.jang_id ? jang_pend_cnt(user_now.jang_id) : 0);
    setPropVal(
      (user_now.memb_id ? memb_prop_cnt(user_now.memb_id) : 0) +
        (user_now.memb_id ? memb_pend_cnt(user_now.memb_id) : 0)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (me_item === undefined) {
    return <main className="h-dvh w-full bg-[#FFF8F3]" />;
  }

  if (!me_item) {
    return null;
  }

  function do_togl_role() {
    const next_role = user_role === "res" ? "chief" : "res";
    setUserRole(next_role);
    updt_curr({ user_role: next_role });
  }

  function go_memb(memb_id: string) {
    rout_nav.push(`/resident/${memb_id}`);
  }

  function go_matc() {
    if (user_role === "chief") {
      rout_nav.push("/matching");
    } else {
      rout_nav.push("/sent");
    }
  }

  function go_prop() {
    rout_nav.push("/proposal");
  }

  function go_mypage() {
    rout_nav.push("/mypage");
  }

  const role_lbl = user_role === "res" ? "주민" : "이장님";
  const matc_lbl = user_role === "res" ? "남은 매칭 시도" : "진행중인 매칭";
  const matc_val = user_role === "res" ? RES_MATC : `${pend_val}건`;
  const bell_dot = (user_role === "chief" && pend_val > 0) || prop_val > 0;

  return (
    <main className="min-h-dvh w-full bg-[#FFF8F3] pb-24">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#F26B12]">주변</h1>
        <div className="flex items-center gap-3">
          <button type="button" onClick={go_prop} aria-label="알림" className="relative">
            <Bell className="h-5 w-5 text-gray-500" />
            {bell_dot && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />}
          </button>
          <span className="flex items-center gap-1 rounded-full bg-[#FFE9D6] py-1 pl-1 pr-3 text-sm font-bold text-[#F26B12]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F26B12] text-[9px] text-white">
              P
            </span>
            12,450
          </span>
        </div>
      </header>

      {/* 프로필 카드 */}
      <section className="mx-5 mt-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FF9D5C] to-[#F26B12] p-4 text-white shadow-sm">
        <div className="relative shrink-0">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/25">
            {me_item.user_img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me_item.user_img} alt="프로필 사진" className="h-full w-full object-cover" />
            ) : (
              <FoxIcon className="h-9 w-9" />
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="프로필 수정"
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#F26B12] bg-white text-[#F26B12]"
          >
            <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">안녕하세요, {me_item.user_name}님! 👋</p>
          <p className="mt-0.5 truncate text-xs text-white/85">
            {me_item.user_bio || "오늘도 좋은 인연을 만들어보세요."}
          </p>
        </div>
      </section>

      {/* 내 역할 / 이장님 연락처 카드 */}
      <section className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <button type="button" onClick={do_togl_role} className="w-full text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">내 역할</span>
              {user_role === "res" ? (
                <Users className="h-5 w-5 text-[#F26B12]" />
              ) : (
                <Crown className="h-5 w-5 text-[#F26B12]" />
              )}
            </div>
            <p className="mt-1 text-lg font-extrabold text-gray-900">{role_lbl}</p>
          </button>
          <button
            type="button"
            onClick={go_matc}
            className="mt-3 w-full border-t border-gray-100 pt-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                {matc_lbl}
                {user_role === "chief" && pend_val > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {pend_val}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
            <p className="text-base font-bold text-gray-900">{matc_val}</p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => rout_nav.push("/chief")}
          className="rounded-2xl bg-white p-4 text-left shadow-sm transition active:opacity-90"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">이장님 연락처</span>
            <Users className="h-5 w-5 text-[#F26B12]" />
          </div>
          <p className="mt-1 text-lg font-extrabold text-gray-900">{CHIEF_CNT}명</p>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-400">새로운 주민 소개</span>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
          <p className="text-base font-bold text-gray-900">{INTRO_CNT}명</p>
        </button>
      </section>

      {/* 가이드 투어 */}
      <section className="mx-5 mt-3 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-900">주변 가이드 투어</p>
          <p className="mt-1 text-xs text-gray-400">서비스 이용 방법을 한눈에 확인해보세요!</p>
          <button
            type="button"
            className="mt-3 rounded-xl bg-[#F26B12] px-4 py-2 text-xs font-bold text-white transition active:opacity-90"
          >
            가이드 보기
          </button>
        </div>
        <FoxReadIcon className="h-16 w-16 shrink-0" />
      </section>

      {/* 이장님 추천 주민 */}
      <section className="mt-5">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-[15px] font-bold text-gray-900">이장님 추천 주민</h2>
          <span className="text-xs text-gray-400">더보기 &gt;</span>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {MEMB_LIST.map((m_item) => (
            <button
              key={m_item.memb_id}
              type="button"
              onClick={() => go_memb(m_item.memb_id)}
              className="w-32 shrink-0 rounded-2xl bg-white p-3 text-left shadow-sm transition active:opacity-90"
            >
              <div
                className="relative flex h-24 w-full items-center justify-center rounded-xl text-2xl font-bold text-white"
                style={{ backgroundColor: m_item.ton_hex }}
              >
                {m_item.ini_char}
                <Heart className="absolute right-1.5 top-1.5 h-4 w-4 text-white/90" strokeWidth={2} />
              </div>
              <p className="mt-2 text-sm font-bold text-gray-900">
                {m_item.memb_name}, {m_item.memb_age}
              </p>
              <p className="text-[11px] text-gray-400">
                {m_item.memb_job} · {m_item.memb_mbti}
              </p>
              <p className="mt-1 truncate text-[10px] text-[#F26B12]">{m_item.tag_list.join(" ")}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 하단 탭바 (추후 개발) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-gray-100 bg-white py-2">
        <TabItem icon={<Home className="h-5 w-5" />} lbl_txt="홈" actv />
        <TabItem icon={<Heart className="h-5 w-5" />} lbl_txt="매칭" badge_cnt={prop_val} onBadge={go_prop} />
        <TabItem icon={<Users className="h-5 w-5" />} lbl_txt="마을" />
        <TabItem icon={<Send className="h-5 w-5" />} lbl_txt="메시지" />
        <TabItem icon={<User className="h-5 w-5" />} lbl_txt="마이페이지" onTap={go_mypage} />
      </nav>

      {edit_open && (
        <ProfEditModal
          init_img={me_item.user_img}
          init_bio={me_item.user_bio}
          onClose={() => setEditOpen(false)}
          onSave={(next_img, next_bio) => {
            updt_curr({ user_img: next_img, user_bio: next_bio });
            setMeItem((prev_item) => (prev_item ? { ...prev_item, user_img: next_img, user_bio: next_bio } : prev_item));
            setEditOpen(false);
          }}
        />
      )}
    </main>
  );
}

function TabItem({
  icon,
  lbl_txt,
  actv,
  badge_cnt,
  onBadge,
  onTap,
}: {
  icon: React.ReactNode;
  lbl_txt: string;
  actv?: boolean;
  badge_cnt?: number;
  onBadge?: () => void;
  onTap?: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center gap-1 px-2 py-1">
      <button
        type="button"
        onClick={onTap}
        className={`flex flex-col items-center gap-1 ${actv ? "text-[#F26B12]" : "text-gray-300"}`}
      >
        {icon}
        <span className={`text-[10px] ${actv ? "font-bold text-[#F26B12]" : "text-gray-400"}`}>
          {lbl_txt}
        </span>
      </button>
      {!!badge_cnt && badge_cnt > 0 && (
        <button
          type="button"
          onClick={onBadge}
          aria-label={`새로운 제안 ${badge_cnt}건 확인하기`}
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
        >
          {badge_cnt}
        </button>
      )}
    </div>
  );
}

function FoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M8 6 L15 16 L10 16 Z" fill="#FFB37C" />
      <path d="M32 6 L25 16 L30 16 Z" fill="#FFB37C" />
      <circle cx="20" cy="22" r="14" fill="#FFF3E9" />
      <circle cx="15" cy="21" r="1.6" fill="#3A2A20" />
      <circle cx="25" cy="21" r="1.6" fill="#3A2A20" />
      <path d="M20 25 L17 28 L23 28 Z" fill="#F26B12" />
    </svg>
  );
}

function FoxReadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <circle cx="40" cy="40" r="38" fill="#FFF3E9" />
      <path d="M22 20 L30 32 L24 32 Z" fill="#FFB37C" />
      <path d="M58 20 L50 32 L56 32 Z" fill="#FFB37C" />
      <circle cx="40" cy="40" r="18" fill="#FFDCB8" />
      <circle cx="34" cy="39" r="2" fill="#3A2A20" />
      <circle cx="46" cy="39" r="2" fill="#3A2A20" />
      <path d="M40 44 L36 48 L44 48 Z" fill="#F26B12" />
      <rect x="24" y="56" width="32" height="10" rx="2" fill="white" stroke="#F26B12" strokeWidth="1.5" />
      <line x1="30" y1="60" x2="50" y2="60" stroke="#F26B12" strokeWidth="1.2" />
      <line x1="30" y1="63" x2="44" y2="63" stroke="#F26B12" strokeWidth="1.2" />
    </svg>
  );
}
