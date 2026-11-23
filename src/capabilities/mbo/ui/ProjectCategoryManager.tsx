import React, { useState } from 'react';
import { Plus, Archive, RotateCcw, Tag } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import {
  listActiveCategories,
  validateCategoryDraft,
  type ProjectCategory,
} from '../domain/projectCategoryEngine';
import {
  archiveProjectCategory,
  createProjectCategory,
  renameProjectCategory,
  restoreProjectCategory,
} from '../services/projectCategoryService';
import { showToast } from '@/shared/feedback/uiFeedback';

type Props = {
  organizationId: string;
  categories: ProjectCategory[];
  onChanged: () => void;
  onClose: () => void;
};

export const ProjectCategoryManager: React.FC<Props> = ({
  organizationId,
  categories,
  onChanged,
  onClose,
}) => {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#0f766e');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const active = listActiveCategories(categories);
  const archived = categories.filter((c) => !c.isActive);

  const handleCreate = async () => {
    setError(null);
    const check = validateCategoryDraft({ label, color }, categories);
    if (!check.isValid) {
      setError(check.error ?? '입력 오류');
      return;
    }
    setBusy(true);
    try {
      await createProjectCategory(organizationId, { label, color }, categories);
      setLabel('');
      showToast('분류가 추가되었습니다.', 'success');
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '추가 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleRenameSave = async (cat: ProjectCategory) => {
    if (!renameValue.trim() || renameValue.trim() === cat.label) {
      setRenameId(null);
      return;
    }
    try {
      await renameProjectCategory(cat.id, organizationId, renameValue, categories);
      showToast('이름이 변경되었습니다.', 'success');
      setRenameId(null);
      onChanged();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '변경 실패', 'error');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="프로젝트 분류 관리"
      maxWidth="lg"
      description="연구·품질·기술 등 분류를 사업장에서 추가·이름변경할 수 있습니다. 삭제는 보관(비활성)만 가능합니다."
      footer={
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Tag className="h-4 w-4 text-slate-500" />
          분류 목록
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={`${FORM_CONTROL_CLASS} flex-1`}
            placeholder="새 분류 이름 (예: 기술대응)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="color"
            className="h-11 w-14 rounded-lg border border-slate-300 p-1"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="분류 색상"
          />
          <Button variant="primary" isLoading={busy} onClick={() => void handleCreate()}>
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <ul className="space-y-2">
          {active.map((cat) => (
            <li
              key={cat.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color || '#64748b' }}
                />
                {renameId === cat.id ? (
                  <FormField label="이름 변경" htmlFor={`rename-${cat.id}`} className="min-w-0 flex-1">
                    <input
                      id={`rename-${cat.id}`}
                      className={FORM_CONTROL_CLASS}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                  </FormField>
                ) : (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{cat.label}</div>
                    <div className="text-[10px] text-slate-400">{cat.categoryKey}</div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {renameId === cat.id ? (
                  <>
                    <Button variant="primary" size="sm" onClick={() => void handleRenameSave(cat)}>
                      저장
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRenameId(null)}>
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRenameId(cat.id);
                      setRenameValue(cat.label);
                    }}
                  >
                    이름변경
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void archiveProjectCategory(cat.id, organizationId)
                      .then(() => {
                        showToast('분류를 보관했습니다. 기존 프로젝트는 유지됩니다.', 'info');
                        onChanged();
                      })
                      .catch((cause) => {
                        showToast(cause instanceof Error ? cause.message : '보관 실패', 'error');
                      });
                  }}
                >
                  <Archive className="h-3.5 w-3.5" />
                  보관
                </Button>
              </div>
            </li>
          ))}
          {active.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">
              활성 분류가 없습니다. 위에서 추가하세요.
            </li>
          ) : null}
        </ul>

        <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? '보관 목록 숨기기' : `보관된 분류 ${archived.length}건 보기`}
        </Button>

        {showArchived ? (
          <ul className="space-y-2">
            {archived.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2 opacity-80"
              >
                <span className="text-sm text-slate-600">{cat.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void restoreProjectCategory(cat.id, organizationId)
                      .then(() => {
                        showToast('분류를 복구했습니다.', 'success');
                        onChanged();
                      })
                      .catch((cause) => {
                        showToast(cause instanceof Error ? cause.message : '복구 실패', 'error');
                      });
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  복구
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
};
