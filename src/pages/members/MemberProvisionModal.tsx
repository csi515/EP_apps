import React, { useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  generateInitialPassword,
  provisionOrgMember,
} from '@/core/organizations/services/orgMemberAdminService';
import type { DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { OrgTreeNode } from '@/core/organizations/services/organizationTreeService';

type Props = {
  open: boolean;
  organizationId: string;
  roles: DynamicRoleRow[];
  departments: OrgTreeNode[];
  onClose: () => void;
  onProvisioned: () => void;
};

export function MemberProvisionModal({
  open,
  organizationId,
  roles,
  departments,
  onClose,
  onProvisioned,
}: Props): React.JSX.Element {
  const [loginId, setLoginId] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState(() => generateInitialPassword());
  const [baseRole, setBaseRole] = useState<'staff' | 'manager' | 'admin'>('staff');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<{ loginId: string; password: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoginId('');
    setFullName('');
    setPassword(generateInitialPassword());
    setBaseRole('staff');
    setRoleId('');
    setDepartmentId('');
    setIssued(null);
  }, [open]);

  const sortedDepts = useMemo(
    () => [...departments].sort((a, b) => a.path.localeCompare(b.path)),
    [departments]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId.trim() || loginId.trim().length < 2) {
      showToast('아이디는 2자 이상이어야 합니다.', 'warning');
      return;
    }
    if (password.length < 8) {
      showToast('비밀번호는 8자 이상이어야 합니다.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const result = await provisionOrgMember({
        organizationId,
        loginId: loginId.trim(),
        password,
        fullName: fullName.trim() || loginId.trim(),
        baseRole,
        organizationRoleId: roleId || null,
        departmentId: departmentId || null,
      });
      setIssued({ loginId: result.login_id, password });
      onProvisioned();
      showToast('임직원 계정이 발급되었습니다. 초기 비밀번호를 전달해 주세요.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '계정 발급에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!issued) return;
    const text = `아이디: ${issued.loginId}\n초기 비밀번호: ${issued.password}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('아이디·초기 비밀번호를 복사했습니다.', 'success');
    } catch {
      showToast('복사에 실패했습니다. 화면에 표시된 값을 직접 전달하세요.', 'warning');
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="임직원 등록"
      description="초대 없이 로그인 아이디와 초기 비밀번호로 계정을 발급합니다."
      maxWidth="lg"
      intent="form"
      footer={
        issued ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void copyCredentials()}>
              <Copy className="mr-1.5 h-4 w-4" />
              복사
            </Button>
            <Button type="button" onClick={onClose}>
              완료
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button
              type="submit"
              form="member-provision-form"
              isLoading={submitting}
              disabled={submitting}
            >
              계정 발급
            </Button>
          </div>
        )
      }
    >
      {issued ? (
        <div
          className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4"
          data-testid="member-provision-issued"
        >
          <p className="text-sm font-bold text-emerald-900">발급 완료 — 이 화면에서만 초기 비밀번호를 확인할 수 있습니다.</p>
          <p className="text-sm text-emerald-900">
            아이디: <span className="font-mono font-bold">{issued.loginId}</span>
          </p>
          <p className="text-sm text-emerald-900">
            초기 비밀번호: <span className="font-mono font-bold">{issued.password}</span>
          </p>
          <p className="text-xs text-emerald-800">
            첫 로그인 시 비밀번호 변경이 강제됩니다.
          </p>
        </div>
      ) : (
        <form
          id="member-provision-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-3"
          data-testid="member-provision-form"
        >
          <FormField label="아이디 *" hint="영문·숫자 등 문자열 (이메일 형식 불필요)">
            <input
              className={FORM_CONTROL_CLASS}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              minLength={2}
              autoComplete="off"
              placeholder="예: kim.cs 또는 2024001"
            />
          </FormField>
          <FormField label="성명">
            <input
              className={FORM_CONTROL_CLASS}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="홍길동"
            />
          </FormField>
          <FormField label="초기 비밀번호 *">
            <div className="flex gap-2">
              <input
                className={FORM_CONTROL_CLASS}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassword(generateInitialPassword())}
                aria-label="비밀번호 다시 생성"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="기본 역할">
              <select
                className={FORM_CONTROL_CLASS}
                value={baseRole}
                onChange={(e) => setBaseRole(e.target.value as 'staff' | 'manager' | 'admin')}
              >
                <option value="staff">일반 직원</option>
                <option value="manager">매니저</option>
                <option value="admin">관리자</option>
              </select>
            </FormField>
            <FormField label="배정 직급">
              <select
                className={FORM_CONTROL_CLASS}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">미배정</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="소속 부서">
            <select
              className={FORM_CONTROL_CLASS}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">나중에 배치</option>
              {sortedDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {`${'—'.repeat(Math.max(0, (d.path.match(/\//g)?.length ?? 2) - 2))} ${d.name}`}
                </option>
              ))}
            </select>
          </FormField>
        </form>
      )}
    </Modal>
  );
}
