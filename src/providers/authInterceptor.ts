type Replay = {
  run: () => Promise<Response>;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
};

const queue: Replay[] = [];
const listeners = new Set<(open: boolean) => void>();
let installed = false;

export function subscribeReAuth(listener: (open: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openReAuthModal(): void {
  listeners.forEach((listener) => listener(true));
}

export function closeReAuthModal(): void {
  listeners.forEach((listener) => listener(false));
}

export function isSessionExpiry(status: number | undefined, message?: string): boolean {
  if (status === 401) return true;
  const text = (message ?? '').toLowerCase();
  return text.includes('jwt') && text.includes('expired');
}

export async function replayPendingRequests(): Promise<number> {
  const pending = queue.splice(0, queue.length);
  for (const item of pending) {
    try {
      item.resolve(await item.run());
    } catch (error) {
      item.reject(error);
    }
  }
  return pending.length;
}

export function discardPendingRequests(): void {
  const pending = queue.splice(0, queue.length);
  pending.forEach((item) => item.reject(new Error('세션 연장을 취소했습니다.')));
}

function shouldIgnore(url: string): boolean {
  return url.includes('/auth/v1/token') || url.includes('/auth/v1/logout');
}

export function installAuthInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (shouldIgnore(request.url) || request.headers.get('x-moa-replay') === '1') {
      return original(request);
    }
    const response = await original(request.clone());
    if (response.status !== 401) return response;
    openReAuthModal();
    return new Promise<Response>((resolve, reject) => {
      queue.push({
        resolve,
        reject,
        run: () => {
          const replay = request.clone();
          replay.headers.set('x-moa-replay', '1');
          return original(replay);
        },
      });
    });
  };
}
