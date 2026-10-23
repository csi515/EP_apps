import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { ShoppingCart, Camera, Barcode, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { SearchField } from '@/shared/components/ui';
import { formatCurrency } from '@/utils/formatters';
import {
  useBarcodeScanner,
  playScannerSound,
} from '@/capabilities/inventory';
import { saleService } from '../../services/saleService';
import {
  cartTotalAmount,
  type SaleCartLine,
  type SaleCatalogItem,
} from '../../types/sale';
import { SALE_POS_COPY as COPY } from './salePosCopy';
import { SaleCartLineRow } from './SaleCartLineRow';
import { SaleCheckoutModal } from './SaleCheckoutModal';
import { SaleCameraScannerModal } from './SaleCameraScannerModal';
import { SaleReceiptPrintModal, type ReceiptData } from './SaleReceiptPrintModal';
import { matchCatalogItem } from './saleCatalogMatch';

export const SalePosView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [catalog, setCatalog] = useState<SaleCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleCartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setCatalog([]);
      return;
    }
    setLoading(true);
    try {
      setCatalog(await saleService.listCatalog(orgId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (row) =>
        row.productName.toLowerCase().includes(q) ||
        (row.variantName?.toLowerCase().includes(q) ?? false) ||
        (row.productCode?.toLowerCase().includes(q) ?? false)
    );
  }, [catalog, search]);

  const total = useMemo(() => cartTotalAmount(cart), [cart]);

  const addToCart = useCallback((item: SaleCatalogItem) => {
    setLastAddedKey(item.key);
    setTimeout(() => setLastAddedKey(null), 1500);

    setCart((prev) => {
      const existing = prev.find((line) => line.key === item.key);
      if (existing) {
        return prev.map((line) =>
          line.key === item.key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          key: item.key,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          unitPrice: item.unitPrice,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQty = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.key !== key));
      return;
    }
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, quantity } : line))
    );
  };

  // [방식 A] USB/블루투스 HID 바코드/QR 스캐너 입력 감지 (검색창 포커스 불필요)
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const matched = matchCatalogItem(code, catalog);
      if (matched) {
        addToCart(matched);
        showToast(`'${matched.productName}' 상품이 추가되었습니다 (+1)`, 'success');
      } else {
        playScannerSound('error');
        showToast(`등록되지 않은 바코드입니다: ${code}`, 'error');
      }
    },
    [catalog, addToCart, showToast]
  );

  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: Boolean(orgId) && !checkoutOpen && !cameraOpen,
    feedbackOnScan: true,
  });

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<ShoppingCart className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 판매할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="p-4 sm:p-6 space-y-3 flex-1">
        <PageHeader
          icon={<ShoppingCart className="w-5 h-5" />}
          iconClassName="text-teal-600"
          title={COPY.title}
          description={COPY.description}
        />

        {/* 바코드 스캐너 대기 및 카메라 스캔 툴바 */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={COPY.searchPlaceholder}
              className="w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="스마트폰/태블릿 카메라로 바코드·QR 연속 스캔"
          >
            <Camera className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">카메라 스캔</span>
          </button>
        </div>

        {/* HID 스캐너 상시 활성 안내 뱃지 */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 rounded-xl text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <Barcode className="w-3.5 h-3.5 text-teal-600" />
            <span>바코드 스캐너 자동 감지 활성 (언제든 바코드/QR을 찍으세요)</span>
          </div>
          <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
            포커스 무관 · 1D/2D QR 지원
          </span>
        </div>

        {loading ? (
          <PageListSkeleton rows={3} message="목록을 불러오는 중..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-10 h-10" />}
            title={catalog.length === 0 ? COPY.emptyCatalog : COPY.emptySearch}
            description={catalog.length === 0 ? COPY.emptyCatalogHint : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => {
              const isJustAdded = lastAddedKey === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className={`w-full text-left bg-white rounded-2xl border p-4 min-h-[72px] transition-all cursor-pointer ${
                      isJustAdded
                        ? 'border-teal-500 bg-teal-50/50 shadow-sm ring-1 ring-teal-400'
                        : 'border-slate-200 active:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                          {isJustAdded && (
                            <span className="text-[10px] font-bold text-teal-600 flex items-center gap-0.5">
                              <Sparkles className="w-3 h-3" /> 담김!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.variantName ?? COPY.singleOption}
                          {item.productCode && ` · 바코드: ${item.productCode}`}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold tabular-nums text-teal-700">
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 데스크톱 장바구니 패널 */}
        <section className="hidden md:block mt-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{COPY.cartTitle}</h2>
            <span className="text-xs font-bold text-slate-500">
              {COPY.cartCount(cart.length)}
            </span>
          </div>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{COPY.cartEmpty}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cart.map((line) => (
                <li key={line.key}>
                  <SaleCartLineRow
                    line={line}
                    onDecrease={() => setQty(line.key, line.quantity - 1)}
                    onIncrease={() => setQty(line.key, line.quantity + 1)}
                    onRemove={() => setQty(line.key, 0)}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700">{COPY.totalLabel}</span>
            <span className="text-xl font-bold tabular-nums text-teal-700">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="w-full min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {COPY.checkout}
          </button>
        </section>
      </div>

      {/* 모바일 하단 플로팅 장바구니 바 */}
      <div className="md:hidden fixed left-0 right-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        {cart.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto px-4 pt-3 space-y-2 border-b border-slate-100">
            {cart.map((line) => (
              <div key={line.key}>
                <SaleCartLineRow
                  line={line}
                  compact
                  onDecrease={() => setQty(line.key, line.quantity - 1)}
                  onIncrease={() => setQty(line.key, line.quantity + 1)}
                  onRemove={() => setQty(line.key, 0)}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">
              {cart.length === 0 ? COPY.cartEmpty : COPY.cartCount(cart.length)}
            </p>
            <p className="text-lg font-bold tabular-nums text-slate-900 truncate">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="shrink-0 min-h-[48px] px-5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {COPY.checkout}
          </button>
        </div>
      </div>

      {/* 결제 모달 */}
      <SaleCheckoutModal
        isOpen={checkoutOpen}
        organizationId={orgId}
        lines={cart}
        onClose={() => setCheckoutOpen(false)}
        onCompleted={(amount, sale) => {
          showToast(COPY.saleDone(formatCurrency(amount)), 'success');
          if (sale) {
            setCompletedReceipt({
              id: sale.id,
              createdAt: sale.createdAt,
              totalAmount: sale.totalAmount,
              pointsUsed: sale.pointsUsed,
              paymentMethod: sale.paymentMethod,
              items: sale.items.map((i) => ({
                productNameSnapshot: i.productNameSnapshot,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discountAmount: i.discountAmount,
                lineAmount: i.lineAmount,
              })),
            });
          }
          setCart([]);
          setCheckoutOpen(false);
        }}
        onError={(message) => showToast(message, 'error')}
      />

      {/* [방식 B] 모바일/태블릿 카메라 바코드·QR 연속 스캔 모달 */}
      <SaleCameraScannerModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        catalog={catalog}
        cart={cart}
        onScanItem={addToCart}
        onUpdateQty={setQty}
        onRemoveItem={(key) => setQty(key, 0)}
      />

      {/* 결제 완료 시 영수증 즉시 출력 모달 */}
      <SaleReceiptPrintModal
        isOpen={Boolean(completedReceipt)}
        onClose={() => setCompletedReceipt(null)}
        receipt={completedReceipt}
      />
    </div>
  );
};
