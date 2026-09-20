import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "주변",
  description: "내 주변의 사람들과 신뢰로 연결되는 시작",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* 모바일 전용으로 만든 화면들이라 웹 브라우저 같은 넓은 화면에서는 <main>들의
          w-full이 뷰포트 폭 그대로 늘어나 점수 막대/버튼 등이 불편하게 길어 보였다
          (2026-09-20, 결과서 화면 우선 대응 -> 화면 전체로 확장). 가장 큰 일반 모바일
          기기 폭(iPhone Pro Max 등 기준 430px)으로 앱 전체를 감싸 웹에서는 카드처럼
          가운데 정렬하고, 그보다 좁은 실제 모바일 화면에서는 max-width가 뷰포트 폭
          그대로 적용돼 기존과 동일하게 보인다. position:fixed 하단 액션바/탭바는 이
          래퍼 밖에서 뷰포트 기준으로 뜨므로, 각자 mx-auto max-w-[430px]로 따로
          맞춰준다(BottomTabBar.tsx 등). */}
      <body className="bg-gray-100">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-white">{children}</div>
      </body>
    </html>
  );
}
