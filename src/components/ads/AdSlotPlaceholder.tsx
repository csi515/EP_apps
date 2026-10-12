import React from 'react';

export type AdSlotFormat =
  | 'leaderboard'
  | 'in-feed'
  | 'rectangle'
  | 'mobile-banner'
  | 'auto'
  | 'horizontal';

export interface AdSlotPlaceholderProps {
  /** 광고 포맷 규격 */
  format?: AdSlotFormat;
  /** 추가 클래스 */
  className?: string;
  /** 고정 높이 클래스 (기본: format 규격 또는 h-64 min-h-64) */
  heightClassName?: string;
  /** 애드센스 슬롯 ID (추후 스크립트 연동 시 사용) */
  slotId?: string;
  adSlotId?: string;
}

const FORMAT_DIMENSIONS: Record<string, string> = {
  leaderboard: 'h-[90px] sm:h-[100px] w-full max-w-[728px]',
  'in-feed': 'h-[120px] sm:h-[140px] w-full max-w-[640px]',
  rectangle: 'h-[250px] w-[300px]',
  'mobile-banner': 'h-[50px] w-full max-w-[320px]',
  horizontal: 'h-32 w-full',
  auto: 'h-64 min-h-64 w-full',
};

/**
 * CLS(Cumulative Layout Shift) 0% 보장을 위한 AdSense 사전 예약 슬롯 컴포넌트
 * 규격별 고정 높이와 레이아웃을 선확보하여 광고 로딩 전후 화면 흔들림을 방지합니다.
 * 규칙: 공개 랜딩 페이지 및 고객 마이페이지 하단에만 배치 (관리자 워크스페이스 노출 금지)
 */
export const AdSlotPlaceholder: React.FC<AdSlotPlaceholderProps> = ({
  format = 'auto',
  className = '',
  heightClassName,
  slotId,
  adSlotId,
}) => {
  const activeSlotId = slotId || adSlotId;
  const dimensionClass = heightClassName || FORMAT_DIMENSIONS[format] || 'h-64 min-h-64 w-full';

  return (
    <aside
      role="region"
      aria-label="스폰서 광고 영역"
      className={`mx-auto my-6 flex flex-col items-center justify-center relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 transition-colors ${dimensionClass} ${className}`}
      style={{
        contain: 'layout style paint',
      }}
    >
      {/* 
        [Google AdSense Production Unit Template]
        구글 애드센스 승인 완료 시 아래 주석 코드를 활성화하여 교체:
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client="ca-pub-0000000000000000"
          data-ad-slot={activeSlotId || "1234567890"}
          data-ad-format={format === "in-feed" ? "fluid" : "auto"}
          data-full-width-responsive="true"
        />
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-1.5 text-slate-400 p-2">
        <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-white border border-slate-200 text-slate-400 rounded-full shadow-xs">
          Sponsored Space
        </span>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-500">파트너스 추천 영역</p>
          <p className="text-[11px] text-slate-400 mt-0.5">광고 영역 사전 확보 (CLS 0%)</p>
        </div>
        {activeSlotId && (
          <span className="text-[10px] font-mono text-slate-300">
            Slot #{activeSlotId}
          </span>
        )}
      </div>
    </aside>
  );
};
