import React, { useState, useEffect, useMemo, FC } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Ticket,
  Calendar,
  Building2,
  Package,
  Clock,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  getPresetQuests,
  calculateQuestProgress,
  getQuestStorageKey,
  type QuestItem,
  type QuestIconType,
} from './questEngine';
import { StorageService } from '@/services/storage';

interface GettingStartedQuestWidgetProps {
  onNavigate: (tab: string) => void;
  organizationId?: string;
  industryType?: string;
  customerWord?: string;
  placeWord?: string;
  onOpenCustomerModal?: () => void;
}

const ICON_MAP: Record<QuestIconType, React.ReactNode> = {
  user: <UserPlus className="w-5 h-5 text-indigo-600" />,
  ticket: <Ticket className="w-5 h-5 text-emerald-600" />,
  calendar: <Calendar className="w-5 h-5 text-amber-600" />,
  building: <Building2 className="w-5 h-5 text-blue-600" />,
  package: <Package className="w-5 h-5 text-purple-600" />,
  clock: <Clock className="w-5 h-5 text-orange-600" />,
  file: <FileText className="w-5 h-5 text-teal-600" />,
  sparkles: <Sparkles className="w-5 h-5 text-rose-600" />,
};

export const GettingStartedQuestWidget: FC<GettingStartedQuestWidgetProps> = ({
  onNavigate,
  organizationId,
  industryType,
  customerWord = '고객',
  placeWord = '사업장',
  onOpenCustomerModal,
}) => {
  const quests = useMemo(
    () => getPresetQuests(industryType, customerWord, placeWord),
    [industryType, customerWord, placeWord]
  );

  const storageKey = useMemo(() => getQuestStorageKey(organizationId), [organizationId]);

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  // 실 데이터 기반 자동 감지 (원생/고객이 1명 이상 등록된 경우 첫 단계 자동 체크)
  useEffect(() => {
    try {
      const students = StorageService.getStudents();
      if (students.length > 0 && quests.length > 0) {
        const firstQuest = quests[0];
        if (!completedIds.includes(firstQuest.id)) {
          const updated = [...completedIds, firstQuest.id];
          setCompletedIds(updated);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      }
    } catch {
      // noop
    }
  }, [quests, completedIds, storageKey]);

  const progress = useMemo(
    () => calculateQuestProgress(quests, completedIds),
    [quests, completedIds]
  );

  const toggleQuest = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // noop
      }
      return next;
    });
  };

  const handleAction = (quest: QuestItem) => {
    // 첫 회원 등록 퀘스트이고 모달 오프너가 제공된 경우 모달 오픈
    if (
      (quest.id.includes('first') || quest.id.includes('member') || quest.id.includes('entity')) &&
      quest.targetTab === 'students' &&
      onOpenCustomerModal
    ) {
      onOpenCustomerModal();
      return;
    }
    onNavigate(quest.targetTab);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // noop
    }
  };

  return (
    <div
      className="bg-gradient-to-br from-white via-indigo-50/20 to-slate-50/80 rounded-3xl border border-indigo-100/80 p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all duration-300"
      data-testid="getting-started-quest-widget"
    >
      {/* 위젯 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-50">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>사업장 맞춤형 첫걸음 퀘스트</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            🚀 대표님을 위한 {placeWord} 첫 세팅 가이드
          </h2>
          <p className="text-xs text-slate-500">
            핵심 기능 3~4가지를 완료하여 {customerWord}을 맞이할 준비를 마쳐보세요.
          </p>
        </div>

        {/* 진행률 & 컨트롤 */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-2xs min-w-[140px]">
            <div className="flex justify-between items-center text-xs font-black mb-1.5">
              <span className="text-slate-600">진척도</span>
              <span className={progress.isAllCompleted ? 'text-emerald-600' : 'text-indigo-600'}>
                {progress.completedCount}/{progress.totalQuests} 완료 ({progress.progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.isAllCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 완료 축하 배너 */}
      {progress.isAllCompleted && !isCollapsed && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base">
                🎉 축하합니다! 모든 첫걸음 퀘스트를 완수하셨습니다!
              </p>
              <p className="text-xs text-emerald-100 mt-0.5">
                이제 {placeWord} 운영이 완벽히 준비되었습니다. 본격적으로 {customerWord}을 맞이해보세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-white/80 hover:text-white flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
            title="퀘스트 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>다시하기</span>
          </button>
        </div>
      )}

      {/* 퀘스트 카드 목록 */}
      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quests.map((quest) => {
            const isDone = completedIds.includes(quest.id);

            return (
              <div
                key={quest.id}
                className={`relative rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                  isDone
                    ? 'bg-emerald-50/40 border-emerald-200/60 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-indigo-200 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* 카드 상단: 단계 뱃지 & 완료 토글 */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {quest.stepNumber}단계
                    </span>
                    <button
                      type="button"
                      onClick={(e) => toggleQuest(quest.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 transition-colors"
                      title={isDone ? '완료 취소' : '완료로 표시'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* 아이콘 및 제목 */}
                  <div className="flex items-start gap-2.5 mb-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      {ICON_MAP[quest.icon] || <Sparkles className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`text-sm font-bold leading-tight ${
                          isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {quest.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  {/* 도움말 팁 */}
                  {quest.helpTip && !isDone && (
                    <div className="mt-2.5 p-2 bg-indigo-50/60 rounded-xl text-[11px] text-indigo-800 leading-relaxed border border-indigo-100/50">
                      💡 <strong>팁:</strong> {quest.helpTip}
                    </div>
                  )}
                </div>

                {/* 바로가기 버튼 */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleAction(quest)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
                      isDone
                        ? 'text-slate-400 hover:text-slate-600'
                        : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                  >
                    <span>{quest.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
