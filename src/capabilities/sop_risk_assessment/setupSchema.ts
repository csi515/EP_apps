import type { CapabilitySetupSchema } from '@/core/presets/types';

export const sopRiskAssessmentSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'sop_risk_assessment',
  title: '작업표준 및 위험성평가 설정',
  description: '산업안전보건법 기준 5x5 빈도·강도 매트릭스 및 고위험 개선 대책 기준을 설정합니다.',
  fields: [
    {
      id: 'critical_risk_threshold',
      label: '중대 위험(Critical) 판정 점수 기준 (이상)',
      type: 'number',
      defaultValue: 15,
      description: '해당 점수 이상의 위험요인은 작업 즉시 중지 및 우선 개선 조치 대상이 됩니다.',
    },
    {
      id: 'require_ppe_checklist',
      label: '공정 작업 전 필수 개인보호구(PPE) 착용 체크',
      type: 'boolean',
      defaultValue: true,
      description: '작업표준(SOP) 수행 시 필수 보호구 구비 여부를 사전에 확인합니다.',
    },
    {
      id: 'regular_audit_cycle_months',
      label: '정기 위험성평가 실시 주기 (개월)',
      type: 'number',
      defaultValue: 12,
      description: '법정 정기 위험성평가 주기(기본 1년 단위)입니다.',
    },
  ],
};
