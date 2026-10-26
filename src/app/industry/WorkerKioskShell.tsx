import React, { useState } from 'react';
import { Wrench, CheckSquare, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { TaskPipelineKanbanView } from '@/capabilities/task_pipeline/ui/TaskPipelineKanbanView';
import { DesktopSopRiskMatrixView } from '@/capabilities/sop_risk_assessment';

/**
 * Worker Kiosk Shell
 *
 * worker 역할 로그인 시 공정 칸반 및 안전 점검 중심의 심플 키오스크 모드 렌더링
 */
export function WorkerKioskShell() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'safety'>('kanban');
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* 키오스크 상단 헤더 바 */}
      <header className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>현장 작업자 키오스크</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
                Worker Mode
              </span>
            </div>
            <div className="text-xs text-slate-400">생산 공정 실적 입력 및 안전점검 표준</div>
          </div>
        </div>

        {/* 탭 전환 및 로그아웃 버튼 */}
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'kanban'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>공정 파이프라인</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('safety')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'safety'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>안전 SOP 점검</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 키오스크 본문 컨텐츠 */}
      <main className="flex-1 p-5 overflow-y-auto bg-slate-900">
        {activeTab === 'kanban' && <TaskPipelineKanbanView />}
        {activeTab === 'safety' && <DesktopSopRiskMatrixView />}
      </main>
    </div>
  );
}
