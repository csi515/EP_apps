const RELOAD_FLAG = 'ep.staleChunkReload';
const LEGACY_RELOAD_FLAG = 'moa.staleChunkReload';

function readReloadFlag(): string | null {
  try {
    const current = sessionStorage.getItem(RELOAD_FLAG);
    if (current != null) return current;
    const legacy = sessionStorage.getItem(LEGACY_RELOAD_FLAG);
    if (legacy != null) {
      sessionStorage.setItem(RELOAD_FLAG, legacy);
      sessionStorage.removeItem(LEGACY_RELOAD_FLAG);
      return legacy;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function isStaleChunkError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? '');
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|loading chunk \d+ failed|chunkloaderror/i.test(
    text
  );
}

/** 배포 직후 예전 해시 청크 404 — SW 갱신 후 한 번만 새로고침 */
export function reloadOnceForStaleAssets(): void {
  if (typeof window === 'undefined') return;
  try {
    if (readReloadFlag() === '1') return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    /* private mode */
  }
  void (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  })();
}

export function clearStaleChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
    sessionStorage.removeItem(LEGACY_RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}
