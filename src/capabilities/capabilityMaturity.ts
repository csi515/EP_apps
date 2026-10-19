/** 4대 실측(저장·권한·화면·테스트) 기준 Capability 성숙도. */
export const CAPABILITY_MATURITY = {
  mbo_management: 'B',
  shuttle_dispatch: 'B-',
  attendance_loop: 'A',
  ticket_passes: 'B+',
  workplace_policy: 'B',
  retail_inventory: 'A-',
  safety_consent: 'C+',
} as const;

export type CapabilityMaturityId = keyof typeof CAPABILITY_MATURITY;
