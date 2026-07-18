import CntcDetail from "@/components/cntc/CntcDetail";

export default function CntcPage({ params }: { params: { uid: string } }) {
  return <CntcDetail uid={params.uid} />;
}
