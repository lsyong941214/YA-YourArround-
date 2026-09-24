import { Suspense } from "react";
import CntcDetail from "@/components/cntc/CntcDetail";

export default function CntcPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <CntcDetail />
    </Suspense>
  );
}
