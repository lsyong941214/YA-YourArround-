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

// 홈 화면 홍보 슬롯(체크리스트 C)에서 쓰는 승인된 가게 목록 - RLS(shop_promo_select_approved)가
// 활성 구독이 있는 가게만 이미 걸러준다(구독 만료되면 여기서도 자동으로 빠진다)
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

// ============================================================
// 가게 홍보 구독 (체크리스트 B3) - 요금표 조회 / 내 구독 현황 / 쿠폰으로 구독 활성화
// ============================================================
export const SUB_DURATIONS = [1, 3, 6, 9] as const;
export type SubDuration = (typeof SUB_DURATIONS)[number];

export type SubPlan = {
  duration_months: SubDuration;
  price: number;
  is_active: boolean;
};

type SubPlanRow = { duration_months: SubDuration; price: number; is_active: boolean };

// 구독 화면에 보여줄 요금표 - 로그인한 누구나 조회 가능(관리자만 수정)
export async function list_sub_plans(): Promise<SubPlan[]> {
  const { data, error } = await supabase
    .from("shop_sub_plans")
    .select("duration_months, price, is_active")
    .order("duration_months", { ascending: true });
  if (error || !data) return [];
  return data as SubPlanRow[];
}

export type ShopSub = {
  sub_id: string;
  duration_months: number;
  price_applied: number;
  coupon_id: string | null;
  ends_at: number;
  cancelled: boolean;
};

type SubRow = {
  id: string;
  duration_months: number;
  price_applied: number;
  coupon_id: string | null;
  ends_at: string;
  status: "active" | "canceled";
};

// 해당 가게의 가장 최근 구독 이력 1건 (없으면 null - 아직 한 번도 구독한 적 없음)
export async function my_shop_subscription(shop_id: string): Promise<ShopSub | null> {
  const { data, error } = await supabase
    .from("shop_subscriptions")
    .select("id, duration_months, price_applied, coupon_id, ends_at, status")
    .eq("shop_id", shop_id)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as SubRow;
  return {
    sub_id: row.id,
    duration_months: row.duration_months,
    price_applied: row.price_applied,
    coupon_id: row.coupon_id,
    ends_at: new Date(row.ends_at).getTime(),
    cancelled: row.status === "canceled",
  };
}

export type RedeemStat =
  | "ok"
  | "no_auth"
  | "no_shop"
  | "not_owner"
  | "no_plan"
  | "bad_code"
  | "inactive"
  | "expired"
  | "sold_out";

const REDEEM_MSG: Record<RedeemStat, string> = {
  ok: "구독이 적용됐어요.",
  no_auth: "로그인이 만료되었어요. 다시 로그인해주세요.",
  no_shop: "가게 정보를 찾을 수 없어요.",
  not_owner: "본인 가게에만 쿠폰을 적용할 수 있어요.",
  no_plan: "해당 기간의 요금이 아직 준비되지 않았어요.",
  bad_code: "존재하지 않는 쿠폰 코드예요.",
  inactive: "사용이 중지된 쿠폰이에요.",
  expired: "기간이 지난 쿠폰이에요.",
  sold_out: "이미 다 사용된 쿠폰이에요.",
};

// 쿠폰 코드로 구독을 활성화한다 - 정식 결제(PG) 연동 전까지는 이 경로가 유일한 구독 활성화 수단
export async function redeem_coupon(
  shop_id: string,
  code: string,
  duration: SubDuration
): Promise<{ ok_flag: boolean; msg: string }> {
  const { data, error } = await supabase.rpc("redeem_shop_coupon", {
    p_shop_id: shop_id,
    p_code: code.trim(),
    p_duration: duration,
  });
  if (error) return { ok_flag: false, msg: "쿠폰 적용에 실패했어요." };
  const stat = (data?.stat ?? "bad_code") as RedeemStat;
  return { ok_flag: stat === "ok", msg: REDEEM_MSG[stat] ?? "쿠폰 적용에 실패했어요." };
}

// ============================================================
// 가게 등록 심사 세부 체크리스트 (음식점/카페 입점 심사 기준) - 가게 주인은 자기 가게 이력만
// 조회 가능(반려 사유를 보여주는 것과 같은 투명성 원칙). 기록(추가)은 관리자만 shop_admin_store에서.
// ============================================================
export const CHECK_TYPE_LIST = [
  "biz_reg_verify",
  "biz_status",
  "food_biz_report",
  "onl_sale_report",
  "addr_verify",
  "img_origin",
  "label_compliance",
  "admin_penalty",
  "payer_match",
  "categ_fit",
] as const;
export type CheckType = (typeof CHECK_TYPE_LIST)[number];

export const CHECK_TYPE_LBL: Record<CheckType, string> = {
  biz_reg_verify: "사업자등록번호 진위확인",
  biz_status: "휴폐업 상태",
  food_biz_report: "영업신고증(식품위생법)",
  onl_sale_report: "통신판매업 신고",
  addr_verify: "주소 실존/좌표 확인",
  img_origin: "사진 도용 여부",
  label_compliance: "원산지·알레르기 표시",
  admin_penalty: "위생 행정처분 이력",
  payer_match: "결제자 명의 일치",
  categ_fit: "업종 적합성",
};

export type CheckResult = "pending" | "pass" | "fail" | "skip";

export type ReviewCheck = {
  check_id: string;
  check_type: CheckType;
  method: "manual" | "auto";
  result: CheckResult;
  note: string;
  evidence_url: string | null;
  made_at: number;
};

type CheckRow = {
  id: string;
  check_type: CheckType;
  method: "manual" | "auto";
  result: CheckResult;
  note: string;
  evidence_url: string | null;
  created_at: string;
};

function row_to_check(row: CheckRow): ReviewCheck {
  return {
    check_id: row.id,
    check_type: row.check_type,
    method: row.method,
    result: row.result,
    note: row.note,
    evidence_url: row.evidence_url,
    made_at: new Date(row.created_at).getTime(),
  };
}

// 항목별 최신 이력만 남긴다(append-only 테이블이라 과거 재검증 이력은 더 있을 수 있음)
function latest_per_type(rows: ReviewCheck[]): ReviewCheck[] {
  const seen = new Map<CheckType, ReviewCheck>();
  for (const row of rows) {
    if (!seen.has(row.check_type)) seen.set(row.check_type, row);
  }
  return Array.from(seen.values());
}

// 내 가게의 심사 체크리스트 현재 상태(항목별 최신 1건씩)
export async function my_review_checks(shop_id: string): Promise<ReviewCheck[]> {
  const { data, error } = await supabase
    .from("shop_review_checks")
    .select("id, check_type, method, result, note, evidence_url, created_at")
    .eq("shop_id", shop_id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return latest_per_type((data as CheckRow[]).map(row_to_check));
}
