import { Suspense } from "react";
import BlndRsltScreen from "@/components/blind/BlndRsltScreen";

export default function BlindResultPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <BlndRsltScreen />
    </Suspense>
  );
}
