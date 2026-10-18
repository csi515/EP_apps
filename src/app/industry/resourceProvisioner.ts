import React from 'react';
import type { ResourceProps } from '@refinedev/core';
import {
  Users,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lock,
  Ticket,
  Package,
  Receipt,
  ReceiptText,
  BookOpen,
  BookOpenCheck,
  WalletCards,
  MessageSquareText,
  Sparkles,
  FileSignature,
  FileText,
  CalendarDays,
  CalendarClock,
  KanbanSquare,
  ClipboardCheck,
  ClipboardList,
  UserCheck,
  UserCheck2,
  Award,
  Truck,
  HeartPulse,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Box,
  Tag,
} from 'lucide-react';
import type { IndustryType } from '@/core/industry/catalog';
import { getIndustryCapabilities } from './industryCapabilityMap';
import type { MoaI18nProvider } from '@/providers/i18nProvider';
import {
  assemblePreset,
  assembleAdHocCapabilities,
  PresetAssemblyError,
} from '@/app/presets/presetAssembler';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import type { PresetCapabilityId } from '@/core/presets/types';
import { createLogger } from '@/core/logging';

const logger = createLogger('ResourceProvisioner');

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lock,
  Ticket,
  Package,
  Receipt,
  ReceiptText,
  BookOpen,
  BookOpenCheck,
  WalletCards,
  MessageSquareText,
  Sparkles,
  FileSignature,
  FileText,
  CalendarDays,
  CalendarClock,
  KanbanSquare,
  ClipboardCheck,
  ClipboardList,
  UserCheck,
  UserCheck2,
  Award,
  Truck,
  HeartPulse,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Box,
  Tag,
};

export interface ProvisionResourcesOptions {
  industry: IndustryType | string | null | undefined;
  i18n: MoaI18nProvider;
  /** 사업주가 스토어/설정에서 추가로 활성화한 Capability 목록 (0초 실시간 메뉴 재조립용) */
  activeCapabilities?: readonly string[];
}

/**
 * 활성 업종과 사업주 맞춤 Capability에 따라 Refine의 ResourceProps 배열을 동적으로 프로비저닝합니다.
 *
 * 1. dashboard: 전 업종 공통 대시보드
 * 2. roster: 활성 시 customers ("학생/회원/고객 관리") 프로비저닝
 * 3. scheduling: 활성 시 schedules ("일정 관리") 프로비저닝
 * 4. billing: 활성 시 tuition_invoices ("수강료/회비/결제") 프로비저닝
 * 5. Preset Assembler: 활성 업종 프리셋 기본 Capability 리소스 동적 결합
 * 6. Ad-Hoc Provisioner: 사업주가 추가로 켠 Capability 리소스 실시간 동적 주입 (Zero-Refresh)
 */
export function provisionIndustryResources(
  options: ProvisionResourcesOptions
): ResourceProps[] {
  const { industry, i18n, activeCapabilities = [] } = options;
  const capabilities = getIndustryCapabilities(industry);

  const resources: ResourceProps[] = [
    // 1. 대시보드는 모든 업종 공통
    {
      name: 'dashboard',
      list: '/',
      meta: {
        label: i18n.translate('resources.dashboard.name', '대시보드'),
        icon: React.createElement(LayoutDashboard, { className: 'h-4 w-4' }),
      },
    },
  ];

  const existingNames = new Set<string>(['dashboard']);

  // 2. roster capability: 고객/학생/회원 관리
  if (capabilities.roster !== false) {
    const customerSingular = i18n.translate('customer.singular', '고객');
    resources.push({
      name: 'customers',
      list: '/students',
      create: '/students/create',
      edit: '/students/:id/edit',
      show: '/students/:id',
      meta: {
        label: `${customerSingular} 관리`,
        icon: React.createElement(Users, { className: 'h-4 w-4' }),
      },
    });
    existingNames.add('customers');
  }

  // 3. scheduling capability: 일정/수업 관리
  if (capabilities.scheduling === true) {
    const scheduleSingular = i18n.translate('schedule.singular', '일정');
    resources.push({
      name: 'schedules',
      list: '/schedules',
      meta: {
        label: `${scheduleSingular} 관리`,
        icon: React.createElement(Calendar, { className: 'h-4 w-4' }),
      },
    });
    existingNames.add('schedules');
  }

  // 4. billing capability: 수강료/회비/결제 관리
  if (capabilities.billing === true) {
    const billingFee = i18n.translate('billing.fee', '수강료');
    resources.push({
      name: 'tuition_invoices',
      list: '/billing',
      meta: {
        label: `${billingFee}/결제`,
        icon: React.createElement(CreditCard, { className: 'h-4 w-4' }),
      },
    });
    existingNames.add('tuition_invoices');
  }

  const presetIncludedCaps = new Set<string>();

  // 5. Preset Assembler를 통한 업종 기본 Capability 리소스 병합
  if (industry) {
    const preset = getIndustryPreset(industry);
    if (preset) {
      for (const cap of preset.capabilities) {
        presetIncludedCaps.add(cap);
      }
      try {
        const assembled = assemblePreset(preset.id);
        for (const item of assembled.resources) {
          if (!existingNames.has(item.name)) {
            existingNames.add(item.name);
            const IconComponent = (item.meta.icon && ICON_MAP[item.meta.icon]) || LayoutGrid;
            resources.push({
              name: item.name,
              list: item.list,
              create: item.create,
              edit: item.edit,
              show: item.show,
              meta: {
                ...item.meta,
                icon: React.createElement(IconComponent, { className: 'h-4 w-4' }),
              },
            });
          }
        }
      } catch (err) {
        if (err instanceof PresetAssemblyError) {
          throw err;
        }
        logger.warn(`Preset assembly skipped for ${industry}:`, err);
      }
    }
  }

  // 6. Ad-Hoc Dynamic Provisioner: 사업주가 추가로 켠 Capability 리소스 실시간 동적 주입
  const additionalCaps = activeCapabilities.filter(
    (cap) => !presetIncludedCaps.has(cap)
  ) as PresetCapabilityId[];

  if (additionalCaps.length > 0) {
    try {
      const adHocAssembled = assembleAdHocCapabilities(additionalCaps);
      for (const item of adHocAssembled.resources) {
        if (!existingNames.has(item.name)) {
          existingNames.add(item.name);
          const IconComponent = (item.meta.icon && ICON_MAP[item.meta.icon]) || LayoutGrid;
          resources.push({
            name: item.name,
            list: item.list,
            create: item.create,
            edit: item.edit,
            show: item.show,
            meta: {
              ...item.meta,
              icon: React.createElement(IconComponent, { className: 'h-4 w-4' }),
            },
          });
        }
      }
    } catch (err) {
      logger.warn('Ad-hoc capability assembly skipped:', err);
    }
  }

  return resources;
}
