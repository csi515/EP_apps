import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  FileText,
  ShieldAlert,
  Calculator,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  User,
  PenTool,
  RotateCcw,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateRefundEstimate,
  evaluateContractStatus,
  summarizeContracts,
  type SignedContract,
  type ContractTemplateType,
} from '../domain/digitalContractEngine';

const STORAGE_KEY_CONTRACTS = 'moa_digital_contracts_data';

const DEFAULT_CONTRACTS: SignedContract[] = [
  {
    id: 'ctr-101',
    contractNumber: 'CTR-202610-001',
    templateType: 'personal_training',
    title: '1:1 VIP 퍼스널 트레이닝 30회 이용계약서',
    customerName: '홍길동',
    customerPhone: '010-8832-1920',
    totalContractAmount: 1800000,
    startDate: '2026-10-01',
    endDate: '2027-01-31',
    totalSessionsOrDays: 30,
    usedSessionsOrDays: 6,
    signedAt: '2026-10-01T14:20:00Z',
    status: 'ACTIVE',
    notes: '공정위 표준약관 10% 위약금 및 환불 규정 동의 완료',
  },
  {
    id: 'ctr-102',
    contractNumber: 'CTR-202610-002',
    templateType: 'membership_pass',
    title: '피트니스 연간 VIP 올패스 회원권 계약서',
    customerName: '김민주',
    customerPhone: '010-5541-9921',
    totalContractAmount: 1200000,
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    totalSessionsOrDays: 365,
    usedSessionsOrDays: 45,
    signedAt: '2026-09-01T11:00:00Z',
    status: 'ACTIVE',
    notes: '락커 및 운동복 무료 지원 혜택 포함',
  },
  {
    id: 'ctr-103',
    contractNumber: 'CTR-202609-015',
    templateType: 'academy_tuition',
    title: '중등 입시 영어 단과 3개월 정기 수강원서',
    customerName: '이서진 (학부모 이정훈)',
    customerPhone: '010-3321-4411',
    totalContractAmount: 900000,
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    totalSessionsOrDays: 24,
    usedSessionsOrDays: 12,
    signedAt: '2026-09-01T16:30:00Z',
    status: 'ACTIVE',
  },
];

export const DigitalContractManagementView: React.FC = () => {
  const [contracts, setContracts] = useState<SignedContract[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTRACTS);
      return saved ? JSON.parse(saved) : DEFAULT_CONTRACTS;
    } catch {
      return DEFAULT_CONTRACTS;
    }
  });

  const [selectedContractId, setSelectedContractId] = useState<string>(DEFAULT_CONTRACTS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // 환불 시뮬레이터 소진 수량 입력 상태
  const [simulatedUsedUnits, setSimulatedUsedUnits] = useState<number>(6);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
    } catch {}
  }, [contracts]);

  const selectedContract = contracts.find((c) => c.id === selectedContractId) || contracts[0];
  const summary = useMemo(() => summarizeContracts(contracts), [contracts]);

  const refundCalculation = useMemo(() => {
    return calculateRefundEstimate(selectedContract, simulatedUsedUnits, 10);
  }, [selectedContract, simulatedUsedUnits]);

  const filteredContracts = useMemo(() => {
    if (!searchQuery.trim()) return contracts;
    const q = searchQuery.toLowerCase();
    return contracts.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    );
  }, [contracts, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              현장 전자계약 & 환불 규정 서명 보관
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            태블릿 전자서명을 통해 공정위 표준약관 환불 규정을 체결하고 분쟁 없는 안전한 계약서를 5년간 보관합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSignModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <PenTool className="w-4 h-4" />
            현장 전자서약 체결
          </button>
        </div>
      </div>

      {/* 종합 메트릭 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">유효 체결 계약</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.activeCount}건</div>
          <p className="text-xs text-gray-400 mt-1">총 체결 {summary.totalContractCount}건 중</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">총 보관 계약 가치</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {summary.totalContractValue.toLocaleString()}원
          </div>
          <p className="text-xs text-gray-400 mt-1">법적 효력 전자 서명 보관</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <div className="flex items-center justify-between text-blue-800 mb-2">
            <span className="text-sm font-medium">공정위 표준 위약금 10%</span>
            <ShieldAlert className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">분쟁 방지 연동</div>
          <p className="text-xs text-blue-600 mt-1">소진 회차 일할 공제 자동 계산</p>
        </div>
      </div>

      {/* 계약서 목록 & 상세 서명 뷰어 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측 계약서 목록 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="고객명, 계약번호 검색..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {filteredContracts.map((c) => {
              const isSelected = c.id === selectedContract.id;
              const status = evaluateContractStatus(c);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedContractId(c.id);
                    setSimulatedUsedUnits(c.usedSessionsOrDays);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900">{c.customerName}</span>
                    <span className="text-xs text-gray-400 font-mono">{c.contractNumber}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 truncate">{c.title}</div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">
                      {c.usedSessionsOrDays}/{c.totalSessionsOrDays} 이용
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                      {status === 'ACTIVE' ? '유효 계약' : '만료됨'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우측 계약서 상세 & 환불 시뮬레이터 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedContract.contractNumber}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedContract.title}</h2>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">총 계약 금액</div>
                <div className="text-xl font-extrabold text-gray-900">
                  {selectedContract.totalContractAmount.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 계약 인적 사항 및 기간 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3.5 rounded-lg">
              <div>
                <span className="text-gray-400 block">계약자명</span>
                <span className="font-semibold text-gray-900">{selectedContract.customerName}</span>
              </div>
              <div>
                <span className="text-gray-400 block">연락처</span>
                <span className="font-semibold text-gray-900">{selectedContract.customerPhone}</span>
              </div>
              <div>
                <span className="text-gray-400 block">계약 기간</span>
                <span className="font-semibold text-gray-900">
                  {selectedContract.startDate} ~ {selectedContract.endDate}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">소진 진도율</span>
                <span className="font-semibold text-blue-600">
                  {selectedContract.usedSessionsOrDays} / {selectedContract.totalSessionsOrDays}
                </span>
              </div>
            </div>

            {/* 공정위 표준 환불 규정 산출 보드 */}
            <div className="border border-amber-200 bg-amber-50/50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-700" />
                  <span>중도 해지 위약금 및 환불금 공식 자동 산출기</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">이용 소진량:</span>
                  <input
                    type="number"
                    min={0}
                    max={selectedContract.totalSessionsOrDays}
                    value={simulatedUsedUnits}
                    onChange={(e) => setSimulatedUsedUnits(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-xs border rounded bg-white text-center font-bold"
                  />
                  <span className="text-xs text-gray-500">회/일</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="bg-white p-3 rounded-lg border">
                  <span className="text-gray-500 block">이용 대가 (단가 차감)</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                    -{refundCalculation.usedAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <span className="text-gray-500 block">법정 위약금 (총액의 10%)</span>
                  <span className="font-bold text-red-600 text-sm mt-0.5 block">
                    -{refundCalculation.penaltyAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-300 bg-emerald-50/60">
                  <span className="text-emerald-800 block font-semibold">최종 반환 예상금</span>
                  <span className="font-extrabold text-emerald-700 text-base mt-0.5 block">
                    {refundCalculation.refundableAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 전자서명 확인 및 액션 */}
            <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>체결일시: {new Date(selectedContract.signedAt).toLocaleString('ko-KR')}</span>
              </div>
              <button
                onClick={() =>
                  showToast(
                    `[${selectedContract.contractNumber}] 법적 효력 전자계약서 PDF가 다운로드되었습니다.`,
                    'success'
                  )
                }
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                <Download className="w-3.5 h-3.5" />
                계약서 PDF 내려받기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
