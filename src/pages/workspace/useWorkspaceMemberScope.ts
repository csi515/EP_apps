import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuth } from '@/core/auth/AuthProvider';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import {
  loadOrganizationTree,
  type DepartmentMemberRow,
  type OrgTreeNode,
} from '@/core/organizations/services/organizationTreeService';

export type WorkspaceMemberScope = {
  loading: boolean;
  scopeType: DepartmentScopeType;
  memberDepartmentId: string | null;
  memberPath: string | null;
  departmentPathById: ReadonlyMap<string, string>;
  isGlobalScope: boolean;
};

const GLOBAL_SCOPE: WorkspaceMemberScope = {
  loading: false,
  scopeType: 'GLOBAL',
  memberDepartmentId: null,
  memberPath: null,
  departmentPathById: new Map(),
  isGlobalScope: true,
};

export function useWorkspaceMemberScope(): WorkspaceMemberScope {
  const { currentOrganization, selectedMembership } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const memberId = selectedMembership?.id ?? null;
  const role = selectedMembership?.role ?? null;

  const [nodes, setNodes] = useState<OrgTreeNode[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMemberRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setNodes([]);
      setDepartmentMembers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadOrganizationTree(orgId)
      .then((tree) => {
        if (cancelled) return;
        setNodes(tree.nodes);
        setDepartmentMembers(tree.departmentMembers);
      })
      .catch(() => {
        if (!cancelled) {
          setNodes([]);
          setDepartmentMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const departmentPathById = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.id, node.path);
    }
    return map;
  }, [nodes]);

  return useMemo(() => {
    if (role === 'owner' || role === 'admin') {
      return { ...GLOBAL_SCOPE, loading };
    }
    if (!memberId || !user?.id) {
      return { ...GLOBAL_SCOPE, loading };
    }

    const assignment = departmentMembers.find((row) => row.member_id === memberId);
    if (!assignment) {
      return { ...GLOBAL_SCOPE, loading, departmentPathById };
    }

    const scopeType = assignment.scope_type;
    const memberDepartmentId = assignment.department_id;
    const memberPath = departmentPathById.get(memberDepartmentId) ?? null;

    return {
      loading,
      scopeType,
      memberDepartmentId,
      memberPath,
      departmentPathById,
      isGlobalScope: scopeType === 'GLOBAL',
    };
  }, [role, memberId, user?.id, departmentMembers, departmentPathById, loading]);
}
