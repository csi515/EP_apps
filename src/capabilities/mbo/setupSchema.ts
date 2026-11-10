import type { CapabilitySetupSchema } from '@/core/presets/types';

export const mboSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'mbo',
  title: '목표관리(MBO) 운영 설정',
  description: '회사·부서·개인 목표 계층, 실행 계획 승인 절차, 정기 점검 주기 설정',
  fields: [
    {
      id: 'require_plan_approval',
      label: '계획 작성 시 관리자 승인 필수',
      type: 'boolean',
      defaultValue: true,
      description: '직원이 목표 및 프로젝트 계획을 등록하면 관리자 승인을 득한 후 실행으로 전이됩니다.',
    },
  ],
};
