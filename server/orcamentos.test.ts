import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all db functions
vi.mock("./db", () => ({
  getServices: vi.fn().mockResolvedValue([
    { id: 1, name: "Higienização Sofá", price: "150.00", category: "Estofados", active: true, description: null, createdAt: new Date() }
  ]),
  getServiceById: vi.fn().mockResolvedValue({ id: 1, name: "Higienização Sofá", price: "150.00", category: "Estofados", active: true }),
  createService: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateService: vi.fn().mockResolvedValue([{}]),
  deleteService: vi.fn().mockResolvedValue([{}]),
  getClients: vi.fn().mockResolvedValue([
    { id: 1, name: "João Silva", phone: "11999999999", email: null, address: null, notes: null, createdAt: new Date() }
  ]),
  getClientById: vi.fn().mockResolvedValue({ id: 1, name: "João Silva", phone: "11999999999" }),
  createClient: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateClient: vi.fn().mockResolvedValue([{}]),
  deleteClient: vi.fn().mockResolvedValue([{}]),
  getBudgets: vi.fn().mockResolvedValue([
    { id: 1, clientId: 1, clientName: "João Silva", clientPhone: "11999999999", clientAddress: null, subtotal: "150.00", discountType: "fixed", discountValue: "0", total: "150.00", status: "pending", notes: null, videos: null, validDays: 7, paymentConditions: null, createdAt: new Date(), updatedAt: new Date() }
  ]),
  getBudgetById: vi.fn().mockResolvedValue({
    id: 1, clientId: 1, clientName: "João Silva", clientPhone: "11999999999", clientAddress: null, subtotal: "150.00", discountType: "fixed", discountValue: "0", total: "150.00", status: "pending", notes: null, videos: null, validDays: 7, paymentConditions: null, companyId: null, createdAt: new Date(), updatedAt: new Date()
  }),
  toggleBudgetSold: vi.fn().mockResolvedValue([{}]),
  getYesterdayUnsoldBudgets: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue([]),
  upsertSetting: vi.fn().mockResolvedValue([{}]),
  getCompetitors: vi.fn().mockResolvedValue([]),
  getCompetitorById: vi.fn().mockResolvedValue(null),
  createCompetitor: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateCompetitor: vi.fn().mockResolvedValue([{}]),
  deleteCompetitor: vi.fn().mockResolvedValue([{}]),
  getCriteria: vi.fn().mockResolvedValue([]),
  createCriteria: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateCriteria: vi.fn().mockResolvedValue([{}]),
  deleteCriteria: vi.fn().mockResolvedValue([{}]),
  getScores: vi.fn().mockResolvedValue([]),
  upsertScore: vi.fn().mockResolvedValue([{}]),
  getCompetitorServices: vi.fn().mockResolvedValue([]),
  createCompetitorService: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateCompetitorService: vi.fn().mockResolvedValue([{}]),
  deleteCompetitorService: vi.fn().mockResolvedValue([{}]),
  getServiceCategories: vi.fn().mockResolvedValue([]),
  createServiceCategory: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateServiceCategory: vi.fn().mockResolvedValue([{}]),
  deleteServiceCategory: vi.fn().mockResolvedValue([{}]),
  getCarpetOrders: vi.fn().mockResolvedValue([]),
  getCarpetOrderById: vi.fn().mockResolvedValue(null),
  createCarpetOrder: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateCarpetOrder: vi.fn().mockResolvedValue([{}]),
  deleteCarpetOrder: vi.fn().mockResolvedValue([{}]),
  getCarpetMetrics: vi.fn().mockResolvedValue({ total: 0, pending: 0, completed: 0 }),
  getCarpetPhotos: vi.fn().mockResolvedValue([]),
  addCarpetPhoto: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteCarpetPhoto: vi.fn().mockResolvedValue([{}]),
  getAllCarpetTags: vi.fn().mockResolvedValue([]),
  createCarpetTag: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteCarpetTag: vi.fn().mockResolvedValue([{}]),
  getTagsForOrder: vi.fn().mockResolvedValue([]),
  addTagToOrder: vi.fn().mockResolvedValue([{}]),
  removeTagFromOrder: vi.fn().mockResolvedValue([{}]),
  setTagsForOrder: vi.fn().mockResolvedValue([{}]),
  getOrderIdsByTag: vi.fn().mockResolvedValue([]),
  getSales: vi.fn().mockResolvedValue([]),
  getSaleById: vi.fn().mockResolvedValue(null),
  createSale: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateSale: vi.fn().mockResolvedValue([{}]),
  deleteSale: vi.fn().mockResolvedValue([{}]),
  getSaleMetrics: vi.fn().mockResolvedValue({ total: 0, count: 0 }),
  getSalesByClientId: vi.fn().mockResolvedValue([]),
  getSaleReceipts: vi.fn().mockResolvedValue([]),
  addSaleReceipt: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteSaleReceipt: vi.fn().mockResolvedValue([{}]),
  updateClientLTV: vi.fn().mockResolvedValue([{}]),
  getPendingSales: vi.fn().mockResolvedValue([]),
  deleteSaleByBudgetId: vi.fn().mockResolvedValue([{}]),
  getCarpetOrdersByPhone: vi.fn().mockResolvedValue([]),
  getClientMetrics: vi.fn().mockResolvedValue({ total: 0 }),
  getTopClients: vi.fn().mockResolvedValue([]),
  getClientPhotos: vi.fn().mockResolvedValue([]),
  addClientPhoto: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteClientPhoto: vi.fn().mockResolvedValue([{}]),
  getBudgetsByClient: vi.fn().mockResolvedValue([]),
  getUsers: vi.fn().mockResolvedValue([]),
  setUserRole: vi.fn().mockResolvedValue([{}]),
  getExecutionOrders: vi.fn().mockResolvedValue([]),
  getExecutionOrderById: vi.fn().mockResolvedValue(null),
  createExecutionOrder: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateExecutionOrder: vi.fn().mockResolvedValue([{}]),
  deleteExecutionOrder: vi.fn().mockResolvedValue([{}]),
  getExecutionMetrics: vi.fn().mockResolvedValue({ total: 0 }),
  getUpsellItems: vi.fn().mockResolvedValue([]),
  createUpsellItem: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteUpsellItem: vi.fn().mockResolvedValue([{}]),
  getExecutionServiceItems: vi.fn().mockResolvedValue([]),
  setExecutionServiceItems: vi.fn().mockResolvedValue([{}]),
  getServiceItemsTotalsByOrders: vi.fn().mockResolvedValue([]),
  getUpsellTotalsByOrders: vi.fn().mockResolvedValue([]),
  getPresetMessages: vi.fn().mockResolvedValue([]),
  createPresetMessage: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updatePresetMessage: vi.fn().mockResolvedValue([{}]),
  deletePresetMessage: vi.fn().mockResolvedValue([{}]),
  createAppNotification: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  getAppNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue([{}]),
  markAllNotificationsRead: vi.fn().mockResolvedValue([{}]),
  clearAllNotifications: vi.fn().mockResolvedValue([{}]),
  getExecutionPhotos: vi.fn().mockResolvedValue([]),
  addExecutionPhoto: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteExecutionPhoto: vi.fn().mockResolvedValue([{}]),
  getTeams: vi.fn().mockResolvedValue([]),
  getTeamById: vi.fn().mockResolvedValue(null),
  createTeam: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateTeam: vi.fn().mockResolvedValue([{}]),
  deleteTeam: vi.fn().mockResolvedValue([{}]),
  getTeamMembers: vi.fn().mockResolvedValue([]),
  getAllActiveMembers: vi.fn().mockResolvedValue([]),
  createTeamMember: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateTeamMember: vi.fn().mockResolvedValue([{}]),
  deleteTeamMember: vi.fn().mockResolvedValue([{}]),
  getExecutionCarpets: vi.fn().mockResolvedValue([]),
  getExecutionCarpetById: vi.fn().mockResolvedValue(null),
  createExecutionCarpet: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateExecutionCarpet: vi.fn().mockResolvedValue([{}]),
  deleteExecutionCarpet: vi.fn().mockResolvedValue([{}]),
  getExecutionCarpetPhotos: vi.fn().mockResolvedValue([]),
  addExecutionCarpetPhoto: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  deleteExecutionCarpetPhoto: vi.fn().mockResolvedValue([{}]),
  updateCarpetPhotoCaption: vi.fn().mockResolvedValue([{}]),
  getExecutionDashboardMetrics: vi.fn().mockResolvedValue({ total: 0 }),
  getWeeklyExecutionOrders: vi.fn().mockResolvedValue([]),
  getUpsellTotal: vi.fn().mockResolvedValue(0),
  getExecutionOrdersByClient: vi.fn().mockResolvedValue([]),
  getExecutionOrdersByPhone: vi.fn().mockResolvedValue([]),
  getClientHistoryForAI: vi.fn().mockResolvedValue([]),
  getInactiveClients: vi.fn().mockResolvedValue([]),
  getMostSoldServices: vi.fn().mockResolvedValue([]),
  setClientReactivation: vi.fn().mockResolvedValue([{}]),
  getTodayReactivationClients: vi.fn().mockResolvedValue([]),
  getAllReactivationClients: vi.fn().mockResolvedValue([]),
  removeClientReactivation: vi.fn().mockResolvedValue([{}]),
  getSystemMetrics: vi.fn().mockResolvedValue({ totalCompanies: 0, activeCompanies: 0 }),
  getCompanyStats: vi.fn().mockResolvedValue({}),
  updateCompanyCredential: vi.fn().mockResolvedValue([{}]),
  getBudgetItems: vi.fn().mockResolvedValue([
    { id: 1, budgetId: 1, serviceId: 1, name: "Higienização Sofá", description: null, quantity: 1, unitPrice: "150.00", subtotal: "150.00" }
  ]),
  createBudget: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateBudget: vi.fn().mockResolvedValue([{}]),
  deleteBudget: vi.fn().mockResolvedValue([{}]),
  addBudgetItem: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  updateBudgetItem: vi.fn().mockResolvedValue([{}]),
  deleteBudgetItem: vi.fn().mockResolvedValue([{}]),
  deleteAllBudgetItems: vi.fn().mockResolvedValue([{}]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

/**
 * Contexto de uma EMPRESA logada (login por e-mail/senha) — é o cenário real de
 * quem cadastra dados no sistema.
 *
 * Antes este contexto usava `loginMethod: "manus"` (dono do sistema), em que o
 * `companyId` é null. Criar registros nessa condição era justamente o bug que
 * gerou 15 clientes, 12 orçamentos e 4 vendas órfãos na produção — hoje é
 * bloqueado (ver migration 0021 e `exigirEmpresa` em routers.ts).
 */
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-company",
      email: "empresa@example.com",
      name: "Empresa Teste",
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

/** Contexto do DONO DO SISTEMA (OAuth), que não pertence a nenhuma empresa. */
function createOwnerContext(): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "test-owner",
      email: "dono@example.com",
      name: "Dono do Sistema",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("services router", () => {
  it("should list services", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.services.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
  });

  it("should create a service", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.services.create({
      name: "Higienização Sofá 2 Lugares",
      price: "120.00",
      category: "Estofados",
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("should update a service", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.services.update({ id: 1, name: "Higienização Sofá Atualizado" });
    expect(result.success).toBe(true);
  });

  it("should delete a service", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.services.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("clients router", () => {
  it("should list clients", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("phone");
  });

  it("should create a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.create({
      name: "Maria Santos",
      phone: "11988888888",
    });
    expect(result.success).toBe(true);
  });

  it("should update a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.update({ id: 1, name: "Maria Santos Atualizado" });
    expect(result.success).toBe(true);
  });
});

describe("budgets router", () => {
  it("should list budgets", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.budgets.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("clientName");
    expect(result[0]).toHaveProperty("total");
  });

  it("should get budget by id with items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.budgets.getById({ id: 1 });
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("clientName");
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result?.items)).toBe(true);
  });

  it("should create a budget with items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.budgets.create({
      clientId: 1,
      clientName: "João Silva",
      clientPhone: "11999999999",
      subtotal: "150.00",
      discountType: "fixed",
      discountValue: "0",
      total: "150.00",
      validDays: 7,
      items: [
        { name: "Higienização Sofá", quantity: 1, unitPrice: "150.00", subtotal: "150.00" }
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should update budget status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.budgets.updateStatus({ id: 1, status: "accepted" });
    expect(result.success).toBe(true);
  });

  it("should delete a budget", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.budgets.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("should duplicate a budget with all items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.budgets.duplicate({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});

/**
 * Proteção contra o bug que gerou registros órfãos na produção: o dono do
 * sistema (sem empresa na sessão) NÃO pode criar registros, porque eles
 * nasceriam sem companyId e ficariam invisíveis para todas as empresas.
 */
describe("proteção contra registro sem empresa", () => {
  it("dono do sistema NÃO cria cliente sem empresa", async () => {
    const caller = appRouter.createCaller(createOwnerContext());
    await expect(
      caller.clients.create({ name: "Cliente Órfão", phone: "11999999999" })
    ).rejects.toThrow(/empresa/i);
  });

  it("dono do sistema NÃO cria serviço sem empresa", async () => {
    const caller = appRouter.createCaller(createOwnerContext());
    await expect(
      caller.services.create({ name: "Serviço Órfão", price: "100.00", category: "Geral", active: true })
    ).rejects.toThrow(/empresa/i);
  });

  it("dono do sistema NÃO cria orçamento sem empresa", async () => {
    const caller = appRouter.createCaller(createOwnerContext());
    await expect(
      caller.budgets.create({
        clientName: "Cliente Órfão",
        clientPhone: "11999999999",
        clientAddress: "Rua Teste, 1",
        subtotal: "100.00",
        discountType: "fixed",
        discountValue: "0.00",
        total: "100.00",
        validDays: 7,
        items: [],
      } as any)
    ).rejects.toThrow(/empresa/i);
  });

  it("empresa logada CONSEGUE criar cliente (contraprova)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.create({ name: "Cliente Válido", phone: "11888888888" });
    expect(result.success).toBe(true);
  });
});
