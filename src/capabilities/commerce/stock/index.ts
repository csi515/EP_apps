export type {
  Inventory,
  InventoryStockRow,
  SaleStockDeductLine,
  StockAdjustmentInput,
  StockInboundInput,
  StockListOptions,
  StockMovement,
  StockMovementListQuery,
  StockMovementType,
  StockReturnReferenceType,
  StockReturnRestoreInput,
  StockSaleDeductInput,
  StockSaleReferenceType,
  StockShortfall,
  StockTransferInput,
} from './types';
export {
  INVENTORY_LOW_STOCK_THRESHOLD,
  STOCK_ADJUSTMENT_REASONS,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
  TEXTBOOK_SALE_MOVEMENT_REF,
} from './types';
export { inventoryService, callApplyStockMovement } from './inventoryService';
export { mapStockMovementRpcError } from './mapStockMovementRpcError';
export { stockSaleOps } from './stockSaleOps';
export { stockLocationService, type StockLocation } from './stockLocationService';
export {
  aggregateSaleStockLines,
  findStockShortfalls,
  saleStockAggKey,
} from './saleStockAggregate';
