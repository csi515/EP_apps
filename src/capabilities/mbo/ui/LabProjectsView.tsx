import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useList } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { MboProjectPortfolioView } from './MboProjectPortfolioView';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import type { MboStatus } from '../domain/mboEngine';
import {
  ensureDefaultProjectCategories,
  listProjectCategories,
} from '../services/projectCategoryService';

/**
 * 연구소 전용 진행 프로젝트 페이지 (MBO 평가 허브와 분리된 진입점)
 */
export const LabProjectsView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { query } = useList<any>({
    resource: 'mbo_projects',
    pagination: { mode: 'off' },
  });
  const refineRows = query?.data?.data;

  const reloadCategories = useCallback(async () => {
    if (!orgId) {
      setCategories([]);
      return;
    }
    try {
      await ensureDefaultProjectCategories(orgId);
      const rows = await listProjectCategories(orgId, { includeArchived: true });
      setCategories(rows);
    } catch {
      setCategories([]);
    }
  }, [orgId]);

  useEffect(() => {
    void reloadCategories();
  }, [reloadCategories]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ProjectCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const projects: PortfolioProject[] = useMemo(() => {
    if (!refineRows || refineRows.length === 0) return [];
    return refineRows.map((row: any) => {
      const cat = row.category_id ? categoryById.get(row.category_id) : undefined;
      return {
        id: row.id,
        title: row.title,
        ownerId: row.owner_id ?? null,
        ownerName: row.owner_name || '미배정',
        status: (row.status || 'draft') as MboStatus,
        startDate: row.start_date || '2026-01-01',
        targetDate: row.target_date || '2026-12-31',
        progressRate: row.progress_rate ?? 0,
        objectiveId: row.objective_id,
        description: row.description,
        categoryId: row.category_id ?? null,
        categoryLabel: cat?.label ?? null,
        categoryColor: cat?.color ?? null,
      };
    });
  }, [refineRows, categoryById]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          등록된 연구소 프로젝트가 없습니다. MBO 목표 등록 시 생성된 실행 프로젝트가 여기에 표시됩니다.
        </div>
      ) : (
        <MboProjectPortfolioView
          projects={projects}
          categories={categories}
          organizationId={orgId}
          title="연구소 진행 프로젝트"
          subtitle="연구·품질·기술 등 분류는 사업장이 직접 추가·관리합니다. MBO 평가 화면과 별도 진입점입니다."
          showQuarterlyReview={false}
          selectedProjectId={selectedId}
          onSelectProject={setSelectedId}
          onCategoriesChanged={() => void reloadCategories()}
        />
      )}
    </div>
  );
};
