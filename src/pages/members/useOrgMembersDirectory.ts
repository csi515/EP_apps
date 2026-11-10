import { useCallback, useEffect, useState } from 'react';
import {
  listDynamicRoles,
  listRoleMembers,
  type DynamicMemberRow,
  type DynamicRoleRow,
} from '@/core/organizations/services/dynamicRoleService';

type Options = {
  orgId: string;
  /** false면 자동 로드 안 함 */
  enabled?: boolean;
};

/** 조직 멤버·직급 목록 (MemberList / 앱 권한 공유) */
export function useOrgMembersDirectory({ orgId, enabled = true }: Options) {
  const [members, setMembers] = useState<DynamicMemberRow[]>([]);
  const [roles, setRoles] = useState<DynamicRoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedRoles, fetchedMembers] = await Promise.all([
        listDynamicRoles(orgId),
        listRoleMembers(orgId),
      ]);
      setRoles(fetchedRoles);
      setMembers(fetchedMembers);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    members,
    setMembers,
    roles,
    setRoles,
    loading,
    error,
    setError,
    reload,
  };
}
