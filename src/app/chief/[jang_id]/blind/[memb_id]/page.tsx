import BlndReqScreen from "@/components/chief/BlndReqScreen";

export default function ChiefBlindPage({
  params,
}: {
  params: { jang_id: string; memb_id: string };
}) {
  return <BlndReqScreen jang_id={params.jang_id} memb_id={params.memb_id} />;
}
