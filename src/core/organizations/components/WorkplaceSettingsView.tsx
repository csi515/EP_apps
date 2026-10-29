// @ts-nocheck
import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { PageHeader } from '@/shared/components';
import {
  FormField,
  FORM_CONTROL_CLASS,
  SettingsCard,
} from '@/shared/components/ui';
import type { AcademySettings, AcademyRoomKind } from '../settingsTypes';
import { IndustryFeatureGuidePanel } from '@/core/help';
import { LegalLinks } from '@/core/legal';
import {
  Settings,
  Building,
  Save,
  Loader2,
  Trash2,
  DoorOpen,
  Plus,
  BookOpen,
  SlidersHorizontal,
  Shield,
} from 'lucide-react';
import { getIndustryAccent, getCustomerLabel, getPlaceLabel, getFeeLabel, getBankAccountPlaceholder, supportsDeposit as industrySupportsDeposit, showsTextbooksLink as industryShowsTextbooksLink, getRoomConfig } from '@/core/industry/industryUi';
import { normalizeIndustryType } from '@/core/industry/types';
import { renderStaffHoursFields } from '@/core/staff/staffUi';
import { useModuleLabels } from '@/core/labels';
import * as orgService from '@/core/organizations/services/organizationService';
import {
  ROOM_KIND_LABEL,
  createRoom,
  getConfiguredRooms,
} from '../utils/academyRooms';
import {
  EMPTY_ORGANIZATION_ADDRESS,
  formatOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';
import { OrganizationBackupCard } from './OrganizationSettingsCards';
import { buildWorkplaceSettingsSavePayload } from '../workplaceSettingsSave';

export const WorkplaceSettingsView: FC = () => {
  const navigate = useNavigate();
  const { showToast, triggerRefresh, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const placeLabel = getPlaceLabel(industry);
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const feeLabel = getFeeLabel(industry);
  const org = useOrganization();
  const roomCfg = getRoomConfig(industry);
  const depositSupported = industrySupportsDeposit(industry);
  const textbooksLinkVisible = industryShowsTextbooksLink(industry);
  const bankAccountPlaceholder = getBankAccountPlaceholder(industry);
  /** personal_plant_ops: 예약금·강의실·교재 등 학원 잔재 숨김 */
  const isPlantOps = normalizeIndustryType(industry) === 'personal_plant_ops';
  const showAcademyFacilityBlocks = !isPlantOps && (depositSupported || textbooksLinkVisible || Boolean(roomCfg));

  const accent = getIndustryAccent(industry);
  const accentBtn = `${accent.btn} ${accent.btnHover}`;
  const accentIcon = accent.icon;
  const accentHover = accent.hoverBg;

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings());
  const [addressParts, setAddressParts] = useState<OrganizationAddressValue>(() => {
    const saved = StorageService.getSettings();
    const existing = (saved.address || '').trim();
    return existing
      ? { ...EMPTY_ORGANIZATION_ADDRESS, roadAddress: existing }
      : EMPTY_ORGANIZATION_ADDRESS;
  });
  const [isSaving, setIsSaving] = useState(false);
  const rooms = getConfiguredRooms(settings);

  useEffect(() => {
    const orgId = org.currentOrganization?.id;
    if (!orgId) return;

    let cancelled = false;
    void (async () => {
      try {
        const loaded = await orgService.fetchOrganizationAddress(orgId);
        if (cancelled) return;
        const roadAddress =
          loaded.roadAddress.trim() || loaded.legacyAddress.trim() || '';
        setAddressParts({
          roadAddress,
          addressDetail: loaded.addressDetail,
          postal: loaded.postal,
          sido: loaded.sido,
          sigungu: loaded.sigungu,
          dong: loaded.dong,
          jibun: loaded.jibun,
        });
        if (roadAddress || loaded.addressDetail) {
          setSettings((prev) => ({
            ...prev,
            address:
              formatOrganizationAddress({
                roadAddress,
                addressDetail: loaded.addressDetail,
              }) ||
              loaded.legacyAddress ||
              prev.address,
          }));
        }
      } catch {
        // 로컬 설정 유지
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [org.currentOrganization?.id]);

  const updateRoom = (id: string, patch: { name?: string; kind?: AcademyRoomKind }) => {
    setSettings({
      ...settings,
      rooms: rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const addRoom = () => {
    setSettings({
      ...settings,
      rooms: [
        ...rooms,
        createRoom({
          name: `${roomCfg.defaultPrefix} ${rooms.length + 1}`,
          kind: roomCfg.defaultKind,
        }),
      ],
    });
  };

  const removeRoom = (id: string) => {
    setSettings({
      ...settings,
      rooms: rooms.filter((r) => r.id !== id),
    });
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const displayAddress =
        formatOrganizationAddress(addressParts) || settings.address || '';
      const nextSettings = {
        ...settings,
        address: displayAddress,
        rooms: getConfiguredRooms(settings),
      };
      
      if (org.currentOrganization) {
        await orgService.updateOrganization(org.currentOrganization.id, {
          name: settings.name,
          addressParts,
          settings: buildWorkplaceSettingsSavePayload(settings, {
            displayAddress,
            rooms: getConfiguredRooms(settings),
          }),
        });

        org.patchOrganization(org.currentOrganization.id, { name: settings.name });
        await org.refreshOrganizations();
      }
      
      StorageService.saveSettings(nextSettings);
      setSettings(nextSettings);
      triggerRefresh();
      showToast('사업장 설정이 저장되었습니다.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : '설정 저장 중 오류가 발생했습니다.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Settings className="w-6 h-6" />}
        iconClassName={accentIcon}
        title="사업장 운영 및 환경 설정"
        description="기본 정보, 출입 관리, 백업, 업종별 기능 설명서"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SettingsCard
          className="lg:col-span-2 sm:p-8"
          title={`${placeLabel} 운영 설정`}
          icon={<Building className={`w-4 h-4 ${accentIcon}`} />}
        >
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {depositSupported && (
              <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4"
                    checked={settings.depositEnabled === true}
                    onChange={(e) =>
                      setSettings({ ...settings, depositEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">예약금 받기</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      켜면 고객 신청 시 계좌이체와 QR을 보여 줍니다. 끄면 신청만 받습니다.
                    </span>
                  </span>
                </label>
                {settings.depositEnabled && (
                  <FormField label="예약금 금액">
                    <input
                      type="number"
                      min={0}
                      value={settings.depositAmount ?? 0}
                      onChange={(e) =>
                        setSettings({ ...settings, depositAmount: Number(e.target.value) || 0 })
                      }
                      className={FORM_CONTROL_CLASS}
                    />
                  </FormField>
                )}
                {renderStaffHoursFields({
                  teachers: StorageService.getTeachers().filter((t) => t.status === 'active'),
                  windows: settings.staffHours || [],
                  onChange: (staffHours) => setSettings({ ...settings, staffHours }),
                })}
              </div>
            )}

            {showAcademyFacilityBlocks ? (
              <>
                <FormField label="수납용 계좌번호 안내 (영수증 및 청구서에 표기)">
                  <input
                    type="text"
                    placeholder={bankAccountPlaceholder}
                    value={typeof settings.bankAccount === 'string' ? settings.bankAccount : ''}
                    onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
                    className={FORM_CONTROL_CLASS}
                  />
                </FormField>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <DoorOpen className={`w-4 h-4 ${accentIcon}`} />
                      <p className="text-sm font-bold text-slate-800">{roomCfg.sectionTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={addRoom}
                      className={`inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-bold rounded-xl ${accent.hoverBg} ${accentIcon}`}
                    >
                      <Plus className="w-4 h-4" />
                      추가
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {roomCfg.sectionDescription}
                  </p>
                  {rooms.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                      등록된 실이 없습니다. 추가하거나 온보딩에서 설정해 주세요.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {rooms.map((room) => (
                        <li
                          key={room.id}
                          className="flex flex-row gap-2 items-center rounded-xl border border-slate-100 bg-slate-50/80 p-2.5"
                        >
                          <input
                            type="text"
                            value={room.name}
                            onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                            className={`${FORM_CONTROL_CLASS} flex-1 min-h-[44px]`}
                            placeholder={roomCfg.placeholder}
                          />
                          <select
                            value={room.kind}
                            onChange={(e) =>
                              updateRoom(room.id, { kind: e.target.value as AcademyRoomKind })
                            }
                            className={`${FORM_CONTROL_CLASS} w-32 min-h-[44px]`}
                          >
                            {(roomCfg.allowedKinds as string[]).includes('treatment') && (
                              <option value="treatment">{ROOM_KIND_LABEL.treatment}</option>
                            )}
                            {(roomCfg.allowedKinds as string[]).includes('classroom') && (
                              <option value="classroom">{ROOM_KIND_LABEL.classroom}</option>
                            )}
                            {(roomCfg.allowedKinds as string[]).includes('practice') && (
                              <option value="practice">{ROOM_KIND_LABEL.practice}</option>
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeRoom(room.id)}
                            className="p-2.5 min-h-[44px] min-w-[44px] text-rose-500 hover:bg-rose-50 rounded-xl"
                            aria-label={`${room.name} 삭제`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {textbooksLinkVisible && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('textbooks')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 min-h-[44px]"
                    >
                      <BookOpen className="w-4 h-4" />
                      사용 교재는 교재 관리에서 등록
                    </button>
                  )}
                </div>
              </>
            ) : null}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-6 py-2.5 min-h-[44px] ${accentBtn} disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? '저장 중…' : '설정 정보 저장'}
              </button>
            </div>
          </form>
        </SettingsCard>

        <div className="space-y-6">
          {/* 사이드바 메뉴 표시 관리 바로가기 카드 */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">사이드바 메뉴 표시 관리</h3>
                  <p className="text-[11px] text-slate-500">현재 업종에 맞추어 불필요한 사이드바 메뉴를 숨기거나 표시합니다</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('capabilities')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
              >
                메뉴 설정 열기
              </button>
            </div>
          </div>

          {/* 직급 및 권한 설정 바로가기 카드 */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">직급 및 권한 설정</h3>
                  <p className="text-[11px] text-slate-500">대표, 팀장, 실무자 등 직급 신설 및 세부 권한을 제어합니다</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/workspace/settings/roles')}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
              >
                직급 관리 열기
              </button>
            </div>
          </div>

          <OrganizationBackupCard
            placeLabel={placeLabel}
            customerLabel={customerLabel}
            feeLabel={feeLabel}
            accentIcon={accentIcon}
            accentHover={accentHover}
          />

          <div className="pt-2 pb-4">
            <LegalLinks className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500" />
          </div>
        </div>
      </div>

      <IndustryFeatureGuidePanel industry={industry} />
    </div>
  );
};

/** @deprecated Use WorkplaceSettingsView */
export const AcademySettingsView: FC = WorkplaceSettingsView;

export default WorkplaceSettingsView;
