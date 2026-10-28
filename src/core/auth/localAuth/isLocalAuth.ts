/** 로컬 SQLite 인증 모드 (Supabase Auth 비사용) */
export function isLocalAuthEnabled(): boolean {
  const raw = String(import.meta.env?.VITE_LOCAL_AUTH ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
