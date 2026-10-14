import type { CapabilitySetupSchema } from '@/core/presets/types';

export const equipmentLifecycleSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'equipment_lifecycle',
  title: '고가 기구 점검 주기 & 감가상각 설정',
  description: '장비별 정기 점검 주기, 내용연수 감가상각 및 신규 교체 임계 비율을 설정합니다.',
  fields: [
    {
      id: 'replacementCostThresholdPercent',
      label: '신규 교체 권장 임계 비율(%)',
      type: 'number',
      defaultValue: 50,
      description: '취득 원가 대비 누적 수리비가 이 비율을 초과하면 신규 장비 교체 권장 알림을 표시합니다.',
    },
    {
      id: 'dueSoonAlertDays',
      label: '정기 점검 도래 예고일(일)',
      type: 'number',
      defaultValue: 14,
      description: '다음 정기 점검일까지 남은 일수가 이 기준 이하일 때 사전 경고 상태로 전환합니다.',
    },
  ],
};
