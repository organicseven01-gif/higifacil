import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module to avoid real DB connections in tests
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getClients: vi.fn().mockResolvedValue([
      {
        id: 1, name: "João Silva", phone: "11999990000", email: "joao@test.com",
        cep: "01310-100", street: "Av. Paulista", addressNumber: "1000",
        complement: "Apto 12", neighborhood: "Bela Vista", city: "São Paulo", state: "SP",
        notes: "Cliente VIP", photos: null,
        createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01"),
      },
    ]),
    getClientById: vi.fn().mockResolvedValue({
      id: 1, name: "João Silva", phone: "11999990000", email: "joao@test.com",
      cep: null, street: null, addressNumber: null, complement: null,
      neighborhood: null, city: null, state: null, notes: null, photos: null,
      createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01"),
    }),
    createClient: vi.fn().mockResolvedValue({ insertId: 2 }),
    updateClient: vi.fn().mockResolvedValue(undefined),
    deleteClient: vi.fn().mockResolvedValue(undefined),
    getClientMetrics: vi.fn().mockResolvedValue({ total: 5, newThisMonth: 2, totalRevenue: 1500.0, avgTicket: 300.0 }),
    getTopClients: vi.fn().mockResolvedValue([
      { clientId: 1, clientName: "João Silva", clientPhone: "11999990000", totalRevenue: 800, budgetCount: 2 },
    ]),
    getClientPhotos: vi.fn().mockResolvedValue([]),
    addClientPhoto: vi.fn().mockResolvedValue({ insertId: 1 }),
    deleteClientPhoto: vi.fn().mockResolvedValue(undefined),
  };
});

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      // Simula um master de empresa (company_email login) com role admin
      loginMethod: "company_email",
      role: "admin",
      companyId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("clients.list", () => {
  it("returns a list of clients", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name", "João Silva");
    expect(result[0]).toHaveProperty("phone", "11999990000");
  });
});

describe("clients.metrics", () => {
  it("returns client metrics", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.metrics();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("newThisMonth");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("avgTicket");
    expect(result.total).toBe(5);
    expect(result.newThisMonth).toBe(2);
  });
});

describe("clients.topClients", () => {
  it("returns top clients by revenue", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.topClients();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("clientName", "João Silva");
    expect(result[0]).toHaveProperty("totalRevenue", 800);
  });
});

describe("clients.create", () => {
  it("creates a client with full address", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.create({
      name: "Maria Souza",
      phone: "11988880000",
      email: "maria@test.com",
      cep: "04538-133",
      street: "Rua das Flores",
      addressNumber: "42",
      complement: "Casa",
      neighborhood: "Itaim Bibi",
      city: "São Paulo",
      state: "SP",
      notes: "Prefere contato por WhatsApp",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("creates a client with minimal data", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.create({
      name: "Pedro Costa",
      phone: "11977770000",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("rejects creation without name", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.clients.create({ name: "", phone: "11977770000" })
    ).rejects.toThrow();
  });
});

describe("clients.update", () => {
  it("updates a client", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.update({
      id: 1,
      name: "João Silva Atualizado",
      city: "Campinas",
      state: "SP",
    });
    expect(result).toEqual({ success: true });
  });
});

describe("clients.delete", () => {
  it("deletes a client", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("clients.getPhotos", () => {
  it("returns photos for a client", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.getPhotos({ clientId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("clients.addPhoto", () => {
  it("adds a photo to a client", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.addPhoto({
      clientId: 1,
      furnitureType: "Sofá 3 lugares",
      photoUrl: "https://example.com/sofa.jpg",
    });
    expect(result).toEqual({ success: true });
  });
});

describe("clients.deletePhoto", () => {
  it("deletes a client photo", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.deletePhoto({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});
