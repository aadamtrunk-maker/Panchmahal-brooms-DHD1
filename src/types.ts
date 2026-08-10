export interface SKU {
  id: number;
  srNo: number;
  name: string;
  packing: string;
  boxPacking: string;
  boxPrice: number;
  perPcCost: number;
  retailPrice: number;
}

export interface SaleItem {
  skuId: number;
  quantity: number;
}

export interface DailyLedger {
  id: string; // e.g. "2026-07-17"
  date: string;
  sales: {
    skuId: number;
    skuName: string;
    packing: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  notes?: string;
}
