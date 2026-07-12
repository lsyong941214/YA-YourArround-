import ChiefDetail from "@/components/chief/ChiefDetail";

export default function ChiefDetailPage({ params }: { params: { jang_id: string } }) {
  return <ChiefDetail jang_id={params.jang_id} />;
}
