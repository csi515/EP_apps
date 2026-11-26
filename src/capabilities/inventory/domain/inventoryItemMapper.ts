import type { InventoryItem, StockLotItem, WarehouseLocation } from './inventoryEngine';

type UnknownRecord = Record<string, unknown>;

function readNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function resolveWarehouseLocation(value: unknown): WarehouseLocation | undefined {
  if (value && typeof value === 'object') {
    const loc = value as UnknownRecord;
    const zoneId = readString(loc.zoneId ?? loc.zone_id, '');
    if (!zoneId) return undefined;
    return {
      zoneId,
      rackNo: readString(loc.rackNo ?? loc.rack_no, '-'),
      binNo: readString(loc.binNo ?? loc.bin_no, '-'),
    };
  }
  const locationText = readString(value, '');
  if (!locationText) return undefined;
  return { zoneId: locationText, rackNo: '-', binNo: '-' };
}

/** Refine/PostgREST 행 → UI InventoryItem (데모 필드명과 DB 필드명 모두 허용) */
export function mapInventoryItemFromApi(row: unknown): InventoryItem & { location?: WarehouseLocation } {
  const r = (row ?? {}) as UnknownRecord;
  const metadata = (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as UnknownRecord;

  const itemTypeRaw = r.itemType ?? r.item_type ?? metadata.itemType ?? metadata.item_type;
  const itemType =
    itemTypeRaw === 'textbook' || itemTypeRaw === 'consumable' || itemTypeRaw === 'goods'
      ? itemTypeRaw
      : undefined;

  const location = resolveWarehouseLocation(r.location);

  return {
    id: readString(r.id),
    name: readString(r.name),
    sku: readString(r.sku),
    barcode: r.barcode ? readString(r.barcode) : metadata.barcode ? readString(metadata.barcode) : undefined,
    itemType,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    currentStock: readNumber(r.currentStock ?? r.quantity, 0),
    safetyStock: readNumber(
      r.safetyStock ?? r.safety_stock ?? metadata.safetyStock ?? metadata.safety_stock,
      0
    ),
    unitPrice: readNumber(r.unitPrice ?? r.unit_cost ?? r.cost, 0),
    vendorId: r.vendorId ? readString(r.vendorId) : r.vendor_id ? readString(r.vendor_id) : undefined,
    vendorName: r.vendorName
      ? readString(r.vendorName)
      : r.vendor_name
        ? readString(r.vendor_name)
        : undefined,
    location,
  };
}

export function mapStockLotFromApi(row: unknown): StockLotItem {
  const r = (row ?? {}) as UnknownRecord;
  const expiry = r.expiryDate ?? r.expiry_date;
  return {
    id: readString(r.id),
    itemId: readString(r.itemId ?? r.item_id ?? r.product_id),
    lotNumber: readString(r.lotNumber ?? r.lot_number),
    expiryDate: expiry ? readString(expiry).slice(0, 10) : '',
    quantity: readNumber(r.quantity, 0),
    locationName: r.locationName
      ? readString(r.locationName)
      : r.location_name
        ? readString(r.location_name)
        : undefined,
  };
}