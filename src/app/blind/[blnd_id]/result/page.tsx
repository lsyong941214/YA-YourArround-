import BlndRsltScreen from "@/components/blind/BlndRsltScreen";

export default function BlindResultPage({ params }: { params: { blnd_id: string } }) {
  return <BlndRsltScreen blnd_id={params.blnd_id} />;
}
