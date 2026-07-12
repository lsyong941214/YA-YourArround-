import ReqSendScreen from "@/components/chief/ReqSendScreen";

export default function ChiefRequestPage({
  params,
}: {
  params: { jang_id: string; memb_id: string };
}) {
  return <ReqSendScreen jang_id={params.jang_id} memb_id={params.memb_id} />;
}
