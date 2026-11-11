import React, { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { FormField } from '@/shared/components/ui/FormField';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import type { ApprovalMemberOption } from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import type { ResearchMember, ResearchProject } from '../domain/researchProjectEngine';
import { getLeadName, getCoLeadNames } from '../domain/researchProjectEngine';
import { RESEARCH_COPY } from './researchUiCopy';

type Props = {
  isOpen: boolean;
  project: ResearchProject | null;
  saving: boolean;
  requireCoLead: boolean;
  members: ApprovalMemberOption[];
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    summary: string;
    startDate: string;
    endDate: string;
    budgetPlanned: number;
    members: ResearchMember[];
  }) => Promise<string | null>;
  onLifecycle: (status: 'suspended' | 'canceled' | 'active') => Promise<string | null>;
};

export const ResearchProjectEditModal: React.FC<Props> = ({
  isOpen,
  project,
  saving,
  requireCoLead,
  members,
  onClose,
  onSubmit,
  onLifecycle,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetPlanned, setBudgetPlanned] = useState(0);
  const [leadUserId, setLeadUserId] = useState('');
  const [coLeadUserId, setCoLeadUserId] = useState('');
  const [formError, setFormError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isOpen || !project) return;
    setTitle(project.title);
    setSummary(project.summary ?? '');
    setStartDate(project.startDate);
    setEndDate(project.endDate);
    setBudgetPlanned(project.budget.planned);
    const lead = project.members.find((m) => m.role === 'lead');
    const co = project.members.find((m) => m.role === 'co_lead');
    const leadMatch = members.find(
      (m) => m.userId === lead?.memberId || m.name === lead?.memberName
    );
    const coMatch = members.find(
      (m) => m.userId === co?.memberId || m.name === co?.memberName
    );
    setLeadUserId(leadMatch?.userId || lead?.memberId || '');
    setCoLeadUserId(coMatch?.userId || co?.memberId || '');
    setFormError('');
    setDirty(false);
  }, [isOpen, project, members]);

  if (!project) return null;

  const markDirty = () => setDirty(true);

  const buildMembers = (): ResearchMember[] | null => {
    const lead = members.find((m) => m.userId === leadUserId);
    if (!lead) {
      setFormError('연구 담당자를 선택해 주세요.');
      return null;
    }
    const coLead = members.find((m) => m.userId === coLeadUserId);
    if (requireCoLead && !coLead) {
      setFormError(RESEARCH_COPY.requireCoLeadError);
      return null;
    }
    if (coLead && coLead.userId === lead.userId) {
      setFormError('담당자와 부담당자는 서로 달라야 합니다.');
      return null;
    }
    const next: ResearchMember[] = [
      { memberId: lead.userId, memberName: lead.name, role: 'lead' },
    ];
    if (coLead) {
      next.push({ memberId: coLead.userId, memberName: coLead.name, role: 'co_lead' });
    }
    for (const m of project.members) {
      if (m.role === 'member') next.push(m);
    }
    return next;
  };

  const handleSubmit = async () => {
    const researchMembers = buildMembers();
    if (!researchMembers) return;
    const err = await onSubmit({
      title,
      summary,
      startDate,
      endDate,
      budgetPlanned: Number(budgetPlanned) || 0,
      members: researchMembers,
    });
    if (err) {
      setFormError(err);
      return;
    }
    setDirty(false);
    onClose();
  };

  const handleLifecycle = async (status: 'suspended' | 'canceled' | 'active') => {
    const err = await onLifecycle(status);
    if (err) setFormError(err);
    else onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={RESEARCH_COPY.editTitle}
      description={`${getLeadName(project)}${
        getCoLeadNames(project).length ? ` · 부담당 ${getCoLeadNames(project).join(', ')}` : ''
      }`}
      intent="form"
      dirty={dirty}
      maxWidth="lg"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(project.status === 'active' || project.status === 'gate_review') && (
              <Button variant="outline" onClick={() => void handleLifecycle('suspended')}>
                {RESEARCH_COPY.suspend}
              </Button>
            )}
            {project.status === 'suspended' && (
              <Button variant="outline" onClick={() => void handleLifecycle('active')}>
                {RESEARCH_COPY.resume}
              </Button>
            )}
            {project.status !== 'canceled' && project.status !== 'completed' && (
              <Button variant="destructive" onClick={() => void handleLifecycle('canceled')}>
                {RESEARCH_COPY.cancelProject}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {RESEARCH_COPY.cancel}
            </Button>
            <Button variant="primary" isLoading={saving} onClick={() => void handleSubmit()}>
              {RESEARCH_COPY.saveEdit}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <FormField label={RESEARCH_COPY.fieldTitle} htmlFor="rp-edit-title" required>
          <Input
            id="rp-edit-title"
            value={title}
            onChange={(e) => {
              markDirty();
              setTitle(e.target.value);
            }}
          />
        </FormField>
        <FormField label={RESEARCH_COPY.fieldSummary} htmlFor="rp-edit-summary">
          <textarea
            id="rp-edit-summary"
            value={summary}
            onChange={(e) => {
              markDirty();
              setSummary(e.target.value);
            }}
            className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={RESEARCH_COPY.fieldStart} htmlFor="rp-edit-start" required>
            <Input
              id="rp-edit-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                markDirty();
                setStartDate(e.target.value);
              }}
            />
          </FormField>
          <FormField label={RESEARCH_COPY.fieldEnd} htmlFor="rp-edit-end" required>
            <Input
              id="rp-edit-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                markDirty();
                setEndDate(e.target.value);
              }}
            />
          </FormField>
        </div>
        <FormField label={RESEARCH_COPY.fieldBudget} htmlFor="rp-edit-budget" required>
          <Input
            id="rp-edit-budget"
            type="number"
            min={0}
            value={budgetPlanned}
            onChange={(e) => {
              markDirty();
              setBudgetPlanned(Number(e.target.value));
            }}
          />
        </FormField>
        <FormField label={RESEARCH_COPY.fieldLead} htmlFor="rp-edit-lead" required>
          <select
            id="rp-edit-lead"
            value={leadUserId}
            onChange={(e) => {
              markDirty();
              setLeadUserId(e.target.value);
            }}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">{RESEARCH_COPY.pickMember}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label={requireCoLead ? RESEARCH_COPY.fieldCoLeadRequired : RESEARCH_COPY.fieldCoLead}
          htmlFor="rp-edit-colead"
          required={requireCoLead}
        >
          <select
            id="rp-edit-colead"
            value={coLeadUserId}
            onChange={(e) => {
              markDirty();
              setCoLeadUserId(e.target.value);
            }}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">{RESEARCH_COPY.pickMember}</option>
            {members.map((m) => (
              <option key={`co-${m.userId}`} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </FormField>
        {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
      </div>
    </Modal>
  );
};
