import type { CapabilitySetupSchema } from '@/core/presets/types';

export const hazardousSubstanceMsdsSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'hazardous_substance_msds',
  title: '유해화학물질 및 시약 MSDS 관리 설정',
  description: '화학물질 성상별(산/염기, 산화제/유기물) 격리 보관 규칙, 규제 대상 전구체 알림, 위험물 안전 재고 기준을 설정합니다.',
  fields: [
    {
      id: 'enforce_strict_separation',
      label: '혼합 보관 금지 규칙 엄격 적용 (산·염기 분리보관)',
      type: 'boolean',
      defaultValue: true,
      description: '반응성 및 유독가스 발생 위험이 있는 화학물질 간 동일 캐비닛 보관을 차단합니다.',
    },
    {
      id: 'require_usage_purpose',
      label: '시약 불출 시 사용 목적 및 연구과제 입력 필수',
      type: 'boolean',
      defaultValue: true,
      description: '일정량 이상 시약 불출 시 과제 번호와 사용 목적 입력을 의무화합니다.',
    },
    {
      id: 'precursor_alert_threshold_ml',
      label: '사제폭탄/마약 원료물질(전구체) 알림 기준량 (mL/g)',
      type: 'number',
      defaultValue: 50,
      description: '규제 대상 전구물질의 1회 불출량이 기준을 초과하면 연구실 책임자에게 즉시 알림을 발송합니다.',
    },
  ],
};
