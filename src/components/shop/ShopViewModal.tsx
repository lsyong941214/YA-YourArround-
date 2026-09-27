"use client";

/**
 * ShopViewModal.tsx
 * 홈 화면 가게 홍보 카드 클릭 시 뜨는 상세 팝업 - 별도 라우트 없이 정보만 보여준다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { Clock, MapPin, Store, X } from "lucide-react";
import { ShopPromo } from "@/lib/store/shop_store";

export default function ShopViewModal({ shop_item, onClose }: { shop_item: ShopPromo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="relative h-40 w-full overflow-hidden rounded-t-3xl bg-[#FFE9D6] sm:rounded-t-3xl">
          {shop_item.img_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop_item.img_url} alt={shop_item.shop_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#F26B12]">
              <Store className="h-10 w-10" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <span className="rounded-full bg-[#FFF3E9] px-2.5 py-1 text-[11px] font-bold text-[#F26B12]">
            {shop_item.category}
          </span>
          <h3 className="mt-2 text-lg font-bold text-gray-900">{shop_item.shop_name}</h3>

          <div className="mt-3 space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {shop_item.region}
            </p>
            {shop_item.biz_hours && (
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5 shrink-0" /> {shop_item.biz_hours}
              </p>
            )}
          </div>

          {shop_item.description && (
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{shop_item.description}</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
