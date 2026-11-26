/**
 * localChangePassword — POST 후 GET /session 갱신 및 auth listener 알림
 * 실행: npx tsx src/core/auth/localAuth/localChangePassword.contract.test.ts
 */
import assert from 'node:assert/strict';
import type { Session } from '@supabase/supabase-js';
import { localChangePassword } from './localAuthApi';
import { setLocalAuthToken, subscribeLocalAuth } from './localSessionStore';

const memoryStore: Record<string, string> = {};
const storage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const key of Object.keys(memoryStore)) delete memoryStore[key];
  },
  key: () => null,
  length: 0,
};

Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

const originalFetch = globalThis.fetch;
let sessionFetchCount = 0;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/password/change')) {
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.includes('/session')) {
    sessionFetchCount += 1;
    return new Response(
      JSON.stringify({
        session: {
          access_token: 'refreshed-token',
          user: {
            id: 'user-1',
            email: 'staff@example.com',
            login_id: 'staff01',
            full_name: '테스트 직원',
            must_change_password: false,
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return originalFetch(input, init);
};

async function run(): Promise<void> {
  setLocalAuthToken('before-change');
  sessionFetchCount = 0;

  let notified: Session | null | undefined;
  const unsub = subscribeLocalAuth((session) => {
    notified = session;
  });

  await localChangePassword('OldPass123!', 'NewPass123!');

  assert.equal(sessionFetchCount, 1, 'GET /session must run after password change');
  assert.ok(notified, 'auth listener must be notified');
  assert.equal(notified!.user.user_metadata.must_change_password, false);
  assert.equal(memoryStore.ep_local_auth_token, 'refreshed-token');

  unsub();
  globalThis.fetch = originalFetch;
  console.log('localChangePassword.contract.test.ts: ok');
}

void run();