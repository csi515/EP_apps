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
      // 미구현·설정 무시 — UI/런타임에서 읽지 않음 (노선은 마스터 테이블로 관리)
      defaultValue: ['본사-강남역', '본사-판교역'],
      description: '미구현·설정 무시. 실제 노선은 셔틀 노선 마스터에서 관리합니다.',
    },
    {
      id: 'enableBoardingCheck',
      label: '모바일 탑승 확인(QR/체크인) 사용',
      type: 'boolean',
      // 미구현·설정 무시 — defaultEnabled false
      defaultValue: false,
      description: '미구현·설정 무시. QR/체크인 탑승 확인은 아직 런타임에 연결되지 않았습니다.',
    },
  ],
};
