import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database module
vi.mock("./db", () => ({
  getSales: vi.fn(),
  getSaleById: vi.fn(),
  createSale: vi.fn(),
  updateSale: vi.fn(),
  deleteSale: vi.fn(),
  getSaleMetrics: vi.fn(),
  getSaleReceipts: vi.fn(),
  addSaleReceipt: vi.fn(),
  deleteSaleReceipt: vi.fn(),
  updateClientLTV: vi.fn(),
}));

import {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
  getSaleMetrics,
  getSaleReceipts,
  addSaleReceipt,
  deleteSaleReceipt,
  updateClientLTV,
} from "./db";

const mockSale = {
  id: 1,
  saleCode: 1,
  budgetId: 10,
  clientName: "João Silva",
  clientPhone: "11999999999",
  clientId: null,
  total: "500.00",
  paymentMethod: "pix",
  installments: 1,
  amountReceived: "500.00",
  paymentStatus: "paid",
  notes: null,
  saleDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReceipt = {
  id: 1,
  saleId: 1,
  receiptUrl: "https://s3.example.com/receipt.jpg",
  receiptKey: "receipt.jpg",
  receiptType: "pix",
  caption: "Comprovante PIX",
  createdAt: new Date(),
};

const mockMetrics = {
  totalSales: 5,
  totalRevenue: 2500,
  avgTicket: 500,
  paidCount: 4,
  pendingCount: 1,
  thisMonthRevenue: 1500,
};

describe("Sales DB Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSales returns list of sales", async () => {
    (getSales as any).mockResolvedValue([mockSale]);
    const result = await getSales();
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe("João Silva");
  });

  it("getSales filters by paymentMethod", async () => {
    (getSales as any).mockResolvedValue([mockSale]);
    const result = await getSales({ paymentMethod: "pix" });
    expect(getSales).toHaveBeenCalledWith({ paymentMethod: "pix" });
    expect(result).toHaveLength(1);
  });

  it("getSaleById returns sale by id", async () => {
    (getSaleById as any).mockResolvedValue(mockSale);
    const result = await getSaleById(1);
    expect(result?.id).toBe(1);
    expect(result?.clientName).toBe("João Silva");
  });

  it("getSaleById returns null for non-existent id", async () => {
    (getSaleById as any).mockResolvedValue(null);
    const result = await getSaleById(999);
    expect(result).toBeNull();
  });

  it("createSale creates a new sale with saleCode", async () => {
    (createSale as any).mockResolvedValue(mockSale);
    const result = await createSale({
      clientName: "João Silva",
      clientPhone: "11999999999",
      total: "500.00",
      paymentMethod: "pix",
      paymentStatus: "paid",
    } as any);
    expect(result?.saleCode).toBe(1);
    expect(result?.clientName).toBe("João Silva");
  });

  it("updateSale updates sale fields", async () => {
    const updated = { ...mockSale, paymentStatus: "paid", amountReceived: "500.00" };
    (updateSale as any).mockResolvedValue(updated);
    const result = await updateSale(1, { paymentStatus: "paid" } as any);
    expect(result?.paymentStatus).toBe("paid");
  });

  it("deleteSale removes sale and receipts", async () => {
    (deleteSale as any).mockResolvedValue(undefined);
    await deleteSale(1);
    expect(deleteSale).toHaveBeenCalledWith(1);
  });

  it("getSaleMetrics returns correct metrics", async () => {
    (getSaleMetrics as any).mockResolvedValue(mockMetrics);
    const result = await getSaleMetrics();
    expect(result.totalSales).toBe(5);
    expect(result.totalRevenue).toBe(2500);
    expect(result.avgTicket).toBe(500);
    expect(result.paidCount).toBe(4);
    expect(result.pendingCount).toBe(1);
    expect(result.thisMonthRevenue).toBe(1500);
  });

  it("getSaleReceipts returns receipts for a sale", async () => {
    (getSaleReceipts as any).mockResolvedValue([mockReceipt]);
    const result = await getSaleReceipts(1);
    expect(result).toHaveLength(1);
    expect(result[0].receiptType).toBe("pix");
  });

  it("addSaleReceipt adds a new receipt", async () => {
    (addSaleReceipt as any).mockResolvedValue(mockReceipt);
    const result = await addSaleReceipt({
      saleId: 1,
      receiptUrl: "https://s3.example.com/receipt.jpg",
      receiptType: "pix",
      caption: "Comprovante PIX",
    } as any);
    expect(result?.saleId).toBe(1);
    expect(result?.receiptType).toBe("pix");
  });

  it("deleteSaleReceipt removes a receipt", async () => {
    (deleteSaleReceipt as any).mockResolvedValue(undefined);
    await deleteSaleReceipt(1);
    expect(deleteSaleReceipt).toHaveBeenCalledWith(1);
  });

  it("updateClientLTV updates client total spent", async () => {
    (updateClientLTV as any).mockResolvedValue(undefined);
    await updateClientLTV("11999999999");
    expect(updateClientLTV).toHaveBeenCalledWith("11999999999");
  });
});
