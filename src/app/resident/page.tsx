import { Suspense } from "react";
import MembDetail from "@/components/resident/MembDetail";

export default function ResidentPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-white" />}>
      <MembDetail />
    </Suspense>
  );
}
