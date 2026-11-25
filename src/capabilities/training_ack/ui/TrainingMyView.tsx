import React, { useCallback, useEffect, useState } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showErrorToast, showToast } from '@/shared/feedback/uiFeedback';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { InlineBusy } from '@/shared/components/ui/Skeleton';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import {
  formatAckedAt,
  isAckCurrent,
  needsReAck,
  trainingStatusLabel,
} from '../domain/trainingAckEngine';
import {
  acknowledgeTrainingCourse,
  listMyTrainingCourses,
  type MyTrainingCourse,
} from '../trainingAckService';
import { TRAINING_COPY } from './trainingUiCopy';

export const TrainingMyView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;

  const [courses, setCourses] = useState<MyTrainingCourse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!orgId || !memberId) {
      setCourses([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listMyTrainingCourses(orgId, memberId);
      setCourses(rows);
    } catch {
      showErrorToast(TRAINING_COPY.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [orgId, memberId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected = courses.find((c) => c.id === selectedId) ?? null;

  const handleAck = async (isReAck: boolean) => {
    if (!orgId || !memberId || !selected) return;
    setBusy(true);
    try {
      const row = await acknowledgeTrainingCourse(orgId, selected.id, memberId, {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      setCourses((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, acknowledgment: row } : c)),
      );
      showToast(isReAck ? TRAINING_COPY.reAckSuccess : TRAINING_COPY.ackSuccess, 'success');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : TRAINING_COPY.ackFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!memberId) {
    return (
      <WorkPageFrame title={TRAINING_COPY.tabMine} width="form">
        <p className="text-sm text-slate-600">{TRAINING_COPY.noMember}</p>
      </WorkPageFrame>
    );
  }

  if (selected) {
    const ack = selected.acknowledgment;
    const ackCurrent = isAckCurrent(
      ack ? { courseRevision: ack.course_revision } : null,
      selected.revision,
    );
    const reAck = needsReAck(
      ack ? { courseRevision: ack.course_revision } : null,
      selected.revision,
    );
    return (
      <WorkPageFrame title={selected.title} width="form">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            {TRAINING_COPY.backToList}
          </Button>
          <p className="text-xs font-semibold text-slate-500">
            {TRAINING_COPY.statusLabel}: {trainingStatusLabel(selected.status)}
            {selected.revision > 1 ? ` · r${selected.revision}` : ''}
          </p>
          <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            {selected.body}
          </div>
          {ackCurrent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">{TRAINING_COPY.ackDone}</p>
              <p className="mt-1">
                {TRAINING_COPY.ackAtLabel}: {formatAckedAt(ack!.acked_at)}
              </p>
            </div>
          ) : reAck && selected.status === 'published' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">{TRAINING_COPY.reAckNeeded}</p>
                {ack ? (
                  <p className="mt-1 text-xs">
                    {TRAINING_COPY.ackAtLabel} (이전): {formatAckedAt(ack.acked_at)} · r
                    {ack.course_revision}
                  </p>
                ) : null}
              </div>
              <Button variant="primary" disabled={busy} onClick={() => void handleAck(true)}>
                {TRAINING_COPY.reAckButton}
              </Button>
            </div>
          ) : selected.status === 'published' ? (
            <Button variant="primary" disabled={busy} onClick={() => void handleAck(false)}>
              {TRAINING_COPY.ackButton}
            </Button>
          ) : (
            <p className="text-sm text-slate-500">{TRAINING_COPY.closedCourse}</p>
          )}
        </div>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame title={TRAINING_COPY.tabMine} width="form">
      {loading ? (
        <InlineBusy label={TRAINING_COPY.loading} />
      ) : courses.length === 0 ? (
        <EmptyState title={TRAINING_COPY.emptyMine} />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {courses.map((c) => {
            const ack = c.acknowledgment;
            const current = isAckCurrent(
              ack ? { courseRevision: ack.course_revision } : null,
              c.revision,
            );
            const stale = needsReAck(
              ack ? { courseRevision: ack.course_revision } : null,
              c.revision,
            );
            let subtitle = trainingStatusLabel(c.status);
            if (current && ack) {
              subtitle = `${TRAINING_COPY.ackDone} · ${formatAckedAt(ack.acked_at)}`;
            } else if (stale) {
              subtitle = TRAINING_COPY.reAckNeeded;
            }
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="text-sm font-semibold text-slate-900">{c.title}</span>
                  <span className={`text-xs ${stale ? 'text-amber-700' : 'text-slate-500'}`}>
                    {subtitle}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </WorkPageFrame>
  );
};
