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

const LOCAL_SAMPLE: PortfolioProject[] = [
  {
    id: 'lab-p1',
    title: '친환경 촉매 합성 및 파일럿 스케일업',
    ownerId: 'u-kim',
    ownerName: '김수석',
    status: 'in_progress',
    startDate: '2026-01-15',
    targetDate: '2026-06-30',
    progressRate: 42,
    categoryId: 'local-research',
    categoryLabel: '연구',
    categoryColor: '#4f46e5',
  },
  {
    id: 'lab-p2',
    title: 'FE-SEM 측정 표준 SOP·품질 게이트',
    ownerId: 'u-lee',
    ownerName: '이선임',
    status: 'approved',
    startDate: '2026-03-01',
    targetDate: '2026-04-30',
    progressRate: 68,
    categoryId: 'local-quality',
    categoryLabel: '품질',
    categoryColor: '#059669',
  },
  {
    id: 'lab-p3',
    title: '분석장비 제어 펌웨어 개선',
    ownerId: 'u-park',
    ownerName: '박센터장',
    status: 'in_progress',
    startDate: '2026-02-01',
    targetDate: '2026-08-31',
    progressRate: 35,
    categoryId: 'local-tech',
    categoryLabel: '기술',
    categoryColor: '#0284c7',
  },
];

const LOCAL_CATEGORIES: ProjectCategory[] = [
  {
    id: 'local-research',
    organizationId: 'local',
    categoryKey: 'research',
    label: '연구',
    color: '#4f46e5',
    sortOrder: 10,
    isActive: true,
  },
  {
    id: 'local-quality',
    organizationId: 'local',
    categoryKey: 'quality',
    label: '품질',
    color: '#059669',
    sortOrder: 20,
    isActive: true,
  },
  {
    id: 'local-tech',
    organizationId: 'local',
    categoryKey: 'technology',
    label: '기술',
    color: '#0284c7',
    sortOrder: 30,
    isActive: true,
  },
];

/**
 * 연구소 전용 진행 프로젝트 페이지 (MBO 평가 허브와 분리된 진입점)
 */
export const LabProjectsView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const [categories, setCategories] = useState<ProjectCategory[]>(LOCAL_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { query } = useList<any>({
    resource: 'mbo_projects',
    pagination: { mode: 'off' },
  });
  const refineRows = query?.data?.data;

  const reloadCategories = useCallback(async () => {
    if (!orgId) {
      setCategories(LOCAL_CATEGORIES);
      return;
    }
    try {
      await ensureDefaultProjectCategories(orgId);
      const rows = await listProjectCategories(orgId, { includeArchived: true });
      setCategories(rows.length > 0 ? rows : LOCAL_CATEGORIES);
    } catch {
      setCategories(LOCAL_CATEGORIES);
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
    if (refineRows && refineRows.length > 0) {
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
    }
    return LOCAL_SAMPLE;
  }, [refineRows, categoryById]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
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
    </div>
  );
};
