import { useMemo } from 'react';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { getResolvedTerm, type StandardTermKey } from '@/core/i18n/termEngine';
import { resolveIndustryId } from '@/core/industry/resolveIndustry';

export interface UseTenantTermsResult {
  customerTerm: string;
  instructorTerm: string;
  spaceTerm: string;
  passTerm: string;
  lessonTerm: string;
  bookingTerm: string;
  resolve: (key: StandardTermKey) => string;
}

/**
 * useTenantTerms
 * 현재 조직의 업종 기본 용어 및 사용자 맞춤 용어를 통합 해석하여 단일 진실 공급원(SSOT)으로 제공하는 훅.
 */
export function useTenantTerms(): UseTenantTermsResult {
  const orgContext = useOptionalOrganization();
  const currentOrg = orgContext?.currentOrganization;
  const customTerms = orgContext?.customTerms || {};
  const industryType = resolveIndustryId(currentOrg?.industry_type) ?? '';

  const customerTerm = useMemo(
    () => getResolvedTerm('term.customer', customTerms, industryType),
    [customTerms, industryType]
  );
  const instructorTerm = useMemo(
    () => getResolvedTerm('term.instructor', customTerms, industryType),
    [customTerms, industryType]
  );
  const spaceTerm = useMemo(
    () => getResolvedTerm('term.space', customTerms, industryType),
    [customTerms, industryType]
  );
  const passTerm = useMemo(
    () => getResolvedTerm('term.pass', customTerms, industryType),
    [customTerms, industryType]
  );
  const lessonTerm = useMemo(
    () => getResolvedTerm('term.lesson', customTerms, industryType),
    [customTerms, industryType]
  );

  const bookingTerm = useMemo(() => {
    return `${lessonTerm}예약`;
  }, [lessonTerm]);

  const resolve = (key: StandardTermKey) => {
    return getResolvedTerm(key, customTerms, industryType);
  };

  return {
    customerTerm,
    instructorTerm,
    spaceTerm,
    passTerm,
    lessonTerm,
    bookingTerm,
    resolve,
  };
}
