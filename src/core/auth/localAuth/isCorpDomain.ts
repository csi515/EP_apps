/** 사내 PG + PostgREST 도메인 SoT 사용 여부 */
export function isCorpDomainEnabled(): boolean {
  const raw = String(import.meta.env?.VITE_CORP_DOMAIN ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
