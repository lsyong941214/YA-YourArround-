"use client";

/**
 * TermsModal.tsx
 * 이용약관/개인정보처리방침 전문 팝업 - 회원가입 화면(LocalLoginScreen)의 "보기"에서 연다.
 * 계정을 만들기 전(폼 입력 상태를 지키고 싶어서) 페이지 이동 대신 모달로 띄운다.
 * - 명명 규칙: "단어_단어_..." 형태, 각 단어는 최대 4자
 */
import { useState } from "react";
import { X } from "lucide-react";

export type TermsTab = "svc" | "priv";

const SVC_TXT = `본 약관은 초안이며, 정식 서비스 시행 전 법무 검토를 거쳐 확정됩니다.

제1조 (목적)
이 약관은 "주변"(이하 "서비스")이 제공하는 지역 기반 소개·매칭 서비스의 이용 조건과
절차, 이용자와 서비스 간의 권리·의무를 정하는 것을 목적으로 합니다.

제2조 (이용 자격)
1. 만 19세 이상만 가입할 수 있습니다. 가입 시 입력한 생년월일을 기준으로 서버에서
   재검증하며, 미만인 경우 가입이 제한됩니다.
2. 허위 정보로 가입하거나 다른 사람의 사진·신원을 도용해 프로필을 등록할 수 없습니다.

제3조 (이용자의 의무)
1. 조건만남, 성매매 등 불법 행위를 목적으로 하는 게시물·메시지를 작성할 수 없습니다.
2. 다른 이용자에게 불쾌감을 주는 행위, 허위 신고, 반복적인 규정 위반 행위를 해서는 안
   됩니다.
3. 위 사항을 위반하면 서비스 이용이 정지되거나 영구적으로 제한될 수 있습니다.

제4조 (신고 및 제재)
1. 이용자는 다른 이용자의 부적절한 행위를 신고할 수 있습니다.
2. 동일 대상에 대해 서로 다른 신고자 3인 이상의 신고가 누적되면 해당 계정은 자동으로
   이용이 정지되며, 운영자 검토를 거쳐 영구 이용 제한으로 전환될 수 있습니다.

제5조 (유료 서비스)
1. 서비스는 이용자 간 감사의 표시로 크레딧을 주고받는 유료 기능을 제공할 수 있습니다.
2. 결제·환불·분쟁 해결 절차는 별도 정책으로 정하며, 해당 정책이 이 약관과 함께 적용됩니다.

제6조 (약관의 변경)
서비스는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 서비스
내 공지를 통해 사전 고지합니다.

시행일: 추후 공지`;

const PRIV_TXT = `본 방침은 초안이며, 정식 서비스 시행 전 법무 검토를 거쳐 확정됩니다.

1. 수집하는 개인정보 항목
이름, 역할(주민/이장), 생년월일, MBTI, 직업, 지역(텍스트), 소개 문구, 프로필·앨범 사진.
성적 지향, 정밀 위치(GPS) 등 민감정보는 수집하지 않습니다.

2. 수집 목적
- 본인 확인 및 만 19세 이상 여부 확인
- 이웃 소개·매칭 서비스 제공
- 신고 처리, 부정 이용 방지 등 서비스 운영

3. 보유 및 이용 기간
회원 탈퇴 시까지 보유하며, 탈퇴 후에는 관계 법령이 정한 기간 또는 신고·수사기관 협조
목적으로 필요한 최소 기간 동안만 별도 보관 후 파기합니다.

4. 제3자 제공
법령에 근거하거나 수사기관의 적법한 요청이 있는 경우를 제외하고, 이용자의 개인정보를
제3자에게 제공하지 않습니다.

5. 처리 위탁
서비스 운영을 위해 Supabase(데이터베이스·인증·파일 저장)에 개인정보 처리를 위탁하고
있습니다.

6. 이용자의 권리
이용자는 언제든 본인의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.

7. 개인정보 보호책임자
연락처: 추후 공지 (담당자 지정 및 문의 채널 확정 예정)

시행일: 추후 공지`;

export default function TermsModal({
  init_tab,
  onClose,
}: {
  init_tab: TermsTab;
  onClose: () => void;
}) {
  const [tab_val, setTabVal] = useState<TermsTab>(init_tab);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-base font-bold text-gray-900">약관 및 정책</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-5 mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#FFF3E9] p-1">
          <button
            type="button"
            onClick={() => setTabVal("svc")}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              tab_val === "svc" ? "bg-[#F26B12] text-white" : "text-[#F26B12]"
            }`}
          >
            이용약관
          </button>
          <button
            type="button"
            onClick={() => setTabVal("priv")}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              tab_val === "priv" ? "bg-[#F26B12] text-white" : "text-[#F26B12]"
            }`}
          >
            개인정보처리방침
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-5">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
            {tab_val === "svc" ? SVC_TXT : PRIV_TXT}
          </p>
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[#F26B12] py-3 text-sm font-bold text-white transition active:opacity-90"
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
}
