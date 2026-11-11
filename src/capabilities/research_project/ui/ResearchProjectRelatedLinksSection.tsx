import React, { useState } from 'react';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { validateHttpUrl, type ResearchProjectLink } from '../domain/researchProjectEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { RESEARCH_COPY } from './researchUiCopy';

type Props = {
  links: ResearchProjectLink[];
  onAdd?: (title: string, url: string) => Promise<string | null>;
  onDelete?: (linkId: string) => Promise<string | null>;
};

export const ResearchProjectRelatedLinksSection: React.FC<Props> = ({
  links,
  onAdd,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!onAdd) return;
    if (!title.trim()) {
      showToast('자료 제목을 입력해 주세요.', 'warning');
      return;
    }
    const urlCheck = validateHttpUrl(url);
    if (!urlCheck.isValid) {
      showToast(urlCheck.errorMessage || RESEARCH_COPY.relatedLinksInvalidUrl, 'error');
      return;
    }
    setSaving(true);
    const err = await onAdd(title.trim(), url.trim());
    setSaving(false);
    if (err) {
      showToast(err, 'error');
      return;
    }
    setTitle('');
    setUrl('');
    setOpen(false);
    showToast(RESEARCH_COPY.relatedLinksAdded, 'success');
  };

  const handleDelete = async (linkId: string) => {
    if (!onDelete) return;
    if (!window.confirm(RESEARCH_COPY.relatedLinksDeleteConfirm)) return;
    const err = await onDelete(linkId);
    if (err) showToast(err, 'error');
    else showToast(RESEARCH_COPY.relatedLinksDeleted, 'success');
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Link2 className="h-4 w-4" /> {RESEARCH_COPY.relatedLinksTitle}
        </h3>
        {onAdd ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex min-h-[44px] items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="h-3.5 w-3.5" /> {RESEARCH_COPY.relatedLinksAdd}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={RESEARCH_COPY.relatedLinksTitlePlaceholder}
            className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={RESEARCH_COPY.relatedLinksUrlPlaceholder}
            className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[44px] rounded-lg px-3 text-xs text-slate-500"
            >
              {RESEARCH_COPY.relatedLinksCancel}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAdd()}
              className="min-h-[44px] rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {RESEARCH_COPY.relatedLinksSave}
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-2 text-sm text-slate-600">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2 text-slate-800 hover:text-indigo-600"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate font-medium">{link.title}</span>
            </a>
            {onDelete ? (
              <button
                type="button"
                aria-label={RESEARCH_COPY.relatedLinksDelete}
                onClick={() => void handleDelete(link.id)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        ))}
        {links.length === 0 ? (
          <li className="py-2 text-xs text-slate-400">{RESEARCH_COPY.relatedLinksEmpty}</li>
        ) : null}
      </ul>
    </section>
  );
};
