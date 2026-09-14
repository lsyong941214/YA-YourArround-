/**
 * chat_store.ts
 * 연결 성사(r_acpt)된 두 사람의 채팅 메시지 저장소 - Supabase public.chat_messages 테이블 기반
 * - RLS가 match_requests.status = 'r_acpt' + 당사자(requester/resident)만 조회·작성을
 *   허용하므로, 이장은 대화 내용을 볼 수 없다
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

export type ChatMsg = {
  msg_id: string;
  req_id: string;
  send_id: string;
  body_txt: string;
  made_at: number;
};

type MsgRow = {
  id: string;
  match_request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function row_to_msg(row: MsgRow): ChatMsg {
  return {
    msg_id: row.id,
    req_id: row.match_request_id,
    send_id: row.sender_id,
    body_txt: row.body,
    made_at: new Date(row.created_at).getTime(),
  };
}

export async function list_msgs(req_id: string): Promise<ChatMsg[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("match_request_id", req_id)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as MsgRow[]).map(row_to_msg);
}

export async function send_msg(
  req_id: string,
  send_id: string,
  body_txt: string
): Promise<{ item?: ChatMsg; err_msg?: string }> {
  const trim_txt = body_txt.trim();
  if (!trim_txt) return { err_msg: "메시지를 입력해주세요." };
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ match_request_id: req_id, sender_id: send_id, body: trim_txt })
    .select("*")
    .single();
  if (error || !data) {
    return { err_msg: error?.message ?? "메시지를 보내지 못했어요." };
  }
  return { item: row_to_msg(data as MsgRow) };
}

// 상대방이 보낸 메시지를 Supabase Realtime으로 바로 받는다. 새로고침(list_msgs 재조회) 대신
// 새로 들어온 행을 그대로 넘겨준다 - 내가 보낸 메시지는 send_msg 응답으로 이미 화면에 반영되고
// 나에게도 이 이벤트가 오므로, 호출부(ChatScreen)에서 msg_id로 중복을 걸러낸다.
// 언마운트 시 반환된 함수로 구독을 해제해야 한다.
export function sub_chat(req_id: string, on_new: (msg: ChatMsg) => void): () => void {
  const chan = supabase
    .channel(`chat_${req_id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `match_request_id=eq.${req_id}` },
      (payload) => on_new(row_to_msg(payload.new as MsgRow))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(chan);
  };
}
