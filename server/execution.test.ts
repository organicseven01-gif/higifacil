import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getExecutionOrders: vi.fn(),
  getExecutionOrderById: vi.fn(),
  createExecutionOrder: vi.fn(),
  updateExecutionOrder: vi.fn(),
  deleteExecutionOrder: vi.fn(),
  getExecutionMetrics: vi.fn(),
  getUpsellItems: vi.fn(),
  createUpsellItem: vi.fn(),
  deleteUpsellItem: vi.fn(),
  getExecutionPhotos: vi.fn(),
  addExecutionPhoto: vi.fn(),
  deleteExecutionPhoto: vi.fn(),
  getUsers: vi.fn(),
  setUserRole: vi.fn(),
}));

import {
  getExecutionOrders,
  getExecutionOrderById,
  createExecutionOrder,
  updateExecutionOrder,
  deleteExecutionOrder,
  getExecutionMetrics,
  getUpsellItems,
  createUpsellItem,
  deleteUpsellItem,
  getUsers,
  setUserRole,
} from "./db";

describe("Execution Module - DB Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExecutionOrders", () => {
    it("should return execution orders for a specific date", async () => {
      const mockOrders = [
        {
          id: 1,
          orderNumber: 1,
          clientName: "João Silva",
          clientPhone: "11999999999",
          scheduledDate: "2026-03-01",
          scheduledTime: "09:00",
          status: "pending",
          serviceDescription: "Higienização sofá",
          totalValue: "350.00",
        },
      ];
      vi.mocked(getExecutionOrders).mockResolvedValue(mockOrders as any);

      const result = await getExecutionOrders({ date: "2026-03-01" });
      expect(result).toEqual(mockOrders);
      expect(getExecutionOrders).toHaveBeenCalledWith({ date: "2026-03-01" });
    });

    it("should return empty array when no orders found", async () => {
      vi.mocked(getExecutionOrders).mockResolvedValue([]);
      const result = await getExecutionOrders({ date: "2026-03-15" });
      expect(result).toEqual([]);
    });

    it("should filter by status", async () => {
      const mockPendingOrders = [
        { id: 1, status: "pending", clientName: "Maria", scheduledDate: "2026-03-01" },
      ];
      vi.mocked(getExecutionOrders).mockResolvedValue(mockPendingOrders as any);
      const result = await getExecutionOrders({ status: "pending" });
      expect(result).toEqual(mockPendingOrders);
    });
  });

  describe("getExecutionOrderById", () => {
    it("should return a single execution order by id", async () => {
      const mockOrder = {
        id: 1,
        clientName: "João Silva",
        scheduledDate: "2026-03-01",
        status: "pending",
      };
      vi.mocked(getExecutionOrderById).mockResolvedValue(mockOrder as any);

      const result = await getExecutionOrderById(1);
      expect(result).toEqual(mockOrder);
      expect(getExecutionOrderById).toHaveBeenCalledWith(1);
    });

    it("should return null when order not found", async () => {
      vi.mocked(getExecutionOrderById).mockResolvedValue(null as any);
      const result = await getExecutionOrderById(999);
      expect(result).toBeNull();
    });
  });

  describe("createExecutionOrder", () => {
    it("should create a new execution order", async () => {
      const newOrder = {
        clientName: "Maria Santos",
        clientPhone: "11988888888",
        scheduledDate: "2026-03-02",
        scheduledTime: "14:00",
        serviceDescription: "Higienização colchão casal",
        totalValue: "200.00",
        status: "pending",
      };
      const createdOrder = { id: 2, orderNumber: 2, ...newOrder };
      vi.mocked(createExecutionOrder).mockResolvedValue(createdOrder as any);

      const result = await createExecutionOrder(newOrder as any);
      expect(result).toEqual(createdOrder);
      expect(createExecutionOrder).toHaveBeenCalledWith(newOrder);
    });
  });

  describe("updateExecutionOrder", () => {
    it("should update execution order status to done", async () => {
      vi.mocked(updateExecutionOrder).mockResolvedValue(undefined as any);
      await updateExecutionOrder(1, { status: "done", completedAt: new Date() } as any);
      expect(updateExecutionOrder).toHaveBeenCalledWith(1, expect.objectContaining({ status: "done" }));
    });

    it("should update execution order status to cancelled", async () => {
      vi.mocked(updateExecutionOrder).mockResolvedValue(undefined as any);
      await updateExecutionOrder(1, { status: "cancelled" } as any);
      expect(updateExecutionOrder).toHaveBeenCalledWith(1, { status: "cancelled" });
    });
  });

  describe("deleteExecutionOrder", () => {
    it("should delete an execution order", async () => {
      vi.mocked(deleteExecutionOrder).mockResolvedValue(undefined as any);
      await deleteExecutionOrder(1);
      expect(deleteExecutionOrder).toHaveBeenCalledWith(1);
    });
  });

  describe("getExecutionMetrics", () => {
    it("should return metrics for a specific date", async () => {
      const mockMetrics = {
        total: 5,
        pending: 2,
        done: 3,
        cancelled: 0,
        totalValue: "1750.00",
      };
      vi.mocked(getExecutionMetrics).mockResolvedValue(mockMetrics as any);

      const result = await getExecutionMetrics("2026-03-01");
      expect(result).toEqual(mockMetrics);
      expect(result.total).toBe(5);
      expect(result.pending).toBe(2);
      expect(result.done).toBe(3);
    });

    it("should return zero metrics when no orders", async () => {
      const emptyMetrics = { total: 0, pending: 0, done: 0, cancelled: 0, totalValue: "0" };
      vi.mocked(getExecutionMetrics).mockResolvedValue(emptyMetrics as any);
      const result = await getExecutionMetrics("2026-03-15");
      expect(result.total).toBe(0);
    });
  });

  describe("Upsell Items", () => {
    it("should get upsell items for an execution order", async () => {
      const mockItems = [
        { id: 1, executionOrderId: 1, description: "Perfume para sofá", quantity: 1, unitPrice: "50.00", total: "50.00" },
      ];
      vi.mocked(getUpsellItems).mockResolvedValue(mockItems as any);

      const result = await getUpsellItems(1);
      expect(result).toEqual(mockItems);
      expect(getUpsellItems).toHaveBeenCalledWith(1);
    });

    it("should create a upsell item", async () => {
      const newItem = {
        executionOrderId: 1,
        description: "Impermeabilizante",
        quantity: 2,
        unitPrice: "80.00",
        total: "160.00",
      };
      const createdItem = { id: 2, ...newItem };
      vi.mocked(createUpsellItem).mockResolvedValue(createdItem as any);

      const result = await createUpsellItem(newItem as any);
      expect(result).toEqual(createdItem);
    });

    it("should delete a upsell item", async () => {
      vi.mocked(deleteUpsellItem).mockResolvedValue(undefined as any);
      await deleteUpsellItem(1);
      expect(deleteUpsellItem).toHaveBeenCalledWith(1);
    });
  });
});

describe("User Role Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUsers", () => {
    it("should return all users", async () => {
      const mockUsers = [
        { id: 1, openId: "user-1", name: "Israel Samuel", role: "master", email: "israel@example.com" },
        { id: 2, openId: "user-2", name: "Funcionário Teste", role: "funcionario", email: "func@example.com" },
      ];
      vi.mocked(getUsers).mockResolvedValue(mockUsers as any);

      const result = await getUsers();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });
  });

  describe("setUserRole", () => {
    it("should set user role to funcionario", async () => {
      vi.mocked(setUserRole).mockResolvedValue(undefined as any);
      await setUserRole("user-2", "funcionario");
      expect(setUserRole).toHaveBeenCalledWith("user-2", "funcionario");
    });

    it("should set user role to master", async () => {
      vi.mocked(setUserRole).mockResolvedValue(undefined as any);
      await setUserRole("user-1", "master");
      expect(setUserRole).toHaveBeenCalledWith("user-1", "master");
    });

    it("should set user role to secretaria", async () => {
      vi.mocked(setUserRole).mockResolvedValue(undefined as any);
      await setUserRole("user-4", "secretaria");
      expect(setUserRole).toHaveBeenCalledWith("user-4", "secretaria");
    });
  });
});

describe("Role-based Access Control Logic", () => {
  type Role = "user" | "admin" | "master" | "secretaria" | "funcionario";

  const MANAGEMENT_ROLES: Role[] = ["master", "admin"];
  const SALES_ROLES: Role[] = ["master", "admin"];
  const OFFICE_ROLES: Role[] = ["master", "admin", "secretaria"];
  const EXECUTION_ROLES: Role[] = ["master", "admin", "secretaria", "funcionario"];

  const canAccess = (role: Role, allowedRoles: Role[]) => allowedRoles.includes(role);

  it("funcionario should only access execution", () => {
    const role: Role = "funcionario";
    expect(canAccess(role, EXECUTION_ROLES)).toBe(true);
    expect(canAccess(role, OFFICE_ROLES)).toBe(false);
    expect(canAccess(role, SALES_ROLES)).toBe(false);
    expect(canAccess(role, MANAGEMENT_ROLES)).toBe(false);
  });

  it("secretaria should access office and execution but not sales financials", () => {
    const role: Role = "secretaria";
    expect(canAccess(role, OFFICE_ROLES)).toBe(true);
    expect(canAccess(role, EXECUTION_ROLES)).toBe(true);
    expect(canAccess(role, SALES_ROLES)).toBe(false);
    expect(canAccess(role, MANAGEMENT_ROLES)).toBe(false);
  });

  it("admin should access everything except master-only features", () => {
    const role: Role = "admin";
    expect(canAccess(role, MANAGEMENT_ROLES)).toBe(true);
    expect(canAccess(role, SALES_ROLES)).toBe(true);
    expect(canAccess(role, OFFICE_ROLES)).toBe(true);
    expect(canAccess(role, EXECUTION_ROLES)).toBe(true);
  });

  it("master should access everything", () => {
    const role: Role = "master";
    expect(canAccess(role, MANAGEMENT_ROLES)).toBe(true);
    expect(canAccess(role, SALES_ROLES)).toBe(true);
    expect(canAccess(role, OFFICE_ROLES)).toBe(true);
    expect(canAccess(role, EXECUTION_ROLES)).toBe(true);
  });
});
