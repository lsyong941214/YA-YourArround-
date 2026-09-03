"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Home, Send, User, Users } from "lucide-react";
import { curr_user } from "@/lib/store/auth_store";
import { memb_prop_cnt, sent_prog_cnt as matc_sent_prog_cnt } from "@/lib/store/matc_store";
import { memb_pend_cnt, sent_prog_cnt as blnd_sent_prog_cnt } from "@/lib/store/blnd_store";

// 로그인 이후 화면(홈/매칭/연락처/마이페이지 등)에 공통으로 고정 노출되는 하단 탭바
export default function BottomTabBar() {
  const rout_nav = useRouter();
  const path_now = usePathname();
  const [sign_in, setSignIn] = useState(false);
  const [prop_val, setPropVal] = useState(0);
  const [sent_prog_val, setSentProgVal] = useState(0);

  useEffect(() => {
    (async () => {
      const user_now = await curr_user();
      if (!user_now) {
        setSignIn(false);
        return;
      }
      setSignIn(true);
      const [prop_cnt, blnd_pend_cnt, matc_sent_cnt, blnd_sent_cnt] = await Promise.all([
        memb_prop_cnt(user_now.user_id),
        memb_pend_cnt(user_now.user_id),
        matc_sent_prog_cnt(user_now.user_id),
        blnd_sent_prog_cnt(user_now.user_id),
      ]);
      setPropVal(prop_cnt + blnd_pend_cnt);
      setSentProgVal(matc_sent_cnt + blnd_sent_cnt);
    })();
    // 화면을 옮길 때마다(제안 수락/거절 등으로 건수가 바뀔 수 있으므로) 다시 계산한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path_now]);

  if (!sign_in) return null;

  const matc_badge_cnt = prop_val + sent_prog_val;
  const on_home = path_now === "/home";
  const on_matc =
    path_now.startsWith("/matching") || path_now.startsWith("/sent") || path_now.startsWith("/proposal");
  const on_mypage = path_now.startsWith("/mypage");

  function go_home() {
    rout_nav.push("/home");
  }

  function go_sent() {
    rout_nav.push("/sent");
  }

  function go_prop() {
    rout_nav.push("/proposal");
  }

  function go_mypage() {
    rout_nav.push("/mypage");
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-gray-100 bg-white py-2">
      <TabItem icon={<Home className="h-5 w-5" />} lbl_txt="홈" actv={on_home} onTap={go_home} />
      <TabItem
        icon={<Heart className="h-5 w-5" fill={matc_badge_cnt > 0 ? "currentColor" : "none"} />}
        lbl_txt="매칭"
        actv={on_matc}
        badge_cnt={matc_badge_cnt}
        onBadge={prop_val > 0 ? go_prop : go_sent}
        onTap={go_sent}
      />
      <TabItem icon={<Users className="h-5 w-5" />} lbl_txt="마을" />
      <TabItem icon={<Send className="h-5 w-5" />} lbl_txt="메시지" />
      <TabItem icon={<User className="h-5 w-5" />} lbl_txt="마이페이지" actv={on_mypage} onTap={go_mypage} />
    </nav>
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
