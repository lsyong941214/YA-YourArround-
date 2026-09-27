import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/common/PwaRegister";

export const metadata: Metadata = {
  title: "주변",
  description: "내 주변의 사람들과 신뢰로 연결되는 시작",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "주변",
  },
};

export const viewport: Viewport = {
  themeColor: "#F26B12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
