import type { CapabilitySetupSchema } from '@/core/presets/types';

export const researchProjectSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'research_project',
  title: '연구과제 관리 설정',
  description:
    '연구 담당/부담당, 예산 한도, 기본 게이트(1~n차) 템플릿을 설정합니다. MBO 평가와는 별도의 연구과제 생명주기입니다.',
  fields: [
    {
      id: 'default_gate_count',
      label: '기본 게이트 차수',
      type: 'number',
      defaultValue: 3,
      description: '신규 과제 생성 시 기본으로 생성할 게이트 개수(1~n차)입니다.',
    },
    {
      id: 'require_co_lead',
      label: '부담당자 지정 필수',
      type: 'boolean',
      defaultValue: false,
      description: '켜면 과제 등록 시 부담당자(co_lead)를 1명 이상 지정해야 합니다.',
    },
    {
      id: 'block_overspend',
      label: '계획 예산 초과 집행 차단',
      type: 'boolean',
      defaultValue: true,
      description: '집행액이 계획 예산을 넘으면 저장을 거부합니다.',
    },
  ],
};
