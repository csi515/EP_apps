import type { CapabilitySetupSchema } from '@/core/presets/types';

export const seatRoomSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'seat_room',
  title: '공간·좌석 시간 점유 설정',
  description: '총 좌석/룸 수와 기본 이용시간, 초과 페널티 요율, 퇴실 청소 필요 여부를 설정합니다.',
  fields: [
    {
      id: 'roomManagementMode',
      label: '공간·룸 운영 방식',
      type: 'select',
      defaultValue: 'free',
      options: [
        { value: 'free', label: '자율 빈방 이용 (호실 구분 없이 자유 연습/이용)' },
        { value: 'assigned', label: '호실별 지정 관리 (1호실, 2호실 등 개별 룸 배정)' },
        { value: 'none', label: '룸 구분 없음 (오픈형 단일 공간/미사용)' },
      ],
      description: '호실 구분 없이 자율 이용할 경우 개별 룸 이름을 등록하지 않아도 됩니다.',
    },
    {
      id: 'totalCapacity',
      label: '총 공간/좌석 수량 (개)',
      type: 'number',
      defaultValue: 20,
      required: true,
    },
    {
      id: 'defaultDurationMinutes',
      label: '기본 이용 단위 시간 (분)',
      type: 'number',
      defaultValue: 60,
      required: true,
    },
    {
      id: 'baseRatePerHour',
      label: '시간당 기본 요금 (원)',
      type: 'number',
      defaultValue: 3000,
    },
    {
      id: 'overduePenaltyRate',
      label: '초과 이용 할증 배율',
      type: 'number',
      defaultValue: 1.5,
      description: '정해진 시간 초과 시 적용할 할증 배율 (예: 1.5 = 150%)',
    },
    {
      id: 'requiresCleaning',
      label: '퇴실 시 청소/소독 프로세스 필수 여부',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
