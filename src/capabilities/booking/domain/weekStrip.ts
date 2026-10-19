export type SlotBadge = { label: string; closed: boolean };

export function formatSlotBadge(time: string, remaining: number, capacity: number): SlotBadge {
  if (remaining <= 0) return { label: `${time} (마감)`, closed: true };
  return { label: `${time} (${remaining}/${capacity}명 잔여)`, closed: false };
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function weekDates(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}
