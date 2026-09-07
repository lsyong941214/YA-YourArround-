"use client";

import { AlertTriangle, X } from "lucide-react";

// 주변인 테스트 "종료하기" 확인 모달 - 진행 중/결과 화면 어느 쪽에서 눌러도 공용으로 쓴다
export default function BlndEndConfirmModal({
  busy_flag,
  onClose,
  onConfirm,
}: {
  busy_flag?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">주변인 테스트를 종료할까요?</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs leading-relaxed text-red-600">
            지금 종료하면 진행 중이던 주변인 테스트가 즉시 끝나고, 상대방에게도 종료된
            것으로 표시돼요. 이 작업은 되돌릴 수 없어요.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy_flag}
            className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition active:opacity-90 disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy_flag}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white transition active:opacity-90 disabled:opacity-60"
          >
            종료하기
          </button>
        </div>
      </div>
    </div>
  );
}
