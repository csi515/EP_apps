import { isChosungQuery } from '@/core/customers/chosungSearch';
import type { PublishedCompanyAppId } from '@/pages/workspace/publishedCompanyApps';
import {
  buildCompanyAppAccessInputFromStorageUser,
  canAccessCompanyApp,
  type CompanyAppAccessInput,
} from '@/pages/workspace/companyAppAccess';

export type CommandItem = {
  id: string;
  label: string;
  /** i18n key (ep.palette.*) — UI에서 translate */
  labelKey?: string;
  chosung?: string;
  group: 'member' | 'menu' | 'action';
  href: string;
  /** 설정 시 canAccessCompanyApp 통과해야 팔레트에 표시 */
  appId?: PublishedCompanyAppId;
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
  {
    id: 'menu-intranet',
    label: '사내 업무 스위트',
    labelKey: 'ep.palette.menu.intranet',
    chosung: 'ㅅㄴㅇㅁㅅㅌ',
    group: 'menu',
    href: '/workspace/intranet',
  },
  {
    id: 'menu-approvals',
    label: '전자 결재',
    labelKey: 'ep.palette.menu.approvals',
    chosung: 'ㅈㅈㄱㅈ',
    group: 'menu',
    href: '/workspace/approvals',
  },
  {
    id: 'menu-org',
    label: '조직도·직급',
    labelKey: 'ep.palette.menu.org',
    chosung: 'ㅈㅈㄷㅈㄱ',
    group: 'menu',
    href: '/workspace/organization',
  },
  {
    id: 'menu-resources',
    label: '공용자원',
    labelKey: 'ep.palette.menu.resources',
    chosung: 'ㄱㅇㅈㅇ',
    group: 'menu',
    href: '/workspace/resources',
    appId: 'resources',
  },
  {
    id: 'menu-rnd',
    label: '연구소 포털',
    labelKey: 'ep.palette.menu.rnd',
    chosung: 'ㅇㄱㅅㅍㅌ',
    group: 'menu',
    href: '/rnd',
    appId: 'research',
  },
  {
    id: 'menu-settings',
    label: '설정',
    labelKey: 'ep.palette.menu.settings',
    chosung: 'ㅅㅈ',
    group: 'menu',
    href: '/workspace/settings',
  },
  {
    id: 'menu-schedule',
    label: '공용자원 예약',
    labelKey: 'ep.palette.menu.schedule',
    chosung: 'ㄱㅇㅈㅇㅇㅇ',
    group: 'menu',
    href: '/booking/week',
    appId: 'resources',
  },
];

/** 런처와 동일 규칙으로 앱 접근이 필요한 메뉴만 필터 */
export function filterCommandsByAppAccess(
  items: readonly CommandItem[],
  access: CompanyAppAccessInput | null
): CommandItem[] {
  return items.filter((item) => {
    if (!item.appId) return true;
    return canAccessCompanyApp(item.appId, access);
  });
}

export function resolveCommandAccessFromStorageUser(
  activeUser: Parameters<typeof buildCompanyAppAccessInputFromStorageUser>[0]
): CompanyAppAccessInput | null {
  return buildCompanyAppAccessInputFromStorageUser(activeUser);
}
