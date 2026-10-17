import React, { useState } from 'react';
import {
  Award,
  ShieldCheck,
  Lock,
  Plus,
  User,
  Star,
  CheckCircle2,
} from 'lucide-react';
import {
  calculateGradeFromScore,
  type MboEvaluationGrade,
  type MboEvaluationType,
} from '../domain/mboEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export interface EvaluationItem {
  id: string;
  projectId: string;
  targetUserName: string;
  evaluatorName: string;
  evaluationType: MboEvaluationType;
  score: number;
  grade: MboEvaluationGrade;
  qualitativeFeedback: string;
  isConfidential: boolean;
  createdAt: string;
}

interface MboEvaluationMatrixViewProps {
  projectId: string;
  projectTitle: string;
  targetUserName: string;
  evaluations: EvaluationItem[];
  onCreateEvaluation: (evalItem: Omit<EvaluationItem, 'id' | 'grade' | 'createdAt'>) => void;
}

export const MboEvaluationMatrixView: React.FC<MboEvaluationMatrixViewProps> = ({
  projectId,
  projectTitle,
  targetUserName,
  evaluations,
  onCreateEvaluation,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [evalType, setEvalType] = useState<MboEvaluationType>('self');
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState('');
  const [isConfidential, setIsConfidential] = useState(true);

  const filteredEvals = evaluations.filter((e) => e.projectId === projectId);

  // 평균 점수 산출
  const avgScore =
    filteredEvals.length > 0
      ? Math.round(filteredEvals.reduce((sum, e) => sum + e.score, 0) / filteredEvals.length)
      : 0;
  const avgGrade = calculateGradeFromScore(avgScore);

  const getEvaluationTypeLabel = (type: MboEvaluationType) => {
    switch (type) {
      case 'self':
        return '본인 자기평가';
      case 'peer':
        return '동료 다면평가';
      case 'manager':
        return '1차 상사평가';
      case 'final':
        return '최종 심의평가';
    }
  };

  const getGradeBadge = (grade: MboEvaluationGrade) => {
    switch (grade) {
      case 'S':
        return <span className="px-2 py-0.5 rounded-full font-black text-xs bg-purple-100 text-purple-700">등급 S (탁월)</span>;
      case 'A':
        return <span className="px-2 py-0.5 rounded-full font-black text-xs bg-emerald-100 text-emerald-700">등급 A (우수)</span>;
      case 'B':
        return <span className="px-2 py-0.5 rounded-full font-black text-xs bg-blue-100 text-blue-700">등급 B (보통)</span>;
      case 'C':
        return <span className="px-2 py-0.5 rounded-full font-black text-xs bg-amber-100 text-amber-700">등급 C (미흡)</span>;
      case 'D':
        return <span className="px-2 py-0.5 rounded-full font-black text-xs bg-rose-100 text-rose-700">등급 D (경고)</span>;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      showToast('정성 평가 피드백을 작성해주세요.', 'warning');
      return;
    }

    onCreateEvaluation({
      projectId,
      targetUserName,
      evaluatorName: '현재 평가자',
      evaluationType: evalType,
      score,
      qualitativeFeedback: feedback.trim(),
      isConfidential,
    });

    setFeedback('');
    setShowModal(false);
    showToast('다면 평가표가 등록되었습니다.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* 상단 평가 대시보드 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold mb-1">
            <Award className="w-3.5 h-3.5" />
            <span>MBO 다면 성과평가표</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">{projectTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            대상자: <span className="font-bold text-slate-700">{targetUserName}</span> · 자기평가 및 상사/동료 다면 점수표
          </p>
        </div>

        <div className="flex items-center gap-4">
          {filteredEvals.length > 0 && (
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">종합 평균 점수</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{avgScore}점</span>
                  {getGradeBadge(avgGrade)}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>평가서 등록</span>
          </button>
        </div>
      </div>

      {/* 평가 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvals.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            등록된 성과 평가 결과가 없습니다. 평가를 시작하세요.
          </div>
        ) : (
          filteredEvals.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {getEvaluationTypeLabel(item.evaluationType)}
                  </span>
                  {item.isConfidential && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" />
                      비공개
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-slate-900">{item.score}점</span>
                  {getGradeBadge(item.grade)}
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>평가자: {item.evaluatorName}</span>
                  <span>{item.createdAt}</span>
                </div>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed text-slate-800 font-medium">
                  "{item.qualitativeFeedback}"
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 신규 평가 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">성과 평가서 작성</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">평가 유형</label>
                <select
                  value={evalType}
                  onChange={(e) => setEvalType(e.target.value as MboEvaluationType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                >
                  <option value="self">본인 자기평가</option>
                  <option value="peer">동료 다면평가</option>
                  <option value="manager">1차 상사평가</option>
                  <option value="final">최종 심의평가</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>평가 점수: {score}점</span>
                  <span>{getGradeBadge(calculateGradeFromScore(score))}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">정성 평가 피드백 *</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="목표 대비 주요 성과 및 보완점에 대한 상세 의견을 작성하세요."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-24"
                  required
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700">비공개 평가 (인사 평가자 외 열람 제한)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  평가 제출
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
