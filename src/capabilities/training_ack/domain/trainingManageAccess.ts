import {
  canManageTrainingAck as canManageFromPermissions,
  type AccessMember,
} from '@/domain/permissions';

/** 도메인/테스트용 위임 */
export function canManageTrainingAckActivity(member: AccessMember): boolean {
  return canManageFromPermissions(member);
}
