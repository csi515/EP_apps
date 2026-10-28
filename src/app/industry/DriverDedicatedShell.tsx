import React, { Suspense, lazy } from 'react';
import { Bus, LogOut } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';

const ShuttleRoutesPage = lazy(() =>
  import('@/capabilities/shuttle_dispatch/ui/ShuttleRoutesPage').then((m) => ({
    default: m.ShuttleRoutesPage,
  }))
);

/**
 * 기사 전용 풀스크린 셸 — EP shuttle_dispatch 노선 화면.
 * (레거시 vehicle_shuttle 모듈은 제품 경로에서 제거됨)
 */
export function DriverDedicatedShell() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
            <Bus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">셔틀 기사 전용 모드</div>
            <div className="text-[11px] text-slate-400">출퇴근 셔틀 운행 관제</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>
      <main className="flex-1 overflow-auto bg-white text-slate-900">
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">셔틀 노선을 불러오는 중…</div>}>
          <ShuttleRoutesPage />
        </Suspense>
      </main>
    </div>
  );
}
