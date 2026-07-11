import MembDetail from "@/components/resident/MembDetail";

export default function ResidentPage({ params }: { params: { memb_id: string } }) {
  return <MembDetail memb_id={params.memb_id} />;
}
