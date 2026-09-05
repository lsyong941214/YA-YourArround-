import BottomTabBar from "@/components/common/BottomTabBar";

// 로그인 이후 주요 화면(홈/매칭/연락처 목록/마이페이지 등) 전용 레이아웃
// - 상세/작업 화면(이장님 상세, 요청 보내기, 수락·거절, 밸런스 게임 등)은 이 그룹 밖에 있어
//   자체 화면에 집중하도록 하단 탭바 없이 유지된다
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomTabBar />
    </>
  );
}
