import { Suspense } from "react";
import MatcReviewScreen from "@/components/matching/MatcReviewScreen";

export default function MatchingReviewPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <MatcReviewScreen />
    </Suspense>
  );
}
