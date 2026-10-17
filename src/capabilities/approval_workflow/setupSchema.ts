import type { CapabilitySetupSchema } from '@/core/presets/types';

export const approvalWorkflowSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'approval_workflow',
  title: '전자결재 및 기안 승인 설정',
  description: '부서별 기안 양식, 금액별 전결 규정, 다단계 승인선 및 전자서명 정책 설정',
  fields: [
    {
      id: 'default_approval_mode',
      label: '기본 결재선 모드',
      type: 'select',
      defaultValue: 'sequential',
      description: '순차 결재(담당->팀장->대표) 또는 병렬 합의 모드를 선택합니다.',
      options: [
        { label: '순차 결재 (직급별 단계적 승인)', value: 'sequential' },
        { label: '합의 병행 결재 (부서장 합의 후 최종 승인)', value: 'consensus' },
      ],
    },
    {
      id: 'require_digital_signature',
      label: '결재 시 터치 전자서명 필수',
      type: 'boolean',
      defaultValue: true,
      description: '승인/합의 처리 시 모바일 화면에 자필 서명을 남겨 법적 감사 증빙을 확보합니다.',
    },
    {
      id: 'auto_notify_next_approver',
      label: '다음 결재자 푸시/인앱 알림 자동 발송',
      type: 'boolean',
      defaultValue: true,
      description: '앞 단계 결재가 완료되면 다음 순번 결재자에게 즉시 승인 요청 알림을 발송합니다.',
    },
    {
      id: 'allow_requester_cancel',
      label: '결재 진행 중 기안자 자진 취소 허용',
      type: 'boolean',
      defaultValue: true,
      description: '최종 승인 전까지 기안자가 오기재 문서를 자진 회수/취소할 수 있도록 허용합니다.',
    },
  ],
};
