import { Suspense } from "react";
import ReqSendScreen from "@/components/chief/ReqSendScreen";

export default function ChiefRequestPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <ReqSendScreen />
    </Suspense>
  );
}
