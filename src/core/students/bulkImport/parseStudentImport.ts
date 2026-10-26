import ExcelJS from 'exceljs';
import type { StudentImportRawRow } from './types';
import { STUDENT_IMPORT_TEMPLATE_HEADERS } from './types';
import { excelSerialToIsoDate, normalizeHeader } from './validateStudentImport';

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function cellToString(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // 생년월일 등 Excel 시리얼(대략 20000~60000)
    if (value > 20000 && value < 80000 && Number.isInteger(value)) {
      return excelSerialToIsoDate(value);
    }
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).trim();
}

function rowsFromMatrix(matrix: unknown[][]): StudentImportRawRow[] {
  if (matrix.length === 0) return [];
  const headers = (matrix[0] || []).map((h) => normalizeHeader(cellToString(h)));
  const rows: StudentImportRawRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r] || [];
    if (!cells.length || cells.every((c) => !cellToString(c))) continue;
    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      values[h] = cellToString(cells[i]);
    });
    rows.push({ rowNumber: r + 1, values });
  }
  return rows;
}

function worksheetToMatrix(sheet: ExcelJS.Worksheet): unknown[][] {
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as unknown[];
    // ExcelJS row.values is 1-indexed (index 0 unused)
    const cells = Array.isArray(values) ? values.slice(1) : [];
    while (matrix.length < rowNumber) matrix.push([]);
    matrix[rowNumber - 1] = cells.map((cell) => {
      if (cell && typeof cell === 'object' && 'result' in (cell as object)) {
        return (cell as { result?: unknown }).result;
      }
      if (cell && typeof cell === 'object' && 'text' in (cell as object)) {
        return (cell as { text?: unknown }).text;
      }
      return cell;
    });
  });
  return matrix;
}

export function parseStudentImportCsv(text: string): StudentImportRawRow[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  const matrix = lines.map(splitCsvLine);
  return rowsFromMatrix(matrix);
}

export async function parseStudentImportWorkbook(buffer: ArrayBuffer): Promise<StudentImportRawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  return rowsFromMatrix(worksheetToMatrix(sheet));
}

/** ExcelJS로 수강생 일괄등록 xlsx 템플릿 생성 */
export async function buildTemplateWorkbookBuffer(): Promise<ArrayBuffer> {
  const sample = [
    '김민수',
    '남',
    '2015-03-12',
    '',
    '서울초',
    '초3',
    '김부모',
    '01012345678',
    'parent@example.com',
    '모',
    '피아노 초급',
    new Date().toISOString().slice(0, 10),
    '180000',
    '10',
    '',
  ];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('수강생');
  sheet.addRow([...STUDENT_IMPORT_TEMPLATE_HEADERS]);
  sheet.addRow(sample);
  const out = await workbook.xlsx.writeBuffer();
  const bytes = out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function parseStudentImportFile(file: File): Promise<StudentImportRawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseStudentImportCsv(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    return parseStudentImportWorkbook(buffer);
  }
  throw new Error('CSV(.csv) 또는 Excel(.xlsx, .xls) 파일만 지원합니다.');
}
