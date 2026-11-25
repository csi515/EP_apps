export { supabase, isSupabaseConfigured, getCoreClient } from './client';
export { getIndustryClient, getBathClient } from './industryClient';
export { getPlatformClient } from './platformClient';
export type {
  Database,
  Organization,
  Profile,
  OrganizationMember,
  Customer,
  CustomerContact,
  Staff,
  Service,
  Schedule,
  Payment,
  PaymentTransaction,
  Consultation,
  Notification,
  MemberRole,
  ScheduleStatus,
  PaymentStatus,
  PaymentMethod,
  NotificationStatus,
  NotificationChannel,
} from './database.types';
