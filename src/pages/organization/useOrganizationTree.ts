import { useCallback, useEffect, useState } from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import {
  assignDepartmentScope,
  createDepartment,
  deleteDepartment,
  loadOrganizationTree,
  moveDepartment,
  reassignMemberDepartment,
  renameDepartment,
  revokeMemberRoleViaRpc,
  type DepartmentMemberRow,
  type OrgTreeNode,
} from '@/core/organizations/services/organizationTreeService';

export type { DepartmentMemberRow, OrgTreeNode as OrgNode };

export function useOrganizationTree(organizationId: string | null | undefined) {
  const [nodes, setNodes] = useState<OrgTreeNode[]>([]);
  const [members, setMembers] = useState<DynamicMemberRow[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!organizationId) {
      setNodes([]);
      setMembers([]);
      setDepartmentMembers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadOrganizationTree(organizationId);
      setNodes(loaded.nodes);
      setMembers(loaded.members);
      setDepartmentMembers(loaded.departmentMembers);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '조직도 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (name: string, parentId: string | null, unitKind?: string | null) => {
      if (!organizationId) return;
      const parent = parentId ? nodes.find((node) => node.id === parentId) : null;
      await createDepartment({
        organizationId,
        name,
        parentId,
        parentPath: parent?.path ?? null,
        unitKind,
      });
      await reload();
    },
    [organizationId, nodes, reload],
  );

  const rename = useCallback(
    async (departmentId: string, name: string, unitKind?: string | null) => {
      await renameDepartment({ departmentId, name, unitKind });
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (departmentId: string) => {
      if (!organizationId) return;
      await deleteDepartment({ organizationId, departmentId });
      await reload();
    },
    [organizationId, reload],
  );

  const move = useCallback(
    async (departmentId: string, newParentId: string | null) => {
      await moveDepartment(departmentId, newParentId, organizationId ?? undefined);
      await reload();
    },
    [organizationId, reload],
  );

  const assignScope = useCallback(
    async (input: {
      departmentId: string;
      memberId: string;
      scopeType: DepartmentScopeType;
      customRoleId?: string | null;
    }) => {
      if (!organizationId) return;
      await assignDepartmentScope({
        organizationId,
        departmentId: input.departmentId,
        memberId: input.memberId,
        scopeType: input.scopeType,
        customRoleId: input.customRoleId,
      });
      await reload();
    },
    [organizationId, reload],
  );

  const reassignMember = useCallback(
    async (memberId: string, departmentId: string) => {
      if (!organizationId) return;
      await reassignMemberDepartment({ organizationId, memberId, departmentId });
      await reload();
    },
    [organizationId, reload],
  );

  const revokeMemberRole = useCallback(
    async (memberId: string) => {
      await revokeMemberRoleViaRpc(memberId);
      await reload();
    },
    [reload],
  );

  return {
    nodes,
    members,
    departmentMembers,
    loading,
    error,
    reload,
    createDepartment: create,
    renameDepartment: rename,
    deleteDepartment: remove,
    moveDepartment: move,
    assignScope,
    reassignMember,
    revokeMemberRole,
  };
}
