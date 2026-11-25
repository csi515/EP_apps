/** 작업표준·위험성평가 UI 문구 */
export const SOP_RISK_UI_COPY = {
  pageLoading: '작업 표준 및 위험성평가 와이드 매트릭스 로딩…',
  repledgeGateBlocked:
    '개정된 작업표준 재서약이 완료되기 전까지 당일 작업 출결/티켓이 활성화되지 않습니다.',
  repledgeLoadFailedPrefix: '재서약 상태를 확인하지 못해 작업을 차단했습니다.',
  submitReview: '검토 요청',
  resubmitReview: '다시 검토 요청',
  independentApprovalNote:
    '이 앱의 문서 결재는 전자결재(approval_workflow)와 별도 대기함입니다.',
  auditCycleHint: (months: number) =>
    `정기 위험성평가 권장 주기: ${months}개월. 주기가 지나면 정기 개정을 열어 주세요.`,
} as const;
