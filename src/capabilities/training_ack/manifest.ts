import { defineCapability } from '../_shared/capabilityTypes';

export const training_ackCapability = defineCapability({
  id: 'training_ack',
  displayName: '교육관리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['training_ack:manage'],
});
