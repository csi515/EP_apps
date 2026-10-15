import { useMemo } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  getResolvedTerm,
  replaceTenantTerms,
  type StandardTermKey,
} from './termEngine';

export interface UseTenantTermsResult {
  t: (key: StandardTermKey | string, fallback?: string) => string;
  format: (templateText: string) => string;
  customTerms: Record<string, string>;
  industryType?: string;
}

/**
 * 사업장 맞춤 도메인 용어 사전 리액트 훅
 */
export function useTenantTerms(): UseTenantTermsResult {
  const { currentOrganization } = useOrganization();

  const settings = (currentOrganization?.settings ?? {}) as Record<string, unknown>;
  const customTerms = (settings.custom_terms ?? {}) as Record<string, string>;
  const industryType = currentOrganization?.industry_type;

  const t = useMemo(() => {
    return (key: StandardTermKey | string, fallback?: string): string => {
      return getResolvedTerm(key, customTerms, industryType, fallback);
    };
  }, [customTerms, industryType]);

  const format = useMemo(() => {
    return (templateText: string): string => {
      return replaceTenantTerms(templateText, customTerms, industryType);
    };
  }, [customTerms, industryType]);

  return {
    t,
    format,
    customTerms,
    industryType,
  };
}

/**
 * 단일 용어 치환 편의 훅
 */
export function useTenantTerm(key: StandardTermKey | string, fallback?: string): string {
  const { t } = useTenantTerms();
  return t(key, fallback);
}
