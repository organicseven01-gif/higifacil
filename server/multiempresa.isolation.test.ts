/**
 * Teste de isolamento multiempresa (multi-tenant) contra banco REAL.
 *
 * Cria duas empresas fictícias (A e B) com dados próprios e verifica que
 * nenhuma consegue ler/alterar/apagar dados da outra através das funções de
 * acesso a dados usadas pelos routers.
 *
 * - Roda somente se DATABASE_URL estiver definida (senão os testes são
 *   marcados como skip, para não quebrar CI sem banco).
 * - Cria e remove os próprios dados. Não toca em nenhum dado pré-existente.
 * - Nunca deve ser apontado para o banco de produção.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getDb,
  rawExecute,
  getClientById,
  getClients,
  getBudgetById,
  getBudgets,
  getBudgetItems,
  updateBudget,
  deleteBudget,
  addBudgetItem,
  getSaleById,
  updateSale,
  deleteSale,
  getSales,
  getServiceById,
  getServices,
  getServiceCategories,
  getCarpetOrderById,
  getExecutionOrderById,
  getCriteria,
  createCriteria,
  updateCriteria,
  deleteCriteria,
  getScores,
  upsertScore,
  getAllCarpetTags,
  createCarpetTag,
  deleteCarpetTag,
  getCompetitors,
  createCompetitor,
} from "./db";
import { exigirBancoDeTeste } from "./test-guard";

// ⚠️ Este arquivo ESCREVE no banco (cria 2 empresas fictícias e apaga no fim).
// A trava impede execução acidental contra produção. Ver server/test-guard.ts.
const guarda = exigirBancoDeTeste();
const d = guarda.temBanco ? describe : describe.skip;

type Fixture = {
  companyId: number;
  clientId: number;
  budgetId: number;
  budgetItemId: number;
  saleId: number;
  serviceId: number;
  categoryId: number;
  carpetOrderId: number;
  executionOrderId: number;
};

async function criarFixture(sufixo: string): Promise<Fixture> {
  const stamp = `${Date.now().toString(36)}${sufixo}`;
  const [emp] = await rawExecute(
    `INSERT INTO companies (name, email, slug, plan, planType, subscriptionStatus, active, createdAt, updatedAt)
     VALUES (?, ?, ?, 'trial', 'solo', 'active', 1, NOW(), NOW())`,
    [`ISOTEST ${sufixo}`, `isotest.${stamp}@teste.local`, `isotest-${stamp}`]
  );
  const companyId = (emp as any).insertId;

  const [svc] = await rawExecute(
    `INSERT INTO services (name, price, category, active, companyId, createdAt, updatedAt)
     VALUES (?, '100.00', 'Higienização', 1, ?, NOW(), NOW())`,
    [`Servico ISOTEST ${sufixo}`, companyId]
  );
  const serviceId = (svc as any).insertId;

  const [cat] = await rawExecute(
    `INSERT INTO service_categories (name, companyId, createdAt, updatedAt)
     VALUES (?, ?, NOW(), NOW())`,
    [`Categoria ISOTEST ${sufixo}`, companyId]
  );
  const categoryId = (cat as any).insertId;

  const [cli] = await rawExecute(
    `INSERT INTO clients (name, phone, companyId, createdAt, updatedAt)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [`Cliente ISOTEST ${sufixo}`, `1190000${sufixo === "A" ? "0001" : "0002"}`, companyId]
  );
  const clientId = (cli as any).insertId;

  const [orc] = await rawExecute(
    `INSERT INTO budgets
       (budgetNumber, clientId, clientName, clientPhone, clientAddress, subtotal,
        discountType, discountValue, total, status, validDays, companyId, createdAt, updatedAt)
     VALUES (1, ?, ?, ?, 'Rua Teste, 1', '100.00', 'fixed', '0.00', '100.00', 'pending', 7, ?, NOW(), NOW())`,
    [clientId, `Cliente ISOTEST ${sufixo}`, `1190000${sufixo === "A" ? "0001" : "0002"}`, companyId]
  );
  const budgetId = (orc as any).insertId;

  const [item] = await rawExecute(
    `INSERT INTO budget_items (budgetId, serviceId, name, quantity, unitPrice, subtotal, createdAt)
     VALUES (?, ?, ?, 1, '100.00', '100.00', NOW())`,
    [budgetId, serviceId, `Item ISOTEST ${sufixo}`]
  );
  const budgetItemId = (item as any).insertId;

  const [venda] = await rawExecute(
    `INSERT INTO sales (saleCode, budgetId, clientName, clientPhone, clientId, total,
                        paymentMethod, paymentStatus, transactionType, saleDate, companyId, createdAt, updatedAt)
     VALUES (1, ?, ?, ?, ?, '100.00', 'pix', 'paid', 'receita', NOW(), ?, NOW(), NOW())`,
    [budgetId, `Cliente ISOTEST ${sufixo}`, `1190000${sufixo === "A" ? "0001" : "0002"}`, clientId, companyId]
  );
  const saleId = (venda as any).insertId;

  const [tapete] = await rawExecute(
    `INSERT INTO carpet_orders (orderNumber, clientName, clientPhone, price, status,
                               expectedDelivery, companyId, createdAt, updatedAt)
     VALUES (1, ?, ?, '100.00', 'collected', DATE_ADD(NOW(), INTERVAL 5 DAY), ?, NOW(), NOW())`,
    [`Cliente ISOTEST ${sufixo}`, `1190000${sufixo === "A" ? "0001" : "0002"}`, companyId]
  );
  const carpetOrderId = (tapete as any).insertId;

  const [os] = await rawExecute(
    `INSERT INTO execution_orders (orderNumber, clientName, clientPhone, serviceDescription,
                                   totalValue, scheduledDate, status, companyId, createdAt, updatedAt)
     VALUES (1, ?, ?, 'Servico ISOTEST', '100.00', '2026-01-01', 'pending', ?, NOW(), NOW())`,
    [`Cliente ISOTEST ${sufixo}`, `1190000${sufixo === "A" ? "0001" : "0002"}`, companyId]
  );
  const executionOrderId = (os as any).insertId;

  return { companyId, clientId, budgetId, budgetItemId, saleId, serviceId, categoryId, carpetOrderId, executionOrderId };
}

async function limparFixture(f: Fixture) {
  // Apaga por subconsulta (e não por id fixo) para não deixar resíduo caso o
  // teste tenha criado registros extras durante as verificações.
  await rawExecute(
    `DELETE FROM budget_items WHERE budgetId IN (SELECT id FROM budgets WHERE companyId = ?)`,
    [f.companyId]
  );
  await rawExecute(
    `DELETE FROM sale_receipts WHERE saleId IN (SELECT id FROM sales WHERE companyId = ?)`,
    [f.companyId]
  );
  await rawExecute(`DELETE FROM sales WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM budgets WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM execution_orders WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM carpet_orders WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM clients WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM service_categories WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM services WHERE companyId = ?`, [f.companyId]);
  // Tabelas isoladas pela migration 0020 (ordem: filho antes do pai)
  await rawExecute(`DELETE FROM carpet_order_tags WHERE tagId IN (SELECT id FROM carpet_tags WHERE companyId = ?)`, [f.companyId]);
  await rawExecute(`DELETE FROM carpet_tags WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM competitor_scores WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM competitor_criteria WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM competitor_services WHERE competitorId IN (SELECT id FROM competitors WHERE companyId = ?)`, [f.companyId]);
  await rawExecute(`DELETE FROM competitors WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM company_credentials WHERE companyId = ?`, [f.companyId]);
  await rawExecute(`DELETE FROM companies WHERE id = ?`, [f.companyId]);
}

d("Isolamento multiempresa", () => {
  let A: Fixture;
  let B: Fixture;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco não disponível — verifique DATABASE_URL");
    A = await criarFixture("A");
    B = await criarFixture("B");
  }, 60_000);

  afterAll(async () => {
    if (A) await limparFixture(A);
    if (B) await limparFixture(B);
  }, 60_000);

  // ─── Leitura ────────────────────────────────────────────────────────────────
  it("empresa A não lê cliente da empresa B", async () => {
    expect(await getClientById(B.clientId, A.companyId)).toBeUndefined();
    expect(await getClientById(A.clientId, A.companyId)).toBeDefined();
  });

  it("empresa A não lê orçamento da empresa B", async () => {
    expect(await getBudgetById(B.budgetId, A.companyId)).toBeUndefined();
    expect(await getBudgetById(A.budgetId, A.companyId)).toBeDefined();
  });

  it("empresa A não lê itens do orçamento da empresa B", async () => {
    expect(await getBudgetItems(B.budgetId, A.companyId)).toHaveLength(0);
    expect((await getBudgetItems(A.budgetId, A.companyId)).length).toBeGreaterThan(0);
  });

  it("empresa A não lê venda (financeiro) da empresa B", async () => {
    expect(await getSaleById(B.saleId, A.companyId)).toBeNull();
    expect(await getSaleById(A.saleId, A.companyId)).not.toBeNull();
  });

  it("empresa A não lê serviço da empresa B", async () => {
    expect(await getServiceById(B.serviceId, A.companyId)).toBeUndefined();
    expect(await getServiceById(A.serviceId, A.companyId)).toBeDefined();
  });

  it("empresa A não lê tapete da empresa B", async () => {
    expect(await getCarpetOrderById(B.carpetOrderId, A.companyId)).toBeUndefined();
    expect(await getCarpetOrderById(A.carpetOrderId, A.companyId)).toBeDefined();
  });

  it("empresa A não lê ordem de execução da empresa B", async () => {
    expect(await getExecutionOrderById(B.executionOrderId, A.companyId)).toBeNull();
    expect(await getExecutionOrderById(A.executionOrderId, A.companyId)).not.toBeNull();
  });

  // ─── Listagens não vazam ────────────────────────────────────────────────────
  it("listagens só retornam dados da própria empresa", async () => {
    const clientesA = await getClients(undefined, A.companyId);
    expect(clientesA.every((c: any) => c.companyId === A.companyId)).toBe(true);
    expect(clientesA.some((c: any) => c.id === B.clientId)).toBe(false);

    const orcamentosA = await getBudgets(undefined, undefined, A.companyId);
    expect(orcamentosA.every((b: any) => b.companyId === A.companyId)).toBe(true);

    const vendasA = await getSales(undefined, A.companyId);
    expect(vendasA.every((s: any) => s.companyId === A.companyId)).toBe(true);
    expect(vendasA.some((s: any) => s.id === B.saleId)).toBe(false);

    const servicosA = await getServices(undefined, A.companyId);
    expect(servicosA.some((s: any) => s.id === B.serviceId)).toBe(false);

    const categoriasA = await getServiceCategories(A.companyId);
    expect(categoriasA.some((c: any) => c.id === B.categoryId)).toBe(false);
  });

  // ─── Escrita / exclusão ─────────────────────────────────────────────────────
  it("empresa A não altera orçamento da empresa B", async () => {
    await updateBudget(B.budgetId, { clientName: "INVASAO" }, A.companyId);
    const orcamentoB = await getBudgetById(B.budgetId, B.companyId);
    expect(orcamentoB?.clientName).not.toBe("INVASAO");
  });

  it("empresa A não apaga orçamento da empresa B", async () => {
    await expect(deleteBudget(B.budgetId, A.companyId)).rejects.toThrow();
    expect(await getBudgetById(B.budgetId, B.companyId)).toBeDefined();
  });

  it("empresa A não adiciona item em orçamento da empresa B", async () => {
    await expect(
      addBudgetItem(
        { budgetId: B.budgetId, name: "INVASAO", quantity: 1, unitPrice: "1.00", subtotal: "1.00" } as any,
        A.companyId
      )
    ).rejects.toThrow();
    const itensB = await getBudgetItems(B.budgetId, B.companyId);
    expect(itensB.some((i: any) => i.name === "INVASAO")).toBe(false);
  });

  it("empresa A não altera venda da empresa B", async () => {
    await expect(updateSale(B.saleId, { total: "999.99" } as any, A.companyId)).rejects.toThrow();
    const vendaB = await getSaleById(B.saleId, B.companyId);
    expect(vendaB?.total).not.toBe("999.99");
  });

  it("empresa A não apaga venda da empresa B", async () => {
    await expect(deleteSale(B.saleId, A.companyId)).rejects.toThrow();
    expect(await getSaleById(B.saleId, B.companyId)).not.toBeNull();
  });

  // ─── Concorrentes / critérios / notas / etiquetas (migration 0020) ─────────
  // Estas 3 tabelas não tinham companyId e eram compartilhadas por todas as
  // empresas. Depois da migration 0020 têm companyId NOT NULL + FK.
  it("critérios de concorrente são isolados por empresa", async () => {
    await createCriteria({ name: "Critério ISOTEST A", type: "text" } as any, A.companyId);
    await createCriteria({ name: "Critério ISOTEST B", type: "text" } as any, B.companyId);

    const critA = await getCriteria(A.companyId);
    const critB = await getCriteria(B.companyId);

    expect(critA.every((c: any) => c.companyId === A.companyId)).toBe(true);
    expect(critA.some((c: any) => c.name === "Critério ISOTEST B")).toBe(false);
    expect(critB.some((c: any) => c.name === "Critério ISOTEST A")).toBe(false);
  });

  it("empresa A não altera nem apaga critério da empresa B", async () => {
    const critB = await getCriteria(B.companyId);
    const alvo = critB[0];
    expect(alvo).toBeDefined();

    await updateCriteria(alvo.id, { name: "INVASAO" } as any, A.companyId);
    const depois = await getCriteria(B.companyId);
    expect(depois.find((c: any) => c.id === alvo.id)?.name).not.toBe("INVASAO");

    await deleteCriteria(alvo.id, A.companyId);
    const aindaExiste = (await getCriteria(B.companyId)).some((c: any) => c.id === alvo.id);
    expect(aindaExiste).toBe(true);
  });

  it("notas de concorrente são isoladas e validam dono do concorrente", async () => {
    await createCompetitor({ name: "Concorrente ISOTEST A" } as any, A.companyId);
    await createCompetitor({ name: "Concorrente ISOTEST B" } as any, B.companyId);
    const compA = (await getCompetitors(A.companyId))[0];
    const compB = (await getCompetitors(B.companyId))[0];
    const critA = (await getCriteria(A.companyId))[0];
    expect(compA && compB && critA).toBeTruthy();

    // A pontua o próprio concorrente: permitido
    await upsertScore(compA.id, critA.id, "10", undefined, A.companyId);
    const notasA = await getScores(A.companyId);
    expect(notasA.some((s: any) => s.competitorId === compA.id)).toBe(true);

    // A tentando pontuar o concorrente de B: bloqueado
    await expect(
      upsertScore(compB.id, critA.id, "99", undefined, A.companyId)
    ).rejects.toThrow();

    // B não vê as notas de A
    const notasB = await getScores(B.companyId);
    expect(notasB.some((s: any) => s.competitorId === compA.id)).toBe(false);
  });

  it("etiquetas de tapete são isoladas por empresa", async () => {
    await createCarpetTag({ name: "Etiqueta ISOTEST A", category: "other" } as any, A.companyId);
    await createCarpetTag({ name: "Etiqueta ISOTEST B", category: "other" } as any, B.companyId);

    const tagsA = await getAllCarpetTags(A.companyId);
    const tagsB = await getAllCarpetTags(B.companyId);

    expect(tagsA.every((t: any) => t.companyId === A.companyId)).toBe(true);
    expect(tagsA.some((t: any) => t.name === "Etiqueta ISOTEST B")).toBe(false);
    expect(tagsB.some((t: any) => t.name === "Etiqueta ISOTEST A")).toBe(false);

    // A tentando apagar etiqueta de B: bloqueado
    const alvoB = tagsB[0];
    await expect(deleteCarpetTag(alvoB.id, A.companyId)).rejects.toThrow();
    expect((await getAllCarpetTags(B.companyId)).some((t: any) => t.id === alvoB.id)).toBe(true);
  });

  // ─── Simetria: B contra A ───────────────────────────────────────────────────
  it("empresa B também não acessa dados da empresa A (simetria)", async () => {
    expect(await getClientById(A.clientId, B.companyId)).toBeUndefined();
    expect(await getBudgetById(A.budgetId, B.companyId)).toBeUndefined();
    expect(await getSaleById(A.saleId, B.companyId)).toBeNull();
    expect(await getServiceById(A.serviceId, B.companyId)).toBeUndefined();
    await expect(deleteSale(A.saleId, B.companyId)).rejects.toThrow();
  });
});
