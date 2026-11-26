/** 시설 점검 → CAPA → 사고 대장 연계 UI 문구 */
export const MAINTENANCE_CAPA_UI_COPY = {
  draftReady: 'CAPA 초안이 준비되었습니다. 확인 후 사고 대장에 등록해 주세요.',
  persistSuccessCreate: '시설 사고 대장에 CAPA가 등록되었습니다.',
  persistSuccessLink: '기존 사고 보고서에 CAPA가 연결되었습니다.',
  persistFailed: '사고 대장 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  confirmRegister: '사고 대장 등록',
  confirming: '등록 중…',
  linkageDisabled: '현재 조직 설정에서 점검-CAPA 사고 연계가 비활성화되어 있습니다.',
  organizationRequired: '조직이 선택되지 않아 저장할 수 없습니다.',
  supabaseNotConfigured: '서버 데이터 연동이 설정되지 않아 사고 대장에 저장할 수 없습니다.',
  missingDraft: '등록할 CAPA 초안이 없습니다.',
} as const;

export type MaintenanceCapaPersistBlockReason = keyof Pick<
  typeof MAINTENANCE_CAPA_UI_COPY,
  'linkageDisabled' | 'organizationRequired' | 'supabaseNotConfigured'
>;