/**
 * Industry capability → 탭/뷰 조합. Composition 책임.
 * Core는 이 규칙을 import하지 않는다.
 * 플래그 값은 `industryCapabilityMap.getIndustryCapabilities`.
 */
import type { CapabilityId } from '@/capabilities';
import { getIndustryCapabilities } from './industryCapabilityMap';
import { installCapabilityNavFilter } from '@/core/industry/capabilityNavHost';
import { isIndustryCapabilityEnabled, type IndustryCapabilityFlagMap } from '@/core/industry/industryCapabilities';

/** 탭이 이 capability에 묶이면, capability가 꺼진 업종에서는 숨긴다. */
export const NAV_TAB_REQUIRED_CAPABILITY: Readonly<Partial<Record<string, CapabilityId>>> = {
  attendance: 'attendance',
  'check-in': 'attendance',
  tuition: 'billing',
  unpaid: 'billing',
  finance: 'billing',
  expenses: 'billing',
  payroll: 'billing',
  shuttle: 'transport',
  'enrollment-requests': 'enrollment',
  consultations: 'consultation',
  'practice-rooms': 'resources',
  parents: 'parent',
  sales: 'commerce',
  retail: 'commerce',
  inventory: 'commerce',
};

/**
 * income은 billing(수납) 또는 commerce(판매내역) 중 하나가 있으면 유지한다.
 * 그 외 탭은 NAV_TAB_REQUIRED_CAPABILITY 만 본다.
 */
export function isNavTabAllowedForCapabilities(
  tab: string,
  capabilities: IndustryCapabilityFlagMap | undefined
): boolean {
  if (tab === 'income') {
    return (
      isIndustryCapabilityEnabled(capabilities, 'billing') ||
      isIndustryCapabilityEnabled(capabilities, 'commerce')
    );
  }
  const required = NAV_TAB_REQUIRED_CAPABILITY[tab];
  if (!required) return true;
  return isIndustryCapabilityEnabled(capabilities, required);
}

export function filterTabsByIndustryCapabilities<T extends string>(
  tabs: readonly T[],
  capabilities: IndustryCapabilityFlagMap | undefined
): T[] {
  return tabs.filter((tab) => isNavTabAllowedForCapabilities(tab, capabilities));
}

export function filterIndustryNavTabs<T extends string>(
  tabs: readonly T[],
  industry: string | null | undefined
): T[] {
  return filterTabsByIndustryCapabilities(tabs, getIndustryCapabilities(industry));
}

/** enabled capability가 갖춰야 할 네비/뷰 단서 */
export const CAPABILITY_IMPLEMENTATION_TABS: Readonly<Record<CapabilityId, readonly string[]>> = {
  roster: ['students', 'members'],
  scheduling: ['timetable', 'calendar', 'classes', 'bookings'],
  booking: ['bookings', 'services'],
  billing: ['tuition', 'unpaid', 'finance', 'income', 'expenses', 'payroll'],
  attendance: ['attendance', 'check-in'],
  parent: ['parents'],
  enrollment: ['enrollment-requests'],
  consultation: ['consultations'],
  resources: ['practice-rooms', 'resources'],
  transport: ['shuttle'],
  commerce: ['sales', 'retail', 'inventory', 'textbooks'],
  passes: ['passes', 'tickets'],
  locker: ['lockers'],
  inventory: ['inventory', 'stock'],
  seat_room: ['seat-rooms', 'spaces'],
  rental_equipment: ['rentals', 'equipment'],
  maintenance_checklist: ['maintenance', 'checklists'],
  instructor_match: ['instructors', 'matching'],
  shift_schedule: ['shifts', 'staff-schedule'],
  task_pipeline: ['pipelines', 'orders'],
  billing_invoicing: ['billing-invoices', 'invoices'],
  ledger_simple: ['ledger', 'closing'],
  credit_wallet: ['wallets', 'credits'],
  consultation_crm: ['consultations', 'crm'],
  treatment_chart: ['charts', 'treatments'],
  safety_consent: ['consents', 'waivers'],
  curriculum_progress: ['curriculum', 'progress', 'reports'],
  retention_marketing: ['retention', 'marketing', 'crm'],
  table_order_kds: ['kds', 'orders', 'table-orders'],
  diet_body_log: ['diet-body-log', 'diet', 'workout', 'inbody'],
  vehicle_shuttle: ['shuttle', 'routes'],
  commission_payroll: ['commission-payroll', 'payroll', 'settlement'],
  lost_found: ['lost-found', 'lost_items'],
  recipe_bom: ['recipe-bom', 'recipes', 'bom'],
  digital_contract: ['contracts', 'agreements'],
  seat_timer_billing: ['seat-timers', 'timers'],
  treatment_portfolio: ['portfolio', 'lookbook', 'styles'],
  work_order_kanban: ['work-orders', 'kanban'],
  waitlist_turn_queue: ['turn-queue', 'waitlist', 'queue'],
  deposit_escrow: ['deposit-escrow', 'deposits', 'escrow'],
  equipment_lifecycle: ['equipment-lifecycle', 'assets', 'lifecycle'],
  package_split_billing: ['package-billing', 'packages', 'unearned'],
  exam_grade_analytics: ['grade-analytics', 'grades', 'exams'],
  kiosk_staff_call: ['staff-call', 'calls', 'bellboard'],
  membership_referral_tree: ['family-tree', 'families', 'referrals'],
  hygiene_haccp_log: ['hygiene-log', 'hygiene', 'temperatures'],
  sop_risk_assessment: ['sop-risk', 'safety', 'hazards', 'sops'],
  vendor_ap_invoice: ['vendor-ap', 'vendors', 'ap-invoices', 'purchase-invoices'],
  work_attendance_payroll: ['work-payroll', 'timecards', 'payroll-slips', 'staff-payroll'],
  pickup_orders: ['pickup-orders', 'pickups', 'orders'],
  loyalty_stamp: ['loyalty-stamps', 'stamps', 'stickers'],
  workplace_policy: ['policies', 'workplace-policies', 'regulations'],
  feedbacks: ['operations', 'handover', 'feedbacks', 'incidents'],
  trial_funnel: ['trial-funnel', 'trials', 'leads'],
  learning_journal: ['learning-journal', 'journals', 'growth-log'],
  level_assessment: ['level-assessment', 'assessments', 'certifications'],
  space_turnaround: ['space-turnaround', 'turnarounds', 'cleaning'],
  supply_restock: ['supply-restock', 'restock', 'supplies'],
  makeup_lesson_pass: ['makeup-lesson-pass', 'makeup-tokens', 'makeup-slots'],
  intake_assessment: ['intake-assessment', 'intakes', 'questionnaires'],
  daily_care_report: ['daily-care-report', 'daily-care', 'care-logs'],
  substitute_dispatch: ['substitute-dispatch', 'substitutes', 'dispatches'],
  entry_pass_ticket: ['entry-pass-ticket', 'tickets', 'scans'],
  event_contest_hub: ['event-contest-hub', 'contests', 'cue-sheet'],
  facility_incident_report: ['facility-incident-report', 'incidents', 'accident-reports'],
  nps_survey_collector: ['nps-survey-collector', 'nps-surveys', 'satisfaction'],
  achievement_quest_badge: ['achievement-quest-badge', 'quests', 'badges'],
  parking_validator: ['parking-validator', 'parking', 'parking-tickets'],
  emergency_alert_broadcast: ['emergency-broadcast', 'emergency-alerts', 'broadcasts'],
  digital_guestbook: ['digital-guestbook', 'guestbook', 'visitors'],
  mbo: ['mbo', 'objectives', 'projects', 'evaluations'],
  approval_workflow: ['approvals', 'approval-requests', 'approval-templates'],
  quality_inspection: ['quality', 'inspection-standards', 'inspection-records'],
  change_management: ['change-management', 'ecn', 'eco', 'change-orders'],
  patent_ip_asset: ['patents', 'patent-inventors', 'patent-rewards'],
  leave_management: ['leave-management', 'leave-requests', 'leave-balances'],
  promotional_deal: ['promotional-deals', 'deals', 'promotions', 'events'],
  daily_pos_reconciliation: ['pos-reconciliations', 'daily-pos'],
  lost_card_rfid: ['lost-cards', 'rfid-cards'],
  valet_key_custody: ['valet-keys', 'valet'],
  coatroom_baggage: ['coatroom-baggage', 'baggage'],
  locker_emergency_override: ['locker-overrides', 'locker-emergency'],
  sound_broadcast_schedule: ['sound-broadcasts', 'broadcast-schedule'],
  certificate_issuance: ['certificate-issuances', 'certificates'],
  customer_blacklist_guard: ['customer-blacklists', 'blacklist'],
  franchise_supervision: ['franchise-supervisions', 'supervisions'],
  nda_privacy_audit: ['nda-privacy-audits', 'privacy-audit'],
  sublease_space_contract: ['sublease-space-contracts', 'sublease'],
  calibration_metering: ['calibration-meters', 'meter-calibration'],
  key_access_control: ['key-access-logs', 'key-access'],
  hazardous_waste_log: ['hazardous-waste-logs', 'hazardous-waste'],
  consumable_dispenser: ['consumable-dispenses', 'consumables'],
  energy_utility_meter: ['energy-utility-meters', 'utility-meters'],
  onboarding_checklist: ['onboarding-checklists', 'onboarding'],
  skills_matrix_cert: ['skills-matrix-certs', 'skills-matrix'],
  whistleblower_grievance: ['whistleblower-grievances', 'grievances'],
  uniform_safety_gear: ['uniform-safety-gears', 'safety-gears'],
  petty_cash_expense: ['petty-cash-expenses', 'petty-cash'],
  prepaid_tax_withholding: ['prepaid-tax-withholdings', 'tax-withholding'],
  royalty_profit_share: ['royalty-profit-shares', 'royalty-share'],
  service_warranty_claim: ['service-warranty-claims', 'warranty-claims'],
  custom_order_craft: ['custom-order-crafts', 'custom-orders'],
  media_asset_dam: ['media-assets', 'dam'],
  exhibition_art_curation: ['art-exhibitions', 'exhibition-art'],
  vip_concierge_preference: ['vip-profiles', 'vip-concierge'],
  study_group_study_hall: ['study-groups', 'study-hall'],
  mentor_mentee_match: ['mentoring-pairs', 'mentor-mentee'],
  simple_pl_cashflow: ['pl-cashflows', 'financial-statements'],
  fixed_asset_depreciation: ['fixed-assets', 'assets'],
  procurement_3way_match: ['procurement-3way', 'procurement-matches'],
  fefo_lot_tracker: ['fefo-lots', 'lots'],
  budget_ceiling_quota: ['budget-ceilings', 'budget-quotas'],
  field_audit_trail: ['audit-trails', 'audit-logs'],
  vendor_scorecard: ['vendor-scorecards', 'vendor-evaluations'],
  field_dispatch: ['dispatch', 'field-dispatch'],
  waitlist_queue: ['waitlist', 'waitlist-queue'],
};

installCapabilityNavFilter(filterIndustryNavTabs);
