import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showErrorToast, showToast } from '@/shared/feedback/uiFeedback';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import { InlineBusy } from '@/shared/components/ui/Skeleton';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import {
  trainingStatusLabel,
  type TrainingAssigneeTarget,
} from '../domain/trainingAckEngine';
import {
  closeTrainingCourse,
  createTrainingCourse,
  listCourseAcknowledgments,
  replaceTrainingAssignees,
  saveAndPublishTrainingCourse,
  updateTrainingCourse,
  type TrainingAcknowledgmentRow,
  type TrainingCourseRow,
} from '../trainingAckService';
import { TrainingAckLogTable } from './TrainingAckLogTable';
import { TrainingAssigneeEditor } from './TrainingAssigneeEditor';
import { TrainingManageGate } from './TrainingAccessGate';
import {
  loadTrainingCoursesBundle,
  loadTrainingDepartments,
  loadTrainingMemberOptions,
  type TrainingOption,
} from './trainingManageLoaders';
import { TRAINING_COPY } from './trainingUiCopy';

function TrainingManageInner() {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;

  const [courses, setCourses] = useState<TrainingCourseRow[]>([]);
  const [assigneesByCourse, setAssigneesByCourse] = useState<
    Record<string, TrainingAssigneeTarget[]>
  >({});
  const [departments, setDepartments] = useState<TrainingOption[]>([]);
  const [members, setMembers] = useState<TrainingOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignees, setAssignees] = useState<TrainingAssigneeTarget[]>([]);
  const [acks, setAcks] = useState<TrainingAcknowledgmentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const selected = useMemo(
    () => courses.find((c) => c.id === selectedId) ?? null,
    [courses, selectedId],
  );

  const isDirty = useMemo(() => {
    if (creating) return Boolean(title.trim() || body.trim() || assignees.length);
    if (!selected) return false;
    const saved = assigneesByCourse[selected.id] ?? [];
    const sameAssignees =
      saved.length === assignees.length &&
      saved.every(
        (s, i) =>
          s.departmentId === assignees[i]?.departmentId &&
          s.memberId === assignees[i]?.memberId,
      );
    return selected.title !== title || selected.body !== body || !sameAssignees;
  }, [creating, title, body, assignees, selected, assigneesByCourse]);

  const reloadMeta = useCallback(async () => {
    if (!orgId) return;
    try {
      const [depts, mems] = await Promise.all([
        loadTrainingDepartments(orgId),
        loadTrainingMemberOptions(orgId),
      ]);
      setDepartments(depts);
      setMembers(mems);
    } catch {
      showErrorToast(TRAINING_COPY.loadFailed);
    }
  }, [orgId]);

  const reloadCourses = useCallback(async () => {
    if (!orgId) return;
    try {
      const bundle = await loadTrainingCoursesBundle(orgId);
      setCourses(bundle.courses);
      setAssigneesByCourse(bundle.assigneesByCourse);
    } catch {
      showErrorToast(TRAINING_COPY.loadFailed);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    void Promise.all([reloadMeta(), reloadCourses()]).finally(() => setLoading(false));
  }, [orgId, reloadMeta, reloadCourses]);

  useEffect(() => {
    if (!selected) {
      if (!creating) {
        setTitle('');
        setBody('');
        setAssignees([]);
        setAcks([]);
      }
      return;
    }
    setTitle(selected.title);
    setBody(selected.body);
    setAssignees(assigneesByCourse[selected.id] ?? []);
    void listCourseAcknowledgments(orgId, selected.id)
      .then(setAcks)
      .catch(() => setAcks([]));
  }, [selected, assigneesByCourse, orgId, creating]);

  const openCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setTitle('');
    setBody('');
    setAssignees([]);
    setAcks([]);
  };

  const handleSave = async () => {
    if (!orgId) return;
    setBusy(true);
    try {
      let courseId = selected?.id;
      if (creating || !courseId) {
        const created = await createTrainingCourse(orgId, {
          title,
          body,
          createdBy: memberId,
        });
        courseId = created.id;
        if (assignees.length > 0) {
          await replaceTrainingAssignees(orgId, courseId, assignees);
        }
        setCreating(false);
        setSelectedId(courseId);
      } else {
        await updateTrainingCourse(orgId, courseId, { title, body });
        if (assignees.length > 0) {
          await replaceTrainingAssignees(orgId, courseId, assignees);
        }
      }
      showToast(TRAINING_COPY.saveSuccess, 'success');
      await reloadCourses();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : TRAINING_COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!orgId || !selected) return;
    if (assignees.length === 0) {
      showErrorToast(TRAINING_COPY.needAssign);
      return;
    }
    setBusy(true);
    try {
      await saveAndPublishTrainingCourse(orgId, selected.id, { title, body, assignees });
      showToast(TRAINING_COPY.publishSuccess, 'success');
      await reloadCourses();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : TRAINING_COPY.publishFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!orgId || !selected) return;
    setBusy(true);
    try {
      await closeTrainingCourse(orgId, selected.id);
      showToast(TRAINING_COPY.closeSuccess, 'success');
      await reloadCourses();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : TRAINING_COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);
  const editing = creating || Boolean(selected);

  return (
    <WorkPageFrame title={TRAINING_COPY.tabManage} width="hub">
      <div className="mb-3 flex items-center justify-end gap-2">
        {loading ? <InlineBusy label={TRAINING_COPY.loading} /> : null}
        <Button variant="primary" size="sm" onClick={openCreate}>
          {TRAINING_COPY.create}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {courses.length === 0 ? (
            <div className="p-3">
              <EmptyState title={TRAINING_COPY.emptyManage} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {courses.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                      selectedId === c.id ? 'bg-slate-100 font-semibold' : ''
                    }`}
                    onClick={() => {
                      setCreating(false);
                      setSelectedId(c.id);
                    }}
                  >
                    <span className="block truncate text-slate-900">{c.title}</span>
                    <span className="text-[11px] text-slate-500">
                      {trainingStatusLabel(c.status)}
                      {c.revision > 1 ? ` · r${c.revision}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          {!editing ? (
            <p className="text-sm text-slate-500">{TRAINING_COPY.pickCourseHint}</p>
          ) : (
            <>
              <FormField label={TRAINING_COPY.titleLabel}>
                <input
                  className={FORM_CONTROL_CLASS}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={TRAINING_COPY.titlePlaceholder}
                />
              </FormField>
              <FormField label={TRAINING_COPY.bodyLabel}>
                <textarea
                  className={`${FORM_CONTROL_CLASS} min-h-[10rem]`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={TRAINING_COPY.bodyPlaceholder}
                />
              </FormField>
              <TrainingAssigneeEditor
                departments={departments}
                members={members}
                assignees={assignees}
                onChange={setAssignees}
              />
              {selected && selected.status !== 'published' && isDirty ? (
                <p className="text-xs text-slate-500">{TRAINING_COPY.publishSaveHint}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={busy} onClick={() => void handleSave()}>
                  {TRAINING_COPY.saveDraft}
                </Button>
                {selected && selected.status !== 'published' ? (
                  <Button variant="secondary" disabled={busy} onClick={() => void handlePublish()}>
                    {TRAINING_COPY.publish}
                  </Button>
                ) : null}
                {selected && selected.status === 'published' ? (
                  <Button variant="ghost" disabled={busy} onClick={() => void handleClose()}>
                    {TRAINING_COPY.close}
                  </Button>
                ) : null}
              </div>
              {selected ? (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h3 className="text-sm font-semibold text-slate-800">{TRAINING_COPY.logsTitle}</h3>
                  <TrainingAckLogTable rows={acks} memberName={memberName} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </WorkPageFrame>
  );
}

export const TrainingManagePage: React.FC = () => (
  <TrainingManageGate>
    <TrainingManageInner />
  </TrainingManageGate>
);
