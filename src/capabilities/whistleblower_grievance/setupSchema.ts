import type { CapabilitySetupSchema } from '@/core/presets/types';

export const whistleblowerGrievanceSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'whistleblower_grievance',
  title: '익명 고충 제보 보안 설정',
  description: '제보 접수 시 처리 기한(일) 및 열람 권한 보안 정책을 설정합니다.',
  fields: [
    {
      id: 'investigation_sla_days',
      label: '고충 처리 권고 기한(일)',
      type: 'number',
      defaultValue: 14,
      description: '접수된 익명 제보에 대해 인사위원회가 1차 조치 결과를 회신해야 하는 기한입니다.',
    },
    {
      id: 'mask_ip_address',
      label: '제보자 IP 및 식별 정보 완전 삭제',
      type: 'boolean',
      defaultValue: true,
      description: '보복 방지를 위해 네트워크 접속 IP 및 브라우저 User-Agent를 일체 저장하지 않습니다.',
    },
  ],
};
