import React from 'react';
import { CalendarPlus, CheckCircle2, UserPlus, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  users: UserPlus,
  calendar: CalendarPlus,
  check: CheckCircle2,
};

type Action = { label: string; onClick: () => void };

type Props = {
  title: string;
  description: string;
  iconName: string;
  actionButton?: Action;
};

export function ActionableEmptyState({ title, description, iconName, actionButton }: Props) {
  const Icon = ICONS[iconName] ?? CheckCircle2;
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-base font-bold text-slate-900">{title}</p>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
      {actionButton ? (
        <button type="button" className="min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" onClick={actionButton.onClick}>
          {actionButton.label}
        </button>
      ) : null}
    </div>
  );
}
