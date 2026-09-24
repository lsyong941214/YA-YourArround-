import { Suspense } from "react";
import ChiefDetail from "@/components/chief/ChiefDetail";

export default function ChiefDetailPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <ChiefDetail />
    </Suspense>
  );
}
