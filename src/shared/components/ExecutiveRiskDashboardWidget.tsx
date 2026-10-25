import React from 'react';
import { useList } from '@refinedev/core';
import {
  calculateExecutiveRiskScore,
  type DepartmentRiskFactors,
  type RiskLevelGrade,
} from '@/capabilities/_shared/riskDashboardEngine';

export const ExecutiveRiskDashboardWidget: React.FC = () => {
  // 1. 안전 사고 목록 조회
  const { query: incidentQuery } = useList<any>({
    resource: 'facility_incident_reports',
    pagination: { pageSize: 50 },
  });
  const incidents = incidentQuery?.data?.data || [];
  const openIncidents = incidents.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed');
  const criticalIncidents = openIncidents.filter((i: any) => i.severity === 'critical' || i.severity === 'high');

  // 2. 고객 VOC 불만 목록 조회
  const { query: feedbackQuery } = useList<any>({
    resource: 'feedbacks',
    pagination: { pageSize: 50 },
  });
  const feedbacks = feedbackQuery?.data?.data || [];
  const openComplaints = feedbacks.filter((f: any) => f.status === 'open' || f.status === 'in_progress');

  // 3. 미납/연체 청구서 목록 조회
  const { query: invoiceQuery } = useList<any>({
    resource: 'invoices',
    pagination: { pageSize: 100 },
  });
  const invoices = invoiceQuery?.data?.data || [];
  const unpaidInvoices = invoices.filter((inv: any) => inv.status === 'unpaid' || inv.status === 'overdue');
  const overdueRatio = invoices.length > 0 ? unpaidInvoices.length / invoices.length : 0;

  // 4. 통합 리스크 지수 계산
  const factors: DepartmentRiskFactors = {
    incidentCount: openIncidents.length,
    criticalIncidentCount: criticalIncidents.length,
    vocComplaintCount: openComplaints.length,
    npsDetractorRatio: 0.1, // 기본 추정치
    unpaidInvoiceCount: unpaidInvoices.length,
    overdueInvoiceRatio: overdueRatio,
  };

  const assessment = calculateExecutiveRiskScore(factors);

  const getGradeBadge = (grade: RiskLevelGrade) => {
    switch (grade) {
      case 'critical':
        return <span className="px-2.5 py-1 bg-red-600 text-white font-black text-xs rounded-full animate-pulse">심각 (CRITICAL)</span>;
      case 'warning':
        return <span className="px-2.5 py-1 bg-amber-500 text-white font-bold text-xs rounded-full">경고 (WARNING)</span>;
      case 'caution':
        return <span className="px-2.5 py-1 bg-yellow-500 text-white font-bold text-xs rounded-full">주의 (CAUTION)</span>;
      case 'normal':
        return <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full">정상 (NORMAL)</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      {/* 상단 헤더 & 점수 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🛡️ 전사 통합 경영 리스크 지수</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            안전사고·고객VOC·NPS·미수금 4대 지표 실시간 결합 분석
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getGradeBadge(assessment.grade)}
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {assessment.riskScore}
            <span className="text-xs font-normal text-slate-400">/100점</span>
          </span>
        </div>
      </div>

      {/* 3대 리스크 세부 게이지 바 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span>안전/설비 리스크</span>
            <span>{assessment.breakdown.safetyScore}/30점</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full"
              style={{ width: `${(assessment.breakdown.safetyScore / 30) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">미결 사고: {factors.incidentCount}건</p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span>고객 VOC 리스크</span>
            <span>{assessment.breakdown.customerScore}/30점</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{ width: `${(assessment.breakdown.customerScore / 30) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">미처리 불만: {factors.vocComplaintCount}건</p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span>재무/수납 리스크</span>
            <span>{assessment.breakdown.financialScore}/40점</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${(assessment.breakdown.financialScore / 40) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">미수금 청구: {factors.unpaidInvoiceCount}건</p>
        </div>
      </div>

      {/* 추천 조치 사항 알림 */}
      <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1 text-xs">
        <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
          <span>📋 경영진 권고 조치 사항 (Action Items)</span>
        </div>
        <div className="space-y-0.5 text-blue-800 dark:text-blue-200">
          {assessment.keyActionItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-1">
              <span>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
