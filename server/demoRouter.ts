/**
 * demoRouter — Painel de demonstração exclusivo para demo@limpafacil.com.br
 * Permite zerar e popular dados fictícios por aba para fins de demonstração.
 */
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { eq, and } from "drizzle-orm";
import {
  clients, budgets, budgetItems, services, carpetOrders,
  executionOrders, sales, saleReceipts, executionPhotos,
  executionServiceItems, upsellItems, executionCarpets,
} from "../drizzle/schema";

const DEMO_EMAIL = "demo@limpafacil.com.br";

/** Middleware que garante que só a conta demo pode usar estas procedures */
const demoProcedure = protectedProcedure.use(({ ctx, next }) => {
  const email = ctx.user?.email;
  if (email !== DEMO_EMAIL) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à conta de demonstração." });
  }
  if (!ctx.companyId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Empresa não identificada." });
  }
  return next({ ctx: { ...ctx, companyId: ctx.companyId as number } });
});

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const DEMO_CLIENTS = [
  { name: "João Silva", phone: "11991110001", email: "joao.silva@email.com", city: "São Paulo", state: "SP", neighborhood: "Vila Mariana", street: "Rua das Flores", addressNumber: "123" },
  { name: "Maria Souza", phone: "11991110002", email: "maria.souza@email.com", city: "São Paulo", state: "SP", neighborhood: "Moema", street: "Av. Ibirapuera", addressNumber: "456" },
  { name: "Carlos Oliveira", phone: "11991110003", email: null, city: "Guarulhos", state: "SP", neighborhood: "Centro", street: "Rua Sete de Setembro", addressNumber: "789" },
  { name: "Ana Paula Costa", phone: "11991110004", email: "ana.costa@email.com", city: "São Paulo", state: "SP", neighborhood: "Pinheiros", street: "Rua dos Pinheiros", addressNumber: "321" },
  { name: "Roberto Ferreira", phone: "11991110005", email: null, city: "São Bernardo do Campo", state: "SP", neighborhood: "Rudge Ramos", street: "Av. Kennedy", addressNumber: "654" },
  { name: "Fernanda Lima", phone: "11991110006", email: "fernanda.lima@email.com", city: "São Paulo", state: "SP", neighborhood: "Tatuapé", street: "Rua Tuiuti", addressNumber: "987" },
  { name: "Marcos Almeida", phone: "11991110007", email: null, city: "Osasco", state: "SP", neighborhood: "Centro", street: "Rua Ângelo Flaquer", addressNumber: "147" },
  { name: "Patrícia Rocha", phone: "11991110008", email: "patricia.rocha@email.com", city: "São Paulo", state: "SP", neighborhood: "Lapa", street: "Rua Guaicurus", addressNumber: "258" },
];

const DEMO_SERVICES = [
  { name: "Limpeza de Sofá 2 Lugares", price: "180.00", category: "Sofá", description: "Limpeza completa com extratora e produtos especializados" },
  { name: "Limpeza de Sofá 3 Lugares", price: "220.00", category: "Sofá", description: "Limpeza completa com extratora e produtos especializados" },
  { name: "Limpeza de Sofá 4 Lugares", price: "280.00", category: "Sofá", description: "Limpeza completa com extratora e produtos especializados" },
  { name: "Limpeza de Colchão Solteiro", price: "150.00", category: "Colchão", description: "Higienização e sanitização completa" },
  { name: "Limpeza de Colchão Casal", price: "200.00", category: "Colchão", description: "Higienização e sanitização completa" },
  { name: "Limpeza de Colchão Queen", price: "240.00", category: "Colchão", description: "Higienização e sanitização completa" },
  { name: "Limpeza de Tapete até 2m²", price: "120.00", category: "Tapete", description: "Lavagem e secagem no local" },
  { name: "Limpeza de Tapete 2 a 4m²", price: "180.00", category: "Tapete", description: "Lavagem e secagem no local" },
  { name: "Limpeza de Cadeira", price: "80.00", category: "Cadeira", description: "Limpeza de cadeira estofada" },
  { name: "Limpeza de Poltrona", price: "130.00", category: "Poltrona", description: "Limpeza completa de poltrona" },
];

const DEMO_CARPET_ORDERS = [
  { clientName: "João Silva", clientPhone: "11991110001", carpetType: "Persa", carpetSize: "2x3m", carpetColor: "Vermelho e dourado", observations: "Mancha de vinho na borda", price: "180.00", status: "washing" as const, paid: false },
  { clientName: "Maria Souza", clientPhone: "11991110002", carpetType: "Felpudo", carpetSize: "1.5x2m", carpetColor: "Bege", observations: "Sem manchas, limpeza de rotina", price: "120.00", status: "ready" as const, paid: true },
  { clientName: "Carlos Oliveira", clientPhone: "11991110003", carpetType: "Sisal", carpetSize: "3x4m", carpetColor: "Natural", observations: "Muito sujo, precisa de tratamento extra", price: "280.00", status: "collected" as const, paid: false },
  { clientName: "Ana Paula Costa", clientPhone: "11991110004", carpetType: "Vinil", carpetSize: "2x2m", carpetColor: "Cinza", observations: "Manchas de gordura", price: "150.00", status: "delivered" as const, paid: true },
  { clientName: "Roberto Ferreira", clientPhone: "11991110005", carpetType: "Pelúcia", carpetSize: "1x1.5m", carpetColor: "Branco", observations: "Pelo de animal", price: "90.00", status: "washing" as const, paid: false },
];

export const demoRouter = router({
  /** Verifica se o usuário logado é a conta demo */
  isDemo: protectedProcedure.query(({ ctx }) => {
    return { isDemo: ctx.user?.email === DEMO_EMAIL };
  }),

  /** Zera todos os dados da empresa demo (clientes, orçamentos, serviços, tapetes, execuções) */
  clearAll: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;

    // Ordem: dependentes primeiro
    await db.delete(executionServiceItems).where(
      eq(executionServiceItems.executionOrderId,
        db.select({ id: executionOrders.id }).from(executionOrders).where(eq(executionOrders.companyId, cId)) as any
      )
    ).catch(() => {});

    // Deletar em ordem de dependência
    await db.execute(`DELETE esi FROM execution_service_items esi INNER JOIN execution_orders eo ON esi.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.execute(`DELETE ep FROM execution_photos ep INNER JOIN execution_orders eo ON ep.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.execute(`DELETE ui FROM upsell_items ui INNER JOIN execution_orders eo ON ui.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.execute(`DELETE ec FROM execution_carpets ec INNER JOIN execution_orders eo ON ec.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.delete(executionOrders).where(eq(executionOrders.companyId, cId));

    await db.execute(`DELETE sr FROM sale_receipts sr INNER JOIN sales s ON sr.saleId = s.id WHERE s.companyId = ${cId}`);
    await db.delete(sales).where(eq(sales.companyId, cId));

    await db.execute(`DELETE bi FROM budget_items bi INNER JOIN budgets b ON bi.budgetId = b.id WHERE b.companyId = ${cId}`);
    await db.delete(budgets).where(eq(budgets.companyId, cId));

    await db.execute(`DELETE cp FROM carpet_photos cp INNER JOIN carpet_orders co ON cp.carpetOrderId = co.id WHERE co.companyId = ${cId}`);
    await db.execute(`DELETE ci FROM carpet_items ci INNER JOIN carpet_orders co ON ci.carpetOrderId = co.id WHERE co.companyId = ${cId}`);
    await db.execute(`DELETE cot FROM carpet_order_tags cot INNER JOIN carpet_orders co ON cot.carpetOrderId = co.id WHERE co.companyId = ${cId}`);
    await db.delete(carpetOrders).where(eq(carpetOrders.companyId, cId));

    await db.execute(`DELETE cp FROM client_photos cp INNER JOIN clients c ON cp.clientId = c.id WHERE c.companyId = ${cId}`);
    await db.delete(clients).where(eq(clients.companyId, cId));

    await db.delete(services).where(eq(services.companyId, cId));

    return { success: true, message: "Todos os dados foram apagados. Sistema limpo como no primeiro acesso." };
  }),

  /** Zera apenas os serviços */
  clearServices: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    await db.delete(services).where(eq(services.companyId, ctx.companyId));
    return { success: true };
  }),

  /** Zera apenas os tapetes */
  clearCarpets: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    await db.execute(`DELETE cp FROM carpet_photos cp INNER JOIN carpet_orders co ON cp.carpetOrderId = co.id WHERE co.companyId = ${cId}`);
    await db.execute(`DELETE ci FROM carpet_items ci INNER JOIN carpet_orders co ON ci.carpetOrderId = co.id WHERE co.companyId = ${cId}`);
    await db.execute(`DELETE cot FROM carpet_order_tags cot INNER JOIN carpet_orders co ON cot.carpetOrderId = co.id WHERE co.companyId = ${cId}`);
    await db.delete(carpetOrders).where(eq(carpetOrders.companyId, cId));
    return { success: true };
  }),

  /** Zera apenas os clientes */
  clearClients: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    await db.execute(`DELETE cp FROM client_photos cp INNER JOIN clients c ON cp.clientId = c.id WHERE c.companyId = ${cId}`);
    await db.delete(clients).where(eq(clients.companyId, cId));
    return { success: true };
  }),

  /** Zera apenas os orçamentos */
  clearBudgets: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    await db.execute(`DELETE bi FROM budget_items bi INNER JOIN budgets b ON bi.budgetId = b.id WHERE b.companyId = ${cId}`);
    await db.delete(budgets).where(eq(budgets.companyId, cId));
    return { success: true };
  }),

  /** Zera apenas as execuções/serviços feitos */
  clearExecutions: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    await db.execute(`DELETE esi FROM execution_service_items esi INNER JOIN execution_orders eo ON esi.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.execute(`DELETE ep FROM execution_photos ep INNER JOIN execution_orders eo ON ep.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.execute(`DELETE ui FROM upsell_items ui INNER JOIN execution_orders eo ON ui.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.execute(`DELETE ec FROM execution_carpets ec INNER JOIN execution_orders eo ON ec.executionOrderId = eo.id WHERE eo.companyId = ${cId}`);
    await db.delete(executionOrders).where(eq(executionOrders.companyId, cId));
    return { success: true };
  }),

  /** Popula com dados fictícios realistas */
  populateAll: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    const now = Date.now();

    // 1. Inserir clientes
    const insertedClients: number[] = [];
    for (const c of DEMO_CLIENTS) {
      const [result] = await db.insert(clients).values({
        ...c,
        companyId: cId,
        createdAt: new Date(now - Math.random() * 60 * 24 * 60 * 60 * 1000), // últimos 60 dias
      });
      insertedClients.push((result as any).insertId);
    }

    // 2. Inserir serviços
    const insertedServices: { id: number; name: string; price: string }[] = [];
    let svcCode = 1;
    for (const s of DEMO_SERVICES) {
      const [result] = await db.insert(services).values({
        ...s,
        serviceCode: svcCode++,
        active: true,
        companyId: cId,
      });
      insertedServices.push({ id: (result as any).insertId, name: s.name, price: s.price });
    }

    // 3. Inserir orçamentos com itens
    const budgetStatuses: Array<"pending" | "sent" | "accepted" | "rejected"> = ["pending", "pending", "accepted", "accepted", "rejected", "pending", "accepted", "sent"];
    for (let i = 0; i < DEMO_CLIENTS.length; i++) {
      const client = DEMO_CLIENTS[i];
      const status = budgetStatuses[i] ?? "pending";
      const svc1 = insertedServices[i % insertedServices.length];
      const svc2 = insertedServices[(i + 2) % insertedServices.length];
      const subtotal = parseFloat(svc1.price) + parseFloat(svc2.price);

      const [bResult] = await db.insert(budgets).values({
        budgetNumber: i + 1,
        clientId: insertedClients[i] ?? null,
        clientName: client.name,
        clientPhone: client.phone,
        clientAddress: `${client.street}, ${client.addressNumber} - ${client.neighborhood}, ${client.city}/${client.state}`,
        subtotal: subtotal.toFixed(2),
        discountType: "fixed",
        discountValue: "0.00",
        total: subtotal.toFixed(2),
        status,
        sold: status === "accepted",
        soldAt: status === "accepted" ? new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        validDays: 7,
        companyId: cId,
        createdAt: new Date(now - (DEMO_CLIENTS.length - i) * 3 * 24 * 60 * 60 * 1000),
      });
      const budgetId = (bResult as any).insertId;

      await db.insert(budgetItems).values([
        { budgetId, serviceId: svc1.id, name: svc1.name, quantity: 1, unitPrice: svc1.price, subtotal: svc1.price },
        { budgetId, serviceId: svc2.id, name: svc2.name, quantity: 1, unitPrice: svc2.price, subtotal: svc2.price },
      ]);
    }

    // 4. Inserir tapetes
    const today = new Date();
    for (let i = 0; i < DEMO_CARPET_ORDERS.length; i++) {
      const co = DEMO_CARPET_ORDERS[i];
      const collected = new Date(now - (DEMO_CARPET_ORDERS.length - i) * 2 * 24 * 60 * 60 * 1000);
      const expected = new Date(collected.getTime() + 5 * 24 * 60 * 60 * 1000);
      await db.insert(carpetOrders).values({
        orderNumber: i + 1,
        ...co,
        collectedAt: collected,
        expectedDelivery: expected,
        deliveredAt: co.status === "delivered" ? new Date(expected.getTime() + 24 * 60 * 60 * 1000) : null,
        companyId: cId,
      });
    }

    // 5. Inserir execuções
    const execStatuses: Array<"pending" | "done" | "cancelled"> = ["done", "done", "pending", "pending", "done", "cancelled", "done", "pending"];
    for (let i = 0; i < DEMO_CLIENTS.length; i++) {
      const client = DEMO_CLIENTS[i];
      const status = execStatuses[i] ?? "pending";
      const svc = insertedServices[i % insertedServices.length];
      const scheduledDate = new Date(now - (DEMO_CLIENTS.length - i) * 4 * 24 * 60 * 60 * 1000);
      const dateStr = scheduledDate.toISOString().split("T")[0];
      await db.insert(executionOrders).values({
        orderNumber: i + 1,
        clientId: insertedClients[i] ?? null,
        clientName: client.name,
        clientPhone: client.phone,
        street: client.street,
        addressNumber: client.addressNumber,
        neighborhood: client.neighborhood,
        city: client.city,
        state: client.state,
        serviceDescription: svc.name,
        totalValue: svc.price,
        scheduledDate: dateStr,
        scheduledTime: "09:00",
        status,
        companyId: cId,
      });
    }

    return {
      success: true,
      message: `Sistema populado com ${DEMO_CLIENTS.length} clientes, ${DEMO_SERVICES.length} serviços, ${DEMO_CLIENTS.length} orçamentos, ${DEMO_CARPET_ORDERS.length} tapetes e ${DEMO_CLIENTS.length} execuções.`,
    };
  }),

  /** Popula apenas clientes */
  populateClients: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    const now = Date.now();
    for (const c of DEMO_CLIENTS) {
      await db.insert(clients).values({
        ...c,
        companyId: cId,
        createdAt: new Date(now - Math.random() * 60 * 24 * 60 * 60 * 1000),
      });
    }
    return { success: true, count: DEMO_CLIENTS.length };
  }),

  /** Popula apenas serviços */
  populateServices: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    let svcCode = 1;
    for (const s of DEMO_SERVICES) {
      await db.insert(services).values({ ...s, serviceCode: svcCode++, active: true, companyId: cId });
    }
    return { success: true, count: DEMO_SERVICES.length };
  }),

  /** Popula apenas tapetes */
  populateCarpets: demoProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const cId = ctx.companyId;
    const now = Date.now();
    for (let i = 0; i < DEMO_CARPET_ORDERS.length; i++) {
      const co = DEMO_CARPET_ORDERS[i];
      const collected = new Date(now - (DEMO_CARPET_ORDERS.length - i) * 2 * 24 * 60 * 60 * 1000);
      const expected = new Date(collected.getTime() + 5 * 24 * 60 * 60 * 1000);
      await db.insert(carpetOrders).values({
        orderNumber: i + 1,
        ...co,
        collectedAt: collected,
        expectedDelivery: expected,
        deliveredAt: co.status === "delivered" ? new Date(expected.getTime() + 24 * 60 * 60 * 1000) : null,
        companyId: cId,
      });
    }
    return { success: true, count: DEMO_CARPET_ORDERS.length };
  }),
});
