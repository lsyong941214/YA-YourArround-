import { Suspense } from "react";
import ChatScreen from "@/components/chat/ChatScreen";

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <ChatScreen />
    </Suspense>
  );
}
