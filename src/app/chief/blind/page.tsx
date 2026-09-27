import { Suspense } from "react";
import BlndReqScreen from "@/components/chief/BlndReqScreen";

export default function ChiefBlindPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <BlndReqScreen />
    </Suspense>
  );
}
