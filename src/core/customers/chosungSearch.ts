const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

export function isChosungQuery(query: string): boolean {
  const compact = query.replace(/\s/g, '');
  return compact.length > 0 && [...compact].every((char) => CHOSUNG.includes(char));
}

export function customerNameFilter(query: string): { column: 'chosung' | 'name'; value: string } {
  const compact = query.trim();
  if (isChosungQuery(compact)) {
    return { column: 'chosung', value: `${compact}%` };
  }
  return { column: 'name', value: `%${compact}%` };
}
