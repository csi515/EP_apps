import type { CapabilitySetupSchema } from '@/core/presets/types';

export const patentIpAssetSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'patent_ip_asset',
  title: '특허 및 직무발명 보상 관리 설정',
  description: '사내 연구원 발명 신고, 특허 심의위원회 등급(A/B/C) 기준, 출원 및 등록 직무발명 보상금 기준을 설정합니다.',
  fields: [
    {
      id: 'default_application_reward_amount',
      label: '특허 출원 기본 보상금 (원)',
      type: 'number',
      defaultValue: 500000,
      description: '특허청 출원 완료 시 발명자들에게 지분율대로 지급되는 직무발명 보상금입니다.',
    },
    {
      id: 'default_registration_reward_amount',
      label: '특허 등록 기본 보상금 (원)',
      type: 'number',
      defaultValue: 1000000,
      description: '특허 등록 결정 및 등록료 납부 시 지급되는 직무발명 등록 보상금입니다.',
    },
    {
      id: 'require_review_committee_grade',
      label: '사내 특허 심의위원회 등급(A/B/C) 부여 필수화',
      type: 'boolean',
      defaultValue: true,
      description: '발명 신고 접수 후 심의위원회에서 출원 방향(해외/국내/노하우)을 확정해야 출원 진행이 가능합니다.',
    },
  ],
};
