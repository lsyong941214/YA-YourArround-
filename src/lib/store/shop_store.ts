/**
 * shop_store.ts
 * 가게 홍보 등록/조회 저장소 - Supabase public.shop_promotions 테이블 기반
 * - 이장님만 등록할 수 있고(shop_promo_role_chk 트리거), 이장당 1건(owner_id unique)이다.
 * - status는 관리자만 바꿀 수 있다(shop_promo_guard 트리거) - 등록/수정은 항상 'pending'으로
 *   저장된다. 반려 후 다시 수정해서 저장하면 재심사 대기 상태로 돌아간다.
 * - 관리자용 조회/심사(승인·반려)는 admin_store.ts에 있다(신고 처리와 같은 패턴).
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { supabase } from "@/lib/supabase/client";

export type ShopStat = "pending" | "approved" | "rejected";

export const SHOP_CATEG_LIST = ["음식점", "카페", "미용", "생활서비스", "기타"] as const;
export type ShopCateg = (typeof SHOP_CATEG_LIST)[number];

export type ShopPromo = {
  shop_id: string;
  owner_id: string;
  shop_name: string;
  category: string;
  region: string;
  biz_hours: string;
  description: string;
  img_url: string | null;
  biz_reg_no: string | null;
  status: ShopStat;
  reject_reason: string;
  made_at: number;
};

type ShopRow = {
  id: string;
  owner_id: string;
  shop_name: string;
  category: string;
  region: string;
  biz_hours: string;
  description: string;
  img_url: string | null;
  biz_reg_no: string | null;
  status: ShopStat;
  reject_reason: string;
  created_at: string;
};

function row_to_shop(row: ShopRow): ShopPromo {
  return {
    shop_id: row.id,
    owner_id: row.owner_id,
    shop_name: row.shop_name,
    category: row.category,
    region: row.region,
    biz_hours: row.biz_hours,
    description: row.description,
    img_url: row.img_url,
    biz_reg_no: row.biz_reg_no,
    status: row.status,
    reject_reason: row.reject_reason,
    made_at: new Date(row.created_at).getTime(),
  };
}

// 내(이장) 가게 홍보 등록 현황 - 등록한 적 없으면 null
export async function my_shop_promo(): Promise<ShopPromo | null> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return null;
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("*")
    .eq("owner_id", me_uid)
    .maybeSingle();
  if (error || !data) return null;
  return row_to_shop(data as ShopRow);
}

export type ShopInp = {
  shop_name: string;
  category: string;
  region: string;
  biz_hours?: string;
  description?: string;
  img_url?: string | null;
  biz_reg_no?: string | null;
};

// 등록/수정 - 이장당 1건이라 owner_id로 upsert한다. status는 서버 트리거가 항상 'pending'으로
// 되돌리므로 여기서는 신경쓰지 않는다.
export async function save_shop_promo(inp: ShopInp): Promise<{ ok_flag: boolean; err_msg?: string }> {
  const { data: sess_data } = await supabase.auth.getUser();
  const me_uid = sess_data.user?.id;
  if (!me_uid) return { ok_flag: false, err_msg: "로그인이 만료되었어요. 다시 로그인해주세요." };

  const { error } = await supabase.from("shop_promotions").upsert(
    {
      owner_id: me_uid,
      shop_name: inp.shop_name,
      category: inp.category,
      region: inp.region,
      biz_hours: inp.biz_hours ?? "",
      description: inp.description ?? "",
      img_url: inp.img_url ?? null,
      biz_reg_no: inp.biz_reg_no ?? null,
    },
    { onConflict: "owner_id" }
  );
  if (error) {
    // shop_promo_role_chk 트리거가 던진 사유(이장이 아님)를 그대로 보여준다
    return { ok_flag: false, err_msg: error.message ?? "가게 등록에 실패했어요." };
  }
  return { ok_flag: true };
}

// 홈 화면 홍보 슬롯(체크리스트 C)에서 쓰는 승인된 가게 목록
export async function list_shop_promo_approved(): Promise<ShopPromo[]> {
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return (data as ShopRow[]).map(row_to_shop);
}
