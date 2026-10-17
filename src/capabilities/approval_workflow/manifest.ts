import { defineCapability } from '../_shared/capabilityTypes';

export const approval_workflowCapability = defineCapability({
  id: 'approval_workflow',
  displayName: '전사 범용 전자결재 및 기안 승인 워크플로',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [
    'approval:view',
    'approval:create',
    'approval:approve',
    'approval:admin',
  ],
});
