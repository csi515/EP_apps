import React from 'react';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import type { OrgRosterEmploymentFilter, OrgRosterSortKey } from './orgRosterEngine';
import { ORG_CHART_COPY } from './orgChartCopy';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  employment: OrgRosterEmploymentFilter;
  onEmploymentChange: (value: OrgRosterEmploymentFilter) => void;
  sortKey: OrgRosterSortKey;
  onSortKeyChange: (value: OrgRosterSortKey) => void;
};

export function OrgRosterFilters({
  query,
  onQueryChange,
  employment,
  onEmploymentChange,
  sortKey,
  onSortKeyChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2" data-testid="org-roster-filters">
      <label className="sr-only" htmlFor="org-roster-search">
        {ORG_CHART_COPY.rosterSearchPlaceholder}
      </label>
      <input
        id="org-roster-search"
        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
        placeholder={ORG_CHART_COPY.rosterSearchPlaceholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <label className="flex min-h-11 min-w-[10rem] flex-1 flex-col text-[11px] font-bold text-slate-600">
          {ORG_CHART_COPY.rosterEmploymentFilter}
          <select
            className={`${FORM_CONTROL_CLASS} mt-1 h-11 py-0 text-sm`}
            value={employment}
            onChange={(e) => onEmploymentChange(e.target.value as OrgRosterEmploymentFilter)}
          >
            <option value="all">{ORG_CHART_COPY.rosterEmploymentAll}</option>
            <option value="active">{ORG_CHART_COPY.rosterActive}</option>
            <option value="inactive">{ORG_CHART_COPY.rosterInactive}</option>
          </select>
        </label>

        <label className="flex min-h-11 min-w-[10rem] flex-1 flex-col text-[11px] font-bold text-slate-600">
          {ORG_CHART_COPY.rosterSortLabel}
          <select
            className={`${FORM_CONTROL_CLASS} mt-1 h-11 py-0 text-sm`}
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value as OrgRosterSortKey)}
          >
            <option value="name">{ORG_CHART_COPY.rosterSortName}</option>
            <option value="loginId">{ORG_CHART_COPY.rosterSortLoginId}</option>
            <option value="roleName">{ORG_CHART_COPY.rosterSortRole}</option>
            <option value="departmentName">{ORG_CHART_COPY.rosterSortDept}</option>
            <option value="employment">{ORG_CHART_COPY.rosterSortEmployment}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
