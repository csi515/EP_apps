import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Package, Plus, FolderOpen, FileSpreadsheet } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { FilterBar, FilterTabs, SearchField } from '@/shared/components/ui';
import { formatCurrency } from '@/utils/formatters';
import { productService } from '../../services/productService';
import type {
  ProductCategory,
  ProductListItem,
  ProductStatusFilter,
} from '../../types/product';
import { ProductFormModal } from './ProductFormModal';
import { ProductCategoryManageModal } from './ProductCategoryManageModal';
import { ProductBulkImportModal } from './ProductBulkImportModal';
import { PRODUCT_LIST_COPY as COPY } from './productListCopy';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

type CategoryFilter = 'ALL' | 'NONE' | string;

export const ProductListView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const requireSizeColorVariants = Boolean(
    getIndustryPreset(currentOrganization?.industry_type)?.businessRules?.sizeColorSkuSupport
  );

  const [items, setItems] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setItems([]);
      setCategories([]);
      return;
    }
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([
        productService.listProducts(orgId),
        productService.listCategories(orgId),
      ]);
      setItems(list);
      setCategories(cats);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (statusFilter === 'ACTIVE' && !item.isActive) return false;
      if (statusFilter === 'INACTIVE' && item.isActive) return false;
      if (categoryFilter === 'NONE' && item.categoryId) return false;
      if (
        categoryFilter !== 'ALL' &&
        categoryFilter !== 'NONE' &&
        item.categoryId !== categoryFilter
      ) {
        return false;
      }
      return true;
    });
  }, [items, search, statusFilter, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: ProductListItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 상품을 관리할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        icon={<Package className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.title}
        description={COPY.description}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCategoryOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-white border border-teal-200 text-teal-800 text-sm font-bold rounded-xl w-full sm:w-auto cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              {COPY.categoryManage}
            </button>
            <button
              type="button"
              onClick={() => setBulkImportOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-xl w-full sm:w-auto shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              엑셀 일괄 등록
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-teal-600 text-white text-sm font-bold rounded-xl w-full sm:w-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {COPY.add}
            </button>
          </div>
        }
      />

      <FilterBar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={COPY.searchPlaceholder}
          className="w-full sm:flex-1 sm:min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="w-full sm:w-auto min-h-[44px] px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
          aria-label={COPY.categoryLabel}
        >
          <option value="ALL">{COPY.categoryAll}</option>
          <option value="NONE">{COPY.categoryNone}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FilterTabs
          tabs={[
            { id: 'ALL', label: COPY.statusAll },
            { id: 'ACTIVE', label: COPY.statusActive },
            { id: 'INACTIVE', label: COPY.statusInactive },
          ]}
          active={statusFilter}
          onChange={(id) => setStatusFilter(id as ProductStatusFilter)}
          activeClassName="bg-teal-600 text-white"
        />
      </FilterBar>

      {loading ? (
        <PageListSkeleton rows={4} message="상품을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={items.length === 0 ? COPY.emptyTitle : '검색 결과가 없습니다'}
          description={items.length === 0 ? COPY.emptyDescription : '검색어나 필터 조건을 변경해 보세요.'}
        />
      ) : (
        <>
          {/* 모바일 카드 뷰 */}
          <ul className="space-y-2 sm:hidden">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.categoryName ? `${item.categoryName} · ` : ''}
                      {item.productCode ? `${item.productCode} · ` : ''}
                      {COPY.optionBadge(item.variantCount)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      item.isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.isActive ? COPY.statusActive : COPY.statusInactive}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
                  <span className="font-bold tabular-nums text-teal-700">
                    {formatCurrency(item.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="text-xs font-bold text-teal-600 min-h-[44px] px-2 flex items-center cursor-pointer"
                  >
                    {COPY.edit}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">{COPY.nameLabel}</th>
                  <th className="p-4">{COPY.codeLabel}</th>
                  <th className="p-4">{COPY.categoryLabel}</th>
                  <th className="p-4">{COPY.optionModeLabel}</th>
                  <th className="p-4 text-right">{COPY.priceLabel}</th>
                  <th className="p-4 text-center">{COPY.activeLabel}</th>
                  <th className="p-4 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="p-4 font-bold text-slate-900">{item.name}</td>
                    <td className="p-4 font-mono text-xs text-slate-600">
                      {item.productCode || '-'}
                    </td>
                    <td className="p-4 text-slate-600">{item.categoryName || '-'}</td>
                    <td className="p-4 text-slate-600">
                      {COPY.optionBadge(item.variantCount)}
                    </td>
                    <td className="p-4 text-right font-bold tabular-nums text-teal-700">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.isActive ? COPY.statusActive : COPY.statusInactive}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="text-xs font-bold text-teal-600 min-h-[44px] px-2 cursor-pointer"
                      >
                        {COPY.edit}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ProductFormModal
        isOpen={formOpen}
        organizationId={orgId!}
        categories={categories}
        editing={editing}
        requireSizeColorVariants={requireSizeColorVariants}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          showToast(
            editing ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.',
            'success'
          );
          void load();
        }}
        onError={(message) => showToast(message, 'error')}
      />

      <ProductCategoryManageModal
        isOpen={categoryOpen}
        organizationId={orgId}
        onClose={() => setCategoryOpen(false)}
        onChanged={() => void load()}
        onError={(message) => showToast(message, 'error')}
        onToast={showToast}
      />

      <ProductBulkImportModal
        isOpen={bulkImportOpen}
        organizationId={orgId!}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => {
          showToast('상품 일괄 등록이 완료되었습니다.', 'success');
          void load();
        }}
      />
    </div>
  );
};
