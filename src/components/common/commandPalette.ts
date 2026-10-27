import { isChosungQuery } from '@/core/customers/chosungSearch';

export type CommandItem = {
  id: string;
  label: string;
  chosung?: string;
  group: 'member' | 'menu' | 'action';
  href: string;
};

export function isPaletteShortcut(event: { metaKey: boolean; ctrlKey: boolean; key: string }): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
}

export function filterCommands(query: string, items: CommandItem[]): CommandItem[] {
  const compact = query.trim();
  if (!compact) return items;
  if (isChosungQuery(compact)) {
    return items.filter((item) => (item.chosung ?? '').startsWith(compact) || item.label.includes(compact));
  }
  return items.filter((item) => item.label.toLowerCase().includes(compact.toLowerCase()));
}

export function moveCommandIndex(current: number, length: number, direction: 1 | -1): number {
  if (length === 0) return 0;
  return (current + direction + length) % length;
}

export const COMMAND_CATALOG: CommandItem[] = [
  { id: 'menu-intranet', label: '사내 업무 스위트', chosung: 'ㅅㄴㅇㅁㅅㅌ', group: 'menu', href: '/workspace/intranet' },
  { id: 'menu-approvals', label: '전자 결재', chosung: 'ㅈㅈㄱㅈ', group: 'menu', href: '/workspace/approvals' },
  { id: 'menu-org', label: '조직도·직급', chosung: 'ㅈㅈㄷㅈㄱ', group: 'menu', href: '/workspace/organization' },
  { id: 'menu-resources', label: '공용자원', chosung: 'ㄱㅇㅈㅇ', group: 'menu', href: '/workspace/resources' },
  { id: 'menu-rnd', label: '연구소 포털', chosung: 'ㅇㄱㅅㅍㅌ', group: 'menu', href: '/rnd' },
  { id: 'menu-settings', label: '설정', chosung: 'ㅅㅈ', group: 'menu', href: '/workspace/settings' },
  { id: 'menu-schedule', label: '공용자원 예약', chosung: 'ㄱㅇㅈㅇㅇㅇ', group: 'menu', href: '/booking/week' },
];
