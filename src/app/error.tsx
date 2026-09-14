"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Next.js가 렌더링 중 잡지 못한 예외를 만나면 이 화면으로 대체한다.
// 이게 없으면 프로덕션에서는 아무 안내도 없이 "Application error: a client-side
// exception has occurred" 백지 화면만 뜨고, 사용자는 새로고침 말고는 할 수 있는 게 없다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const rout_nav = useRouter();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-[#FFF8F3] px-6 text-center">
      <p className="text-base font-bold text-gray-900">문제가 발생했어요</p>
      <p className="text-sm text-gray-400">잠시 후 다시 시도해주세요.</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-2xl bg-[#F26B12] px-5 py-2.5 text-sm font-bold text-white transition active:opacity-90"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={() => rout_nav.push("/home")}
          className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition active:opacity-90"
        >
          홈으로
        </button>
      </div>
    </main>
  );
}
