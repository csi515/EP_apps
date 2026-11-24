import { Workbook } from 'exceljs';
import { interceptExportWithAudit } from '@/core/audit/auditExportInterceptor';
import {
  formatJoinedAt,
  formatRosterExportFilename,
  type OrgRosterRow,
} from './orgRosterEngine';
import { ORG_CHART_COPY } from './orgChartCopy';

const COLUMNS = [
  { header: '사번', key: 'loginId', width: 12 },
  { header: '이름', key: 'name', width: 14 },
  { header: '직급', key: 'roleName', width: 12 },
  { header: '소속', key: 'departmentName', width: 18 },
  { header: '재직상태', key: 'employment', width: 10 },
  { header: '입사일', key: 'joinedAt', width: 12 },
] as const;

function cellValue(row: OrgRosterRow, key: (typeof COLUMNS)[number]['key']): string {
  switch (key) {
    case 'loginId':
      return row.loginId;
    case 'name':
      return row.name;
    case 'roleName':
      return row.roleName;
    case 'departmentName':
      return row.departmentName;
    case 'employment':
      return row.isActive ? ORG_CHART_COPY.rosterActive : ORG_CHART_COPY.rosterInactive;
    case 'joinedAt':
      return formatJoinedAt(row.joinedAt);
    default:
      return '';
  }
}

function autoFitWidth(header: string, values: string[]): number {
  let max = header.length;
  for (const v of values) {
    max = Math.max(max, [...v].length);
  }
  return Math.min(Math.max(max + 2, 8), 40);
}

async function buildWorkbookBuffer(rows: readonly OrgRosterRow[]): Promise<ArrayBuffer> {
  const workbook = new Workbook();
  workbook.creator = 'EP_apps';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(ORG_CHART_COPY.rosterSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.addRow(COLUMNS.map((c) => c.header));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const row of rows) {
    sheet.addRow(COLUMNS.map((c) => cellValue(row, c.key)));
  }

  COLUMNS.forEach((col, index) => {
    const values = rows.map((r) => cellValue(r, col.key));
    sheet.getColumn(index + 1).width = autoFitWidth(col.header, values);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportOrgRosterXlsx(input: {
  organizationId: string;
  rows: readonly OrgRosterRow[];
  filename?: string;
}): Promise<void> {
  const filename = input.filename ?? formatRosterExportFilename();
  await interceptExportWithAudit(
    {
      organizationId: input.organizationId,
      entityType: 'permissions',
      action: 'excel_export',
      metadata: {
        export: 'org_roster',
        rowCount: input.rows.length,
        filename,
      },
    },
    async () => {
      const buffer = await buildWorkbookBuffer(input.rows);
      triggerDownload(buffer, filename);
    },
  );
}
