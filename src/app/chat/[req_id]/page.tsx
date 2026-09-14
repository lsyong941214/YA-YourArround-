import ChatScreen from "@/components/chat/ChatScreen";

export default function ChatPage({ params }: { params: { req_id: string } }) {
  return <ChatScreen req_id={params.req_id} />;
}
