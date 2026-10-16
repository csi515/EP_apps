import type { CapabilitySetupSchema } from '@/core/presets/types';

export const supply_restockSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'supply_restock',
  title: '소모품 안전재고 및 간이 발주서 설정',
  description: '매장 필수 소모품 안전재고 알림 기준 및 공급처별 원터치 발주서 서식을 설정합니다.',
  fields: [
    {
      id: 'default_safety_margin_percent',
      label: '안전재고 권장 여유율 (%)',
      type: 'number',
      defaultValue: 20,
      description: '주간 평균 소모량 대비 최소한으로 유지해야 하는 안전재고 여유 비율입니다.',
    },
    {
      id: 'enable_web_share_po',
      label: '모바일 메신저(카카오톡/문자) 원터치 발주서 공유 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '생성된 발주서를 브라우저 공유 기능으로 거래처 담당자에게 즉시 전송합니다.',
    },
  ],
};
