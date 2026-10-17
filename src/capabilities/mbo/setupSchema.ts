import type { CapabilitySetupSchema } from '@/core/presets/types';

export const mboSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'mbo',
  title: '목표관리(MBO) 운영 설정',
  description: '회사·부서·개인 목표 계층, 실행 계획 승인 절차, 정기 평가 주기 및 평가 기준 설정',
  fields: [
    {
      id: 'mbo_mode',
      label: 'MBO 운영 모드',
      type: 'select',
      defaultValue: 'simple',
      description: '소규모 매장은 개인/프로젝트 중심 간이 모드를, 중대형 조직은 회사-부서-개인 계층 모드를 선택합니다.',
      options: [
        { label: '간이 모드 (개인/프로젝트 직접 관리)', value: 'simple' },
        { label: '조직 확장 모드 (회사-부서-개인 3계층 승인 라인)', value: 'enterprise' },
      ],
    },
    {
      id: 'require_plan_approval',
      label: '계획 작성 시 관리자 승인 필수',
      type: 'boolean',
      defaultValue: true,
      description: '직원이 목표 및 프로젝트 계획을 등록하면 관리자 승인을 득한 후 실행으로 전이됩니다.',
    },
    {
      id: 'allow_self_evaluation',
      label: '직원 자기 평가 단계 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '관리자 최종 평가 전 직원이 본인의 성과를 사전 평가할 수 있습니다.',
    },
    {
      id: 'evaluation_scale',
      label: '평가 등급 척도',
      type: 'select',
      defaultValue: '5_tier',
      description: '평가 시 부여할 등급 기준을 지정합니다.',
      options: [
        { label: '5단계 등급 (S / A / B / C / D)', value: '5_tier' },
        { label: '3단계 등급 (우수 / 보통 / 미흡)', value: '3_tier' },
      ],
    },
  ],
};
