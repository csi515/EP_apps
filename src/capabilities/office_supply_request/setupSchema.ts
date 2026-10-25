import type { CapabilitySetupSchema } from '@/core/presets/types';

export const officeSupplyRequestSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'office_supply_request',
  title: '사무용품 월별 취합',
  description: '구매 가능 품목 카탈로그·마감일 캠페인·임직원 신청·부서별 취합',
  fields: [
    {
      id: 'monthlyCutoffDay',
      label: '월별 신청 마감일 (매월 일자)',
      type: 'number',
      defaultValue: 25,
    },
    {
      id: 'maxMonthlyBudgetPerUser',
      label: '1인당 월별 신청 한도금액 (원)',
      type: 'number',
      defaultValue: 50000,
    },
  ],
};
