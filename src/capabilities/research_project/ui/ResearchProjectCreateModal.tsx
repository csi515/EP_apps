import React, { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { FormField } from '@/shared/components/ui/FormField';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import type { ApprovalMemberOption } from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import type { ResearchMember } from '../domain/researchProjectEngine';
import { RESEARCH_COPY } from './researchUiCopy';

type Props = {
  isOpen: boolean;
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
};

export const ResearchProjectCreateModal: React.FC<Props> = ({
  isOpen,
  saving,
  requireCoLead,
  members,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [budgetPlanned, setBudgetPlanned] = useState(30_000_000);
  const [leadUserId, setLeadUserId] = useState('');
  const [coLeadUserId, setCoLeadUserId] = useState('');
  const [formError, setFormError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setSummary('');
    setStartDate('2026-04-01');
    setEndDate('2026-12-31');
    setBudgetPlanned(30_000_000);
    setLeadUserId('');
    setCoLeadUserId('');
    setFormError('');
    setDirty(false);
  }, [isOpen]);

  const markDirty = () => setDirty(true);

  const handleSubmit = async () => {
    const lead = members.find((m) => m.userId === leadUserId);
    if (!lead) {
      setFormError('연구 담당자를 선택해 주세요.');
      return;
    }
    const coLead = members.find((m) => m.userId === coLeadUserId);
    if (requireCoLead && !coLead) {
      setFormError(RESEARCH_COPY.requireCoLeadError);
      return;
    }
    if (coLead && coLead.userId === lead.userId) {
      setFormError('담당자와 부담당자는 서로 달라야 합니다.');
      return;
    }

    const researchMembers: ResearchMember[] = [
      { memberId: lead.userId, memberName: lead.name, role: 'lead' },
    ];
    if (coLead) {
      researchMembers.push({
        memberId: coLead.userId,
        memberName: coLead.name,
        role: 'co_lead',
      });
    }

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={RESEARCH_COPY.createTitle}
      intent="form"
      dirty={dirty}
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {RESEARCH_COPY.cancel}
          </Button>
          <Button variant="primary" isLoading={saving} onClick={() => void handleSubmit()}>
            {RESEARCH_COPY.saveCreate}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <FormField label={RESEARCH_COPY.fieldTitle} htmlFor="rp-create-title" required>
          <Input
            id="rp-create-title"
            value={title}
            onChange={(e) => {
              markDirty();
              setTitle(e.target.value);
            }}
          />
        </FormField>
        <FormField label={RESEARCH_COPY.fieldSummary} htmlFor="rp-create-summary">
          <textarea
            id="rp-create-summary"
            value={summary}
            onChange={(e) => {
              markDirty();
              setSummary(e.target.value);
            }}
            className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={RESEARCH_COPY.fieldStart} htmlFor="rp-create-start" required>
            <Input
              id="rp-create-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                markDirty();
                setStartDate(e.target.value);
              }}
            />
          </FormField>
          <FormField label={RESEARCH_COPY.fieldEnd} htmlFor="rp-create-end" required>
            <Input
              id="rp-create-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                markDirty();
                setEndDate(e.target.value);
              }}
            />
          </FormField>
        </div>
        <FormField label={RESEARCH_COPY.fieldBudget} htmlFor="rp-create-budget" required>
          <Input
            id="rp-create-budget"
            type="number"
            min={0}
            value={budgetPlanned}
            onChange={(e) => {
              markDirty();
              setBudgetPlanned(Number(e.target.value));
            }}
          />
        </FormField>
        <FormField label={RESEARCH_COPY.fieldLead} htmlFor="rp-create-lead" required>
          <select
            id="rp-create-lead"
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
          htmlFor="rp-create-colead"
          required={requireCoLead}
        >
          <select
            id="rp-create-colead"
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
