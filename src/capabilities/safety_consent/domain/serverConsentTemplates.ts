import type { ConsentTemplate } from './safetyConsentEngine';

/**
 * W3 (미구현): 테넌트·버전별 서약 템플릿 CRUD는 `safety_consent_templates` 서버 API·DB 담당.
 * 현재 ManagementView는 `SAFETY_CONSENT_DEFAULT_TEMPLATES` 클라이언트 시드만 사용한다.
 */
export type ServerConsentTemplateListQuery = {
  organizationId: string;
  type?: string;
  activeOnly?: boolean;
};

export interface SafetyConsentTemplateServerPort {
  listTemplates(query: ServerConsentTemplateListQuery): Promise<ConsentTemplate[]>;
}

/** W3 스텁 — 서버 목록 없음. UI는 기본 시드 템플릿으로 폴백. */
export const stubSafetyConsentTemplateServer: SafetyConsentTemplateServerPort = {
  async listTemplates() {
    return [];
  },
};