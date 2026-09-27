"use client";

/**
 * ShopPromoSection.tsx
 * 홈 화면 중간에 들어가는 가게 홍보 슬롯 (체크리스트 C) - 승인(approved)된 가게만 보여준다.
 * 내 지역(my_reg)과 겹치는 가게를 앞에 두고, 나머지는 최신 등록순 그대로 둔다(완전 필터링은
 * 아니다 - 등록된 가게 자체가 적을 시기엔 다 보여주는 게 낫다).
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { list_shop_promo_approved, ShopPromo } from "@/lib/store/shop_store";
import ShopViewModal from "@/components/shop/ShopViewModal";

function reg_match(a_reg: string, b_reg: string): boolean {
  const a_val = a_reg.trim();
  const b_val = b_reg.trim();
  if (!a_val || !b_val) return false;
  return a_val.includes(b_val) || b_val.includes(a_val);
}

export default function ShopPromoSection({ my_reg }: { my_reg?: string }) {
  const [shop_list, setShopList] = useState<ShopPromo[] | null>(null);
  const [view_item, setViewItem] = useState<ShopPromo | null>(null);

  useEffect(() => {
    list_shop_promo_approved().then(setShopList);
  }, []);

  if (!shop_list || shop_list.length === 0) return null;

  const sort_list = my_reg
    ? [...shop_list].sort((a, b) => Number(reg_match(b.region, my_reg)) - Number(reg_match(a.region, my_reg)))
    : shop_list;

  return (
    <section className="mt-5">
      <div className="flex items-center gap-1.5 px-5">
        <Store className="h-4 w-4 text-[#F26B12]" />
        <h2 className="text-[15px] font-bold text-gray-900">우리 동네 가게</h2>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
        {sort_list.map((shop_it) => (
          <button
            key={shop_it.shop_id}
            type="button"
            onClick={() => setViewItem(shop_it)}
            className="w-40 shrink-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm"
          >
            <div className="h-24 w-full bg-[#FFE9D6]">
              {shop_it.img_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop_it.img_url} alt={shop_it.shop_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#F26B12]">
                  <Store className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-bold text-gray-900">{shop_it.shop_name}</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                {shop_it.category} · {shop_it.region}
              </p>
            </div>
          </button>
        ))}
      </div>

      {view_item && <ShopViewModal shop_item={view_item} onClose={() => setViewItem(null)} />}
    </section>
  );
}
