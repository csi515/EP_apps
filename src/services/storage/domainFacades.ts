// @ts-nocheck
/**
 * EP_apps Legacy storage 조립 — 디스크에 존재하는 capability storage만 결합한다.
 */
import { bookingStorage } from '@/capabilities/booking/infrastructure/bookingStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import { resourcesStorage } from '@/capabilities/resources/infrastructure/resourcesStorage';
import { schedulingStorage } from '@/capabilities/scheduling/infrastructure/schedulingStorage';
import { dashboardStatsStorage } from './dashboardStatsStorage';
import { settingsStorage } from './settingsStorage';
import { storageCore } from './storageApi';

/**
 * Legacy compatibility 조립. 구현 SoT는 각 도메인 싱글톤이다.
 * persist/hydrate/sync 의미는 바꾸지 않는다.
 */
export const assembledStorage = Object.assign(
  storageCore,
  schedulingStorage,
  bookingStorage,
  resourcesStorage,
  settingsStorage,
  commerceStorage,
  dashboardStatsStorage
);

export {
  bookingStorage,
  commerceStorage,
  dashboardStatsStorage,
  resourcesStorage,
  schedulingStorage,
  settingsStorage,
  storageCore,
};
