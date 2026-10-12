import assert from 'node:assert/strict';
import { handlePreloadError, VITE_PRELOAD_FLAG } from './vitePreloadErrorRecovery';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

async function runTests() {
  const storage = createMockStorage();
  let reloadCount = 0;
  let swUpdateCount = 0;

  const mockLocation = {
    reload: () => {
      reloadCount++;
    },
  };

  const mockSwUpdate = async () => {
    swUpdateCount++;
  };

  // 1. First preload error -> triggers reload
  const handled1 = handlePreloadError(new Error('Failed to fetch dynamically imported module'), {
    storage,
    location: mockLocation,
    updateServiceWorkers: mockSwUpdate,
  });

  assert.equal(handled1, true, 'First preload error must be handled');
  assert.ok(storage.getItem(VITE_PRELOAD_FLAG), 'Must set storage flag');

  // Allow async sw update & reload to fire
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(reloadCount, 1, 'Location reload should have been called once');
  assert.equal(swUpdateCount, 1, 'SW update should have been called once');

  // 2. Second preload error immediately during cooldown -> returns false to prevent infinite reload loop!
  const handled2 = handlePreloadError(new Error('Failed to fetch dynamically imported module'), {
    storage,
    location: mockLocation,
    updateServiceWorkers: mockSwUpdate,
  });

  assert.equal(handled2, false, 'Preload error during cooldown must be blocked');
  assert.equal(reloadCount, 1, 'Location reload must not be called again');

  console.log('vitePreloadErrorRecovery tests passed!');
}

void runTests();
