import { useCallback, useEffect, useState } from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import {
  assignDepartmentScope,
  createDepartment,
  loadOrganizationTree,
  moveDepartment,
  revokeMemberRoleViaRpc,
  transferOrganizationOwnership,
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
    async (name: string, parentId: string | null) => {
      if (!organizationId) return;
      const parent = parentId ? nodes.find((node) => node.id === parentId) : null;
      await createDepartment({
        organizationId,
        name,
        parentId,
        parentPath: parent?.path ?? null,
      });
      await reload();
    },
    [organizationId, nodes, reload],
  );

  const move = useCallback(
    async (departmentId: string, newParentId: string | null) => {
      await moveDepartment(departmentId, newParentId);
      await reload();
    },
    [reload],
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

  const revokeMemberRole = useCallback(
    async (memberId: string) => {
      await revokeMemberRoleViaRpc(memberId);
      await reload();
    },
    [reload],
  );

  const transferOwnership = useCallback(
    async (nextOwnerMemberId: string, reason: string) => {
      if (!organizationId) return;
      await transferOrganizationOwnership({
        organizationId,
        nextOwnerMemberId,
        reason,
      });
      await reload();
    },
    [organizationId, reload],
  );

  return {
    nodes,
    members,
    departmentMembers,
    loading,
    error,
    reload,
    createDepartment: create,
    moveDepartment: move,
    assignScope,
    revokeMemberRole,
    transferOwnership,
  };
}
