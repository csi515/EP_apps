/**
 * Core Recent Items Store
 * 사장님/직원이 최근 열람한 고객, 예약, 화면 항목을 로컬 스토리지에 유지하여
 * 옴니서치나 사이드바에서 1클릭 복귀할 수 있도록 지원합니다.
 */

export interface RecentItem {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  category: 'customer' | 'schedule' | 'pass' | 'menu';
  visitedAt: number;
}

const STORAGE_KEY = 'moa_core_recent_items';
const MAX_RECENT_ITEMS = 8;

export function getRecentItems(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordRecentItem(item: Omit<RecentItem, 'visitedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentItems().filter((i) => i.route !== item.route);
    const updated: RecentItem[] = [
      { ...item, visitedAt: Date.now() },
      ...list,
    ].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // 무음 처리
  }
}

export function clearRecentItems(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무음 처리
  }
}
