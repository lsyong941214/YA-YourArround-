"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, UserRound } from "lucide-react";
import { find_req, MatcReq } from "@/lib/store/matc_store";
import { curr_user } from "@/lib/store/auth_store";
import { ChatMsg, list_msgs, send_msg, sub_chat } from "@/lib/store/chat_store";
import AvatarCircle from "@/components/common/AvatarCircle";
import ProfileViewModal, { ProfileViewData } from "@/components/profile/ProfileViewModal";

// 상대방 프로필 정보 - 헤더 표시와 신고하기/차단하기가 뜨는 프로필 보기 팝업(ProfileViewModal)에 함께 쓴다
function partner_of(req_item: MatcReq, my_id: string): ProfileViewData | null {
  if (my_id === req_item.req_uid) {
    return {
      user_id: req_item.memb_id,
      ini_char: req_item.ini_char,
      ton_hex: req_item.ton_hex,
      img_url: req_item.memb_img,
      phot_list: req_item.memb_phts,
      user_name: req_item.memb_name,
      user_age: req_item.memb_age,
      user_job: req_item.memb_job,
      user_mbti: req_item.memb_mbti,
      user_reg: req_item.memb_reg,
      user_bio: req_item.memb_bio,
      tag_list: req_item.tag_list,
    };
  }
  if (my_id === req_item.memb_id) {
    return {
      user_id: req_item.req_uid,
      ini_char: req_item.req_ini,
      ton_hex: req_item.req_ton,
      img_url: req_item.req_img,
      phot_list: req_item.req_phts,
      user_name: req_item.req_name,
      user_age: req_item.req_age,
      user_job: req_item.req_job,
      user_mbti: req_item.req_mbti,
      user_reg: req_item.req_reg,
      user_bio: req_item.req_bio,
      tag_list: req_item.req_tags,
    };
  }
  return null;
}

function fmt_time(made_at: number): string {
  return new Date(made_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen({ req_id }: { req_id: string }) {
  const rout_nav = useRouter();
  const [req_item, setReqItem] = useState<MatcReq | undefined | null>(null);
  const [my_id, setMyId] = useState<string | null | undefined>(undefined);
  const [msg_list, setMsgList] = useState<ChatMsg[]>([]);
  const [draft_txt, setDraftTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err_msg, setErrMsg] = useState("");
  const [prof_open, setProfOpen] = useState(false);
  const bottom_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    find_req(req_id).then((found) => setReqItem(found ?? undefined));
    curr_user().then((user_now) => setMyId(user_now?.user_id ?? null));
    list_msgs(req_id).then(setMsgList);
  }, [req_id]);

  // 상대방이 보낸 메시지를 실시간으로 받는다 - 내가 보낸 메시지도 이 이벤트로 다시 오므로
  // msg_id 중복은 걸러낸다
  useEffect(() => {
    return sub_chat(req_id, (new_msg) => {
      setMsgList((prev) => (prev.some((m_item) => m_item.msg_id === new_msg.msg_id) ? prev : [...prev, new_msg]));
    });
  }, [req_id]);

  useEffect(() => {
    bottom_ref.current?.scrollIntoView({ block: "end" });
  }, [msg_list.length]);

  async function do_send() {
    if (!my_id || busy || !draft_txt.trim()) return;
    setBusy(true);
    setErrMsg("");
    const send_txt = draft_txt;
    setDraftTxt("");
    const { item, err_msg: send_err } = await send_msg(req_id, my_id, send_txt);
    if (item) {
      setMsgList((prev) => (prev.some((m_item) => m_item.msg_id === item.msg_id) ? prev : [...prev, item]));
    } else {
      setErrMsg(send_err ?? "메시지를 보내지 못했어요.");
      setDraftTxt(send_txt);
    }
    setBusy(false);
  }

  if (req_item === null || my_id === undefined) {
    return <main className="h-dvh w-full bg-white" />;
  }

  const partner = req_item && my_id ? partner_of(req_item, my_id) : null;

  if (!req_item || !partner || req_item.stat !== "r_acpt") {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-sm text-gray-400">채팅을 열 수 없는 연결이에요.</p>
        <button
          type="button"
          onClick={() => rout_nav.push("/home")}
          className="text-sm font-bold text-[#F26B12]"
        >
          홈으로
        </button>
      </main>
    );
  }

  return (
    <main className="flex h-dvh w-full flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={() => rout_nav.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-gray-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AvatarCircle
            img_url={partner.img_url}
            ini_char={partner.ini_char}
            ton_hex={partner.ton_hex}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          />
          <p className="truncate text-sm font-bold text-gray-900">{partner.user_name}님</p>
        </div>
        <button
          type="button"
          onClick={() => setProfOpen(true)}
          aria-label="프로필 보기 · 신고/차단"
          className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-400"
        >
          <UserRound className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msg_list.length === 0 ? (
          <p className="pt-10 text-center text-xs text-gray-400">
            {partner.user_name}님과의 새로운 대화를 시작해보세요
          </p>
        ) : (
          msg_list.map((m_item) => (
            <MsgBubble key={m_item.msg_id} mine={m_item.send_id === my_id} msg={m_item} />
          ))
        )}
        <div ref={bottom_ref} />
      </div>

      {err_msg && <p className="px-4 pb-1 text-[11px] text-red-400">{err_msg}</p>}
      <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-3">
        <input
          type="text"
          value={draft_txt}
          onChange={(e_val) => setDraftTxt(e_val.target.value)}
          onKeyDown={(e_val) => {
            if (e_val.key === "Enter" && !e_val.nativeEvent.isComposing) do_send();
          }}
          placeholder="메시지를 입력하세요"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full bg-[#FAFAFA] px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={do_send}
          disabled={busy || !draft_txt.trim()}
          aria-label="보내기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F26B12] text-white transition active:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {prof_open && <ProfileViewModal prof_item={partner} onClose={() => setProfOpen(false)} />}
    </main>
  );
}

function MsgBubble({ mine, msg }: { mine: boolean; msg: ChatMsg }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
        <div
          className={`max-w-[70vw] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            mine ? "bg-[#F26B12] text-white" : "bg-[#F1F1F1] text-gray-900"
          }`}
        >
          {msg.body_txt}
        </div>
        <span className="shrink-0 text-[10px] text-gray-300">{fmt_time(msg.made_at)}</span>
      </div>
    </div>
  );
}
