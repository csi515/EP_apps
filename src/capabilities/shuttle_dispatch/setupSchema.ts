import type { CapabilitySetupSchema } from '@/core/presets/types';

export const shuttleDispatchSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'shuttle_dispatch',
  title: '사내 통근 셔틀',
  description: '노선·정류장(승하차 시각) 마스터 및 임직원 고정 탑승 명부',
  fields: [
    {
      id: 'defaultRoutes',
      label: '기본 운행 노선 목록',
      type: 'tags',
      defaultValue: ['본사-강남역', '본사-판교역'],
    },
    {
      id: 'enableBoardingCheck',
      label: '모바일 탑승 확인(QR/체크인) 사용',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
