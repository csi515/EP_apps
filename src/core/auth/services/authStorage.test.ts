import assert from 'node:assert/strict';
import {
  AUTH_STORAGE_KEY_PREFERENCE,
  getAuthStoragePreference,
  setAuthStoragePreference,
  dynamicAuthStorage,
} from './authStorage';

// Fake Web Storage Mock
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

async function runTests() {
  console.log('Running authStorage unit tests...');

  // 1. Node 환경 (window 미정의 상태) 테스트
  assert.equal(getAuthStoragePreference(), true, 'Default preference in Node should be true');

  setAuthStoragePreference(false);
  assert.equal(getAuthStoragePreference(), false, 'Preference should update to false in Node');

  dynamicAuthStorage.setItem('test_token', 'node_val');
  assert.equal(dynamicAuthStorage.getItem('test_token'), 'node_val', 'In-memory get/set in Node should work');

  dynamicAuthStorage.removeItem('test_token');
  assert.equal(dynamicAuthStorage.getItem('test_token'), null, 'In-memory remove in Node should work');

  // 2. 브라우저 환경 모킹 테스트 (window.localStorage & window.sessionStorage)
  const mockLocalStorage = new MemoryStorage();
  const mockSessionStorage = new MemoryStorage();

  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
  };

  try {
    // 2-1. 기본값: rememberMe = true (localStorage 사용)
    setAuthStoragePreference(true);
    assert.equal(getAuthStoragePreference(), true, 'Preference should be true');
    assert.equal(mockLocalStorage.getItem(AUTH_STORAGE_KEY_PREFERENCE), 'true');
    assert.equal(mockSessionStorage.getItem(AUTH_STORAGE_KEY_PREFERENCE), null);

    // setItem 시 localStorage에 쓰여야 함
    dynamicAuthStorage.setItem('sb-auth-token', 'token_12345');
    assert.equal(mockLocalStorage.getItem('sb-auth-token'), 'token_12345', 'Token must be in localStorage');
    assert.equal(mockSessionStorage.getItem('sb-auth-token'), null, 'Token must NOT be in sessionStorage');

    // getItem 시 localStorage에서 읽어와야 함
    assert.equal(dynamicAuthStorage.getItem('sb-auth-token'), 'token_12345');

    // 2-2. 공용 태블릿/패드 모드: rememberMe = false (sessionStorage 사용)
    setAuthStoragePreference(false);
    assert.equal(getAuthStoragePreference(), false, 'Preference should be false');
    assert.equal(mockSessionStorage.getItem(AUTH_STORAGE_KEY_PREFERENCE), 'false');
    assert.equal(mockLocalStorage.getItem(AUTH_STORAGE_KEY_PREFERENCE), null);

    // 공용 기기에서 새로운 세션 토큰 저장 시: sessionStorage에 저장되고 localStorage는 클리어되어야 함
    dynamicAuthStorage.setItem('sb-auth-token', 'shared_kiosk_token');
    assert.equal(mockSessionStorage.getItem('sb-auth-token'), 'shared_kiosk_token', 'Token must be in sessionStorage');
    assert.equal(mockLocalStorage.getItem('sb-auth-token'), null, 'Previous token in localStorage must be purged');

    // getItem 시 sessionStorage 우선 조회
    assert.equal(dynamicAuthStorage.getItem('sb-auth-token'), 'shared_kiosk_token');

    // 2-3. removeItem 호출 시 양쪽 스토리지 모두에서 안전하게 파기
    mockLocalStorage.setItem('orphan_token', 'stale');
    mockSessionStorage.setItem('orphan_token', 'stale');
    dynamicAuthStorage.removeItem('orphan_token');
    assert.equal(mockLocalStorage.getItem('orphan_token'), null, 'localStorage item must be removed');
    assert.equal(mockSessionStorage.getItem('orphan_token'), null, 'sessionStorage item must be removed');

    console.log('authStorage tests passed successfully!');
  } finally {
    delete (globalThis as any).window;
  }
}

void runTests();
