import type { CapabilitySetupSchema } from '@/core/presets/types';

export const facility_incident_reportSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'facility_incident_report',
  title: '시설 안전사고 및 파손 경위서 설정',
  description: '사고 발생 시 기본 배상책임보험사 및 보호자 안내 규칙을 설정합니다.',
  fields: [
    {
      id: 'insuranceCompanyName',
      type: 'text',
      label: '가입 배상책임보험사',
      description: '사고 접수 시 기본 적용될 보험사명 (예: 현대해상, 삼성화재)',
      defaultValue: '',
      required: false,
    },
    {
      id: 'notifyGuardianOnMinorIncident',
      type: 'boolean',
      label: '경미한 부상도 보호자 유선 안내',
      description: '경미한 찰과상 등도 보호자에게 상황을 투명하게 안내합니다.',
      defaultValue: true,
      required: false,
    },
    {
      id: 'defaultHospitalAddress',
      type: 'text',
      label: '인근 지정/연계 병원 정보',
      description: '응급 후송 시 우선 방문할 병원명 및 연락처',
      defaultValue: '',
      required: false,
    },
  ],
};

export const facilityIncidentReportSetupSchema = facility_incident_reportSetupSchema;
