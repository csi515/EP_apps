import React, { useEffect, useMemo, useState } from 'react';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { grantMemberFeaturePermission } from '@/core/organizations/services/dynamicRoleService';
import {
  COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS,
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  type CompanyAppFeatureAssignmentOption,
} from '@/pages/workspace/companyAppAccess';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { OrgNode } from './useOrganizationTree';
import type { OrgRosterRow } from './orgRosterEngine';
import { ORG_CHART_COPY } from './orgChartCopy';

type PermSegment = 'on' | 'off';

type Props = {
  open: boolean;
  row: OrgRosterRow | null;
  member: DynamicMemberRow | null;
  nodes: readonly OrgNode[];
  roles: readonly DynamicRoleRow[];
  canEdit: boolean;
  onClose: () => void;
  onMemberPermissionsUpdated: (member: DynamicMemberRow) => void;
  onSave: (input: {
    memberId: string;
    departmentId: string | null;
    roleId: string | null;
    isActive: boolean;
  }) => void | Promise<void>;
};

const MANAGER_OPTIONS = COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS.filter((o) => !o.appId);

function PermissionSegmentRow({
  option,
  enabled,
  busy,
  canEdit,
  onChange,
}: {
  option: CompanyAppFeatureAssignmentOption;
  enabled: boolean;
  busy: boolean;
  canEdit: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-2 min-w-0">
        <p className="text-sm font-bold text-slate-900">{option.label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{option.desc}</p>
      </div>
      <SegmentedControl
        aria-label={option.label}
        fullWidth
        value={enabled ? 'on' : 'off'}
        activeClassName="bg-slate-800 text-white shadow-none"
        onChange={(v: PermSegment) => {
          if (!canEdit || busy) return;
          onChange(v === 'on');
        }}
        options={[
          { value: 'on', label: ORG_CHART_COPY.rosterPermOn },
          { value: 'off', label: ORG_CHART_COPY.rosterPermOff },
        ]}
      />
    </div>
  );
}

export function OrgRosterEditDrawer({
  open,
  row,
  member,
  nodes,
  roles,
  canEdit,
  onClose,
  onMemberPermissionsUpdated,
  onSave,
}: Props) {
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setDepartmentId(row.departmentId ?? '');
    setRoleId(row.roleId ?? '');
    setIsActive(row.isActive);
  }, [open, row]);

  const usageOptions = useMemo(() => COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS, []);
  const managerOptions = useMemo(() => MANAGER_OPTIONS, []);

  if (!row) return null;

  async function setPermission(key: string, enabled: boolean) {
    if (!member || !canEdit) return;
    setSavingKey(key);
    try {
      await grantMemberFeaturePermission(member.id, key, enabled);
      onMemberPermissionsUpdated({
        ...member,
        feature_permissions: {
          ...(member.feature_permissions || {}),
          [key]: enabled,
        },
      });
      showToast(ORG_CHART_COPY.rosterPermSaved, 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '권한 저장 실패', 'error');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={ORG_CHART_COPY.rosterEditTitle}
      description={`${row.name}${row.loginId ? ` · ${row.loginId}` : ''}`}
      intent="form"
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {ORG_CHART_COPY.cancel}
          </Button>
          {canEdit ? (
            <Button
              type="button"
              isLoading={busy}
              onClick={() => {
                setBusy(true);
                void Promise.resolve(
                  onSave({
                    memberId: row.memberId,
                    departmentId: departmentId || null,
                    roleId: roleId || null,
                    isActive,
                  }),
                ).finally(() => setBusy(false));
              }}
            >
              {ORG_CHART_COPY.rosterSave}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4" data-testid="org-roster-edit-drawer">
        <label className="block text-xs font-bold text-slate-700">
          {ORG_CHART_COPY.rosterEditDepartment}
          <select
            className={`${FORM_CONTROL_CLASS} mt-1`}
            value={departmentId}
            disabled={!canEdit}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">{ORG_CHART_COPY.rosterUnassignedFilter}</option>
            {[...nodes]
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.unitKind ? `${n.unitKind} · ` : ''}
                  {n.name}
                </option>
              ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-slate-700">
          {ORG_CHART_COPY.rosterColRole}
          <select
            className={`${FORM_CONTROL_CLASS} mt-1`}
            value={roleId}
            disabled={!canEdit}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">{ORG_CHART_COPY.roleNone}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-slate-700">
          {ORG_CHART_COPY.rosterColEmployment}
          <select
            className={`${FORM_CONTROL_CLASS} mt-1`}
            value={isActive ? 'active' : 'inactive'}
            disabled={!canEdit}
            onChange={(e) => setIsActive(e.target.value === 'active')}
          >
            <option value="active">{ORG_CHART_COPY.rosterActive}</option>
            <option value="inactive">{ORG_CHART_COPY.rosterInactive}</option>
          </select>
        </label>

        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {ORG_CHART_COPY.rosterPermissions}
          </h3>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {usageOptions.map((option) => (
              <PermissionSegmentRow
                key={option.key}
                option={option}
                enabled={Boolean(member?.feature_permissions?.[option.key])}
                busy={savingKey === option.key}
                canEdit={canEdit}
                onChange={(next) => void setPermission(option.key, next)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {ORG_CHART_COPY.rosterManagerPermissions}
          </h3>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {managerOptions.map((option) => (
              <PermissionSegmentRow
                key={option.key}
                option={option}
                enabled={Boolean(member?.feature_permissions?.[option.key])}
                busy={savingKey === option.key}
                canEdit={canEdit}
                onChange={(next) => void setPermission(option.key, next)}
              />
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
