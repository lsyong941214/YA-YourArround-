import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "주변",
  description: "내 주변의 사람들과 신뢰로 연결되는 시작",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
