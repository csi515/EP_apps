/**
 * Universal useTerminology hook.
 *
 * 현재 활성 업종 또는 컨텍스트에 따라 도메인 용어(TerminologyDictionary)를 조회하고,
 * dot-notation 번역 함수 t(key, fallback)를 제공합니다.
 *
 * 기존 useModuleLabels()와 완벽히 상호 호환됩니다.
 */

import { useMemo } from 'react';
import { useModuleLabels } from '../labels/ModuleLabelsProvider';
import { useOrganization } from '../organizations/OrganizationProvider';
import type { ModuleLabels } from '../labels/types';
import {
  DEFAULT_TERMINOLOGY_DICTIONARY,
  getTerminologyDictionary,
} from './dictionaries';
import { translateTerm } from './translate';
import type { TerminologyDictionary, TermKey } from './types';

export interface UseTerminologyResult {
  /** dot-notation 번역 함수 (예: t('customer.singular'), t('billing.fee')) */
  t: (key: TermKey, fallback?: string) => string;
  /** 현재 활성 전체 용어 사전 */
  terms: TerminologyDictionary;
  /** 레거시 및 기존 코드 호환용 ModuleLabels 객체 */
  labels: ModuleLabels;
}

function applyCustomTermsToDictionary(
  base: TerminologyDictionary,
  customTerms?: Record<string, string>
): TerminologyDictionary {
  if (!customTerms || Object.keys(customTerms).length === 0) {
    return base;
  }

  const customerSingular = customTerms['term.customer'] || customTerms['customer.singular'];
  const staffSingular = customTerms['term.staff'] || customTerms['staff.singular'];
  const serviceSingular = customTerms['term.service'] || customTerms['service.singular'];
  const scheduleSingular = customTerms['term.schedule'] || customTerms['schedule.singular'];
  const feeTerm = customTerms['term.pass'] || customTerms['billing.fee'];
  const roomTerm = customTerms['term.space'] || customTerms['facility.room'];

  return {
    ...base,
    customer: customerSingular
      ? {
          ...base.customer,
          singular: customerSingular,
          plural: customerSingular,
          management: `${customerSingular} 관리`,
          section: customerSingular,
          add: `${customerSingular} 등록`,
          search: `${customerSingular} 검색`,
        }
      : base.customer,
    staff: staffSingular
      ? {
          ...base.staff,
          singular: staffSingular,
          plural: staffSingular,
          management: `${staffSingular} 관리`,
        }
      : base.staff,
    service: serviceSingular
      ? {
          ...base.service,
          singular: serviceSingular,
          plural: serviceSingular,
          management: `${serviceSingular} 관리`,
        }
      : base.service,
    schedule: scheduleSingular
      ? {
          ...base.schedule,
          singular: scheduleSingular,
          plural: scheduleSingular,
          management: `${scheduleSingular} 관리`,
        }
      : base.schedule,
    billing: feeTerm
      ? {
          ...base.billing,
          fee: feeTerm,
        }
      : base.billing,
    facility: roomTerm
      ? {
          ...base.facility,
          room: roomTerm,
        }
      : base.facility,
  };
}

/**
 * 용어 사전 훅.
 * @param industryOverride 명시적으로 특정 업종의 용어를 사용하고자 할 때 전달. 미전달 시 컨텍스트 라벨 활용.
 */
export function useTerminology(
  industryOverride?: string | null,
  localeOverride?: 'ko' | 'en' | null
): UseTerminologyResult {
  const contextLabels = useModuleLabels();

  let orgCustomTerms: Record<string, string> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const org = useOrganization();
    orgCustomTerms = org?.customTerms;
  } catch {
    // outside OrganizationProvider
  }

  const terms = useMemo<TerminologyDictionary>(() => {
    let resolved: TerminologyDictionary;

    if (localeOverride === 'en') {
      resolved = getTerminologyDictionary(industryOverride, 'en');
    } else if (industryOverride) {
      resolved = getTerminologyDictionary(industryOverride, 'ko');
    } else if (contextLabels.billing && contextLabels.facility) {
      resolved = {
        customer: contextLabels.customer,
        contact: contextLabels.contact,
        staff: contextLabels.staff,
        service: contextLabels.service,
        schedule: contextLabels.schedule,
        billing: contextLabels.billing,
        facility: contextLabels.facility,
      };
    } else {
      resolved = {
        customer: contextLabels.customer ?? DEFAULT_TERMINOLOGY_DICTIONARY.customer,
        contact: contextLabels.contact ?? DEFAULT_TERMINOLOGY_DICTIONARY.contact,
        staff: contextLabels.staff ?? DEFAULT_TERMINOLOGY_DICTIONARY.staff,
        service: contextLabels.service ?? DEFAULT_TERMINOLOGY_DICTIONARY.service,
        schedule: contextLabels.schedule ?? DEFAULT_TERMINOLOGY_DICTIONARY.schedule,
        billing: contextLabels.billing ?? DEFAULT_TERMINOLOGY_DICTIONARY.billing,
        facility: contextLabels.facility ?? DEFAULT_TERMINOLOGY_DICTIONARY.facility,
      };
    }

    return applyCustomTermsToDictionary(resolved, orgCustomTerms);
  }, [contextLabels, industryOverride, localeOverride, orgCustomTerms]);

  const t = useMemo(() => {
    return (key: TermKey, fallback?: string) => translateTerm(terms, key, fallback);
  }, [terms]);

  return {
    t,
    terms,
    labels: contextLabels,
  };
}
