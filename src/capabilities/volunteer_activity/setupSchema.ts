import type { CapabilitySetupSchema } from '@/core/presets/types';

export const volunteerActivitySetupSchema: CapabilitySetupSchema = {
  capabilityId: 'volunteer_activity',
  title: '사내 봉사활동',
  description: '봉사활동 종류·모집인원 게시 및 임직원 참여 신청',
  fields: [
    {
      id: 'autoApproveApplication',
      label: '봉사활동 신청 즉시 자동 승인',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'defaultCategories',
      label: '기본 봉사활동 분야',
      type: 'tags',
      defaultValue: ['환경정화', '교육지원', '재능기부'],
    },
  ],
};
