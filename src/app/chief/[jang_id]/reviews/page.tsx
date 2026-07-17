import ChiefReviews from "@/components/chief/ChiefReviews";

export default function ChiefReviewsPage({ params }: { params: { jang_id: string } }) {
  return <ChiefReviews jang_id={params.jang_id} />;
}
