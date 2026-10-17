import { defineCapability } from '../_shared/capabilityTypes';

export const patent_ip_assetCapability = defineCapability({
  id: 'patent_ip_asset',
  displayName: '특허 및 직무발명 지식재산권 관리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
