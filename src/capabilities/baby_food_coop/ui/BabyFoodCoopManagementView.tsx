import React, { useState } from 'react';
import {
  BabyProfileCard,
  type BabyProfile,
} from './BabyProfileCard';
import {
  BabySettlementWidget,
  type SettlementLedgerEntry,
} from './BabySettlementWidget';
import {
  getWeaningStageGuide,
  type WeaningStageGuide,
} from '@/domain/babyFood/babyFoodLogic';
import {
  Baby,
  BookOpen,
  Info,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const INITIAL_BABIES: BabyProfile[] = [
  {
    id: 'baby-1',
    name: '김민준',
    birthDate: '2026-05-15',
    guardianName: '이수진',
    crm_tags: ['초기이유식', '쌀미음완료', '애호박선호'],
    allergies: [],
    memo: '흘리지 않고 잘 먹음',
  },
  {
    id: 'baby-2',
    name: '박지우',
    birthDate: '2026-03-10',
    guardianName: '박태양',
    crm_tags: ['중기이유식', '계란알레르기', '쇠고기선호'],
    allergies: ['계란알레르기 (난류 주의)'],
    memo: '노른자 테스트 시 두드러기 반응 이력',
  },
  {
    id: 'baby-3',
    name: '최서아',
    birthDate: '2025-12-20',
    guardianName: '정미래',
    crm_tags: ['후기이유식', '우유알레르기', '핑거푸드시작'],
    allergies: ['우유알러지'],
    memo: '유제품 섭취 금지',
  },
  {
    id: 'baby-4',
    name: '정도윤',
    birthDate: '2025-09-05',
    guardianName: '강하늘',
    crm_tags: ['완료기유아식', '진밥적응', '치즈선호'],
    allergies: [],
    memo: '스스로 수저 들고 먹음',
  },
];

export const BabyFoodCoopManagementView: React.FC = () => {
  const [babies, setBabies] = useState<BabyProfile[]>(INITIAL_BABIES);
  const [selectedBabyIds, setSelectedBabyIds] = useState<Set<string>>(
    new Set(['baby-1', 'baby-2', 'baby-3'])
  );
  const [selectedGuideModal, setSelectedGuideModal] = useState<{
    guide: WeaningStageGuide;
    babyName: string;
  } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 신규 아기 등록 폼 상태
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newAllergiesInput, setNewAllergiesInput] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');

  const toggleBabySelection = (id: string) => {
    setSelectedBabyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllBabies = () => {
    setSelectedBabyIds(new Set(babies.map((b) => b.id)));
  };

  const deselectAllBabies = () => {
    setSelectedBabyIds(new Set());
  };

  const participatingBabies = babies.filter((b) => selectedBabyIds.has(b.id));

  const handleAddNewBaby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBirthDate) return;

    const allergyList = newAllergiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const tagList = newTagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newBaby: BabyProfile = {
      id: `baby-${Date.now()}`,
      name: newName.trim(),
      birthDate: newBirthDate,
      guardianName: newGuardianName.trim() || undefined,
      crm_tags: [...tagList, ...allergyList],
      allergies: allergyList,
    };

    setBabies((prev) => [newBaby, ...prev]);
    setSelectedBabyIds((prev) => new Set([...prev, newBaby.id]));

    // 폼 초기화
    setNewName('');
    setNewBirthDate('');
    setNewGuardianName('');
    setNewAllergiesInput('');
    setNewTagsInput('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 상단 히어로 배너 */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800 mb-2">
              <Baby className="h-4 w-4" />
              이유식 품앗이 모임 운영 센터
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              소규모 이유식 품앗이 & 1/N 정산 매니저
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              아기 생년월일 기반 실시간 만 월령 계산, 알레르기 안심 가이드, 모임 주기별
              재료비 1/N 자동 정산을 한곳에서 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              아기 프로필 등록
            </button>
          </div>
        </div>
      </div>

      {/* 2단 레이아웃: 좌측 아기 프로필 목록, 우측 1/N 자동 정산 위젯 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측: 아기 프로필 리스트 (7열) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                참여 아기 프로필 ({babies.length}명)
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllBabies}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                전체 참여
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={deselectAllBabies}
                className="text-slate-600 hover:text-slate-800"
              >
                선택 해제
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {babies.map((baby) => (
              <BabyProfileCard
                key={baby.id}
                baby={baby}
                isSelected={selectedBabyIds.has(baby.id)}
                onToggleSelect={toggleBabySelection}
                showWeaningGuideModal={(guide, name) =>
                  setSelectedGuideModal({ guide, babyName: name })
                }
              />
            ))}
          </div>
        </div>

        {/* 우측: 1/N 재료비 자동 정산 위젯 (5열) */}
        <div className="lg:col-span-5 sticky top-4">
          <BabySettlementWidget
            participatingBabies={participatingBabies}
            initialExpense={30000}
          />
        </div>
      </div>

      {/* 이유식 단계 가이드 상세 모달 */}
      {selectedGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {selectedGuideModal.babyName} 아기 맞춤{' '}
                  {selectedGuideModal.guide.stageLabel} 가이드
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuideModal(null)}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-600 block">
                  단계 설명 & 식사 빈도
                </span>
                <p className="mt-1 text-slate-800 font-medium">
                  {selectedGuideModal.guide.description}
                </p>
                <p className="mt-0.5 text-xs text-indigo-600 font-semibold">
                  섭취 주기: {selectedGuideModal.guide.feedingFrequency} (권장 질감:{' '}
                  {selectedGuideModal.guide.textureGuide})
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-emerald-700 block mb-1.5">
                  🌱 추천 음식 & 재료 리스트
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGuideModal.guide.recommendedFoods.map((f, idx) => (
                    <span
                      key={`modal-rec-${idx}`}
                      className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <span className="text-xs font-bold text-rose-800 block mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-rose-600" />
                  ⚠️ 주의 및 제한 식품
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-rose-900">
                  {selectedGuideModal.guide.cautionFoods.map((c, idx) => (
                    <li key={`modal-caut-${idx}`}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setSelectedGuideModal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 아기 프로필 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  새 아기 프로필 등록
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewBaby} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  아기 이름 *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 이로운"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  출생일 *
                </label>
                <input
                  type="date"
                  required
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  보호자명
                </label>
                <input
                  type="text"
                  value={newGuardianName}
                  onChange={(e) => setNewGuardianName(e.target.value)}
                  placeholder="예: 김보호"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">
                  알레르기 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={newAllergiesInput}
                  onChange={(e) => setNewAllergiesInput(e.target.value)}
                  placeholder="예: 계란알레르기, 우유알레르기"
                  className="w-full rounded-lg border border-rose-300 bg-rose-50/30 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  crm_tags / 일반 태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={newTagsInput}
                  onChange={(e) => setNewTagsInput(e.target.value)}
                  placeholder="예: 중기이유식, 소고기선호, 화목모임"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
