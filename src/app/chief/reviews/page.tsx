import { Suspense } from "react";
import ChiefReviews from "@/components/chief/ChiefReviews";

export default function ChiefReviewsPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <ChiefReviews />
    </Suspense>
  );
}
