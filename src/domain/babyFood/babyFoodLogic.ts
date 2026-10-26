/**
 * Baby Food Logic Engine — 이유식 품앗이 모임 전용 도메인 로직
 * 
 * [가드레일 준수]:
 * 1. 외부 유료 API나 문자 발송 배제, 앱 내 순수 상태 연산에 집중.
 * 2. 시간 독립성(Pure Determinism) — 기준 시각 baseDate 주입 지원.
 * 3. 엄격한 타입 정의 및 불변성 보장.
 */

export type WeaningStageKey = 'prep' | 'early' | 'middle' | 'late' | 'complete';

export interface WeaningStageGuide {
  stageKey: WeaningStageKey;
  stageName: string;
  stageLabel: string;
  monthsRange: string;
  recommendedFoods: string[];
  cautionFoods: string[];
  textureGuide: string;
  feedingFrequency: string;
  description: string;
}

export interface SettlementResult {
  totalExpense: number;
  babyCount: number;
  perPersonAmount: number;
  remainderAmount: number;
  formattedPerPerson: string;
  formattedRemainder: string;
}

export interface BabyAgeParts {
  months: number;
  days: number;
}

export interface BabyAgeInfo {
  months: number;
  days: number;
  formattedAge: string;
  stage: WeaningStageGuide;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d;
}

/**
 * 생년월일에 months를 더한 앵커일. 대상 월에 해당 일이 없으면 말일로 클램프.
 */
function addCalendarMonthsClamped(birth: Date, months: number): Date {
  const year = birth.getFullYear();
  const month = birth.getMonth() + months;
  const day = birth.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function diffCalendarDays(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * 생년월일 기준 현재(또는 기준일) 만 개월 수 계산.
 * 
 * @param birthDate 아기 생년월일 (string: 'YYYY-MM-DD' 또는 Date)
 * @param baseDate 계산 기준일 (생략 시 현재 날짜)
 * @returns 만 개월 수 (0 이상의 정수)
 */
export function calculateBabyAge(
  birthDate: string | Date,
  baseDate?: string | Date
): number {
  const birth = new Date(birthDate);
  const base = baseDate ? new Date(baseDate) : new Date();

  if (isNaN(birth.getTime()) || isNaN(base.getTime())) {
    return 0;
  }

  if (base < birth) {
    return 0;
  }

  let months =
    (base.getFullYear() - birth.getFullYear()) * 12 +
    (base.getMonth() - birth.getMonth());

  // 기준일의 일이 생일의 일보다 이전이면 아직 이번 달 만 월령에 도달하지 않음
  // 단, 기준일이 기준 월의 마지막 날(말일)이고 생일의 일이 기준 월 말일 이상인 경우 만 월령 달성 인정
  const isBaseMonthEnd =
    new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate() ===
    base.getDate();
  const isBirthDayGreater = birth.getDate() > base.getDate();

  if (isBirthDayGreater && !isBaseMonthEnd) {
    months--;
  }

  return Math.max(0, months);
}

/**
 * 만 개월 수와 해당 개월 달성일 이후 경과 일수를 함께 산출한다.
 * 개월 규칙은 calculateBabyAge와 동일하며, 월말·윤달은 앵커일 클램프로 처리한다.
 */
export function calculateBabyAgeParts(
  birthDate: string | Date,
  baseDate?: string | Date
): BabyAgeParts {
  const birth = new Date(birthDate);
  const base = baseDate ? new Date(baseDate) : new Date();

  if (isNaN(birth.getTime()) || isNaN(base.getTime()) || base < birth) {
    return { months: 0, days: 0 };
  }

  const months = calculateBabyAge(birthDate, baseDate);
  const anchor = addCalendarMonthsClamped(birth, months);
  const days = diffCalendarDays(anchor, base);
  return { months, days };
}

/**
 * 개월 수에 따른 이유식 단계별 가이드 반환.
 * - 준비기: 0~3개월 (수유 전용)
 * - 초기: 4~6개월
 * - 중기: 7~8개월
 * - 후기: 9~11개월
 * - 완료기: 12개월 이상
 * 
 * @param months 만 개월 수
 */
export function getWeaningStageGuide(months: number): WeaningStageGuide {
  const safeMonths = Math.max(0, Math.floor(months || 0));

  if (safeMonths < 4) {
    return {
      stageKey: 'prep',
      stageName: '준비기',
      stageLabel: '준비기 (0~3개월)',
      monthsRange: '0~3개월',
      recommendedFoods: ['모유', '분유 (수유 전용)'],
      cautionFoods: [
        '모든 고형 이유식',
        '꿀 (영아 보툴리누스증 위험)',
        '생우유',
        '과일 주스',
      ],
      textureGuide: '완전 액상 형태 (모유/분유 수유)',
      feedingFrequency: '수시 수유 (하루 6~8회)',
      description:
        '소화기관이 미숙하여 모유나 분유만으로 영양을 섭취하는 시기입니다.',
    };
  }

  if (safeMonths <= 6) {
    return {
      stageKey: 'early',
      stageName: '초기',
      stageLabel: '초기 (4~6개월)',
      monthsRange: '4~6개월',
      recommendedFoods: [
        '쌀미음',
        '찹쌀',
        '애호박',
        '오이',
        '청경채',
        '양배추',
        '브로콜리',
        '콜리플라워',
        '단호박',
      ],
      cautionFoods: [
        '꿀 (보툴리누스균 위험)',
        '생우유',
        '달걀 흰자',
        '견과류',
        '갑각류',
        '소금/설탕/자극적 조미료',
      ],
      textureGuide: '흘러내리는 미음 형태 (10배죽/8배죽), 부드러운 퓌레',
      feedingFrequency: '1일 1회 (오전 수유 직전 또는 직후)',
      description:
        '숟가락 식사에 적응하고 곡류 및 알레르기 위험이 낮은 채소부터 한 가지씩 시도합니다.',
    };
  }

  if (safeMonths <= 8) {
    return {
      stageKey: 'middle',
      stageName: '중기',
      stageLabel: '중기 (7~8개월)',
      monthsRange: '7~8개월',
      recommendedFoods: [
        '쇠고기(안심/우둔)',
        '닭가슴살',
        '두부',
        '당근',
        '시금치',
        '양파',
        '사과',
        '배',
        '바나나',
        '감자',
        '고구마',
      ],
      cautionFoods: [
        '꿀',
        '생우유',
        '달걀 흰자',
        '돼지고기',
        '새우/게/조개류',
        '통과일/과일 씨앗',
      ],
      textureGuide:
        '부드러운 알갱이 형태 (6배죽/5배죽), 혀로 으깰 수 있는 연두부 굳기',
      feedingFrequency: '1일 2회 (오전/오후 규칙적 배식)',
      description:
        '철분 공급을 위해 매일 쇠고기나 닭가슴살을 섭취하며 오물오물 씹는 연습을 합니다.',
    };
  }

  if (safeMonths <= 11) {
    return {
      stageKey: 'late',
      stageName: '후기',
      stageLabel: '후기 (9~11개월)',
      monthsRange: '9~11개월',
      recommendedFoods: [
        '흰살생선(대구/가자미)',
        '달걀 노른자',
        '무',
        '표고버섯',
        '양송이버섯',
        '아보카도',
        '아기용 치즈',
        '연근',
        '파프리카',
      ],
      cautionFoods: [
        '꿀',
        '생우유',
        '달걀 흰자(알레르기 테스트 필요)',
        '갑각류',
        '통견과류 (질식 위험)',
        '자극적인 양념',
      ],
      textureGuide:
        '진밥 형태 (3배죽/무른밥), 잇몸으로 으깰 수 있는 바나나 굳기',
      feedingFrequency: '1일 3회 (가족 식사 시간과 일치)',
      description:
        '하루 세 번 규칙적인 식사 습관을 들이고 핑거푸드를 통해 자기주도 식사를 연습합니다.',
    };
  }

  return {
    stageKey: 'complete',
    stageName: '완료기',
    stageLabel: '완료기 (12개월+)',
    monthsRange: '12개월 이상',
    recommendedFoods: [
      '진밥/진지기',
      '달걀 전란',
      '돼지고기 안심',
      '등푸른 생선(고등어/삼치)',
      '유아 국/반찬',
      '아기전용 간장/참기름(미량)',
    ],
    cautionFoods: [
      '통견과류/통포도 (질식 및 기도폐쇄 위험)',
      '과도한 염분/당분/가공식품',
      '인스턴트 식품',
      '카페인 음료',
    ],
    textureGuide: '어른 밥보다 살짝 부드러운 진밥 및 한 입 크기 반찬',
    feedingFrequency: '1일 3회 식사 + 영양 간식 1~2회',
    description:
      '어른 밥상으로 이행하는 유아식 단계로, 균형 잡힌 영양 섭취와 자율적 식사 예절을 형성합니다.',
  };
}

/**
 * 생년월일로부터 상세 개월 수 및 추천 가이드를 한 번에 추출하는 편의 함수.
 */
export function getBabyAgeInfo(
  birthDate: string | Date,
  baseDate?: string | Date
): BabyAgeInfo {
  const { months, days } = calculateBabyAgeParts(birthDate, baseDate);
  const stage = getWeaningStageGuide(months);
  return {
    months,
    days,
    formattedAge: days > 0 ? `만 ${months}개월 ${days}일` : `만 ${months}개월`,
    stage,
  };
}

/**
 * 1/N 재료비 자동 정산 계산.
 * 
 * @param totalExpense 총 재료비 (원)
 * @param babyCount 참여 아기 수
 * @returns 1인당 분담금 및 잔여금 결과 객체
 */
export function calculateSettlement(
  totalExpense: number,
  babyCount: number
): SettlementResult {
  const expense = Math.max(0, Math.floor(Number(totalExpense) || 0));
  const count = Math.max(0, Math.floor(Number(babyCount) || 0));

  if (count <= 0 || expense <= 0) {
    return {
      totalExpense: expense,
      babyCount: count,
      perPersonAmount: 0,
      remainderAmount: expense,
      formattedPerPerson: '0원',
      formattedRemainder: `${expense.toLocaleString('ko-KR')}원`,
    };
  }

  const perPersonAmount = Math.floor(expense / count);
  const remainderAmount = expense - perPersonAmount * count;

  return {
    totalExpense: expense,
    babyCount: count,
    perPersonAmount,
    remainderAmount,
    formattedPerPerson: `${perPersonAmount.toLocaleString('ko-KR')}원`,
    formattedRemainder: `${remainderAmount.toLocaleString('ko-KR')}원`,
  };
}
