/**
 * 포털 모드 플래그 엣지 케이스 (학부모 항상 off, 고객 세션 스토리지)
 * 실행: npm run test:app-portal-mode-edge
 */
import assert from 'node:assert/strict';
import {
  isCustomerPortalModeActive,
  isParentPortalModeActive,
  setCustomerPortalModeActive,
  setParentPortalModeActive,
} from './appPortalMode';

const store = new Map<string, string>();

function installSessionStorageMock() {
  const mock = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key() {
      return null;
    },
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mock,
    configurable: true,
    writable: true,
  });
}

installSessionStorageMock();
store.clear();

console.log('[test:app-portal-mode-edge] start');

// 학부모 포털은 항상 inactive
assert.equal(isParentPortalModeActive(), false);
setParentPortalModeActive(true);
assert.equal(isParentPortalModeActive(), false);
setParentPortalModeActive(false);
assert.equal(isParentPortalModeActive(), false);

// 고객 포털: 기본 false
assert.equal(isCustomerPortalModeActive(), false);

// 켜기 / 끄기
setCustomerPortalModeActive(true);
assert.equal(isCustomerPortalModeActive(), true);
assert.equal(store.get('ep_customer_portal_active'), '1');

setCustomerPortalModeActive(false);
assert.equal(isCustomerPortalModeActive(), false);
assert.equal(store.has('ep_customer_portal_active'), false);

// 레거시 키(moa_*) → 신규 키로 마이그레이션
store.clear();
store.set('moa_customer_portal_active', '1');
assert.equal(isCustomerPortalModeActive(), true);
assert.equal(store.get('ep_customer_portal_active'), '1');
assert.equal(store.has('moa_customer_portal_active'), false);

// 레거시 값이 '1'이 아니면 활성 아님
store.clear();
store.set('moa_customer_portal_active', '0');
assert.equal(isCustomerPortalModeActive(), false);

// 신규 키가 있으면 레거시 무시
store.clear();
store.set('ep_customer_portal_active', '0');
store.set('moa_customer_portal_active', '1');
assert.equal(isCustomerPortalModeActive(), false);

store.set('ep_customer_portal_active', '1');
assert.equal(isCustomerPortalModeActive(), true);

// set 시 레거시 키 정리
store.set('moa_customer_portal_active', '1');
setCustomerPortalModeActive(true);
assert.equal(store.has('moa_customer_portal_active'), false);

setCustomerPortalModeActive(false);
assert.equal(store.has('moa_customer_portal_active'), false);
assert.equal(store.has('ep_customer_portal_active'), false);

// sessionStorage throw 시 false / no-throw
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem() {
      throw new Error('quota');
    },
    setItem() {
      throw new Error('quota');
    },
    removeItem() {
      throw new Error('quota');
    },
  },
  configurable: true,
});
assert.equal(isCustomerPortalModeActive(), false);
assert.doesNotThrow(() => setCustomerPortalModeActive(true));
assert.doesNotThrow(() => setCustomerPortalModeActive(false));

console.log('appPortalMode.edge.test.ts: ok');
