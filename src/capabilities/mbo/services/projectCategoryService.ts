import { getCoreClient } from '@/lib/supabase/client';
import {
  slugifyCategoryKey,
  validateCategoryDraft,
  type ProjectCategory,
  type ProjectCategoryDraft,
} from '../domain/projectCategoryEngine';

type CategoryRow = {
  id: string;
  organization_id: string;
  category_key: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
};

function mapRow(row: CategoryRow): ProjectCategory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    categoryKey: row.category_key,
    label: row.label,
    color: row.color,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    archivedAt: row.archived_at,
  };
}

export async function listProjectCategories(
  organizationId: string,
  options: { includeArchived?: boolean } = {}
): Promise<ProjectCategory[]> {
  const client = getCoreClient();
  let query = client
    .from('project_categories' as never)
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  if (!options.includeArchived) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as CategoryRow[]) ?? []).map(mapRow);
}

export async function ensureDefaultProjectCategories(organizationId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('ensure_default_project_categories' as never, {
    p_org: organizationId,
  } as never);
  if (error) throw new Error(error.message);
}

export async function createProjectCategory(
  organizationId: string,
  draft: ProjectCategoryDraft,
  existing: ProjectCategory[]
): Promise<ProjectCategory> {
  const check = validateCategoryDraft(draft, existing);
  if (!check.isValid || !check.categoryKey) {
    throw new Error(check.error ?? 'invalid category');
  }

  const client = getCoreClient();
  const { data, error } = await client
    .from('project_categories' as never)
    .insert({
      organization_id: organizationId,
      category_key: check.categoryKey,
      label: draft.label.trim(),
      color: draft.color ?? null,
      sort_order: draft.sortOrder ?? 100,
      is_active: true,
    } as never)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as CategoryRow);
}

export async function renameProjectCategory(
  categoryId: string,
  organizationId: string,
  nextLabel: string,
  existing: ProjectCategory[]
): Promise<ProjectCategory> {
  const check = validateCategoryDraft(
    { label: nextLabel },
    existing,
    { editingId: categoryId },
  );
  if (!check.isValid) {
    throw new Error(check.error ?? 'invalid category');
  }

  const client = getCoreClient();
  const { data, error } = await client
    .from('project_categories' as never)
    .update({
      label: nextLabel.trim(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', categoryId)
    .eq('organization_id', organizationId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as CategoryRow);
}

export async function archiveProjectCategory(
  categoryId: string,
  organizationId: string
): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('project_categories' as never)
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', categoryId)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

export async function restoreProjectCategory(
  categoryId: string,
  organizationId: string
): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('project_categories' as never)
    .update({
      is_active: true,
      archived_at: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', categoryId)
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
}

export { slugifyCategoryKey };
