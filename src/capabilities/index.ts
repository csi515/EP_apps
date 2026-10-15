import { CAPABILITY_IDS, type CapabilityManifest } from './_shared/capabilityTypes';
import { attendanceCapability } from './attendance/manifest';
import { billingCapability } from './billing/manifest';
import { bookingCapability } from './booking/manifest';
import { commerceCapability } from './commerce/manifest';
import { consultationCapability } from './consultation/manifest';
import { enrollmentCapability } from './enrollment/manifest';
import { parentCapability } from './parent/manifest';
import { resourcesCapability } from './resources/manifest';
import { rosterCapability } from './roster/manifest';
import { schedulingCapability } from './scheduling/manifest';
import { transportCapability } from './transport/manifest';
import { passesCapability } from './passes/manifest';
import { lockerCapability } from './locker/manifest';
import { inventoryCapability } from './inventory/manifest';
import { seat_roomCapability } from './seat_room/manifest';
import { rental_equipmentCapability } from './rental_equipment/manifest';
import { maintenance_checklistCapability } from './maintenance_checklist/manifest';
import { instructor_matchCapability } from './instructor_match/manifest';
import { shift_scheduleCapability } from './shift_schedule/manifest';
import { task_pipelineCapability } from './task_pipeline/manifest';
import { billing_invoicingCapability } from './billing_invoicing/manifest';
import { ledger_simpleCapability } from './ledger_simple/manifest';
import { credit_walletCapability } from './credit_wallet/manifest';
import { consultation_crmCapability } from './consultation_crm/manifest';
import { treatment_chartCapability } from './treatment_chart/manifest';
import { safety_consentCapability } from './safety_consent/manifest';
import { curriculum_progressCapability } from './curriculum_progress/manifest';
import { retention_marketingCapability } from './retention_marketing/manifest';
import { table_order_kdsCapability } from './table_order_kds/manifest';
import { diet_body_logCapability } from './diet_body_log/manifest';
import { vehicle_shuttleCapability } from './vehicle_shuttle/manifest';
import { commission_payrollCapability } from './commission_payroll/manifest';
import { lost_foundCapability } from './lost_found/manifest';
import { recipe_bomCapability } from './recipe_bom/manifest';
import { digital_contractCapability } from './digital_contract/manifest';
import { seat_timer_billingCapability } from './seat_timer_billing/manifest';
import { treatment_portfolioCapability } from './treatment_portfolio/manifest';
import { work_order_kanbanCapability } from './work_order_kanban/manifest';
import { waitlist_turn_queueCapability } from './waitlist_turn_queue/manifest';
import { deposit_escrowCapability } from './deposit_escrow/manifest';
import { equipment_lifecycleCapability } from './equipment_lifecycle/manifest';
import { package_split_billingCapability } from './package_split_billing/manifest';
import { exam_grade_analyticsCapability } from './exam_grade_analytics/manifest';
import { kiosk_staff_callCapability } from './kiosk_staff_call/manifest';
import { membership_referral_treeCapability } from './membership_referral_tree/manifest';
import { hygiene_haccp_logCapability } from './hygiene_haccp_log/manifest';
import { sop_risk_assessmentCapability } from './sop_risk_assessment/manifest';
import { vendor_ap_invoiceCapability } from './vendor_ap_invoice/manifest';
import { work_attendance_payrollCapability } from './work_attendance_payroll/manifest';
import { pickup_ordersCapability } from './pickup_orders/manifest';
import { loyalty_stampCapability } from './loyalty_stamp/manifest';

export {
  CAPABILITY_IDS,
  CAPABILITY_DOMAIN_RELATIONS,
  assertCapabilityDefinition,
  defineCapability,
  type CapabilityDefinition,
  type CapabilityId,
  type CapabilityManifest,
} from './_shared/capabilityTypes';

export const CAPABILITY_MANIFESTS: readonly CapabilityManifest[] = [
  attendanceCapability,
  schedulingCapability,
  bookingCapability,
  billingCapability,
  commerceCapability,
  parentCapability,
  resourcesCapability,
  transportCapability,
  rosterCapability,
  enrollmentCapability,
  consultationCapability,
  passesCapability,
  lockerCapability,
  inventoryCapability,
  seat_roomCapability,
  rental_equipmentCapability,
  maintenance_checklistCapability,
  instructor_matchCapability,
  shift_scheduleCapability,
  task_pipelineCapability,
  billing_invoicingCapability,
  ledger_simpleCapability,
  credit_walletCapability,
  consultation_crmCapability,
  treatment_chartCapability,
  safety_consentCapability,
  curriculum_progressCapability,
  retention_marketingCapability,
  table_order_kdsCapability,
  diet_body_logCapability,
  vehicle_shuttleCapability,
  commission_payrollCapability,
  lost_foundCapability,
  recipe_bomCapability,
  digital_contractCapability,
  seat_timer_billingCapability,
  treatment_portfolioCapability,
  work_order_kanbanCapability,
  waitlist_turn_queueCapability,
  deposit_escrowCapability,
  equipment_lifecycleCapability,
  package_split_billingCapability,
  exam_grade_analyticsCapability,
  kiosk_staff_callCapability,
  membership_referral_treeCapability,
  hygiene_haccp_logCapability,
  sop_risk_assessmentCapability,
  vendor_ap_invoiceCapability,
  work_attendance_payrollCapability,
  pickup_ordersCapability,
  loyalty_stampCapability,
];



