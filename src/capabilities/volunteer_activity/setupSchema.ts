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
      // 미구현·설정 무시 — defaultEnabled false
      defaultValue: false,
      description: '미구현·설정 무시. 신청 승인 흐름은 관리 화면에서 수동 처리합니다.',
    },
    {
      id: 'defaultCategories',
      label: '기본 봉사활동 분야',
      type: 'tags',
      // 미구현·설정 무시 — UI/런타임에서 읽지 않음
      defaultValue: ['환경정화', '교육지원', '재능기부'],
      description: '미구현·설정 무시. 봉사 분야는 활동 등록 시 개별 입력합니다.',
    },
  ],
};
