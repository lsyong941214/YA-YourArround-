import { Suspense } from "react";
import BlndReviewScreen from "@/components/blind/BlndReviewScreen";

export default function BlindReceivePage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <BlndReviewScreen />
    </Suspense>
  );
}
