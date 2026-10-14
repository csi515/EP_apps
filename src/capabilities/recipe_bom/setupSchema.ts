import type { CapabilitySetupSchema } from '@/core/presets/types';

export const recipeBomSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'recipe_bom',
  title: '식자재 레시피 & 자동 소모 BOM 원가 설정',
  description: '메뉴 주문 접수 시 식자재 재고 자동 차감 여부 및 목표 마진율 임계값을 설정합니다.',
  fields: [
    {
      id: 'autoDeductOnOrder',
      label: '주문/결제 접수 시 식자재 재고 자동 차감',
      type: 'boolean',
      defaultValue: true,
      description: '주문 1건 발생 시 레시피 BOM에 정의된 원자재 수량이 즉시 감량됩니다.',
    },
    {
      id: 'targetMarginRatePercent',
      label: '목표 마진율 기준 (%)',
      type: 'number',
      defaultValue: 70,
      description: '설정 마진율 미만인 메뉴는 원가 주의 배지가 표시됩니다.',
    },
    {
      id: 'allowCustomRecipeAdjustment',
      label: '현장 주문 시 시럽/샷 추가 등 커스텀 레시피 반영 허용',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
