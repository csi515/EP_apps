import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  Printer,
  History,
  Send,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  HardHat,
  Eye,
  FileCheck,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  type WorkStandardSOPMaster,
  type StepHazardBlock,
  type RevisionSnapshot,
  PRESET_DEPARTMENTS,
  generateSopDocNo,
  getNextSequenceNumber,
  computeRiskScore,
} from '../domain/sopNumberingAndAuditEngine';

// 초기 데모 데이터 (차량 리프트 하부 정비 및 테이블쏘 작업)
const INITIAL_MASTERS: WorkStandardSOPMaster[] = [
  {
    docNo: 'SOP-MNT-001',
    deptCode: 'MNT',
    deptName: '정비보전팀',
    processName: '차량 리프트 하부 정비 및 부품 교체 작업',
    currentRev: 'Rev.02',
    activeRevNumber: 2,
    status: 'approved',
    revisions: [
      {
        revNumber: 0,
        revLabel: 'Rev.00',
        revisedDate: '2025-06-15',
        revReason: '신규 정비 공정 안전작업표준서 최초 제정',
        authorName: '이정비 주임',
        reviewerName: '김안전 과장',
        approverName: '박센터장',
        status: 'approved',
        prohibitedActions: [
          '락 미체결 상태 하부 진입 금지',
          '리프트 가동 중 타 작업자 출입 금지',
        ],
        stepsSnapshot: [
          {
            id: 'step-0-1',
            stepNumber: 1,
            actionTitle: '차량 진입 및 리프트 암 체결',
            hazardDesc: '차량 중심점 불일치 시 편하중 전복 위험',
            hazardCategory: '기계적/전도',
            initialFreq: 4,
            initialSev: 5,
            initialScore: 20,
            initialLevel: 'critical',
            sopControlMeasure: '중심점 마킹 정렬 후 4개 지지 포인트 확실히 고정',
            requiredPPE: ['안전모', '절연 안전화'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '정비 1조',
            actionDeadline: '상시 적용',
            isImplemented: true,
          },
        ],
      },
      {
        revNumber: 1,
        revLabel: 'Rev.01',
        revisedDate: '2026-01-10',
        revReason: '유압 실린더 노후화 점검 및 비상 정지 절차 보완',
        authorName: '김정비 책임',
        reviewerName: '김안전 과장',
        approverName: '박센터장',
        status: 'approved',
        prohibitedActions: [
          '락 미체결 상태 하부 진입 금지',
          '리프트 가동 중 타 작업자 출입 금지',
          '정격 하중(3.5톤) 초과 차량 인양 금지',
        ],
        stepsSnapshot: [
          {
            id: 'step-1-1',
            stepNumber: 1,
            actionTitle: '차량 진입 및 리프트 암 체결',
            hazardDesc: '차량 중심점 불일치 시 편하중 전복 위험',
            hazardCategory: '기계적/전도',
            initialFreq: 4,
            initialSev: 5,
            initialScore: 20,
            initialLevel: 'critical',
            sopControlMeasure: '중심점 마킹 정렬 후 4개 지지 포인트 확실히 고정',
            requiredPPE: ['안전모', '절연 안전화'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '정비 1조',
            actionDeadline: '상시 적용',
            isImplemented: true,
          },
          {
            id: 'step-1-2',
            stepNumber: 2,
            actionTitle: '50cm 상승 후 흔들림 점검',
            hazardDesc: '차체 체결 불량 시 상승 도중 이탈 및 낙하',
            hazardCategory: '낙하/충돌',
            initialFreq: 3,
            initialSev: 4,
            initialScore: 12,
            initialLevel: 'high',
            sopControlMeasure: '손으로 차체를 전후좌우 흔들어 결착 상태 수동 확인',
            requiredPPE: ['안전모', '보안경'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '정비 1조',
            actionDeadline: '상시 적용',
            isImplemented: true,
          },
        ],
      },
      {
        revNumber: 2,
        revLabel: 'Rev.02',
        revisedDate: '2026-10-21',
        revReason: '신규 고압 유압 리프트 도입에 따른 안전 걸쇠 2중 락 및 보안경 필수 착용 추가',
        authorName: '김정비 책임안전관리자',
        reviewerName: '박안전 부장',
        approverName: '최공장장',
        status: 'approved',
        prohibitedActions: [
          '기계식 안전 걸쇠(락) 미체결 상태에서 차량 하부 진입 절대 금지',
          '리프트 승·하강 작동 중 작업 반경 2m 이내 타 작업자 출입 금지',
          '차량 정격 허용 하중(3.5톤) 초과 차량 및 개조 차량 인양 금지',
          '안전모 턱끈 미착용 및 면장갑 착용 상태 정비 금지',
        ],
        stepsSnapshot: [
          {
            id: 'step-2-1',
            stepNumber: 1,
            actionTitle: '차량 진입 및 리프트 암 4점 체결',
            hazardDesc: '차량 중심점 불일치 시 편하중으로 인한 전복 및 끼임 위험',
            hazardCategory: '기계적/전도',
            initialFreq: 4,
            initialSev: 5,
            initialScore: 20,
            initialLevel: 'critical',
            sopControlMeasure: '차량 중심점 마킹을 정렬하고 4개 지지 패드를 리프팅 포인트에 수평 체결',
            requiredPPE: ['안전모', '절연 안전화', '절단방지장갑'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '정비 1조',
            actionDeadline: '상시 준수',
            isImplemented: true,
          },
          {
            id: 'step-2-2',
            stepNumber: 2,
            actionTitle: '1차 50cm 상승 후 흔들림 안전 점검',
            hazardDesc: '패드 미끄러짐 및 암 체결 불량 시 차체 이탈 낙하',
            hazardCategory: '낙하/충돌',
            initialFreq: 3,
            initialSev: 4,
            initialScore: 12,
            initialLevel: 'high',
            sopControlMeasure: '지상 50cm 지점에서 정지 후 차체 흔들림 수동 확인 및 암 잠금장치 결합 체크',
            requiredPPE: ['안전모', '보안경'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '김정비 책임',
            actionDeadline: '상시 준수',
            isImplemented: true,
          },
          {
            id: 'step-2-3',
            stepNumber: 3,
            actionTitle: '목표 정비 높이 상승 및 기계식 2중 락 체결',
            hazardDesc: '유압 실린더 배관 파손 시 급격한 유압 상실 및 압사 사고',
            hazardCategory: '압사/협착',
            initialFreq: 5,
            initialSev: 5,
            initialScore: 25,
            initialLevel: 'critical',
            sopControlMeasure: '목표 높이 도달 후 유압 밸브 차단 및 래칫 안전 걸쇠 걸림음(딸깍) 2회 필수 확인',
            requiredPPE: ['안전모', '방진마스크'],
            residualFreq: 1,
            residualSev: 3,
            residualScore: 3,
            residualLevel: 'low',
            assignee: '정비 1조',
            actionDeadline: '상시 준수',
            isImplemented: true,
          },
          {
            id: 'step-2-4',
            stepNumber: 4,
            actionTitle: '하부 부품 탈거 및 오일 드레인 정비 작업',
            hazardDesc: '고온 폐오일 비산 화상 및 볼트/공구 낙하로 인한 두부 안구 부상',
            hazardCategory: '화상/비산',
            initialFreq: 3,
            initialSev: 2,
            initialScore: 6,
            residualFreq: 1,
            residualSev: 1,
            residualScore: 1,
            initialLevel: 'medium',
            residualLevel: 'low',
            sopControlMeasure: '반드시 보안경과 안면보호구 착용 후 2인 1조 작업 수행, 오일 받침대 드레인 정위치',
            requiredPPE: ['안전모', '보안경', '내유성장갑'],
            assignee: '정비 1조',
            actionDeadline: '상시 준수',
            isImplemented: true,
          },
        ],
      },
    ],
  },
  {
    docNo: 'SOP-PRD1-001',
    deptCode: 'PRD1',
    deptName: '생산1팀',
    processName: '목공실 고속 테이블쏘(원형톱) 부재 재단 작업',
    currentRev: 'Rev.01',
    activeRevNumber: 1,
    status: 'approved',
    revisions: [
      {
        revNumber: 1,
        revLabel: 'Rev.01',
        revisedDate: '2026-09-12',
        revReason: '푸시 스틱(밀대) 의무화 및 방음 귀마개 추가',
        authorName: '이공방 목공마스터',
        reviewerName: '박안전 부장',
        approverName: '최공장장',
        status: 'approved',
        prohibitedActions: [
          '장갑(목장갑, 면장갑) 착용 절대 금지 (톱날 말림 위험)',
          '톱날 안전 덮개(가드) 탈거 상태에서 작업 금지',
          '톱날 10cm 이내 맨손 접근 절대 금지',
        ],
        stepsSnapshot: [
          {
            id: 'step-p1-1',
            stepNumber: 1,
            actionTitle: '작업 전 집진기 가동 및 톱날 균열 점검',
            hazardDesc: '톱날 피로 파손 파편 비산 및 미세 목분 흡입',
            hazardCategory: '비산/분진',
            initialFreq: 3,
            initialSev: 4,
            initialScore: 12,
            initialLevel: 'high',
            sopControlMeasure: '조기 점검 시 톱날 팁 균열 확인 및 자동 집진기 가동 스위치 ON',
            requiredPPE: ['보안경', '방진마스크', '방음 귀마개'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '목공 1조',
            actionDeadline: '상시 준수',
            isImplemented: true,
          },
          {
            id: 'step-p1-2',
            stepNumber: 2,
            actionTitle: '푸시 스틱(밀대)을 사용한 자재 밀기 절단',
            hazardDesc: '자재 킥백(반동)으로 인한 톱날 손가락 접촉 및 절단 사고',
            hazardCategory: '절단/끼임',
            initialFreq: 5,
            initialSev: 5,
            initialScore: 25,
            initialLevel: 'critical',
            sopControlMeasure: '톱날 15cm 이전부터 양손 대신 전용 푸시 스틱 2개를 사용하여 가압 이송',
            requiredPPE: ['보안경', '방진마스크'],
            residualFreq: 1,
            residualSev: 2,
            residualScore: 2,
            residualLevel: 'low',
            assignee: '목공 1조',
            actionDeadline: '상시 준수',
            isImplemented: true,
          },
        ],
      },
    ],
  },
];

export const DesktopSopRiskMatrixView: React.FC = () => {
  const [masters, setMasters] = useState<WorkStandardSOPMaster[]>(INITIAL_MASTERS);
  const [selectedDocNo, setSelectedDocNo] = useState<string>(INITIAL_MASTERS[0].docNo);
  const [selectedRevNum, setSelectedRevNum] = useState<number>(INITIAL_MASTERS[0].activeRevNumber);

  // 모달 상태
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 신규 공정 등록 폼
  const [newDeptCode, setNewDeptCode] = useState<string>('MNT');
  const [newProcessName, setNewProcessName] = useState<string>('');

  // 개정 기안 폼
  const [revReasonInput, setRevReasonInput] = useState<string>('');

  // 현재 선택된 마스터
  const currentMaster = useMemo(() => {
    return masters.find((m) => m.docNo === selectedDocNo) || masters[0];
  }, [masters, selectedDocNo]);

  // 현재 선택된 리비전 스냅샷
  const currentRevSnapshot = useMemo<RevisionSnapshot>(() => {
    const rev = currentMaster.revisions.find((r) => r.revNumber === selectedRevNum);
    return rev || currentMaster.revisions[currentMaster.revisions.length - 1];
  }, [currentMaster, selectedRevNum]);

  // 활성 리비전 여부 (최신 적용 중인지, 과거 이력 열람인지)
  const isLatestRevision = currentRevSnapshot.revNumber === currentMaster.activeRevNumber;

  // 다음 채번 예상 번호
  const nextDocNoPreview = useMemo(() => {
    const allDocNos = masters.map((m) => m.docNo);
    const seq = getNextSequenceNumber(allDocNos, newDeptCode);
    return generateSopDocNo(newDeptCode, seq);
  }, [masters, newDeptCode]);

  // 위험도 요약 통계
  const riskSummary = useMemo(() => {
    const steps = currentRevSnapshot.stepsSnapshot;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const step of steps) {
      if (step.initialLevel === 'critical') critical++;
      else if (step.initialLevel === 'high') high++;
      else if (step.initialLevel === 'medium') medium++;
      else low++;
    }

    return { total: steps.length, critical, high, medium, low };
  }, [currentRevSnapshot]);

  // 필수 보호구 통합 목록
  const uniquePPE = useMemo(() => {
    const set = new Set<string>();
    for (const step of currentRevSnapshot.stepsSnapshot) {
      for (const ppe of step.requiredPPE) {
        set.add(ppe);
      }
    }
    return Array.from(set);
  }, [currentRevSnapshot]);

  // 공정 전환
  const handleSelectDoc = (docNo: string) => {
    const target = masters.find((m) => m.docNo === docNo);
    if (target) {
      setSelectedDocNo(docNo);
      setSelectedRevNum(target.activeRevNumber);
    }
  };

  // 신규 공정 생성
  const handleCreateNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcessName.trim()) return;

    const deptObj = PRESET_DEPARTMENTS.find((d) => d.code === newDeptCode);
    const allDocNos = masters.map((m) => m.docNo);
    const seq = getNextSequenceNumber(allDocNos, newDeptCode);
    const docNo = generateSopDocNo(newDeptCode, seq);

    const newMaster: WorkStandardSOPMaster = {
      docNo,
      deptCode: newDeptCode,
      deptName: deptObj?.name || newDeptCode,
      processName: newProcessName.trim(),
      currentRev: 'Rev.00',
      activeRevNumber: 0,
      status: 'approved',
      revisions: [
        {
          revNumber: 0,
          revLabel: 'Rev.00',
          revisedDate: new Date().toISOString().split('T')[0],
          revReason: '신규 공정 표준작업서 및 위험성평가 최초 제정',
          authorName: '현장 안전관리자',
          reviewerName: '안전보건팀장',
          approverName: '사업소장',
          status: 'approved',
          prohibitedActions: [
            '보호구 미착용 상태 작업 금지',
            '비상 정지 장치 임의 해제 금지',
          ],
          stepsSnapshot: [
            {
              id: `step-${Date.now()}-1`,
              stepNumber: 1,
              actionTitle: `${newProcessName.trim()} 사전 준비 및 점검`,
              hazardDesc: '사전 점검 미흡으로 인한 오작동 위험',
              hazardCategory: '기계적',
              initialFreq: 3,
              initialSev: 3,
              initialScore: 9,
              initialLevel: 'medium',
              sopControlMeasure: '점검 체크리스트에 의거한 1차 육안 점검',
              requiredPPE: ['안전모', '안전화'],
              residualFreq: 1,
              residualSev: 2,
              residualScore: 2,
              residualLevel: 'low',
              assignee: '해당 공정 담당자',
              actionDeadline: '상시 준수',
              isImplemented: true,
            },
          ],
        },
      ],
    };

    setMasters([...masters, newMaster]);
    setSelectedDocNo(docNo);
    setSelectedRevNum(0);
    setNewProcessName('');
    setShowNewDocModal(false);
  };

  // 개정 기안 상신
  const handleSubmitRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revReasonInput.trim()) return;

    const nextRevNo = currentMaster.activeRevNumber + 1;
    const revLabel = `Rev.${String(nextRevNo).padStart(2, '0')}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const newRevSnapshot: RevisionSnapshot = {
      revNumber: nextRevNo,
      revLabel,
      revisedDate: dateStr,
      revReason: revReasonInput.trim(),
      authorName: '작업표준 기안자',
      reviewerName: '안전보건 검토관',
      approverName: '최종 승인관',
      status: 'approved',
      prohibitedActions: [...currentRevSnapshot.prohibitedActions],
      stepsSnapshot: currentRevSnapshot.stepsSnapshot.map((s) => ({
        ...s,
        id: `step-rev${nextRevNo}-${s.stepNumber}`,
      })),
    };

    const updatedMaster: WorkStandardSOPMaster = {
      ...currentMaster,
      currentRev: revLabel,
      activeRevNumber: nextRevNo,
      revisions: [...currentMaster.revisions, newRevSnapshot],
    };

    setMasters(masters.map((m) => (m.docNo === currentMaster.docNo ? updatedMaster : m)));
    setSelectedRevNum(nextRevNo);
    setRevReasonInput('');
    setShowRevisionModal(false);
  };

  return (
    <div
      className="mx-auto w-full max-w-[1920px] px-4 py-4 sm:px-6 space-y-4 print:p-0 print:m-0"
      data-testid="desktop-sop-risk-matrix"
    >
      {/* 1. 상단 컨트롤 바 (브리핑 & 액션) */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/workspace/intranet"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>사내 앱 런처</span>
          </Link>

          {/* 공정 전환 드롭다운 */}
          <div className="relative">
            <select
              value={selectedDocNo}
              onChange={(e) => handleSelectDoc(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm font-bold text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-hidden"
            >
              {masters.map((m) => (
                <option key={m.docNo} value={m.docNo}>
                  [{m.deptCode}] {m.docNo} - {m.processName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowNewDocModal(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>신규 공정 표준 등록</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 개정 차수(Revision) 선택 콤보박스 */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <History className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">이력:</span>
            <select
              value={selectedRevNum}
              onChange={(e) => setSelectedRevNum(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-indigo-700 focus:outline-hidden"
            >
              {currentMaster.revisions.map((rev) => (
                <option key={rev.revNumber} value={rev.revNumber}>
                  {rev.revLabel} ({rev.revisedDate}) {rev.revNumber === currentMaster.activeRevNumber ? '· 최신적용' : '· 과거스냅샷'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>제·개정 이력 카드</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>현장 인쇄/PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRevisionModal(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>개정 기안(승인요청)</span>
          </button>
        </div>
      </header>

      {/* 과거 리비전 열람 경고 배너 */}
      {!isLatestRevision && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 print:hidden">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>현재 과거 제·개정 스냅샷 ({currentRevSnapshot.revLabel})을 읽기 전용으로 열람 중입니다.</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRevNum(currentMaster.activeRevNumber)}
            className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700"
          >
            최신 적용본({currentMaster.currentRev})으로 복귀
          </button>
        </div>
      )}

      {/* 2. 메인 타이틀 & 부서 메타 정보 카드 (와이드) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-black tracking-wide text-white">
                <Building2 className="h-3 w-3" />
                {currentMaster.deptCode}
              </span>
              <span className="text-xs font-bold text-slate-500">{currentMaster.deptName}</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {currentMaster.docNo}_{currentRevSnapshot.revLabel}
              </span>
              <span className="text-xs text-slate-400">| 개정 승인: {currentRevSnapshot.revisedDate}</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {currentMaster.processName}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              개정 사유: {currentRevSnapshot.revReason} (기안: {currentRevSnapshot.authorName} / 승인: {currentRevSnapshot.approverName})
            </p>
          </div>

          {/* 공정 종합 위험도 신호등 */}
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-100">
            <div className="text-center px-3 border-r border-slate-200">
              <span className="block text-[11px] font-bold text-slate-400">총 작업단계</span>
              <span className="text-lg font-black text-slate-800">{riskSummary.total}단계</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                🔴 중대(Critical) {riskSummary.critical}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                🟠 높음(High) {riskSummary.high}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-yellow-100 px-2.5 py-1 text-xs font-black text-yellow-800">
                🟡 보통(Med) {riskSummary.medium}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                🟢 경미(Low) {riskSummary.low}
              </span>
            </div>
          </div>
        </div>

        {/* 필수 착용 보호구 바 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-slate-600 mr-1">
            <HardHat className="h-4 w-4 text-indigo-600" />
            공정 필수 착용 보호구:
          </span>
          {uniquePPE.map((ppe) => (
            <span
              key={ppe}
              className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800"
            >
              ✓ {ppe}
            </span>
          ))}
        </div>
      </section>

      {/* 3. 와이드 1:1 직결 매트릭스 그리드 (Step ↔ Hazard 1:1 결합 테이블) */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1280px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-bold">
                <th className="py-3.5 px-3 w-16 text-center">순번</th>
                <th className="py-3.5 px-4 w-[280px]">작업 표준 단계 (SOP Action)</th>
                <th className="py-3.5 px-4 w-[280px]">유해·위험요인 (Hazard)</th>
                <th className="py-3.5 px-3 w-28 text-center">초기 위험도</th>
                <th className="py-3.5 px-5">핵심 안전조치 및 SOP 통제기준</th>
                <th className="py-3.5 px-4 w-36">필수 보호구</th>
                <th className="py-3.5 px-3 w-28 text-center">개선후 위험도</th>
                <th className="py-3.5 px-4 w-32 text-center">담당 / 기한</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {currentRevSnapshot.stepsSnapshot.map((step) => {
                const isCritOrHigh = step.initialLevel === 'critical' || step.initialLevel === 'high';
                return (
                  <tr
                    key={step.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCritOrHigh ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* 순번 */}
                    <td className="py-4 px-3 text-center font-black text-slate-500">
                      {String(step.stepNumber).padStart(2, '0')}
                    </td>

                    {/* 작업 표준 단계 */}
                    <td className="py-4 px-4 font-bold text-slate-900 leading-snug">
                      <p className="text-sm font-black">{step.actionTitle}</p>
                      <span className="mt-1 inline-block text-[11px] font-medium text-slate-400">
                        RA 관리번호: {currentMaster.docNo.replace('SOP-', 'RA-')}-H{String(step.stepNumber).padStart(2, '0')}
                      </span>
                    </td>

                    {/* 잠재 유해위험요인 */}
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isCritOrHigh ? 'text-red-500' : 'text-amber-500'}`} />
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{step.hazardDesc}</p>
                          <span className="mt-1 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            분류: {step.hazardCategory}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 초기 위험도 */}
                    <td className="py-4 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black shadow-xs ${
                            step.initialLevel === 'critical'
                              ? 'bg-red-600 text-white'
                              : step.initialLevel === 'high'
                              ? 'bg-amber-500 text-white'
                              : step.initialLevel === 'medium'
                              ? 'bg-yellow-400 text-slate-900'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {step.initialScore}점 ({step.initialLevel.toUpperCase()})
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          빈도 {step.initialFreq} × 강도 {step.initialSev}
                        </span>
                      </div>
                    </td>

                    {/* 핵심 안전조치 및 SOP */}
                    <td className="py-4 px-5">
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-2.5">
                        <p className="font-bold text-indigo-950 leading-relaxed">
                          🛡️ {step.sopControlMeasure}
                        </p>
                      </div>
                    </td>

                    {/* 필수 보호구 */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {step.requiredPPE.map((p) => (
                          <span key={p} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* 개선 후 잔여 위험도 */}
                    <td className="py-4 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-black">
                          🟢 {step.residualScore}점 ({step.residualLevel.toUpperCase()})
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          빈도 {step.residualFreq} × 강도 {step.residualSev}
                        </span>
                      </div>
                    </td>

                    {/* 담당 / 기한 */}
                    <td className="py-4 px-4 text-center">
                      <p className="font-bold text-slate-900">{step.assignee}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.actionDeadline}</p>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> 이행 완료
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 생명 직결 [절대 금지 행위] 붉은색 경고 박스 (Red Card Bar) */}
      <section className="rounded-2xl border-2 border-red-500 bg-red-50/90 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-red-900">
          <ShieldAlert className="h-6 w-6 text-red-600 animate-pulse" />
          <h3 className="text-base font-black">현장 생명 직결 절대 금지 행위 (Life-Critical Prohibited Actions)</h3>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-xs font-bold text-red-800">
          {currentRevSnapshot.prohibitedActions.map((action, idx) => (
            <li key={idx} className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-red-200">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                ✕
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. 신규 공정 표준 등록 모달 (부서 코드 기반 자동 채번) */}
      {showNewDocModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">신규 공정 표준(SOP) 등록 & 채번</h3>
              <button type="button" onClick={() => setShowNewDocModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDoc} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600">소속 부서 선택 (부서 코드 prefix 부여)</label>
                <select
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-900"
                >
                  {PRESET_DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      [{dept.code}] {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600">자동 부여 문서번호 (Auto-Numbering)</label>
                <div className="mt-1 flex h-11 items-center rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 text-sm font-black text-indigo-700">
                  {nextDocNoPreview} (최초 제정 Rev.00)
                </div>
                <p className="mt-1 text-[11px] text-slate-400">부서 코드 내 누적 일련번호에 따라 고유하게 자동 생성됩니다.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600">공정 / 작업 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="예: 클린룸 유기용제 취급 작업, CNC 정밀 가공 작업"
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDocModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  표준서 생성 및 채번 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 개정 기안(승인요청) 모달 */}
      {showRevisionModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">작업표준 개정 기안 (Audit Trail 승인)</h3>
              <button type="button" onClick={() => setShowRevisionModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRevision} className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-700">대상 문서: {currentMaster.docNo} ({currentMaster.processName})</p>
                <p className="text-indigo-600 font-bold">
                  차수 변경: {currentMaster.currentRev} ➔ Rev.{String(currentMaster.activeRevNumber + 1).padStart(2, '0')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600">개정 사유 (법적 Audit Trail 필수 입력)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="예: 공정 신규 장비 도입에 따른 끼임 위험 요인 재평가 및 안전 방호 덮개 확인 절차 추가"
                  value={revReasonInput}
                  onChange={(e) => setRevReasonInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-medium focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  개정안 상신 및 승인 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. 제·개정 이력 카드 모달 */}
      {showHistoryModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">제·개정 이력 추적 (Audit Trail History)</h3>
                <p className="text-xs text-slate-500">{currentMaster.docNo} · {currentMaster.processName}</p>
              </div>
              <button type="button" onClick={() => setShowHistoryModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {currentMaster.revisions.map((rev) => (
                <div
                  key={rev.revNumber}
                  className={`rounded-2xl border p-4 transition-all ${
                    rev.revNumber === selectedRevNum
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-indigo-700">{rev.revLabel}</span>
                    <span className="text-xs text-slate-400">승인일자: {rev.revisedDate}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-800">{rev.revReason}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                    <span>작성자: {rev.authorName}</span>
                    <span>검토: {rev.reviewerName}</span>
                    <span>최종승인: {rev.approverName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRevNum(rev.revNumber);
                        setShowHistoryModal(false);
                      }}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      해당 시점 열람
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
