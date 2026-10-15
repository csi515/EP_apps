import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { PackagePlus, SlidersHorizontal, Warehouse, Camera, Printer, QrCode } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { FilterBar, FilterTabs, SearchField } from '@/shared/components/ui';
import {
  BarcodeLabelPrintModal,
  StoreQrPopPrintModal,
  InventoryScannerModal,
  generateItemBarcode,
  type InventoryItem,
} from '@/capabilities/inventory';
import { inventoryService } from '../../services/inventoryService';
import {
  INVENTORY_LOW_STOCK_THRESHOLD,
  type InventoryStockFilter,
  type InventoryStockRow,
} from '../../types/inventory';
import { INVENTORY_LIST_COPY as COPY } from './inventoryListCopy';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockInboundModal } from './StockInboundModal';

function matchesStockFilter(row: InventoryStockRow, filter: InventoryStockFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'OUT') return row.quantity <= 0;
  return row.quantity > 0 && row.quantity <= INVENTORY_LOW_STOCK_THRESHOLD;
}

function qtyToneClass(quantity: number): string {
  if (quantity <= 0) return 'text-rose-600';
  if (quantity <= INVENTORY_LOW_STOCK_THRESHOLD) return 'text-amber-700';
  return 'text-slate-900';
}

export const InventoryListView: FC = () => {
  const { showToast } = useApp();
  const { isAdmin } = usePermissions();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  /** Owner/Admin/Manager만 입고·조정 — Staff는 조회만 */
  const canMutate = isAdmin;

  const [rows, setRows] = useState<InventoryStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>('ALL');
  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundInitial, setInboundInitial] = useState<InventoryStockRow | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustInitial, setAdjustInitial] = useState<InventoryStockRow | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const [selectedLabelItem, setSelectedLabelItem] = useState<InventoryItem | null>(null);
  const [storePopOpen, setStorePopOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      setRows(await inventoryService.listStockRows(orgId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.productName.toLowerCase().includes(q)) return false;
      return matchesStockFilter(row, stockFilter);
    });
  }, [rows, search, stockFilter]);

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const row of rows) {
      if (row.quantity <= 0) out += 1;
      else if (row.quantity <= INVENTORY_LOW_STOCK_THRESHOLD) low += 1;
    }
    return { all: rows.length, low, out };
  }, [rows]);

  const openInbound = (row?: InventoryStockRow) => {
    if (!canMutate) return;
    setInboundInitial(row ?? null);
    setInboundOpen(true);
  };

  const openAdjust = (row?: InventoryStockRow) => {
    if (!canMutate) return;
    setAdjustInitial(row ?? null);
    setAdjustOpen(true);
  };

  const inventoryItems: InventoryItem[] = useMemo(() => {
    const orgCode = orgId ? orgId.replace(/-/g, '').slice(0, 4).toUpperCase() : '0001';
    return rows.map((r, idx) => ({
      id: r.key,
      name: r.variantName ? `${r.productName} (${r.variantName})` : r.productName,
      sku: r.key,
      barcode: generateItemBarcode(orgCode, idx + 1),
      qrCodeUrl: `https://moa.app/scan/item?id=${encodeURIComponent(r.key)}`,
      currentStock: r.quantity,
      safetyStock: INVENTORY_LOW_STOCK_THRESHOLD,
      unitPrice: 0,
    }));
  }, [rows, orgId]);

  const openLabelPrint = (row?: InventoryStockRow) => {
    if (row) {
      const found = inventoryItems.find((it) => it.id === row.key);
      setSelectedLabelItem(found ?? null);
    } else {
      setSelectedLabelItem(inventoryItems[0] ?? null);
    }
    setLabelPrintOpen(true);
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Warehouse className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 재고를 확인할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        icon={<Warehouse className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.title}
        description={canMutate ? COPY.description : COPY.descriptionReadOnly}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl w-full sm:w-auto shadow-sm"
            >
              <Camera className="w-4 h-4" />
              실시간 스캔
            </button>
            <button
              type="button"
              onClick={() => setStorePopOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl w-full sm:w-auto border border-slate-200/80"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              매장 QR POP
            </button>
            {canMutate && (
              <>
                <button
                  type="button"
                  onClick={() => openAdjust()}
                  disabled={rows.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl w-full sm:w-auto disabled:opacity-60"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {COPY.adjust}
                </button>
                <button
                  type="button"
                  onClick={() => openInbound()}
                  disabled={rows.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl w-full sm:w-auto disabled:opacity-60"
                >
                  <PackagePlus className="w-4 h-4" />
                  {COPY.inbound}
                </button>
              </>
            )}
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
        <FilterTabs
          tabs={[
            { id: 'ALL', label: COPY.filterAll, count: counts.all },
            { id: 'LOW', label: COPY.filterLow, count: counts.low },
            { id: 'OUT', label: COPY.filterOut, count: counts.out },
          ]}
          active={stockFilter}
          onChange={setStockFilter}
          activeClassName="bg-teal-600 text-white"
        />
      </FilterBar>

      {loading ? (
        <PageListSkeleton rows={3} message="목록을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="w-10 h-10" />}
          title={rows.length === 0 ? COPY.emptyTitle : COPY.emptyFilterTitle}
          description={
            rows.length === 0 ? COPY.emptyDescription : COPY.emptyFilterDescription
          }
        />
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filtered.map((row) => (
              <div
                key={row.key}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4"
              >
                <p className="font-bold text-slate-900">{row.productName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {row.variantName ?? COPY.singleOption}
                </p>
                <div className="flex items-end justify-between gap-2 mt-3">
                  <p className={`text-lg font-bold tabular-nums ${qtyToneClass(row.quantity)}`}>
                    {row.quantity}
                    <span className="text-xs font-semibold text-slate-400 ml-1">
                      {COPY.qtyUnit}
                    </span>
                  </p>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.isActive ? COPY.statusActive : COPY.statusInactive}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openLabelPrint(row)}
                          className="text-xs font-bold text-indigo-600 min-h-[44px] px-1 flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          라벨
                        </button>
                        {canMutate && (
                          <>
                            <button
                              type="button"
                              onClick={() => openAdjust(row)}
                              className="text-xs font-bold text-slate-700 min-h-[44px] px-1"
                            >
                              {COPY.adjust}
                            </button>
                            <button
                              type="button"
                              onClick={() => openInbound(row)}
                              className="text-xs font-bold text-teal-700 min-h-[44px] px-1"
                            >
                              {COPY.inbound}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-bold">{COPY.colProduct}</th>
                  <th className="px-4 py-3 font-bold">{COPY.colOption}</th>
                  <th className="px-4 py-3 font-bold text-right">{COPY.colQty}</th>
                  <th className="px-4 py-3 font-bold">{COPY.colStatus}</th>
                  <th className="px-4 py-3 font-bold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.productName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.variantName ?? COPY.singleOption}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${qtyToneClass(
                        row.quantity
                      )}`}
                    >
                      {row.quantity}
                      <span className="text-xs font-semibold text-slate-400 ml-1">
                        {COPY.qtyUnit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          row.isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.isActive ? COPY.statusActive : COPY.statusInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openLabelPrint(row)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 min-h-[44px] px-2 inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        라벨
                      </button>
                      {canMutate && (
                        <>
                          <button
                            type="button"
                            onClick={() => openAdjust(row)}
                            className="text-xs font-bold text-slate-700 min-h-[44px] px-2"
                          >
                            {COPY.adjust}
                          </button>
                          <button
                            type="button"
                            onClick={() => openInbound(row)}
                            className="text-xs font-bold text-teal-600 min-h-[44px] px-2"
                          >
                            {COPY.inbound}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canMutate && (
        <>
          <StockInboundModal
            isOpen={inboundOpen}
            organizationId={orgId}
            stockRows={rows}
            initialRow={inboundInitial}
            onClose={() => setInboundOpen(false)}
            onCompleted={(after) => {
              showToast(COPY.inboundDone(after), 'success');
              void load();
            }}
            onError={(message) => showToast(message, 'error')}
          />

          <StockAdjustmentModal
            isOpen={adjustOpen}
            organizationId={orgId}
            stockRows={rows}
            initialRow={adjustInitial}
            onClose={() => setAdjustOpen(false)}
            onCompleted={(delta, after) => {
              showToast(COPY.adjustDone(delta, after), 'success');
              void load();
            }}
            onError={(message) => showToast(message, 'error')}
          />
        </>
      )}

      <InventoryScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        items={inventoryItems}
        onStockUpdated={(_updatedItem, reason) => {
          showToast(`스캔 완료: ${reason}`, 'success');
          void load();
        }}
      />

      <BarcodeLabelPrintModal
        isOpen={labelPrintOpen}
        onClose={() => setLabelPrintOpen(false)}
        item={selectedLabelItem}
        organizationName={currentOrganization?.name || '사업장'}
      />

      <StoreQrPopPrintModal
        isOpen={storePopOpen}
        onClose={() => setStorePopOpen(false)}
        organizationName={currentOrganization?.name || '사업장'}
        organizationCode={currentOrganization?.id?.replace(/-/g, '').slice(0, 8).toUpperCase() || 'MOA-001'}
        industryLabel="스마트 사업장"
      />
    </div>
  );
};
