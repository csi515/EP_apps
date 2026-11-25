/**
 * 다중 리소스 매트릭스 타임라인 그리드 연산 엔진 (Timeline Grid Engine)
 *
 * 1. 2차원 리소스 매트릭스 [세로: 스태프/룸] × [가로: 시간 축] 좌표 및 퍼센트 계산
 * 2. 마우스/터치 드래그 위치의 15/30분 그리드 자동 스냅 연산
 * 3. 블록 리사이징(시간 연장/단축) 시 최소 단위 보정 연산
 * 4. 리소스별 일일 가동률(Occupancy Rate) 및 빈 슬롯(공실) 실시간 집계
 */

export interface TimelineConfig {
  startHour: number; // 예: 8 (08:00)
  endHour: number; // 예: 22 (22:00)
  slotIntervalMinutes: number; // 예: 15 또는 30
}

export interface TimelinePosition {
  leftPercent: number; // 0 ~ 100%
  widthPercent: number; // 0 ~ 100%
  durationMinutes: number;
}

export interface ResourceOccupancySummary {
  resourceId: string;
  totalOperatingMinutes: number;
  bookedMinutes: number;
  occupancyRatePercent: number; // 0 ~ 100%
  availableMinutes: number;
  bookingCount: number;
}

/**
 * 'HH:mm' 문자열을 자정 기준 분(minutes)으로 변환
 */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * 자정 기준 분(minutes)을 'HH:mm' 포맷 문자열로 변환
 */
export function minutesToHhmm(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 타임라인 가로축 상의 시작 위치(%)와 너비(%) 계산
 */
export function computeEventPosition(
  startTime: string,
  endTime: string,
  config: TimelineConfig
): TimelinePosition {
  const totalTimelineMinutes = (config.endHour - config.startHour) * 60;
  if (totalTimelineMinutes <= 0) {
    return { leftPercent: 0, widthPercent: 0, durationMinutes: 0 };
  }

  const timelineStartMin = config.startHour * 60;
  const eventStartMin = Math.max(timelineStartMin, hhmmToMinutes(startTime));
  const eventEndMin = Math.min(config.endHour * 60, hhmmToMinutes(endTime));

  const durationMinutes = Math.max(0, eventEndMin - eventStartMin);
  const leftPercent = ((eventStartMin - timelineStartMin) / totalTimelineMinutes) * 100;
  const widthPercent = (durationMinutes / totalTimelineMinutes) * 100;

  return {
    leftPercent: Number(leftPercent.toFixed(2)),
    widthPercent: Number(widthPercent.toFixed(2)),
    durationMinutes,
  };
}

/**
 * 임의의 분(minutes)을 슬롯 간격(예: 15분, 30분) 단위로 가장 가까운 그리드에 스냅
 */
export function snapMinutesToGrid(
  rawMinutes: number,
  intervalMinutes: number,
  minHour: number = 0,
  maxHour: number = 24
): number {
  const snapped = Math.round(rawMinutes / intervalMinutes) * intervalMinutes;
  const clamped = Math.max(minHour * 60, Math.min(maxHour * 60, snapped));
  return clamped;
}

/**
 * 가로 드래그 픽셀/퍼센트 위치를 'HH:mm' 슬롯으로 역산 및 스냅
 */
export function snapPercentToTime(
  percent: number, // 0 ~ 100
  config: TimelineConfig
): string {
  const totalMinutes = (config.endHour - config.startHour) * 60;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const rawMinutes = config.startHour * 60 + (clampedPercent / 100) * totalMinutes;

  const snapped = snapMinutesToGrid(
    rawMinutes,
    config.slotIntervalMinutes,
    config.startHour,
    config.endHour
  );
  return minutesToHhmm(snapped);
}

/**
 * 리사이징(크기 조절) 시 새로운 종료 시간 산출 (최소 세션 시간 보장)
 */
export function computeResizedEndTime(
  startTime: string,
  draggedPercent: number,
  config: TimelineConfig,
  minDurationMinutes: number = 30
): string {
  const startMin = hhmmToMinutes(startTime);
  const proposedEnd = snapPercentToTime(draggedPercent, config);
  const proposedEndMin = hhmmToMinutes(proposedEnd);

  const minEndMin = startMin + minDurationMinutes;
  const finalEndMin = Math.max(minEndMin, proposedEndMin);

  return minutesToHhmm(Math.min(config.endHour * 60, finalEndMin));
}

/**
 * 리소스별 타임라인 가동률 및 점유 시간 집계
 */
export function calculateResourceOccupancy(
  resourceId: string,
  events: Array<{ startTime: string; endTime: string }>,
  config: TimelineConfig
): ResourceOccupancySummary {
  const totalOperatingMinutes = (config.endHour - config.startHour) * 60;

  let bookedMinutes = 0;
  for (const ev of events) {
    const s = Math.max(config.startHour * 60, hhmmToMinutes(ev.startTime));
    const e = Math.min(config.endHour * 60, hhmmToMinutes(ev.endTime));
    if (e > s) {
      bookedMinutes += e - s;
    }
  }

  const occupancyRatePercent = totalOperatingMinutes > 0
    ? Math.round((bookedMinutes / totalOperatingMinutes) * 100)
    : 0;

  return {
    resourceId,
    totalOperatingMinutes,
    bookedMinutes,
    occupancyRatePercent: Math.min(100, occupancyRatePercent),
    availableMinutes: Math.max(0, totalOperatingMinutes - bookedMinutes),
    bookingCount: events.length,
  };
}
