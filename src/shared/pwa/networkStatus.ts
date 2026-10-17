/**
 * PWA Network Status & Offline Recovery Observer
 * 
 * 브라우저 및 PWA 환경에서 온라인/오프라인 전환 이벤트를 감지하고,
 * 온라인 복귀 시 대기 중인 동기화 또는 캐시 무효화를 트리거할 수 있는 이벤트 버스를 제공한다.
 */

import { useState, useEffect } from 'react';
import { createLogger } from '@/core/logging';

const logger = createLogger('NetworkStatus');

export interface NetworkStatus {
  isOnline: boolean;
  lastChangedAt: number;
}

export type NetworkChangeCallback = (isOnline: boolean) => void;
const listeners = new Set<NetworkChangeCallback>();

let currentStatus: NetworkStatus = {
  isOnline: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
  lastChangedAt: Date.now(),
};

export function handleNetworkStateChange(isOnline: boolean): void {
  currentStatus = {
    isOnline,
    lastChangedAt: Date.now(),
  };
  logger.info(`Network state changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  for (const cb of listeners) {
    try {
      cb(isOnline);
    } catch (err) {
      logger.error('Error executing network change callback:', err);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => handleNetworkStateChange(true));
  window.addEventListener('offline', () => handleNetworkStateChange(false));
}

export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

export function subscribeNetworkStatus(callback: NetworkChangeCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function clearNetworkListeners(): void {
  listeners.clear();
}

/** React 컴포넌트에서 실시간 네트워크 상태를 구독하는 훅 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(currentStatus);

  useEffect(() => {
    return subscribeNetworkStatus((isOnline) => {
      setStatus({ isOnline, lastChangedAt: Date.now() });
    });
  }, []);

  return status;
}
