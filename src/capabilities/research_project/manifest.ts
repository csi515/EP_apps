import { defineCapability } from '../_shared/capabilityTypes';

export const research_projectCapability = defineCapability({
  id: 'research_project',
  displayName: '연구과제 생명주기 관리',
  dependencies: ['approval_workflow'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
