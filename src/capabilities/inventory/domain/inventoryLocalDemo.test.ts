import assert from 'node:assert/strict';
import { isInventoryListQueryResolved } from './inventoryLocalDemo';
import { mapInventoryItemFromApi, mapStockLotFromApi } from './inventoryItemMapper';

function run() {
  assert.equal(isInventoryListQueryResolved({ isLoading: true }), false);
  assert.equal(isInventoryListQueryResolved({ isError: true, isFetched: true }), false);
  assert.equal(isInventoryListQueryResolved({ isFetched: true, data: { data: [] } }), true);

  const mapped = mapInventoryItemFromApi({
    id: 'a1',
    name: '현장 자재',
    sku: 'STD-01',
    quantity: 12,
    unit_cost: 1500,
    metadata: { safety_stock: 3, barcode: '8801234560012' },
    location: 'ZONE-A',
  });
  assert.equal(mapped.currentStock, 12);
  assert.equal(mapped.safetyStock, 3);
  assert.equal(mapped.unitPrice, 1500);
  assert.equal(mapped.barcode, '8801234560012');

  const lot = mapStockLotFromApi({
    id: 'l1',
    product_id: 'a1',
    lot_number: 'LOT-01',
    expiry_date: '2026-12-31',
    quantity: 5,
    location_name: 'RACK-1',
  });
  assert.equal(lot.itemId, 'a1');
  assert.equal(lot.lotNumber, 'LOT-01');
  assert.equal(lot.quantity, 5);

  console.log('inventoryLocalDemo.test.ts: ok');
}

run();