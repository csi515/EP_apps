/** 엑셀에서 앞자리 0이 빠진 국내 휴대폰 번호를 표준 형식으로 되돌린다. */
export function sanitizeImportPhone(rawPhone: string | number): string {
  const digits = String(rawPhone).replace(/\D/g, '');
  const normalized = digits.length === 10 && digits.startsWith('10') ? `0${digits}` : digits;
  if (!/^010\d{8}$/.test(normalized)) {
    throw new Error('INVALID_PHONE');
  }
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
}
