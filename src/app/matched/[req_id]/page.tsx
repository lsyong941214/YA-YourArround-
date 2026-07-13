import MatchedScreen from "@/components/matched/MatchedScreen";

export default function MatchedPage({ params }: { params: { req_id: string } }) {
  return <MatchedScreen req_id={params.req_id} />;
}
