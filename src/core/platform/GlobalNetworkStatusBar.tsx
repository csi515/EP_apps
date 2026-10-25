import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const GlobalNetworkStatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (isOnline && !showRestored) {
    return null;
  }

  if (!isOnline) {
    return (
      <aside
        aria-label="네트워크 연결 끊김 알림"
        className="w-full bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-50 sticky top-0 animate-in slide-in-from-top duration-200"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-rose-200" />
          <span>인터넷 연결이 원활하지 않습니다. 오프라인 모드로 로컬 캐시를 사용 중입니다.</span>
        </div>
        <button
          onClick={handleManualRetry}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          재연결 시도
        </button>
      </aside>
    );
  }

  // 네트워크 복구 성공 배너
  return (
    <aside
      aria-label="네트워크 복구 알림"
      className="w-full bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm z-50 sticky top-0 animate-in slide-in-from-top duration-200"
    >
      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
      <span>인터넷 연결이 정상 복구되었습니다. 최신 데이터를 동기화합니다.</span>
    </aside>
  );
};
