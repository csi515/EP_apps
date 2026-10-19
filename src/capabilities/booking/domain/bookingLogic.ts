/** 예약 시작 시각과 취소 시한으로 수강권 차감 여부를 판정한다. */
export function shouldDeductPassOnCancel(input: {
  startsAt: Date;
  now: Date;
  cancellationDeadlineMinutes: number;
}): boolean {
  const deadline = input.startsAt.getTime() - input.cancellationDeadlineMinutes * 60_000;
  return input.now.getTime() > deadline;
}
