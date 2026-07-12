import MatcReviewScreen from "@/components/matching/MatcReviewScreen";

export default function MatchingReviewPage({ params }: { params: { req_id: string } }) {
  return <MatcReviewScreen req_id={params.req_id} />;
}
