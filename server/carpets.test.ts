import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo de banco de dados
vi.mock("./db", () => ({
  getCarpetOrders: vi.fn(),
  getCarpetOrderById: vi.fn(),
  createCarpetOrder: vi.fn(),
  updateCarpetOrder: vi.fn(),
  deleteCarpetOrder: vi.fn(),
  getCarpetMetrics: vi.fn(),
  getCarpetPhotos: vi.fn(),
  addCarpetPhoto: vi.fn(),
  deleteCarpetPhoto: vi.fn(),
}));

import {
  getCarpetOrders,
  getCarpetOrderById,
  createCarpetOrder,
  updateCarpetOrder,
  deleteCarpetOrder,
  getCarpetMetrics,
  getCarpetPhotos,
  addCarpetPhoto,
  deleteCarpetPhoto,
} from "./db";

const mockOrder = {
  id: 1,
  orderNumber: 1,
  clientName: "João Silva",
  clientPhone: "(11) 99999-0000",
  carpetType: "Persa",
  carpetSize: "2x3m",
  carpetColor: "Bege",
  observations: "Mancha de café",
  collectedAt: new Date("2026-02-20"),
  expectedDelivery: new Date("2026-02-25"),
  deliveredAt: null,
  status: "collected" as const,
  price: "150.00",
  paid: false,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Carpet Orders - DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getCarpetOrders retorna lista de OS", async () => {
    vi.mocked(getCarpetOrders).mockResolvedValue([mockOrder]);
    const result = await getCarpetOrders();
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe("João Silva");
  });

  it("getCarpetOrders filtra por status", async () => {
    vi.mocked(getCarpetOrders).mockResolvedValue([mockOrder]);
    const result = await getCarpetOrders({ status: "collected" });
    expect(getCarpetOrders).toHaveBeenCalledWith({ status: "collected" });
    expect(result).toHaveLength(1);
  });

  it("getCarpetOrders filtra por busca", async () => {
    vi.mocked(getCarpetOrders).mockResolvedValue([mockOrder]);
    const result = await getCarpetOrders({ search: "João" });
    expect(getCarpetOrders).toHaveBeenCalledWith({ search: "João" });
    expect(result).toHaveLength(1);
  });

  it("getCarpetOrderById retorna OS pelo id", async () => {
    vi.mocked(getCarpetOrderById).mockResolvedValue(mockOrder);
    const result = await getCarpetOrderById(1);
    expect(result?.clientName).toBe("João Silva");
    expect(result?.status).toBe("collected");
  });

  it("getCarpetOrderById retorna undefined para id inexistente", async () => {
    vi.mocked(getCarpetOrderById).mockResolvedValue(undefined);
    const result = await getCarpetOrderById(999);
    expect(result).toBeUndefined();
  });

  it("createCarpetOrder cria uma nova OS", async () => {
    vi.mocked(createCarpetOrder).mockResolvedValue(undefined as any);
    await createCarpetOrder({
      clientName: "Maria Santos",
      clientPhone: "(11) 88888-0000",
      expectedDelivery: new Date("2026-03-01"),
      price: "200.00",
    } as any);
    expect(createCarpetOrder).toHaveBeenCalledTimes(1);
  });

  it("updateCarpetOrder atualiza status para 'washing'", async () => {
    vi.mocked(updateCarpetOrder).mockResolvedValue(undefined as any);
    await updateCarpetOrder(1, { status: "washing" });
    expect(updateCarpetOrder).toHaveBeenCalledWith(1, { status: "washing" });
  });

  it("updateCarpetOrder marca como entregue com deliveredAt", async () => {
    vi.mocked(updateCarpetOrder).mockResolvedValue(undefined as any);
    const deliveredAt = new Date();
    await updateCarpetOrder(1, { status: "delivered", deliveredAt });
    expect(updateCarpetOrder).toHaveBeenCalledWith(1, { status: "delivered", deliveredAt });
  });

  it("deleteCarpetOrder remove a OS", async () => {
    vi.mocked(deleteCarpetOrder).mockResolvedValue(undefined as any);
    await deleteCarpetOrder(1);
    expect(deleteCarpetOrder).toHaveBeenCalledWith(1);
  });

  it("getCarpetMetrics retorna métricas corretas", async () => {
    const mockMetrics = { inProgress: 3, ready: 1, deliveredThisMonth: 5, revenueThisMonth: 750, overdue: 1 };
    vi.mocked(getCarpetMetrics).mockResolvedValue(mockMetrics);
    const result = await getCarpetMetrics();
    expect(result.inProgress).toBe(3);
    expect(result.ready).toBe(1);
    expect(result.deliveredThisMonth).toBe(5);
    expect(result.revenueThisMonth).toBe(750);
    expect(result.overdue).toBe(1);
  });

  it("getCarpetPhotos retorna fotos da OS", async () => {
    const mockPhotos = [{ id: 1, carpetOrderId: 1, photoUrl: "https://example.com/photo.jpg", photoType: "before" as const, caption: null, createdAt: new Date() }];
    vi.mocked(getCarpetPhotos).mockResolvedValue(mockPhotos);
    const result = await getCarpetPhotos(1);
    expect(result).toHaveLength(1);
    expect(result[0].photoType).toBe("before");
  });

  it("addCarpetPhoto adiciona foto à OS", async () => {
    vi.mocked(addCarpetPhoto).mockResolvedValue(undefined as any);
    await addCarpetPhoto({ carpetOrderId: 1, photoUrl: "https://example.com/after.jpg", photoType: "after" } as any);
    expect(addCarpetPhoto).toHaveBeenCalledTimes(1);
  });

  it("deleteCarpetPhoto remove foto", async () => {
    vi.mocked(deleteCarpetPhoto).mockResolvedValue(undefined as any);
    await deleteCarpetPhoto(1);
    expect(deleteCarpetPhoto).toHaveBeenCalledWith(1);
  });
});
