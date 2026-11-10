/**
 * MBO 화면용 쉬운 한글 문구.
 * 도메인 식별자(checkin, lock 등)는 코드에 두고, 사용자에게 보이는 말만 여기서 통일한다.
 */

export const MBO_COPY = {
  appTitle: '내 목표',
  appTitleManager: 'MBO 팀 관리',
  appSubtitle: '목표를 등록하고, 이번 달 진척을 남기고, 일정을 확인합니다.',
  appSubtitleManager: '팀 진척·일정·승인을 한곳에서 확인합니다.',

  tabTeam: '팀',
  tabMine: '내 목표',
  tabShared: '공유받은 목표',

  sectionGoalsMine: '내 목표',
  sectionGoalsTeam: '팀 목표',
  sectionSchedule: '진행 일정',
  panelSchedule: '일정표',
  panelGoals: '목표 목록',
  cyclePolicySummary: '목표는 잠금 기간에 수정이 제한됩니다. 실행 일정·진척 보고는 언제든 가능합니다.',
  cycleManagerOverride: '부서장은 관리 팀원 목표를 잠금 중에도 수정할 수 있습니다.',

  createGoal: '새 목표 등록',
  createGoalModal: '새 목표 등록',
  createGoalTitlePlaceholder: '예: 핵심 KPI 달성 — 전환율·생산성 등 정량 목표를 한 문장으로',
  createGoalCriteriaPlaceholder: '예: 월 단위 측정 지표와 달성 기준(수치·마감 조건)',

  kpiTeamAvg: '팀 평균 진척',
  kpiMissingReport: '이번 달 미보고',
  kpiDelayed: '지연·위험',
  kpiApprovalPending: '승인 대기',

  hubMineCount: '내 목표',
  hubMineAvg: '내 평균 진척',
  hubTeamCount: '팀 목표',
  hubMissingReport: '이번 달 미보고',

  missingReportBanner: (ym: string, count: number) =>
    `${ym} 이번 달 진척 보고가 없는 과제 ${count}건`,
  filterDelayed: '지연·위험 과제만 보는 중',
  filterMissingReport: '이번 달 미보고 과제만 보는 중',
  filterClear: '필터 해제',

  monthlyReport: '이번 달 진척 보고',
  monthlyReportWrite: '진척 보고 작성',
  monthlyReportSave: '진척 보고 저장',
  monthlyReportHistory: '진척 보고 이력',
  monthlyReportMissing: '이번 달 진척 보고가 아직 없습니다.',
  monthlyReportSaved: (ym: string) => `${ym} 진척 보고가 저장되었습니다.`,
  monthlyReportSaveFailed: '진척 보고 저장에 실패했습니다.',
  monthlyReportHint: '이번 달에 한 일과 진척률을 남깁니다. 상사가 의견을 남길 수 있습니다.',
  openScheduleAndReport: '일정·진척 보고 보기',
  projectCreatedHint: '실행 과제가 만들어졌습니다. 일정표에서 기간을 조정하세요.',

  weightLabel: '비중 (%)',
  weightShort: (n: number) => `비중 ${n}%`,
  weightInvalid: (total: number, diff: number) =>
    diff > 0
      ? `목표 비중 합이 100%가 아닙니다 (현재 ${total}%, ${diff}% 부족).`
      : `목표 비중 합이 100%가 아닙니다 (현재 ${total}%, ${Math.abs(diff)}% 초과).`,
  weightChipWarn: '비중 미달',

  lockActive: '지금은 목표 문구를 수정할 수 없습니다',
  lockOff: '목표 수정 가능',
  lockUntil: (month: number, day: number) => `목표 수정 마감 ${month}월 ${day}일`,
  lockBlockCreate: '목표 수정 마감 기간에는 새 목표를 등록할 수 없습니다.',
  lockBlockSchedule: '목표 수정 마감 기간에는 일정을 변경할 수 없습니다.',
  lockBlockEdit: '목표 수정 마감 기간에는 목표 문구·핵심 지표를 고칠 수 없습니다.',
  lockSettingsTitle: '목표 수정 마감·평가 기간',
  lockSettingsUse: '목표 수정 마감 사용 (마감일 이후 목표 문구·핵심 지표 수정 불가)',
  lockSettingsDate: '목표 수정 마감일',
  lockSettingsSaved: '목표 수정 마감과 평가 기간이 저장되었습니다.',
  lockSettingsDefault: '기본값 (1/31 수정 마감 · 12/1~12/31 평가)',
  cycleSettingsTitle: '목표 일정 설정',
  cycleSettingsDesc: '매년 반복되는 목표 수정 마감·평가 기간입니다.',
  cycleSettingsButton: '일정 설정',

  scheduleTitle: '진행 일정',
  scheduleHint: '이름을 누르면 일정 변경과 진척 보고를 할 수 있습니다.',
  ganttSpanOne: '1년',
  ganttSpanTwo: (y: number) => `${y}~${y + 1}년`,
  ganttDragHint:
    '막대 가운데를 드래그해 옮기고, 양끝을 잡아 기간을 늘리거나 줄입니다. 연말~이듬해 일정은 기간 보기를 「올해+내년」으로 바꾸세요.',
  ownerPickerLabel: '책임 담당자',
  ownerPickerPlaceholder: '조직 멤버에서 선택',
  ownerDepartmentLine: (name: string) => `담당 부서 · ${name}`,
  searchMember: '팀원 검색',
  chipReportMissing: '이번 달 미보고',

  levelHintTitle: (level: string) => `지금 등록할 수 있는 최고 단계: ${level}`,
  levelHintBody: '자기보다 윗단계 목표는 등록할 수 없습니다. 상위 목표가 먼저 있어야 합니다.',
  levelSelect: '목표 단계',

  superiorFound: (who: string) => `내 상급자 · ${who}`,
  superiorNone: '내 상급자 · 조직도에 아직 지정되지 않음',
  superiorNoDepartment: '내 상급자 · 소속 부서를 먼저 지정해 주세요',
  superiorSelfTop: '내 상급자 · 없음 (조직도 최상위)',
} as const;
