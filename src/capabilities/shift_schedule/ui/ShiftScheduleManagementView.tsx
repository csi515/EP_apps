import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  Coins,
  X,
  UserCheck,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  detectShiftSlotConflict,
  calculateShiftWage,
  type StaffShift,
} from '../domain/shiftScheduleEngine';

const STORAGE_KEY_SHIFTS = 'moa_staff_shifts';

interface ShiftWithStaffName extends StaffShift {
  staffName: string;
  hourlyRate: number;
}

const SAMPLE_SHIFTS: ShiftWithStaffName[] = [
  {
    id: 'sft-001',
    staffId: 'staff-1',
    staffName: '이지훈 (오전 오픈)',
    startAt: `${new Date().toISOString().slice(0, 10)}T08:00:00Z`,
    endAt: `${new Date().toISOString().slice(0, 10)}T14:00:00Z`,
    breakMinutes: 30,
    hourlyRate: 10500,
  },
  {
    id: 'sft-002',
    staffId: 'staff-2',
    staffName: '김민아 (오후 피크)',
    startAt: `${new Date().toISOString().slice(0, 10)}T14:00:00Z`,
    endAt: `${new Date().toISOString().slice(0, 10)}T20:00:00Z`,
    breakMinutes: 30,
    hourlyRate: 10500,
  },
  {
    id: 'sft-003',
    staffId: 'staff-3',
    staffName: '박준영 (야간 마감)',
    startAt: `${new Date().toISOString().slice(0, 10)}T20:00:00Z`,
    endAt: `${new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)}T02:00:00Z`,
    breakMinutes: 30,
    hourlyRate: 10500,
  },
];

export const ShiftScheduleManagementView: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftWithStaffName[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIFTS);
      if (saved) {
        setShifts(JSON.parse(saved));
      } else {
        setShifts(SAMPLE_SHIFTS);
        localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(SAMPLE_SHIFTS));
      }
    } catch {
      setShifts(SAMPLE_SHIFTS);
    }
  }, []);

  const saveShifts = (next: ShiftWithStaffName[]) => {
    setShifts(next);
    try {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(next));
    } catch {
      // 무시
    }
  };

  const filteredShifts = useMemo(() => {
    if (!searchTerm.trim()) return shifts;
    return shifts.filter((s) => s.staffName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [shifts, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>직원 교대 및 시급 정산</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">근무 교대·시프트</h1>
          <p className="text-xs text-slate-500 mt-1">
            직원 근무표 배정, 시간대 중복 충돌 방어 및 야간 수당 자동 산출을 지원합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>신규 근무 시프트 배정</span>
        </button>
      </div>

      {/* 요약 바 */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="직원명 검색"
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold">
          배정된 시프트 <span className="text-violet-600 font-bold">{shifts.length}</span>건
        </div>
      </div>

      {/* 시프트 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShifts.map((shift) => {
          let wage = { actualWorkMinutes: 0, regularPay: 0, nightBonusPay: 0, totalPay: 0 };
          try {
            wage = calculateShiftWage({
              clockIn: shift.startAt,
              clockOut: shift.endAt,
              breakMinutes: shift.breakMinutes,
              hourlyRate: shift.hourlyRate,
            });
          } catch {
            // 계산 불가 시 기본값
          }

          const hours = (wage.actualWorkMinutes / 60).toFixed(1);

          return (
            <div
              key={shift.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {shift.staffName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    시급: {shift.hourlyRate.toLocaleString()}원
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold">
                  휴게 {shift.breakMinutes}분
                </span>
              </div>

              {/* 근무 시간대 */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">출근 시각</span>
                  <span className="font-semibold">{new Date(shift.startAt).toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">퇴근 시각</span>
                  <span className="font-semibold">{new Date(shift.endAt).toLocaleString('ko-KR')}</span>
                </div>
              </div>

              {/* 급여 및 실근무 시간 산출 */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>실근무 시간</span>
                  <span className="font-bold text-slate-800">{hours}시간</span>
                </div>

                {wage.nightBonusPay > 0 && (
                  <div className="flex items-center justify-between text-amber-600">
                    <span>야간 할증 수당 (22~06시)</span>
                    <span className="font-bold">+{wage.nightBonusPay.toLocaleString()}원</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 text-[11px]">예상 지급액</span>
                  <span className="font-black text-slate-900 text-sm">
                    {wage.totalPay.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 시프트 배정 모달 */}
      {isNewModalOpen && (
        <NewShiftModal
          existingShifts={shifts}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(newShift) => {
            saveShifts([...shifts, newShift]);
            setIsNewModalOpen(false);
            showToast(`'${newShift.staffName}' 시프트가 배정되었습니다.`, 'success');
          }}
        />
      )}
    </div>
  );
};

const NewShiftModal: React.FC<{
  existingShifts: StaffShift[];
  onClose: () => void;
  onCreated: (shift: ShiftWithStaffName) => void;
}> = ({ existingShifts, onClose, onCreated }) => {
  const [staffName, setStaffName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [hourlyRate, setHourlyRate] = useState('10500');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    const startAt = `${date}T${startTime}:00Z`;
    const endAt = `${date}T${endTime}:00Z`;

    // 충돌 감지
    try {
      const conflictCheck = detectShiftSlotConflict(existingShifts, {
        staffId: staffName.trim(),
        startAt,
        endAt,
      });

      if (conflictCheck.hasConflict) {
        showToast('해당 직원의 근무 시간이 다른 시프트와 중복됩니다!', 'warning');
        return;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '시간 형식이 올바르지 않습니다.', 'warning');
      return;
    }

    const newShift: ShiftWithStaffName = {
      id: `sft-${Date.now()}`,
      staffId: staffName.trim(),
      staffName: staffName.trim(),
      startAt,
      endAt,
      breakMinutes: Number(breakMinutes) || 0,
      hourlyRate: Number(hourlyRate) || 10500,
    };

    onCreated(newShift);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900">신규 근무 시프트 배정</h3>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">직원명</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">근무 일자</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">출근 시각</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">퇴근 시각</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">휴게 시간 (분)</label>
              <input
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">시급 (원)</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-500">
              취소
            </button>
            <button type="submit" className="px-4 py-2 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700">
              시프트 배정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
