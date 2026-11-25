/**
 * @deprecated 신규 코드는 `@/capabilities/resources`를 사용한다.
 * Core 배럴은 로컬 모듈만 노출한다 (Capability 정적 import 금지).
 */
export {
  PRACTICE_ROOM_RESOURCE_KIND,
  RESOURCE_KINDS,
  RESOURCE_RESERVATION_BLOCKING_STATUSES,
} from './types';
export type {
  BookableResource,
  CreateResourceReservationInput,
  ListResourceReservationsQuery,
  ListResourcesQuery,
  PracticeRoomRow,
  RequestResourceReservationInput,
  Resource,
  ResourceKind,
  ResourceReservation,
  ResourceReservationStatus,
  PracticeRoomBooking,
  PracticeRoomBookingStatus,
  RoomReservationRow,
  UpsertBookableResourceInput,
} from './types';

export {
  isBlockingReservationStatus,
  resourceRangesOverlap,
  resourceReservationsConflict,
} from './overlap';
export { canReserveResource, isResourceSlotAllowed } from './resourcePolicy';
export { resourceCapability } from './resourceCapability';
export {
  getResourceById,
  listBookableResources,
  listPracticeRooms,
  listResources,
  setResourceActive,
  upsertBookableResource,
} from './resourceService';
export {
  cancelResourceReservation,
  createStaffResourceReservation,
  listResourceReservations,
  requestResourceReservation,
  reviewResourceReservation,
} from './reservationService';
