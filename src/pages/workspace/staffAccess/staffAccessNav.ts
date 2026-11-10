import type { PublishedCompanyAppId } from '@/pages/workspace/publishedCompanyApps';
import { listAssignablePublishedApps } from '@/pages/workspace/publishedCompanyApps';

export type StaffAccessViewMode = 'admin' | 'mine';

export type StaffAccessNavState = {
  appId: PublishedCompanyAppId | null;
  memberId: string | null;
  intent: 'grant' | null;
  mode: StaffAccessViewMode | null;
};

const ASSIGNABLE_IDS = new Set(listAssignablePublishedApps().map((a) => a.id));

export function parseStaffAccessSearch(search: string): StaffAccessNavState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const rawApp = params.get('app');
  const appId =
    rawApp && ASSIGNABLE_IDS.has(rawApp as PublishedCompanyAppId)
      ? (rawApp as PublishedCompanyAppId)
      : null;
  const memberId = params.get('member')?.trim() || null;
  const intent = params.get('intent') === 'grant' ? 'grant' : null;
  const modeRaw = params.get('mode');
  const mode: StaffAccessViewMode | null =
    modeRaw === 'admin' || modeRaw === 'mine' ? modeRaw : null;
  return { appId, memberId, intent, mode };
}

export function buildStaffAccessPath(state: Partial<StaffAccessNavState>): string {
  const params = new URLSearchParams();
  if (state.appId) params.set('app', state.appId);
  if (state.memberId) params.set('member', state.memberId);
  if (state.intent === 'grant') params.set('intent', 'grant');
  if (state.mode === 'admin' || state.mode === 'mine') params.set('mode', state.mode);
  const q = params.toString();
  return q ? `/workspace/app-access?${q}` : '/workspace/app-access';
}
