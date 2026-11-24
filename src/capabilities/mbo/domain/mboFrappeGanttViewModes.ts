/**
 * frappe-gantt view_modes — Month는 단일 헤더·좁은 열로 압축.
 * 주/월/연 UI 토글 없음 — 표시 구간 길이에 따라 자동 선택.
 * 가용 폭에 맞춰 column_width를 줄여 가로 스크롤을 없앤다.
 */
import {
  normalizeVisibleRange,
  type MboGanttVisibleRange,
} from './mboGanttVisibleRange';

export type MboFrappeViewMode = 'Week' | 'Month' | 'Year';

export const MBO_GANTT_BAR_HEIGHT = 16;
export const MBO_GANTT_BAR_PADDING = 8;
export const MBO_GANTT_ROW_HEIGHT = MBO_GANTT_BAR_HEIGHT + MBO_GANTT_BAR_PADDING;

/** 구간이 이 일수 이하면 Week (주 단위 열) */
export const MBO_GANTT_VIEW_WEEK_MAX_DAYS = 90;
/** 구간이 이 일수 이하면 Month, 초과면 Year */
export const MBO_GANTT_VIEW_MONTH_MAX_DAYS = 540;

export const MBO_GANTT_MIN_COLUMN_WIDTH: Record<MboFrappeViewMode, number> = {
  Week: 28,
  Month: 36,
  Year: 48,
};

/** 표시 구간 inclusive 일수 */
export function visibleRangeDaySpan(range: MboGanttVisibleRange): number {
  const n = normalizeVisibleRange(range);
  const start = new Date(`${n.startDate}T00:00:00`);
  const end = new Date(`${n.endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 30;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/**
 * Frappe setup_date_values와 동일한 열 개수.
 * (start에서 step씩 더하며 end 미만일 때마다 1열 추가 → 마지막 step이 end를 넘을 수 있음)
 */
export function visibleRangeColumnCount(
  range: MboGanttVisibleRange,
  mode: MboFrappeViewMode,
): number {
  const n = normalizeVisibleRange(range);
  const start = new Date(`${n.startDate}T00:00:00`);
  const endExclusive = ganttEndForVisibleRange(n, mode);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime())) return 1;

  let t = new Date(start);
  let count = 1;
  while (t < endExclusive) {
    t = addViewStep(t, mode);
    count += 1;
    if (count > 500) break;
  }
  return Math.max(1, count);
}

/** 표시 구간 끝 → Frappe gantt_end (마지막 열의 step 시작일). end-of-day를 쓰면 한 칸이 더 생긴다. */
export function ganttEndForVisibleRange(
  range: MboGanttVisibleRange,
  mode: MboFrappeViewMode,
): Date {
  const n = normalizeVisibleRange(range);
  const end = new Date(`${n.endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return new Date();
  if (mode === 'Month') return new Date(end.getFullYear(), end.getMonth(), 1);
  if (mode === 'Year') return new Date(end.getFullYear(), 0, 1);
  // Week(7d): 구간 안 마지막 주 시작
  const start = new Date(`${n.startDate}T00:00:00`);
  let t = new Date(start);
  let last = new Date(start);
  while (t <= end) {
    last = new Date(t);
    t = addViewStep(t, 'Week');
  }
  return last;
}

function addViewStep(date: Date, mode: MboFrappeViewMode): Date {
  const next = new Date(date);
  if (mode === 'Week') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (mode === 'Month') {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function modeByDaySpan(days: number): MboFrappeViewMode {
  if (days <= MBO_GANTT_VIEW_WEEK_MAX_DAYS) return 'Week';
  if (days <= MBO_GANTT_VIEW_MONTH_MAX_DAYS) return 'Month';
  return 'Year';
}

function nextCoarserMode(mode: MboFrappeViewMode): MboFrappeViewMode | null {
  if (mode === 'Week') return 'Month';
  if (mode === 'Month') return 'Year';
  return null;
}

/**
 * 표시 구간에 맞는 Frappe view mode.
 * widthPx가 있으면 최소 열폭을 만족하도록 더 거친 모드로 올린다.
 */
export function mboFrappeViewModeForVisibleRange(
  range: MboGanttVisibleRange,
  widthPx?: number | null,
): MboFrappeViewMode {
  let mode = modeByDaySpan(visibleRangeDaySpan(range));
  if (!widthPx || widthPx <= 0) return mode;

  while (true) {
    const cols = visibleRangeColumnCount(range, mode);
    const fitted = widthPx / cols;
    if (fitted >= MBO_GANTT_MIN_COLUMN_WIDTH[mode]) return mode;
    const next = nextCoarserMode(mode);
    if (!next) return mode;
    mode = next;
  }
}

/** 가용 폭에 맞춘 column_width (최소폭 이상). 1px 여유로 우측 잘림 방지 */
export function mboGanttFittedColumnWidth(
  range: MboGanttVisibleRange,
  mode: MboFrappeViewMode,
  widthPx: number,
): number {
  const cols = visibleRangeColumnCount(range, mode);
  const min = MBO_GANTT_MIN_COLUMN_WIDTH[mode];
  if (!widthPx || widthPx <= 0 || cols <= 0) return min;
  return Math.max(min, Math.floor((widthPx - 1) / cols));
}

export const MBO_GANTT_HEADER_MONTH = {
  upper_header_height: 36,
  lower_header_height: 0,
} as const;

export const MBO_GANTT_HEADER_DUAL = {
  upper_header_height: 45,
  lower_header_height: 30,
} as const;

export function mboGanttHeaderHeights(mode: MboFrappeViewMode) {
  return mode === 'Month' ? MBO_GANTT_HEADER_MONTH : MBO_GANTT_HEADER_DUAL;
}

/** grid-header 높이 = upper + lower + 10 (frappe 내부와 동일) */
export function mboGanttHeaderTotalPx(mode: MboFrappeViewMode): number {
  const h = mboGanttHeaderHeights(mode);
  return h.upper_header_height + h.lower_header_height + 10;
}

type ViewModeObject = {
  name: MboFrappeViewMode;
  padding?: string;
  step?: string;
  date_format?: string;
  column_width?: number;
  snap_at?: string;
  upper_text?: string | ((d: Date, ld: Date | null, lang: string) => string);
  lower_text?: string | ((d: Date, ld: Date | null, lang: string) => string);
  thick_line?: (d: Date) => boolean;
};

function decadeLabel(d: Date): string {
  const y = d.getFullYear();
  return String(y - (y % 10));
}

function weekLowerText(d: Date, ld: Date | null): string {
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const begin =
    !ld || d.getMonth() !== ld.getMonth()
      ? `${d.getMonth() + 1}/${d.getDate()}`
      : String(d.getDate());
  const endPart =
    end.getMonth() !== d.getMonth()
      ? `${end.getMonth() + 1}/${end.getDate()}`
      : String(end.getDate());
  return `${begin}–${endPart}`;
}

/** scroll_to 매칭용 — ld와 무관하게 동일 문자열 */
function weekUpperText(d: Date): string {
  return `${d.getMonth() + 1}월`;
}

const MBO_FRAPPE_VIEW_MODES_BASE: ViewModeObject[] = [
  {
    name: 'Week',
    padding: '1m',
    step: '7d',
    date_format: 'YYYY-MM-DD',
    column_width: 140,
    lower_text: (d, ld) => weekLowerText(d, ld),
    upper_text: (d) => weekUpperText(d),
    thick_line: (d) => d.getDate() >= 1 && d.getDate() <= 7,
  },
  {
    name: 'Month',
    padding: '1m',
    step: '1m',
    column_width: 68,
    date_format: 'YYYY-MM',
    // Frappe set_scroll_position은 upper_text(date, null)로 헤더를 찾는다.
    // ld 유무에 따라 문구가 바뀌면 classList TypeError가 난다.
    upper_text: (d) => `${d.getFullYear()}. ${d.getMonth() + 1}월`,
    lower_text: '',
    thick_line: (d) => d.getMonth() % 3 === 0,
    snap_at: '7d',
  },
  {
    name: 'Year',
    padding: '2y',
    step: '1y',
    column_width: 120,
    date_format: 'YYYY',
    upper_text: (d, ld) => (!ld || decadeLabel(d) !== decadeLabel(ld) ? decadeLabel(d) : ''),
    lower_text: 'YYYY',
    snap_at: '30d',
  },
];

export const MBO_FRAPPE_VIEW_MODES: ViewModeObject[] = MBO_FRAPPE_VIEW_MODES_BASE;

/**
 * 표시 구간 + padding 0d.
 * widthPx가 있으면 각 모드 column_width를 구간에 맞춰 압축.
 * Frappe setup_options가 view_modes[0]으로 view_mode를 덮어쓰므로
 * activeMode를 맨 앞에 둔다.
 */
export function mboFrappeViewModesForVisibleRange(
  range?: MboGanttVisibleRange | null,
  widthPx?: number | null,
  activeMode?: MboFrappeViewMode | null,
): ViewModeObject[] {
  const modes = MBO_FRAPPE_VIEW_MODES_BASE.map((mode) => {
    const column_width =
      range && widthPx && widthPx > 0
        ? mboGanttFittedColumnWidth(range, mode.name, widthPx)
        : mode.column_width;
    return {
      ...mode,
      padding: '0d' as const,
      column_width,
    };
  });
  if (!activeMode) return modes;
  const active = modes.find((m) => m.name === activeMode);
  if (!active) return modes;
  return [active, ...modes.filter((m) => m.name !== activeMode)];
}
