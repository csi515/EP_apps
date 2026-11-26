import type { ConsentTemplate } from '../domain/safetyConsentEngine';

/**
 * 사업장 기본 서약 양식(UI 카피).
 * 서버·테넌트별 템플릿 CRUD 및 버전 관리는 W3 — 여기는 클라이언트 시드만 담당한다.
 */
export const SAFETY_CONSENT_DEFAULT_TEMPLATES: ConsentTemplate[] = [
  {
    id: 'tpl-tbm',
    type: 'PLANT_TBM_PLEDGE',
    version: 1,
    title: 'TBM(작업 전 안전조회) 및 작업표준 준수 서약서',
    bodyText:
      '본인은 당일 작업표준·위험성평가 내용을 숙지하였으며, 지정된 보호구 착용과 금지행위 준수를 서약합니다. 이상 징후 발견 시 즉시 작업을 중단하고 관리자에게 보고하겠습니다.',
    mandatoryClauses: [
      { id: 'c1', text: '당일 SOP·위험성평가 숙지 확인' },
      { id: 'c2', text: '필수 보호구 착용 및 점검 확인' },
      { id: 'c3', text: '이상 시 작업 중단·보고 의무 동의' },
    ],
    effectiveFrom: '2025-01-01',
    isActive: true,
  },
  {
    id: 'tpl-ppe',
    type: 'PLANT_PPE_PLEDGE',
    version: 1,
    title: '개인보호구(PPE) 착용 및 관리 서약서',
    bodyText:
      '본인은 공정별 필수 보호구를 올바르게 착용·점검하며, 손상·분실 시 즉시 교체 요청할 것을 서약합니다.',
    mandatoryClauses: [
      { id: 'c1', text: '공정별 필수 PPE 목록 확인' },
      { id: 'c2', text: '착용 상태 점검 후 작업 개시' },
      { id: 'c3', text: '손상·분실 시 즉시 보고' },
    ],
    effectiveFrom: '2025-01-01',
    isActive: true,
  },
  {
    id: 'tpl-hotwork',
    type: 'PLANT_HOT_WORK_PLEDGE',
    version: 1,
    title: '화기·고소·밀폐 등 위험작업 안전 서약서',
    bodyText:
      '본인은 화기·고소·밀폐공간 등 위험작업 전 허가·측정·감시 절차를 준수하며, 허가 범위 외 작업을 하지 않을 것을 서약합니다.',
    mandatoryClauses: [
      { id: 'c1', text: '작업허가(또는 동등 절차) 확인' },
      { id: 'c2', text: '가스농도·화재감시 등 사전 점검' },
      { id: 'c3', text: '허가 범위 외 작업 금지' },
    ],
    effectiveFrom: '2025-01-01',
    isActive: true,
  },
];