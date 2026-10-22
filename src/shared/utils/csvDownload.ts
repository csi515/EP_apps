/** UTF-8 BOM 포함 CSV 다운로드 (엑셀 호환) */

export function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (cell: string) => {
    const text = cell ?? '';
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const body = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
