export function createTenantQueryKey(
  tenantId: string,
  domain: string,
  resource: string,
  params?: unknown
): readonly ['tenant', string, string, string, unknown] {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('tenantId is required');
  }
  return ['tenant', tenantId.trim(), domain, resource, params] as const;
}
