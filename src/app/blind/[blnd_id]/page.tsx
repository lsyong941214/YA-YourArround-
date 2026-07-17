import BlndReviewScreen from "@/components/blind/BlndReviewScreen";

export default function BlindReceivePage({ params }: { params: { blnd_id: string } }) {
  return <BlndReviewScreen blnd_id={params.blnd_id} />;
}
