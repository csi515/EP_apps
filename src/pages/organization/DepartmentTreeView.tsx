import React, { useMemo } from 'react';
import type { OrgNode, DepartmentMemberRow } from './useOrganizationTree';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { ORG_CHART_COPY } from './orgChartCopy';

const DEPT_DRAG = 'application/x-ep-department';
const MEMBER_DRAG = 'application/x-ep-member';

function isDescendant(nodes: OrgNode[], ancestorId: string, nodeId: string): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  const ancestor = nodes.find((n) => n.id === ancestorId);
  if (!node || !ancestor || node.id === ancestor.id) return false;
  return node.path.startsWith(ancestor.path);
}

function buildChildrenMap(nodes: OrgNode[]): Map<string | null, OrgNode[]> {
  const map = new Map<string | null, OrgNode[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = map.get(key) ?? [];
    list.push(node);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  return map;
}

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

interface Props {
  nodes: OrgNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (departmentId: string, newParentId: string | null) => void;
  onReassignMember?: (memberId: string, departmentId: string) => void;
  canManage: boolean;
  departmentMembers?: DepartmentMemberRow[];
  members?: DynamicMemberRow[];
  roles?: DynamicRoleRow[];
}

export const DepartmentTreeView: React.FC<Props> = ({
  nodes,
  selectedId,
  onSelect,
  onMove,
  onReassignMember,
  canManage,
  departmentMembers = [],
  members = [],
  roles = [],
}) => {
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const [dragDeptId, setDragDeptId] = React.useState<string | null>(null);
  const [dragMemberId, setDragMemberId] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);

  const renderBranch = (parentId: string | null, depth: number): React.ReactNode => {
    const children = childrenMap.get(parentId) ?? [];
    return children.map((node) => {
      const deptMembers = departmentMembers.filter((dm) => dm.department_id === node.id);
      const leadDm = deptMembers.find((dm) => dm.scope_type === 'DESCENDANTS');
      const leadMember = leadDm ? members.find((m) => m.id === leadDm.member_id) : null;
      const leadRole = leadDm?.custom_role_id
        ? roles.find((r) => r.id === leadDm.custom_role_id)?.name
        : null;
      const isDropTarget = dropTargetId === node.id;

      return (
        <li key={node.id} className="list-none">
          <div
            role="treeitem"
            aria-selected={selectedId === node.id}
            draggable={canManage}
            onDragStart={(event) => {
              if (!canManage) return;
              event.dataTransfer.setData(DEPT_DRAG, node.id);
              event.dataTransfer.effectAllowed = 'move';
              setDragDeptId(node.id);
            }}
            onDragEnd={() => {
              setDragDeptId(null);
              setDropTargetId(null);
            }}
            onDragOver={(event) => {
              if (!canManage) return;
              const movingDept = dragDeptId;
              const movingMember = dragMemberId;
              if (movingDept) {
                if (movingDept === node.id) return;
                if (isDescendant(nodes, movingDept, node.id)) return;
                event.preventDefault();
                setDropTargetId(node.id);
                return;
              }
              if (movingMember && onReassignMember) {
                event.preventDefault();
                setDropTargetId(node.id);
              }
            }}
            onDragLeave={() => {
              if (dropTargetId === node.id) setDropTargetId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const droppedDept =
                event.dataTransfer.getData(DEPT_DRAG) || dragDeptId || '';
              const droppedMember =
                event.dataTransfer.getData(MEMBER_DRAG) || dragMemberId || '';
              setDropTargetId(null);
              setDragDeptId(null);
              setDragMemberId(null);
              if (droppedDept && droppedDept !== node.id && !isDescendant(nodes, droppedDept, node.id)) {
                onMove(droppedDept, node.id);
                return;
              }
              if (droppedMember && onReassignMember) {
                onReassignMember(droppedMember, node.id);
              }
            }}
            className={`mt-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
              selectedId === node.id
                ? 'border-indigo-500 bg-indigo-50'
                : isDropTarget
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
            style={{ marginLeft: depth * 12 }}
          >
            <div className="flex min-h-11 items-center justify-between gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium text-slate-900 hover:text-indigo-600"
                onClick={() => onSelect(node.id)}
              >
                <span className="truncate">
                  {node.unitKind ? (
                    <span className="mr-1 text-[10px] font-bold text-slate-500">[{node.unitKind}]</span>
                  ) : null}
                  {node.name}
                </span>
                <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {deptMembers.length}명
                </span>
              </button>
              {leadMember ? (
                <span className="flex shrink-0 items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <span>리더</span>
                  <span>
                    {leadRole ? `${leadRole}: ` : ''}
                    {leadMember.name || leadMember.email || '지정됨'}
                  </span>
                </span>
              ) : null}
              {canManage ? (
                <span className="text-xs text-slate-400" title="드래그하여 상위 조직 변경">
                  ⋮⋮
                </span>
              ) : null}
            </div>
            {deptMembers.length > 0 ? (
              <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                {deptMembers.map((dm) => {
                  const member = members.find((m) => m.id === dm.member_id);
                  if (!member) return null;
                  const isLead = dm.scope_type === 'DESCENDANTS';
                  return (
                    <li key={dm.id}>
                      <button
                        type="button"
                        draggable={canManage && Boolean(onReassignMember)}
                        onDragStart={(event) => {
                          if (!canManage || !onReassignMember) return;
                          event.stopPropagation();
                          event.dataTransfer.setData(MEMBER_DRAG, member.id);
                          event.dataTransfer.effectAllowed = 'move';
                          setDragMemberId(member.id);
                        }}
                        onDragEnd={() => setDragMemberId(null)}
                        className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-left text-xs ${
                          isLead ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'
                        }`}
                        title={canManage ? '다른 부서로 드래그하여 배치' : undefined}
                      >
                        <span className="truncate font-medium">{memberLabel(member)}</span>
                        <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                          {isLead ? '조직 리더' : '구성원'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <ul role="group">{renderBranch(node.id, depth + 1)}</ul>
        </li>
      );
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">조직 트리</h2>
        {canManage ? (
          <span className="text-xs text-slate-500">부서·인원 드래그로 배치</span>
        ) : null}
      </div>
      {canManage ? (
        <div
          className={`mb-2 min-h-12 rounded-xl border border-dashed px-3 py-2 text-xs ${
            dropTargetId === '__root__' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white text-slate-500'
          }`}
          onDragOver={(event) => {
            if (dragDeptId) {
              event.preventDefault();
              setDropTargetId('__root__');
            }
          }}
          onDragLeave={() => {
            if (dropTargetId === '__root__') setDropTargetId(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const droppedDept = event.dataTransfer.getData(DEPT_DRAG) || dragDeptId;
            setDropTargetId(null);
            setDragDeptId(null);
            if (droppedDept) onMove(droppedDept, null);
          }}
        >
          {ORG_CHART_COPY.move} — 여기에 놓으면 최상위 조직으로 이동
        </div>
      ) : null}
      <ul role="tree" className="m-0 p-0">
        {renderBranch(null, 0)}
      </ul>
      {nodes.length === 0 ? <p className="p-3 text-sm text-slate-500">등록된 조직이 없습니다.</p> : null}
    </div>
  );
};
