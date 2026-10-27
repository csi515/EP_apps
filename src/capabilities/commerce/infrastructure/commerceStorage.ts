import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** EP_apps: piano textbook commerce persist 제거. */
export function createCommerceCapabilityStorage(_api: StorageApi) {
  return {
    list: async () => [],
    get: async () => null,
    save: async () => {
      throw new Error('Textbook commerce removed in EP_apps');
    },
  };
}

export type CommerceCapabilityStorage = ReturnType<typeof createCommerceCapabilityStorage>;

export const commerceStorage = createCommerceCapabilityStorage(storageApi);
