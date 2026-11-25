import { capacityCapability } from '@/capabilities/scheduling/capacity';
import { getCoreClient } from '@/lib/supabase';
import type {
  MyReservationRpcRow,
  OrganizationReservationRpcRow,
  ReservationRow,
} from '@/lib/supabase/database.types';
import type {
  Reservation,
  ReservationDetail,
  MyReservation,
  ReservationRequest,
  ReservationStatus,
} from '@/types';
import { applyReservationCommand } from '../reservationMachine';
import { jsonToRecord } from './scheduleJson';

function mapReservationRow(row: ReservationRow): Reservation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    schedule_id: row.schedule_id,
    customer_id: row.customer_id,
    user_id: row.user_id,
    applicant_name: row.applicant_name,
    applicant_phone: row.applicant_phone,
    applicant_email: row.applicant_email,
    request_message: row.request_message,
    status: row.status,
    confirmed_by: row.confirmed_by,
    confirmed_at: row.confirmed_at,
    cancelled_by: row.cancelled_by,
    cancelled_at: row.cancelled_at,
    cancel_reason: row.cancel_reason,
    metadata: jsonToRecord(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * get_organization_reservations RETURNS TABLE?�는 ReservationDetail??
 * organization_id / user_id / confirmed_by / cancelled_by / metadata / updated_at ???�음.
 * ?�출 ?�자·기본값으�??�메???�?�을 채운??(기존 as-cast ??undefined?�???�드???�전??기본�?.
 */
function mapOrganizationReservation(
  row: OrganizationReservationRpcRow,
  organizationId: string
): ReservationDetail {
  return {
    id: row.id,
    organization_id: organizationId,
    schedule_id: row.schedule_id,
    customer_id: row.customer_id,
    user_id: null,
    applicant_name: row.applicant_name,
    applicant_phone: row.applicant_phone,
    applicant_email: row.applicant_email,
    request_message: row.request_message,
    status: row.status,
    confirmed_by: null,
    confirmed_at: row.confirmed_at,
    cancelled_by: null,
    cancelled_at: row.cancelled_at,
    cancel_reason: row.cancel_reason,
    metadata: {},
    created_at: row.created_at,
    updated_at: row.created_at,
    schedule_title: row.schedule_title ?? '',
    schedule_starts_at: row.schedule_starts_at,
    schedule_ends_at: row.schedule_ends_at,
    confirmed_by_name: row.confirmed_by_name,
    cancelled_by_name: row.cancelled_by_name,
  };
}

function mapMyReservation(row: MyReservationRpcRow): MyReservation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    organization_name: row.organization_name,
    schedule_id: row.schedule_id,
    schedule_title: row.schedule_title ?? '',
    schedule_starts_at: row.schedule_starts_at,
    schedule_ends_at: row.schedule_ends_at,
    status: row.status,
    request_message: row.request_message,
    confirmed_at: row.confirmed_at,
    cancelled_at: row.cancelled_at,
    cancel_reason: row.cancel_reason,
    created_at: row.created_at,
  };
}

/**
 * Schedule Reservation Service
 * bookable Schedule(core.schedules)???�??고객 ?�청 (core.reservations).
 * ?�롯 ?�유 status??reservations�?바꾼?? 방문/출석 ?�장??만들지 ?�는??
 */
export const reservationService = {
  capacitySnapshot: capacityCapability.reservationSnapshot,

  /**
   * ?�약 ?�청 (고객)
   */
  async requestReservation(request: ReservationRequest): Promise<string> {
    const { data, error } = await getCoreClient().rpc('request_reservation', {
      p_schedule_id: request.schedule_id,
      p_applicant_name: request.applicant_name,
      p_applicant_phone: request.applicant_phone ?? null,
      p_applicant_email: request.applicant_email ?? null,
      p_request_message: request.request_message ?? null,
    });

    if (error) throw error;
    return data;
  },

  /**
   * ?�약 ?�정 (?�장/관리자)
   */
  async confirmReservation(reservationId: string, fromStatus?: ReservationStatus): Promise<void> {
    if (fromStatus) {
      applyReservationCommand(fromStatus, 'confirm');
    }
    const { error } = await getCoreClient().rpc('confirm_reservation', {
      p_reservation_id: reservationId,
    });

    if (error) throw error;
  },

  /**
   * ?�약 취소
   */
  async cancelReservation(
    reservationId: string,
    reason?: string,
    fromStatus?: ReservationStatus
  ): Promise<void> {
    if (fromStatus) {
      applyReservationCommand(fromStatus, 'cancel');
    }
    const { error } = await getCoreClient().rpc('cancel_reservation', {
      p_reservation_id: reservationId,
      p_cancel_reason: reason ?? null,
    });

    if (error) throw error;
  },

  /**
   * 조직???�약 목록 조회 (?�장/관리자)
   */
  async getOrganizationReservations(
    organizationId: string,
    status?: ReservationStatus,
    fromDate?: Date,
    limit = 100,
    offset = 0,
    toDate?: Date
  ): Promise<ReservationDetail[]> {
    const { data, error } = await getCoreClient().rpc('get_organization_reservations', {
      p_org_id: organizationId,
      p_status: status ?? null,
      p_from_date: fromDate ? fromDate.toISOString() : null,
      p_limit: limit,
      p_offset: offset,
      p_to_date: toDate ? toDate.toISOString() : null,
    });

    if (error) throw error;
    return (data ?? []).map((row) => mapOrganizationReservation(row, organizationId));
  },

  /**
   * ???�약 목록 조회 (고객)
   */
  async getMyReservations(status?: ReservationStatus, limit = 50): Promise<MyReservation[]> {
    const { data, error } = await getCoreClient().rpc('get_my_reservations', {
      p_status: status ?? null,
      p_limit: limit,
    });

    if (error) throw error;
    return (data ?? []).map(mapMyReservation);
  },

  /**
   * ?�약 ?�세 조회
   */
  async getReservation(reservationId: string): Promise<Reservation> {
    const { data, error } = await getCoreClient()
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (error) throw error;
    return mapReservationRow(data);
  },

  /**
   * 조직??미확???�약 개수 조회
   */
  async getPendingReservationCount(organizationId: string): Promise<number> {
    const { count, error } = await getCoreClient()
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'requested');

    if (error) throw error;
    return count ?? 0;
  },
};
