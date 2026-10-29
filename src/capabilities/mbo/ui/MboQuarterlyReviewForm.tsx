import React, { useState } from 'react';
import {
  FolderKanban,
  FileText,
  Clock,
  MessageSquare,
  Plus,
  Send,
  User,
  CheckCircle2,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { formatPeriodYm } from '../domain/mboMonthlyCheckin';

export interface ProgressLogItem {
  id: string;
  projectId: string;
  authorName: string;
  logDate: string;
  progressRate: number;
  achievements: string;
  issuesAndActions?: string;
  nextSteps?: string;
  periodYm?: string;
}

export interface FeedbackItem {
  id: string;
  projectId: string;
  authorName: string;
  authorRole: string;
  feedbackType: 'comment' | 'revision_request' | 'praise';
  content: string;
  createdAt: string;
}

interface MboQuarterlyReviewFormProps {
  projectId: string;
  projectTitle: string;
  logs: ProgressLogItem[];
  feedbacks: FeedbackItem[];
  defaultPeriodYm?: string;
  authorName?: string;
  onCreateLog: (log: Omit<ProgressLogItem, 'id'>) => void | Promise<void>;
  onCreateFeedback: (
    feedback: Omit<FeedbackItem, 'id' | 'createdAt'>
  ) => void | Promise<void>;
}

export const MboQuarterlyReviewForm: React.FC<MboQuarterlyReviewFormProps> = ({
  projectId,
  projectTitle,
  logs,
  feedbacks,
  defaultPeriodYm,
  authorName = '현재 실무자',
  onCreateLog,
  onCreateFeedback,
}) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [logProgress, setLogProgress] = useState(70);
  const [logAchievements, setLogAchievements] = useState('');
  const [logIssues, setLogIssues] = useState('');
  const [logNextSteps, setLogNextSteps] = useState('');
  const [periodYm, setPeriodYm] = useState(defaultPeriodYm || formatPeriodYm());
  const [busy, setBusy] = useState(false);

  const [feedbackInput, setFeedbackInput] = useState('');
  const [feedbackType, setFeedbackType] = useState<'comment' | 'revision_request' | 'praise'>('comment');

  const filteredLogs = logs.filter((l) => l.projectId === projectId);
  const filteredFeedbacks = feedbacks.filter((f) => f.projectId === projectId);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAchievements.trim()) {
      showToast('주요 달성 성과를 입력해주세요.', 'warning');
      return;
    }
    if (!projectId || projectId.startsWith('obj-')) {
      showToast('실행 프로젝트를 먼저 선택해주세요.', 'warning');
      return;
    }

    setBusy(true);
    try {
      await onCreateLog({
        projectId,
        authorName,
        logDate: new Date().toISOString().slice(0, 10),
        progressRate: logProgress,
        achievements: logAchievements.trim(),
        issuesAndActions: logIssues.trim() || undefined,
        nextSteps: logNextSteps.trim() || undefined,
        periodYm,
      });
      setLogAchievements('');
      setLogIssues('');
      setLogNextSteps('');
      setShowLogModal(false);
      showToast(`${periodYm} 월별 체크인이 저장되었습니다.`, 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '체크인 저장 실패', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;
    if (!projectId || projectId.startsWith('obj-')) {
      showToast('실행 프로젝트를 먼저 선택해주세요.', 'warning');
      return;
    }

    setBusy(true);
    try {
      await onCreateFeedback({
        projectId,
        authorName: authorName || '평가 관리자',
        authorRole: '팀장/디렉터',
        feedbackType,
        content: feedbackInput.trim(),
      });
      setFeedbackInput('');
      showToast('상사 피드백이 등록되었습니다.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '피드백 저장 실패', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 일지 작성 버튼 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mb-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>월별 체크</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900" data-testid="mbo-monthly-project-title">
            {projectTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">월별 진척 체크인 및 상사 피드백 루프</p>
        </div>

        <button
          type="button"
          data-testid="mbo-monthly-checkin-open"
          onClick={() => setShowLogModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>월별 체크인 등록</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 좌측: 분기별 진행 로그 타임라인 (2열) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            월별 체크인 이력 ({filteredLogs.length}건)
          </h3>

          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              등록된 진행 일지가 없습니다. 첫 번째 성과를 기록해보세요.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">{log.authorName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] text-slate-400 font-mono">{log.logDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-600">
                    <span>진척률 {log.progressRate}%</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-700">주요 달성 성과:</h4>
                    <p className="text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {log.achievements}
                    </p>
                  </div>

                  {log.issuesAndActions && (
                    <div>
                      <h4 className="font-bold text-amber-700">이슈 및 조치 사항:</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                        {log.issuesAndActions}
                      </p>
                    </div>
                  )}

                  {log.nextSteps && (
                    <div>
                      <h4 className="font-bold text-slate-700">향후 실행 계획:</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {log.nextSteps}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 우측: 상사 피드백 & 코멘트 스레드 (1열) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            피드백 & 코멘트 ({filteredFeedbacks.length}건)
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredFeedbacks.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">아직 등록된 피드백이 없습니다.</p>
              ) : (
                filteredFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      fb.feedbackType === 'praise'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : fb.feedbackType === 'revision_request'
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{fb.authorName} ({fb.authorRole})</span>
                      <span className="text-slate-400">{fb.createdAt}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{fb.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* 피드백 작성 폼 */}
            <form onSubmit={handleFeedbackSubmit} className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFeedbackType('comment')}
                  className={`px-2 py-0.5 rounded-md font-bold ${
                    feedbackType === 'comment' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  일반 코멘트
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('praise')}
                  className={`px-2 py-0.5 rounded-md font-bold ${
                    feedbackType === 'praise' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  칭찬/격려
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('revision_request')}
                  className={`px-2 py-0.5 rounded-md font-bold ${
                    feedbackType === 'revision_request' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  보완 요청
                </button>
              </div>

              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="실무자에게 전할 구체적 피드백이나 지시사항을 입력하세요..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>전송</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 신규 진척 일지 모달 */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">월별 체크인 작성</h3>
            <form onSubmit={handleLogSubmit} className="space-y-3.5" data-testid="mbo-monthly-checkin-form">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">대상 월 (YYYY-MM)</label>
                <input
                  type="month"
                  data-testid="mbo-monthly-period"
                  value={periodYm}
                  onChange={(e) => setPeriodYm(e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  현재 누적 진척률: {logProgress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={logProgress}
                  onChange={(e) => setLogProgress(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">주요 달성 성과 *</label>
                <textarea
                  value={logAchievements}
                  onChange={(e) => setLogAchievements(e.target.value)}
                  placeholder="이번 기간 동안 실제로 완수하거나 달성한 핵심 결과를 적어주세요."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">이슈 및 장애 요인 (선택)</label>
                <textarea
                  value={logIssues}
                  onChange={(e) => setLogIssues(e.target.value)}
                  placeholder="발생한 지연 원인이나 협조가 필요한 병목 요인"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-16"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">향후 조치 계획 (선택)</label>
                <textarea
                  value={logNextSteps}
                  onChange={(e) => setLogNextSteps(e.target.value)}
                  placeholder="다음 주/분기까지 완수할 실행 과제"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  data-testid="mbo-monthly-checkin-submit"
                  disabled={busy}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-40"
                >
                  {busy ? '저장 중…' : '월별 체크인 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
