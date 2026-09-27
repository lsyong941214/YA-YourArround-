"use client";

/**
 * PwaRegister.tsx
 * 서비스워커 등록만 하는 화면 없는 컴포넌트 - 루트 레이아웃에서 한 번 마운트한다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
