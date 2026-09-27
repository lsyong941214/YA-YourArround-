import { Suspense } from "react";
import MatchedScreen from "@/components/matched/MatchedScreen";

export default function MatchedPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <MatchedScreen />
    </Suspense>
  );
}
