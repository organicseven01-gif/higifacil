import { eq, desc, like, and, or, sql, gte, lte, isNotNull, isNull } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, companies, services, clients, clientPhotos, budgets, budgetItems, settings, competitors, competitorCriteria, competitorScores, competitorServices, serviceCategories, carpetOrders, carpetPhotos, carpetTags, carpetOrderTags, carpetItems, sales, saleReceipts, executionOrders, upsellItems, executionPhotos, teams, teamMembers, executionCarpets, executionCarpetPhotos, InsertService, InsertClient, InsertClientPhoto, InsertBudget, InsertBudgetItem, InsertCompetitor, InsertCompetitorCriteria, InsertCompetitorScore, InsertCompetitorService, InsertServiceCategory, InsertCarpetOrder, InsertCarpetPhoto, InsertCarpetTag, InsertCarpetOrderTag, InsertCarpetItem, InsertSale, InsertSaleReceipt, InsertExecutionOrder, InsertUpsellItem, InsertExecutionPhoto, InsertTeam, InsertTeamMember, InsertExecutionCarpet, InsertExecutionCarpetPhoto, serviceReviews, InsertServiceReview, cancelledOrders, InsertCancelledOrder, executionServiceItems, InsertExecutionServiceItem, presetMessages, InsertPresetMessage, companyUsers, InsertCompanyUser } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: MySql2Database | null = null;
let _pool: mysql.Pool | null = null;

/**
 * TiDB Cloud (Serverless e Dedicated) exige conexão TLS. O mysql2 só ativa
 * TLS se receber a opção `ssl` — passar a URL crua não basta, e o erro que
 * aparece sem isso ("connections using insecure transport are prohibited")
 * não é óbvio. Por isso, se a URL aponta para o TiDB Cloud (ou traz
 * `sslaccept=strict` / `ssl-mode=REQUIRED`) e não define `ssl` explicitamente,
 * habilitamos TLS usando os certificados raiz do próprio sistema.
 */
function shouldForceTls(url: string): boolean {
  if (/[?&]ssl=/.test(url)) return false; // já configurado explicitamente na URL
  return (
    url.includes("tidbcloud.com") ||
    /sslaccept=strict/i.test(url) ||
    /ssl-mode=REQUIRED/i.test(url)
  );
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = process.env.DATABASE_URL;
      // Use explicit mysql2 pool to avoid prepared statement issues with TiDB
      const pool = mysql.createPool({
        uri: url,
        waitForConnections: true,
        connectionLimit: 10,
        enableKeepAlive: true,
        ...(shouldForceTls(url)
          ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
          : {}),
      });
      _pool = pool;
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

/**
 * Executa SQL "cru" com placeholders posicionais (?) e um array de valores —
 * o `db.execute()` do Drizzle não aceita um segundo argumento de parâmetros
 * (só uma string ou SQLWrapper), então usamos o pool mysql2 diretamente para
 * as poucas queries que ainda são montadas manualmente. Mantém o mesmo
 * formato de retorno `[rows, fields]` do mysql2.
 */
export async function rawExecute(query: string, params?: any[]) {
  await getDb();
  if (!_pool) throw new Error("Database not available");
  return _pool.execute(query, params);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== SERVICES ====================

export async function getServices(search?: string, category?: string, activeOnly?: boolean, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (companyId) conditions.push(eq(services.companyId, companyId));
  if (search) {
    // Busca por nome OU por código numérico (ex: "1", "001", "5")
    const codeNum = parseInt(search.replace(/^#/, ''), 10);
    if (!isNaN(codeNum)) {
      conditions.push(or(like(services.name, `%${search}%`), eq(services.serviceCode, codeNum))!);
    } else {
      conditions.push(like(services.name, `%${search}%`));
    }
  }
  if (category) conditions.push(eq(services.category, category));
  if (activeOnly) conditions.push(eq(services.active, true));
  const query = db.select().from(services).orderBy(services.serviceCode);
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function getServiceById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conds: any[] = [eq(services.id, id)];
  if (companyId) conds.push(eq(services.companyId, companyId));
  const result = await db.select().from(services).where(and(...conds)).limit(1);
  return result[0];
}

export async function createService(data: Omit<InsertService, "companyId">, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Gera serviceCode sequencial por empresa
  const cond = companyId ? eq(services.companyId, companyId) : undefined;
  const maxResult = await db.select({ maxCode: sql<number>`MAX(serviceCode)` }).from(services).where(cond);
  const nextCode = (maxResult[0]?.maxCode ?? 0) + 1;
  const result = await db.insert(services).values({ ...data, serviceCode: nextCode, companyId });
  return result;
}

export async function updateService(id: number, data: Partial<InsertService>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(services.id, id)];
  if (companyId) conds.push(eq(services.companyId, companyId));
  await db.update(services).set(data).where(and(...conds));
}

export async function deleteService(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(services.id, id)];
  if (companyId) conds.push(eq(services.companyId, companyId));
  await db.delete(services).where(and(...conds));
}

// ==================== CLIENTS ====================

export async function getClients(search?: string, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const baseConditions: any[] = [];
  if (companyId) baseConditions.push(eq(clients.companyId, companyId));
  if (search) {
    const searchCond = or(
      like(clients.name, `%${search}%`),
      like(clients.phone, `%${search}%`),
      like(clients.email, `%${search}%`)
    )!;
    baseConditions.push(searchCond);
  }
  const query = db.select().from(clients).orderBy(desc(clients.createdAt));
  if (baseConditions.length > 0) return query.where(and(...baseConditions));
  return query;
}

export async function getClientMetrics(companyId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, newThisMonth: 0, totalRevenue: 0, avgTicket: 0 };
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const clientCond = companyId ? and(gte(clients.createdAt, firstOfMonth), eq(clients.companyId, companyId)) : gte(clients.createdAt, firstOfMonth);
  const budgetCond = companyId ? and(eq(budgets.status, 'accepted'), eq(budgets.companyId, companyId)) : eq(budgets.status, 'accepted');
  const [totalRows, newRows, revenueRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(clients).where(companyId ? eq(clients.companyId, companyId) : undefined),
    db.select({ count: sql<number>`count(*)` }).from(clients).where(clientCond),
    db.select({
      total: sql<string>`COALESCE(SUM(${budgets.total}), 0)`,
      count: sql<number>`COUNT(DISTINCT ${budgets.clientPhone})`,
    }).from(budgets).where(budgetCond),
  ]);
  const total = Number(totalRows[0]?.count ?? 0);
  const newThisMonth = Number(newRows[0]?.count ?? 0);
  const totalRevenue = parseFloat(String(revenueRows[0]?.total ?? '0'));
  const clientsWithRevenue = Number(revenueRows[0]?.count ?? 0);
  const avgTicket = clientsWithRevenue > 0 ? totalRevenue / clientsWithRevenue : 0;
  return { total, newThisMonth, totalRevenue, avgTicket };
}

export async function getTopClients(limit = 10, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const cond = companyId ? and(eq(budgets.status, 'accepted'), eq(budgets.companyId, companyId)) : eq(budgets.status, 'accepted');
  const result = await db.select({
    clientPhone: budgets.clientPhone,
    clientName: budgets.clientName,
    totalRevenue: sql<string>`SUM(${budgets.total})`,
    budgetCount: sql<number>`COUNT(${budgets.id})`,
  })
    .from(budgets)
    .where(cond)
    .groupBy(budgets.clientPhone, budgets.clientName)
    .orderBy(desc(sql`SUM(${budgets.total})`))
    .limit(limit);
  return result.map(r => ({
    ...r,
    totalRevenue: parseFloat(String(r.totalRevenue ?? '0')),
  }));
}

export async function getClientPhotos(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientPhotos).where(eq(clientPhotos.clientId, clientId)).orderBy(desc(clientPhotos.createdAt));
}

export async function addClientPhoto(data: InsertClientPhoto) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(clientPhotos).values(data);
  return result;
}

export async function deleteClientPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(clientPhotos).where(eq(clientPhotos.id, id));
}

export async function getBudgetsByClient(clientPhone: string, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Normaliza o telefone removendo não-dígitos para busca mais ampla
  const digits = clientPhone.replace(/\D/g, '');
  const conds: any[] = [like(budgets.clientPhone, `%${digits.slice(-8)}%`)];
  if (companyId) conds.push(eq(budgets.companyId, companyId));
  return db.select({
    id: budgets.id,
    budgetNumber: budgets.budgetNumber,
    clientName: budgets.clientName,
    clientPhone: budgets.clientPhone,
    total: budgets.total,
    status: budgets.status,
    sold: budgets.sold,
    createdAt: budgets.createdAt,
    companyId: budgets.companyId,
  })
    .from(budgets)
    .where(and(...conds))
    .orderBy(desc(budgets.createdAt))
    .limit(20);
}

export async function getClientById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conds: any[] = [eq(clients.id, id)];
  if (companyId) conds.push(eq(clients.companyId, companyId));
  const result = await db.select().from(clients).where(and(...conds)).limit(1);
  return result[0];
}

/**
 * ⚠️ `companyId` é OBRIGATÓRIO nas funções de criação (migration 0021).
 * Antes era opcional e, quando vinha vazio, a coluna simplesmente não entrava
 * no INSERT — foi assim que 15 clientes, 12 orçamentos e 4 vendas nasceram
 * órfãos na produção e ficaram invisíveis no sistema. Agora o TypeScript
 * impede o chamador de esquecer.
 */
export async function createClient(data: Omit<InsertClient, "companyId">, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values({ ...data, companyId });
  return result;
}

export async function updateClient(id: number, data: Partial<InsertClient>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(clients.id, id)];
  if (companyId) conds.push(eq(clients.companyId, companyId));
  await db.update(clients).set(data).where(and(...conds));
}

export async function deleteClient(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(clients.id, id)];
  if (companyId) conds.push(eq(clients.companyId, companyId));
  await db.delete(clients).where(and(...conds));
}

// ==================== BUDGETS ====================

export async function getBudgets(search?: string, status?: string, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (companyId) conditions.push(eq(budgets.companyId, companyId));
  if (search) conditions.push(like(budgets.clientName, `%${search}%`));
  if (status && status !== 'all') conditions.push(eq(budgets.status, status as any));
  const query = db.select().from(budgets).orderBy(desc(budgets.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function getBudgetById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conds: any[] = [eq(budgets.id, id)];
  if (companyId) conds.push(eq(budgets.companyId, companyId));
  const result = await db.select().from(budgets).where(and(...conds)).limit(1);
  return result[0];
}

/**
 * Confirma que o orçamento pertence à empresa. A tabela `budget_items` não
 * tem `companyId` — o vínculo é pelo orçamento pai, então toda operação em
 * item precisa validar o pai antes (senão uma empresa altera itens de
 * orçamento de outra passando um id qualquer).
 */
async function assertBudgetBelongsToCompany(budgetId: number, companyId?: number) {
  if (!companyId) return;
  const budget = await getBudgetById(budgetId, companyId);
  if (!budget) throw new Error("Orçamento não encontrado ou sem permissão");
}

export async function getBudgetItems(budgetId: number, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (companyId) {
    const budget = await getBudgetById(budgetId, companyId);
    if (!budget) return [];
  }
  return db.select().from(budgetItems).where(eq(budgetItems.budgetId, budgetId));
}

export async function getNextBudgetNumber(companyId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const cond = companyId ? eq(budgets.companyId, companyId) : undefined;
  const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(budgetNumber), 0)` }).from(budgets).where(cond);
  return (result[0]?.maxNum ?? 0) + 1;
}

export async function createBudget(data: Omit<InsertBudget, "companyId">, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nextNumber = await getNextBudgetNumber(companyId);
  const result = await db.insert(budgets).values({ ...data, budgetNumber: nextNumber, companyId });
  return result;
}

export async function updateBudget(id: number, data: Partial<InsertBudget>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (companyId) {
    // Isolamento estrito: só atualiza orçamento da própria empresa.
    // ⚠️ Antes isso aceitava também orçamentos legados com companyId NULL
    // (`or(..., isNull(budgets.companyId))`), o que virava vazamento entre
    // empresas em ambiente multiempresa: qualquer empresa podia alterar um
    // orçamento órfão. Se a migração dos dados reais trouxer orçamentos com
    // companyId NULL, é preciso fazer o backfill do companyId correto —
    // não reabrir esta exceção.
    await db.update(budgets).set(data).where(
      and(eq(budgets.id, id), eq(budgets.companyId, companyId))
    );
  } else {
    await db.update(budgets).set(data).where(eq(budgets.id, id));
  }
}

export async function deleteBudget(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verify ownership before deleting
  if (companyId) {
    const existing = await db.select({ id: budgets.id }).from(budgets).where(and(eq(budgets.id, id), eq(budgets.companyId, companyId))).limit(1);
    if (!existing[0]) throw new Error("Orçamento não encontrado ou sem permissão");
  }
  await db.delete(budgetItems).where(eq(budgetItems.budgetId, id));
  await db.delete(budgets).where(eq(budgets.id, id));
}

export async function addBudgetItem(data: InsertBudgetItem, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertBudgetBelongsToCompany(data.budgetId, companyId);
  const result = await db.insert(budgetItems).values(data);
  return result;
}

/** Resolve o orçamento dono de um item e valida a empresa. */
async function assertBudgetItemBelongsToCompany(itemId: number, companyId?: number) {
  if (!companyId) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [item] = await db.select({ budgetId: budgetItems.budgetId }).from(budgetItems).where(eq(budgetItems.id, itemId)).limit(1);
  if (!item) throw new Error("Item de orçamento não encontrado");
  await assertBudgetBelongsToCompany(item.budgetId, companyId);
}

export async function updateBudgetItem(id: number, data: Partial<InsertBudgetItem>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertBudgetItemBelongsToCompany(id, companyId);
  await db.update(budgetItems).set(data).where(eq(budgetItems.id, id));
}

export async function deleteBudgetItem(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertBudgetItemBelongsToCompany(id, companyId);
  await db.delete(budgetItems).where(eq(budgetItems.id, id));
}

export async function deleteAllBudgetItems(budgetId: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertBudgetBelongsToCompany(budgetId, companyId);
  await db.delete(budgetItems).where(eq(budgetItems.budgetId, budgetId));
}

// ==================== SETTINGS ====================
export async function getSettings(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (companyId) return db.select().from(settings).where(eq(settings.companyId, companyId));
  return db.select().from(settings);
}
export async function upsertSetting(key: string, value: string, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Configuração é sempre de uma empresa (settings.companyId é NOT NULL).
  await db.insert(settings)
    .values({ key, value, companyId })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}
// ==================== COMPETITORS ====================
export async function getCompetitors(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (companyId) return db.select().from(competitors).where(eq(competitors.companyId, companyId)).orderBy(competitors.name);
  return db.select().from(competitors).orderBy(competitors.name);
}
export async function getCompetitorById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conds: any[] = [eq(competitors.id, id)];
  if (companyId) conds.push(eq(competitors.companyId, companyId));
  const rows = await db.select().from(competitors).where(and(...conds));
  return rows[0] ?? null;
}
export async function createCompetitor(data: Omit<InsertCompetitor, "companyId">, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(competitors).values({ ...data, companyId });
}
export async function updateCompetitor(id: number, data: Partial<InsertCompetitor>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(competitors.id, id)];
  if (companyId) conds.push(eq(competitors.companyId, companyId));
  await db.update(competitors).set({ ...data, updatedAt: new Date(), lastUpdatedAt: new Date() }).where(and(...conds));
}
export async function deleteCompetitor(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(competitors.id, id)];
  if (companyId) conds.push(eq(competitors.companyId, companyId));
  await db.delete(competitors).where(and(...conds));
}
// ==================== COMPETITOR CRITERIA ====================
export async function getCriteria(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(competitorCriteria);
  if (companyId) {
    return query.where(eq(competitorCriteria.companyId, companyId))
      .orderBy(competitorCriteria.sortOrder, competitorCriteria.name);
  }
  return query.orderBy(competitorCriteria.sortOrder, competitorCriteria.name);
}
export async function createCriteria(data: InsertCompetitorCriteria, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // companyId é NOT NULL no banco (migration 0020): sem empresa não existe
  // mais critério "global". Exigir aqui dá erro claro.
  const empresa = companyId ?? data.companyId;
  if (!empresa) throw new Error("companyId é obrigatório para criar critério de concorrente");
  await db.insert(competitorCriteria).values({ ...data, companyId: empresa });
}
export async function updateCriteria(id: number, data: Partial<InsertCompetitorCriteria>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(competitorCriteria.id, id)];
  if (companyId) conds.push(eq(competitorCriteria.companyId, companyId));
  await db.update(competitorCriteria).set(data).where(and(...conds));
}
export async function deleteCriteria(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(competitorCriteria.id, id)];
  if (companyId) conds.push(eq(competitorCriteria.companyId, companyId));
  await db.delete(competitorCriteria).where(and(...conds));
  // Remove scores associados (restritos à mesma empresa)
  const condsScore: any[] = [eq(competitorScores.criteriaId, id)];
  if (companyId) condsScore.push(eq(competitorScores.companyId, companyId));
  await db.delete(competitorScores).where(and(...condsScore));
}
// ==================== COMPETITOR SCORES ====================
export async function getScores(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(competitorScores);
  if (companyId) return query.where(eq(competitorScores.companyId, companyId));
  return query;
}
export async function upsertScore(
  competitorId: number,
  criteriaId: number,
  value: string,
  notes?: string,
  companyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Valida que concorrente E critério pertencem à empresa antes de gravar a
  // nota — senão uma empresa poderia pontuar o concorrente de outra.
  if (companyId) {
    const [comp] = await db.select({ id: competitors.id }).from(competitors)
      .where(and(eq(competitors.id, competitorId), eq(competitors.companyId, companyId))).limit(1);
    if (!comp) throw new Error("Concorrente não encontrado ou sem permissão");
    const [crit] = await db.select({ id: competitorCriteria.id }).from(competitorCriteria)
      .where(and(eq(competitorCriteria.id, criteriaId), eq(competitorCriteria.companyId, companyId))).limit(1);
    if (!crit) throw new Error("Critério não encontrado ou sem permissão");
  }

  const conds: any[] = [
    eq(competitorScores.competitorId, competitorId),
    eq(competitorScores.criteriaId, criteriaId),
  ];
  if (companyId) conds.push(eq(competitorScores.companyId, companyId));
  const existing = await db.select().from(competitorScores).where(and(...conds));
  if (existing.length > 0) {
    await db.update(competitorScores)
      .set({ value, notes: notes ?? null })
      .where(and(...conds));
  } else {
    // companyId é NOT NULL no banco: exigir aqui dá erro claro em vez de
    // estourar a constraint do MySQL com mensagem obscura.
    if (!companyId) {
      throw new Error("companyId é obrigatório para criar nota de concorrente");
    }
    await db.insert(competitorScores).values({
      competitorId, criteriaId, value, notes: notes ?? null, companyId,
    });
  }
}
// ==================== COMPETITOR SERVICES (preços por empresa) ====================
export async function getCompetitorServices(competitorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(competitorServices).where(eq(competitorServices.competitorId, competitorId));
}
export async function createCompetitorService(data: InsertCompetitorService) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(competitorServices).values(data);
}
export async function updateCompetitorService(id: number, data: Partial<InsertCompetitorService>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(competitorServices).set(data).where(eq(competitorServices.id, id));
}
export async function deleteCompetitorService(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(competitorServices).where(eq(competitorServices.id, id));
}

// ==================== SERVICE CATEGORIES ====================
export async function getServiceCategories(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(serviceCategories);
  if (companyId) {
    return query.where(eq(serviceCategories.companyId, companyId)).orderBy(serviceCategories.sortOrder, serviceCategories.name);
  }
  return query.orderBy(serviceCategories.sortOrder, serviceCategories.name);
}
export async function createServiceCategory(data: Omit<InsertServiceCategory, "companyId">, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(serviceCategories).values({ ...data, companyId });
}
export async function updateServiceCategory(id: number, data: Partial<InsertServiceCategory>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(serviceCategories.id, id)];
  if (companyId) conds.push(eq(serviceCategories.companyId, companyId));
  await db.update(serviceCategories).set(data).where(and(...conds));
}
export async function deleteServiceCategory(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(serviceCategories.id, id)];
  if (companyId) conds.push(eq(serviceCategories.companyId, companyId));
  await db.delete(serviceCategories).where(and(...conds));
}

// ==================== BUDGET SOLD ====================
export async function toggleBudgetSold(id: number, sold: boolean, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conds: any[] = [eq(budgets.id, id)];
  if (companyId) conds.push(eq(budgets.companyId, companyId));
  await db.update(budgets).set({
    sold,
    soldAt: sold ? new Date() : null,
  }).where(and(...conds));
}

export async function getYesterdayUnsoldBudgets() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const startOfYesterday = new Date(now);
  startOfYesterday.setDate(now.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(now);
  endOfYesterday.setDate(now.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);
  return db.select().from(budgets)
    .where(
      and(
        gte(budgets.createdAt, startOfYesterday),
        lte(budgets.createdAt, endOfYesterday),
        eq(budgets.sold, false)
      )
    )
    .orderBy(budgets.createdAt);
}

// ==================== TAPETES (LAVANDERIA) ====================

export async function getCarpetOrders(filters?: { status?: string; search?: string }, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (companyId) conditions.push(eq(carpetOrders.companyId, companyId));
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(carpetOrders.status, filters.status as any));
  }
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(or(like(carpetOrders.clientName, s), like(carpetOrders.clientPhone, s)));
  }
  const query = db.select().from(carpetOrders);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(carpetOrders.createdAt));
  }
  return query.orderBy(desc(carpetOrders.createdAt));
}

export async function getCarpetOrderById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conds: any[] = [eq(carpetOrders.id, id)];
  if (companyId) conds.push(eq(carpetOrders.companyId, companyId));
  const rows = await db.select().from(carpetOrders).where(and(...conds)).limit(1);
  return rows[0];
}

export async function createCarpetOrder(data: InsertCarpetOrder) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Gera número sequencial
  const [lastRow] = await db.select({ maxNum: sql<number>`COALESCE(MAX(${carpetOrders.orderNumber}), 0)` }).from(carpetOrders);
  const nextNumber = (Number(lastRow?.maxNum ?? 0)) + 1;
  return db.insert(carpetOrders).values({ ...data, orderNumber: nextNumber });
}

export async function updateCarpetOrder(id: number, data: Partial<InsertCarpetOrder>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const conds: any[] = [eq(carpetOrders.id, id)];
  if (companyId) conds.push(eq(carpetOrders.companyId, companyId));
  await db.update(carpetOrders).set(data).where(and(...conds));
}

export async function deleteCarpetOrder(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (companyId) {
    const existing = await getCarpetOrderById(id, companyId);
    if (!existing) throw new Error("Pedido de tapete não encontrado ou sem permissão");
  }
  await db.delete(carpetPhotos).where(eq(carpetPhotos.carpetOrderId, id));
  await db.delete(carpetItems).where(eq(carpetItems.carpetOrderId, id));
  await db.delete(carpetOrders).where(eq(carpetOrders.id, id));
}

// ─── Itens de Tapete (múltiplos tapetes por OS) ───────────────────────────────
export async function getCarpetItems(carpetOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(carpetItems).where(eq(carpetItems.carpetOrderId, carpetOrderId)).orderBy(carpetItems.createdAt);
}

export async function setCarpetItems(carpetOrderId: number, items: Array<Omit<InsertCarpetItem, 'id' | 'carpetOrderId' | 'createdAt'>>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Remove itens antigos e insere os novos (replace all)
  await db.delete(carpetItems).where(eq(carpetItems.carpetOrderId, carpetOrderId));
  if (items.length > 0) {
    await db.insert(carpetItems).values(items.map(item => ({ ...item, carpetOrderId })));
  }
}

export async function addCarpetItem(data: Omit<InsertCarpetItem, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(carpetItems).values(data);
  return result;
}

export async function deleteCarpetItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(carpetItems).where(eq(carpetItems.id, id));
}

export async function getCarpetMetrics(companyId?: number) {
  const db = await getDb();
  if (!db) return { inProgress: 0, ready: 0, deliveredThisMonth: 0, revenueThisMonth: 0, overdue: 0 };
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const companyFilter = companyId ? eq(carpetOrders.companyId, companyId) : undefined;
  const [inProgressRows, readyRows, deliveredRows, overdueRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(carpetOrders)
      .where(and(companyFilter, or(eq(carpetOrders.status, 'collected'), eq(carpetOrders.status, 'washing')))),
    db.select({ count: sql<number>`count(*)` }).from(carpetOrders)
      .where(and(companyFilter, eq(carpetOrders.status, 'ready'))),
    db.select({ count: sql<number>`count(*)`, revenue: sql<string>`COALESCE(SUM(${carpetOrders.price}), 0)` })
      .from(carpetOrders)
      .where(and(companyFilter, eq(carpetOrders.status, 'delivered'), gte(carpetOrders.deliveredAt as any, firstOfMonth))),
    db.select({ count: sql<number>`count(*)` }).from(carpetOrders)
      .where(and(
        companyFilter,
        sql`${carpetOrders.status} != 'delivered'`,
        lte(carpetOrders.expectedDelivery, now)
      )),
  ]);
  return {
    inProgress: Number(inProgressRows[0]?.count ?? 0),
    ready: Number(readyRows[0]?.count ?? 0),
    deliveredThisMonth: Number(deliveredRows[0]?.count ?? 0),
    revenueThisMonth: parseFloat(String(deliveredRows[0]?.revenue ?? '0')),
    overdue: Number(overdueRows[0]?.count ?? 0),
  };
}

export async function getCarpetPhotos(carpetOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(carpetPhotos).where(eq(carpetPhotos.carpetOrderId, carpetOrderId)).orderBy(carpetPhotos.createdAt);
}

export async function addCarpetPhoto(data: InsertCarpetPhoto) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(carpetPhotos).values(data);
}

export async function updateCarpetPhotoCaption(id: number, caption: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(carpetPhotos).set({ caption }).where(eq(carpetPhotos.id, id));
}

export async function deleteCarpetPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(carpetPhotos).where(eq(carpetPhotos.id, id));
}

// ─── Tags de Tapetes ──────────────────────────────────────────────────────────
export async function getAllCarpetTags(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(carpetTags);
  if (companyId) {
    return query.where(eq(carpetTags.companyId, companyId)).orderBy(carpetTags.category, carpetTags.name);
  }
  return query.orderBy(carpetTags.category, carpetTags.name);
}
export async function createCarpetTag(data: InsertCarpetTag, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // companyId é NOT NULL no banco (migration 0020)
  const empresa = companyId ?? data.companyId;
  if (!empresa) throw new Error("companyId é obrigatório para criar etiqueta de tapete");
  const [result] = await db.insert(carpetTags).values({ ...data, companyId: empresa });
  return { id: (result as any).insertId };
}
export async function deleteCarpetTag(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (companyId) {
    const [tag] = await db.select({ id: carpetTags.id }).from(carpetTags)
      .where(and(eq(carpetTags.id, id), eq(carpetTags.companyId, companyId))).limit(1);
    if (!tag) throw new Error("Etiqueta não encontrada ou sem permissão");
  }
  // Remove da tabela de junção também
  await db.delete(carpetOrderTags).where(eq(carpetOrderTags.tagId, id));
  const conds: any[] = [eq(carpetTags.id, id)];
  if (companyId) conds.push(eq(carpetTags.companyId, companyId));
  await db.delete(carpetTags).where(and(...conds));
}
/**
 * `carpet_order_tags` é tabela de junção e não tem companyId: o vínculo só é
 * legítimo se o pedido de tapete E a etiqueta forem da mesma empresa. Sem esta
 * validação, uma empresa poderia etiquetar o pedido de outra (ou usar a
 * etiqueta de outra no próprio pedido).
 */
async function assertPedidoEEtiquetaDaEmpresa(
  carpetOrderId: number,
  tagId: number | null,
  companyId?: number
) {
  if (!companyId) return;
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const pedido = await getCarpetOrderById(carpetOrderId, companyId);
  if (!pedido) throw new Error("Pedido de tapete não encontrado ou sem permissão");
  if (tagId !== null) {
    const [tag] = await db.select({ id: carpetTags.id }).from(carpetTags)
      .where(and(eq(carpetTags.id, tagId), eq(carpetTags.companyId, companyId))).limit(1);
    if (!tag) throw new Error("Etiqueta não encontrada ou sem permissão");
  }
}

export async function getTagsForOrder(carpetOrderId: number, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conds: any[] = [eq(carpetOrderTags.carpetOrderId, carpetOrderId)];
  if (companyId) conds.push(eq(carpetTags.companyId, companyId));
  const rows = await db
    .select({ id: carpetTags.id, name: carpetTags.name, color: carpetTags.color, category: carpetTags.category })
    .from(carpetOrderTags)
    .innerJoin(carpetTags, eq(carpetOrderTags.tagId, carpetTags.id))
    .where(and(...conds));
  return rows;
}
export async function addTagToOrder(data: InsertCarpetOrderTag, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertPedidoEEtiquetaDaEmpresa(data.carpetOrderId, data.tagId, companyId);
  // Evita duplicata
  const existing = await db.select().from(carpetOrderTags)
    .where(and(eq(carpetOrderTags.carpetOrderId, data.carpetOrderId), eq(carpetOrderTags.tagId, data.tagId)));
  if (existing.length > 0) return;
  await db.insert(carpetOrderTags).values(data);
}
export async function removeTagFromOrder(carpetOrderId: number, tagId: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertPedidoEEtiquetaDaEmpresa(carpetOrderId, tagId, companyId);
  await db.delete(carpetOrderTags)
    .where(and(eq(carpetOrderTags.carpetOrderId, carpetOrderId), eq(carpetOrderTags.tagId, tagId)));
}
export async function setTagsForOrder(carpetOrderId: number, tagIds: number[], companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Valida o pedido e cada etiqueta antes de trocar o conjunto
  await assertPedidoEEtiquetaDaEmpresa(carpetOrderId, null, companyId);
  for (const tagId of tagIds) {
    await assertPedidoEEtiquetaDaEmpresa(carpetOrderId, tagId, companyId);
  }
  // Remove todas as tags atuais e insere as novas
  await db.delete(carpetOrderTags).where(eq(carpetOrderTags.carpetOrderId, carpetOrderId));
  if (tagIds.length > 0) {
    await db.insert(carpetOrderTags).values(tagIds.map(tagId => ({ carpetOrderId, tagId })));
  }
}

export async function getOrderIdsByTag(tagId: number, companyId?: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  if (companyId) {
    // Só resolve pedidos se a etiqueta for da empresa
    const [tag] = await db.select({ id: carpetTags.id }).from(carpetTags)
      .where(and(eq(carpetTags.id, tagId), eq(carpetTags.companyId, companyId))).limit(1);
    if (!tag) return [];
    const rows = await db.select({ carpetOrderId: carpetOrderTags.carpetOrderId })
      .from(carpetOrderTags)
      .innerJoin(carpetOrders, eq(carpetOrders.id, carpetOrderTags.carpetOrderId))
      .where(and(eq(carpetOrderTags.tagId, tagId), eq(carpetOrders.companyId, companyId)));
    return rows.map(r => r.carpetOrderId);
  }
  const rows = await db.select({ carpetOrderId: carpetOrderTags.carpetOrderId })
    .from(carpetOrderTags)
    .where(eq(carpetOrderTags.tagId, tagId));
  return rows.map(r => r.carpetOrderId);
}

// ─── Vendas ───────────────────────────────────────────────────────────────────
export async function getSalesByClientId(clientId: number, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conds: any[] = [eq(sales.clientId, clientId)];
  if (companyId) conds.push(eq(sales.companyId, companyId));
  return await db.select().from(sales).where(and(...conds)).orderBy(desc(sales.saleDate));
}

export async function getSales(filters?: { paymentMethod?: string; paymentStatus?: string; transactionType?: string; search?: string; clientId?: number; startDate?: Date; endDate?: Date }, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (companyId) conditions.push(eq(sales.companyId, companyId));
  if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
    conditions.push(eq(sales.paymentMethod, filters.paymentMethod as any));
  }
  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    conditions.push(eq(sales.paymentStatus, filters.paymentStatus as any));
  }
  // Por padrão, a aba de Vendas mostra apenas receitas (não despesas)
  const txType = filters?.transactionType ?? 'receita';
  if (txType !== 'all') {
    conditions.push(eq(sales.transactionType, txType as any));
  }
  if (filters?.search) {
    conditions.push(or(
      like(sales.clientName, `%${filters.search}%`),
      like(sales.clientPhone, `%${filters.search}%`),
      like(sales.description, `%${filters.search}%`)
    ));
  }
  if (filters?.startDate) {
    conditions.push(gte(sales.saleDate, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(sales.saleDate, filters.endDate));
  }
  const query = db.select().from(sales);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(sales.saleDate));
  }
  return await query.orderBy(desc(sales.saleDate));
}

export async function getSaleById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conds: any[] = [eq(sales.id, id)];
  if (companyId) conds.push(eq(sales.companyId, companyId));
  const rows = await db.select().from(sales).where(and(...conds)).limit(1);
  return rows[0] ?? null;
}

/**
 * Confirma que a venda pertence à empresa informada. Usado antes de
 * update/delete para impedir que uma empresa altere dados de outra
 * passando um id qualquer (IDOR). Quando `companyId` é undefined (dono do
 * sistema), a checagem é ignorada de propósito.
 */
async function assertSaleBelongsToCompany(id: number, companyId?: number) {
  if (!companyId) return;
  const sale = await getSaleById(id, companyId);
  if (!sale) throw new Error("Venda não encontrada ou sem permissão");
}

export async function createSale(data: Omit<InsertSale, "companyId">, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Gera saleCode sequencial por empresa
  const cond = companyId ? eq(sales.companyId, companyId) : undefined;
  const countRows = await db.select({ count: sql<number>`COUNT(*)` }).from(sales).where(cond);
  const nextCode = (countRows[0]?.count ?? 0) + 1;
  await db.insert(sales).values({ ...data, saleCode: nextCode, companyId });
  const inserted = await db.select().from(sales).orderBy(desc(sales.id)).limit(1);
  return inserted[0];
}

export async function updateSale(id: number, data: Partial<InsertSale>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertSaleBelongsToCompany(id, companyId);
  const conds: any[] = [eq(sales.id, id)];
  if (companyId) conds.push(eq(sales.companyId, companyId));
  await db.update(sales).set(data).where(and(...conds));
  return await getSaleById(id, companyId);
}

export async function deleteSale(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertSaleBelongsToCompany(id, companyId);
  await db.delete(saleReceipts).where(eq(saleReceipts.saleId, id));
  const conds: any[] = [eq(sales.id, id)];
  if (companyId) conds.push(eq(sales.companyId, companyId));
  await db.delete(sales).where(and(...conds));
}

export async function getSaleMetrics(companyId?: number) {
  const db = await getDb();
  if (!db) return { totalSales: 0, totalRevenue: 0, totalExpenses: 0, netProfit: 0, avgTicket: 0, thisMonthRevenue: 0, thisMonthExpenses: 0 };
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const baseCond = companyId ? eq(sales.companyId, companyId) : undefined;
  const monthlyCond = companyId ? and(gte(sales.saleDate, firstOfMonth), eq(sales.companyId, companyId)) : gte(sales.saleDate, firstOfMonth);
  const [totals] = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${sales.transactionType} = 'receita' THEN ${sales.total} ELSE 0 END), 0)`,
    totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${sales.transactionType} = 'despesa' THEN ${sales.total} ELSE 0 END), 0)`,
    totalSales: sql<number>`SUM(CASE WHEN ${sales.transactionType} = 'receita' THEN 1 ELSE 0 END)`,
  }).from(sales).where(baseCond);
  const [monthly] = await db.select({
    thisMonthRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${sales.transactionType} = 'receita' THEN ${sales.total} ELSE 0 END), 0)`,
    thisMonthExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${sales.transactionType} = 'despesa' THEN ${sales.total} ELSE 0 END), 0)`,
    thisMonthSales: sql<number>`SUM(CASE WHEN ${sales.transactionType} = 'receita' THEN 1 ELSE 0 END)`,
  }).from(sales).where(monthlyCond);
  const totalRevenue = Number(totals?.totalRevenue ?? 0);
  const totalExpenses = Number(totals?.totalExpenses ?? 0);
  const totalSales = totals?.totalSales ?? 0;
  const thisMonthSales = Number(monthly?.thisMonthSales ?? 0);
  return {
    totalSales,
    thisMonthSales,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    avgTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
    thisMonthRevenue: Number(monthly?.thisMonthRevenue ?? 0),
    thisMonthExpenses: Number(monthly?.thisMonthExpenses ?? 0),
  };
}

// ─── Comprovantes de Venda ────────────────────────────────────────────────────
export async function getSaleReceipts(saleId: number, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  // A tabela de comprovantes não tem companyId — o vínculo é pela venda,
  // então validamos a venda antes de listar.
  if (companyId) {
    const sale = await getSaleById(saleId, companyId);
    if (!sale) return [];
  }
  return await db.select().from(saleReceipts).where(eq(saleReceipts.saleId, saleId)).orderBy(desc(saleReceipts.createdAt));
}

export async function addSaleReceipt(data: InsertSaleReceipt, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertSaleBelongsToCompany(data.saleId, companyId);
  await db.insert(saleReceipts).values(data);
  const inserted = await db.select().from(saleReceipts).orderBy(desc(saleReceipts.id)).limit(1);
  return inserted[0];
}

export async function deleteSaleReceipt(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (companyId) {
    // Resolve a venda dona do comprovante e confirma que é da empresa.
    const [receipt] = await db.select({ saleId: saleReceipts.saleId }).from(saleReceipts).where(eq(saleReceipts.id, id)).limit(1);
    if (!receipt) throw new Error("Comprovante não encontrado");
    await assertSaleBelongsToCompany(receipt.saleId, companyId);
  }
  await db.delete(saleReceipts).where(eq(saleReceipts.id, id));
}

// Atualiza LTV do cliente ao confirmar venda
export async function updateClientLTV(clientPhone: string) {
  const db = await getDb();
  if (!db) return;
  // Soma todas as vendas pagas para este cliente
  const [result] = await db.select({
    ltv: sql<number>`COALESCE(SUM(${sales.amountReceived}), 0)`,
    totalSales: sql<number>`COUNT(*)`,
  }).from(sales).where(and(
    eq(sales.clientPhone, clientPhone),
    eq(sales.paymentStatus, 'paid')
  ));
  // totalSpent não existe no schema atual — apenas log para referência futura
  if (result) {
    // TODO: adicionar coluna totalSpent ao schema de clients se necessário
    console.log(`[LTV] Cliente ${clientPhone}: R$ ${result.ltv} em ${result.totalSales} vendas`);
  }
}

export async function deleteSaleByBudgetId(budgetId: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Busca a venda vinculada ao orçamento (restrita à empresa, se informada)
  const conds: any[] = [eq(sales.budgetId, budgetId)];
  if (companyId) conds.push(eq(sales.companyId, companyId));
  const existing = await db.select({ id: sales.id }).from(sales).where(and(...conds)).limit(1);
  if (existing.length > 0) {
    await db.delete(saleReceipts).where(eq(saleReceipts.saleId, existing[0].id));
    await db.delete(sales).where(eq(sales.id, existing[0].id));
  }
}

export async function getCarpetOrdersByPhone(phone: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(carpetOrders)
    .where(eq(carpetOrders.clientPhone, phone))
    .orderBy(desc(carpetOrders.createdAt));
}

// ==================== USERS MANAGEMENT ====================

export async function getUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function setUserRole(openId: string, role: 'user' | 'admin' | 'master' | 'secretaria' | 'funcionario') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users).set({ role }).where(eq(users.openId, openId));
}

// ==================== EXECUTION ORDERS ====================

export async function getExecutionOrders(filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  assignedTo?: string;
  clientSearch?: string;
}, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const { like, or } = await import('drizzle-orm');
  const conditions: any[] = [];
  if (companyId) conditions.push(eq(executionOrders.companyId, companyId));
  if (filters?.date) conditions.push(eq(executionOrders.scheduledDate, filters.date));
  if (filters?.startDate) conditions.push(gte(executionOrders.scheduledDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(executionOrders.scheduledDate, filters.endDate));
  if (filters?.status) conditions.push(eq(executionOrders.status, filters.status as 'pending' | 'done' | 'cancelled'));
  if (filters?.assignedTo) conditions.push(eq(executionOrders.assignedTo, filters.assignedTo));
  if (filters?.clientSearch) {
    const q = `%${filters.clientSearch}%`;
    conditions.push(or(
      like(executionOrders.clientName, q),
      like(executionOrders.clientPhone, q)
    ));
  }
  const query = db.select().from(executionOrders);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(executionOrders.scheduledDate, executionOrders.scheduledTime);
  }
  return query.orderBy(executionOrders.scheduledDate, executionOrders.scheduledTime);
}

export async function getExecutionOrderById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conds: any[] = [eq(executionOrders.id, id)];
  if (companyId) conds.push(eq(executionOrders.companyId, companyId));
  const result = await db.select().from(executionOrders).where(and(...conds)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExecutionOrder(data: Omit<InsertExecutionOrder, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Gerar número sequencial
  const last = await db.select({ n: executionOrders.orderNumber }).from(executionOrders)
    .orderBy(desc(executionOrders.orderNumber)).limit(1);
  const orderNumber = (last[0]?.n ?? 0) + 1;
  // Gerar token único para confirmação do cliente
  const { randomBytes } = await import('crypto');
  const confirmToken = randomBytes(24).toString('hex');
  const result = await db.insert(executionOrders).values({ ...data, orderNumber, confirmToken });
  return { id: Number(result[0].insertId), orderNumber, confirmToken };
}

export async function updateExecutionOrder(id: number, data: Partial<InsertExecutionOrder>, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const conds: any[] = [eq(executionOrders.id, id)];
  if (companyId) conds.push(eq(executionOrders.companyId, companyId));
  await db.update(executionOrders).set(data).where(and(...conds));
}

export async function deleteExecutionOrder(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (companyId) {
    const existing = await getExecutionOrderById(id, companyId);
    if (!existing) throw new Error("Ordem de execução não encontrada ou sem permissão");
  }
  await db.delete(upsellItems).where(eq(upsellItems.executionOrderId, id));
  await db.delete(executionPhotos).where(eq(executionPhotos.executionOrderId, id));
  await db.delete(executionOrders).where(eq(executionOrders.id, id));
}

export async function getExecutionMetrics(date?: string, companyId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, done: 0, cancelled: 0, totalValue: 0 };
  const today = date ?? new Date().toISOString().split('T')[0];
  const conditions: any[] = [eq(executionOrders.scheduledDate, today)];
  if (companyId) conditions.push(eq(executionOrders.companyId, companyId));
  const rows = await db.select({
    id: executionOrders.id,
    status: executionOrders.status,
    totalValue: executionOrders.totalValue,
  }).from(executionOrders).where(and(...conditions));
  const metrics = { total: rows.length, pending: 0, done: 0, cancelled: 0, totalValue: 0 };
  const activeOrderIds: number[] = [];
  for (const row of rows) {
    if (row.status === 'pending') metrics.pending++;
    else if (row.status === 'done') metrics.done++;
    else if (row.status === 'cancelled') { metrics.cancelled++; continue; } // não soma canceladas
    metrics.totalValue += parseFloat(row.totalValue ?? '0');
    activeOrderIds.push(row.id);
  }
  // Somar upsell dos pedidos ativos do dia
  if (activeOrderIds.length > 0) {
    const upsellRows = await db.select({ total: upsellItems.total })
      .from(upsellItems)
      .where(sql`${upsellItems.executionOrderId} IN (${sql.join(activeOrderIds.map(id => sql`${id}`), sql`, `)})`);
    const upsellTotal = upsellRows.reduce((sum, u) => sum + parseFloat(u.total ?? '0'), 0);
    metrics.totalValue += upsellTotal;
  }
  return metrics;
}

// ==================== UPSELL ITEMS ====================

export async function getUpsellItems(executionOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(upsellItems)
    .where(eq(upsellItems.executionOrderId, executionOrderId))
    .orderBy(upsellItems.createdAt);
}

export async function createUpsellItem(data: Omit<InsertUpsellItem, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(upsellItems).values(data);
  return { id: Number(result[0].insertId) };
}

export async function deleteUpsellItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(upsellItems).where(eq(upsellItems.id, id));
}

// ==================== EXECUTION PHOTOS ====================

export async function getExecutionPhotos(executionOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(executionPhotos)
    .where(eq(executionPhotos.executionOrderId, executionOrderId))
    .orderBy(executionPhotos.createdAt);
}

export async function addExecutionPhoto(data: Omit<InsertExecutionPhoto, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(executionPhotos).values(data);
  return { id: Number(result[0].insertId) };
}

export async function deleteExecutionPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(executionPhotos).where(eq(executionPhotos.id, id));
}

// ==================== TEAMS ====================
export async function getTeams(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (companyId) return db.select().from(teams).where(eq(teams.companyId, companyId)).orderBy(teams.name);
  return db.select().from(teams).orderBy(teams.name);
}
export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(teams).where(eq(teams.id, id));
  return rows[0] ?? null;
}
export async function createTeam(data: Omit<InsertTeam, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(teams).values(data);
  return { id: Number(result[0].insertId) };
}
export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(teams).set(data).where(eq(teams.id, id));
}
export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
  await db.delete(teams).where(eq(teams.id, id));
}

// ==================== TEAM MEMBERS ====================
export async function getTeamMembers(teamId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (teamId) {
    return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId)).orderBy(teamMembers.name);
  }
  return db.select().from(teamMembers).orderBy(teamMembers.name);
}
export async function getAllActiveMembers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamMembers).where(eq(teamMembers.active, true)).orderBy(teamMembers.name);
}
export async function createTeamMember(data: Omit<InsertTeamMember, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(teamMembers).values(data);
  return { id: Number(result[0].insertId) };
}
export async function updateTeamMember(id: number, data: Partial<InsertTeamMember>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
}
export async function deleteTeamMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(teamMembers).where(eq(teamMembers.id, id));
}

// ==================== EXECUTION CARPETS ====================
export async function getExecutionCarpets(params?: { date?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.date) conditions.push(eq(executionCarpets.scheduledDate, params.date));
  if (params?.status) conditions.push(eq(executionCarpets.status, params.status as any));
  const query = db.select().from(executionCarpets);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(executionCarpets.scheduledTime);
  }
  return query.orderBy(desc(executionCarpets.scheduledDate));
}
export async function getExecutionCarpetById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(executionCarpets).where(eq(executionCarpets.id, id));
  return rows[0] ?? null;
}
export async function createExecutionCarpet(data: Omit<InsertExecutionCarpet, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Auto-increment orderNumber
  const countRows = await db.select({ count: sql<number>`COUNT(*)` }).from(executionCarpets);
  const orderNumber = (Number(countRows[0]?.count ?? 0)) + 1;
  const result = await db.insert(executionCarpets).values({ ...data, orderNumber });
  return { id: Number(result[0].insertId), orderNumber };
}
export async function updateExecutionCarpet(id: number, data: Partial<InsertExecutionCarpet>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(executionCarpets).set(data).where(eq(executionCarpets.id, id));
}
export async function deleteExecutionCarpet(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(executionCarpetPhotos).where(eq(executionCarpetPhotos.executionCarpetId, id));
  await db.delete(executionCarpets).where(eq(executionCarpets.id, id));
}

// ==================== EXECUTION CARPET PHOTOS ====================
export async function getExecutionCarpetPhotos(executionCarpetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(executionCarpetPhotos)
    .where(eq(executionCarpetPhotos.executionCarpetId, executionCarpetId))
    .orderBy(executionCarpetPhotos.createdAt);
}
export async function addExecutionCarpetPhoto(data: Omit<InsertExecutionCarpetPhoto, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(executionCarpetPhotos).values(data);
  return { id: Number(result[0].insertId) };
}
export async function deleteExecutionCarpetPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(executionCarpetPhotos).where(eq(executionCarpetPhotos.id, id));
}

// ==================== EXECUTION DASHBOARD METRICS ====================
export async function getExecutionDashboardMetrics(month?: string, year?: string, companyId?: number) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, doneOrders: 0, totalValue: 0, upsellTotal: 0 };

  const now = new Date();
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
  const targetYear = year ? parseInt(year) : now.getFullYear();

  // Build date range for the month
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDay = new Date(targetYear, targetMonth, 0).getDate();
  const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  // Get execution orders for the month
  const monthConditions: any[] = [
    gte(executionOrders.scheduledDate, startDate),
    lte(executionOrders.scheduledDate, endDate),
  ];
  if (companyId) monthConditions.push(eq(executionOrders.companyId, companyId));
  const orders = await db.select({
    id: executionOrders.id,
    status: executionOrders.status,
    totalValue: executionOrders.totalValue,
  }).from(executionOrders)
    .where(and(...monthConditions));

  const totalOrders = orders.length;
  const doneOrders = orders.filter(o => o.status === 'done').length;
  const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.totalValue ?? '0'), 0);

  // Get upsell total for done orders in the month
  const doneOrderIds = orders.filter(o => o.status === 'done').map(o => o.id);
  let upsellTotal = 0;
  if (doneOrderIds.length > 0) {
    const upsellRows = await db.select({
      total: upsellItems.total,
    }).from(upsellItems)
      .where(sql`${upsellItems.executionOrderId} IN (${sql.join(doneOrderIds.map(id => sql`${id}`), sql`, `)})`);
    upsellTotal = upsellRows.reduce((sum, u) => sum + parseFloat(u.total ?? '0'), 0);
  }

  return { totalOrders, doneOrders, totalValue, upsellTotal };
}

// Get upsell total for a specific execution order
export async function getUpsellTotal(executionOrderId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ total: upsellItems.total })
    .from(upsellItems)
    .where(eq(upsellItems.executionOrderId, executionOrderId));
  return rows.reduce((sum, r) => sum + parseFloat(r.total ?? '0'), 0);
}

// ─── Histórico de OS por cliente ─────────────────────────────────────────────
export async function getExecutionOrdersByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: executionOrders.id,
    orderNumber: executionOrders.orderNumber,
    scheduledDate: executionOrders.scheduledDate,
    scheduledTime: executionOrders.scheduledTime,
    serviceDescription: executionOrders.serviceDescription,
    totalValue: executionOrders.totalValue,
    status: executionOrders.status,
    assignedTo: executionOrders.assignedTo,
    completedAt: executionOrders.completedAt,
    createdAt: executionOrders.createdAt,
  }).from(executionOrders)
    .where(eq(executionOrders.clientId, clientId))
    .orderBy(desc(executionOrders.scheduledDate));
}

export async function getExecutionOrdersByPhone(phone: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: executionOrders.id,
    orderNumber: executionOrders.orderNumber,
    scheduledDate: executionOrders.scheduledDate,
    scheduledTime: executionOrders.scheduledTime,
    serviceDescription: executionOrders.serviceDescription,
    totalValue: executionOrders.totalValue,
    status: executionOrders.status,
    assignedTo: executionOrders.assignedTo,
    completedAt: executionOrders.completedAt,
    createdAt: executionOrders.createdAt,
  }).from(executionOrders)
    .where(eq(executionOrders.clientPhone, phone))
    .orderBy(desc(executionOrders.scheduledDate));
}

// ==================== AI ASSISTANT HELPERS ====================
export async function getClientHistoryForAI(clientPhone: string) {
  const db = await getDb();
  if (!db) return { budgets: [], sales: [], executions: [] };
  const digits = clientPhone.replace(/\D/g, '');
  const phonePattern = `%${digits.slice(-8)}%`;

  const [clientBudgets, clientSales, clientExecutions] = await Promise.all([
    db.select({
      id: budgets.id,
      total: budgets.total,
      sold: budgets.sold,
      createdAt: budgets.createdAt,
    }).from(budgets)
      .where(like(budgets.clientPhone, phonePattern))
      .orderBy(desc(budgets.createdAt))
      .limit(10),

    db.select({
      id: sales.id,
      total: sales.total,
      paymentStatus: sales.paymentStatus,
      createdAt: sales.createdAt,
    }).from(sales)
      .where(like(sales.clientPhone, phonePattern))
      .orderBy(desc(sales.createdAt))
      .limit(10),

    db.select({
      id: executionOrders.id,
      serviceDescription: executionOrders.serviceDescription,
      totalValue: executionOrders.totalValue,
      status: executionOrders.status,
      scheduledDate: executionOrders.scheduledDate,
    }).from(executionOrders)
      .where(like(executionOrders.clientPhone, phonePattern))
      .orderBy(desc(executionOrders.scheduledDate))
      .limit(10),
  ]);

  return { budgets: clientBudgets, sales: clientSales, executions: clientExecutions };
}

// CRM: buscar clientes inativos (sem venda/OS nos últimos X dias)
export async function getInactiveClients(daysSince: number = 180, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSince);
  const cutoffMs = cutoff.getTime();

  // Busca todos os clientes
  const allClients = await db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    createdAt: clients.createdAt,
  }).from(clients).orderBy(desc(clients.createdAt));

  // Para cada cliente, verifica a última OS ou venda
  const result = [];
  for (const client of allClients) {
    if (!client.phone) continue;
    const digits = client.phone.replace(/\D/g, '');
    const phonePattern = `%${digits.slice(-8)}%`;

    const [lastSale] = await db.select({ createdAt: sales.createdAt })
      .from(sales)
      .where(like(sales.clientPhone, phonePattern))
      .orderBy(desc(sales.createdAt))
      .limit(1);

    const [lastExec] = await db.select({ scheduledDate: executionOrders.scheduledDate })
      .from(executionOrders)
      .where(like(executionOrders.clientPhone, phonePattern))
      .orderBy(desc(executionOrders.scheduledDate))
      .limit(1);

    const lastSaleDate = lastSale?.createdAt ? new Date(lastSale.createdAt).getTime() : 0;
    const lastExecDate = lastExec?.scheduledDate ? new Date(lastExec.scheduledDate).getTime() : 0;
    const lastContact = Math.max(lastSaleDate, lastExecDate);

    if (lastContact === 0 || lastContact < cutoffMs) {
      const daysSinceContact = lastContact === 0
        ? null
        : Math.floor((Date.now() - lastContact) / (1000 * 60 * 60 * 24));
      result.push({
        ...client,
        lastContactDate: lastContact === 0 ? null : new Date(lastContact).toISOString(),
        daysSinceContact,
      });
    }
  }
  return result.slice(0, 50); // máximo 50 clientes inativos
}

// Buscar serviços mais vendidos para sugestão de IA
export async function getMostSoldServices(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    name: budgetItems.name,
    count: sql<number>`COUNT(*)`.as('count'),
    avgPrice: sql<number>`AVG(CAST(${budgetItems.unitPrice} AS DECIMAL(10,2)))`.as('avgPrice'),
  }).from(budgetItems)
    .groupBy(budgetItems.name)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

// ─── Pendentes a Receber ─────────────────────────────────────────────────────
export async function getPendingSales(filters?: { startDate?: Date; endDate?: Date; search?: string; companyId?: number }) {
  const db = await getDb();
  if (!db) return { items: [], totalPending: 0 };
  const conditions: any[] = [
    or(
      eq(sales.paymentStatus, 'pending'),
      eq(sales.paymentStatus, 'partial')
    ),
    eq(sales.transactionType, 'receita'),
  ];
  if (filters?.companyId) conditions.push(eq(sales.companyId, filters.companyId));
  if (filters?.startDate) conditions.push(gte(sales.saleDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(sales.saleDate, filters.endDate));
  if (filters?.search) {
    conditions.push(or(
      like(sales.clientName, `%${filters.search}%`),
      like(sales.clientPhone, `%${filters.search}%`),
    ));
  }
  const items = await db.select().from(sales)
    .where(and(...conditions))
    .orderBy(desc(sales.saleDate));

  const totalPending = items.reduce((sum, s) => {
    const total = Number(s.total ?? 0);
    const received = Number(s.amountReceived ?? 0);
    return sum + Math.max(0, total - received);
  }, 0);

  return { items, totalPending };
}

// ─── Avaliações Pós-Serviço ──────────────────────────────────────────────────
export async function createServiceReview(data: InsertServiceReview) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(serviceReviews).values(data);
  return { id: (result as any).insertId };
}

export async function getReviewByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [review] = await db.select().from(serviceReviews).where(eq(serviceReviews.token, token));
  return review ?? null;
}

export async function submitReview(token: string, rating: number, comment?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceReviews)
    .set({ rating, comment: comment ?? null, respondedAt: new Date() })
    .where(eq(serviceReviews.token, token));
  return { success: true };
}

export async function getReviewsByExecutionOrder(executionOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceReviews)
    .where(eq(serviceReviews.executionOrderId, executionOrderId))
    .orderBy(desc(serviceReviews.createdAt));
}

export async function getReviewStats() {
  const db = await getDb();
  if (!db) return { total: 0, responded: 0, avgRating: 0, distribution: {} };
  const all = await db.select().from(serviceReviews).orderBy(desc(serviceReviews.createdAt));
  const responded = all.filter(r => r.rating !== null);
  const avgRating = responded.length > 0
    ? responded.reduce((sum, r) => sum + (r.rating ?? 0), 0) / responded.length
    : 0;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  responded.forEach(r => { if (r.rating) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1; });
  return { total: all.length, responded: responded.length, avgRating: Math.round(avgRating * 10) / 10, distribution, recent: all.slice(0, 10) };
}

export async function getReviewsByClientPhone(phone: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceReviews)
    .where(eq(serviceReviews.clientPhone, phone))
    .orderBy(desc(serviceReviews.createdAt));
}

// ─── Histórico de Cancelamentos ──────────────────────────────────────────────
export async function createCancelledOrder(data: InsertCancelledOrder) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(cancelledOrders).values(data);
  return result;
}

export async function getCancelledOrders(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(cancelledOrders);
  if (companyId !== undefined) {
    return query.where(eq(cancelledOrders.companyId, companyId)).orderBy(desc(cancelledOrders.cancelledAt));
  }
  return query.orderBy(desc(cancelledOrders.cancelledAt));
}

// ─── Itens de Serviço por Agendamento ────────────────────────────────────────
export async function getExecutionServiceItems(executionOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(executionServiceItems)
    .where(eq(executionServiceItems.executionOrderId, executionOrderId))
    .orderBy(executionServiceItems.createdAt);
}

export async function setExecutionServiceItems(
  executionOrderId: number,
  items: Array<{ serviceName: string; serviceId?: number; quantity: number; unitPrice: string }>
) {
  const db = await getDb();
  if (!db) return;
  // Deletar itens anteriores
  await db.delete(executionServiceItems).where(eq(executionServiceItems.executionOrderId, executionOrderId));
  if (items.length === 0) return;
  // Inserir novos
  const rows = items.map(item => ({
    executionOrderId,
    serviceName: item.serviceName,
    serviceId: item.serviceId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: String(Number(item.unitPrice) * item.quantity),
  }));
  await db.insert(executionServiceItems).values(rows);
}

export async function getExecutionServiceItemsTotal(executionOrderId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ total: executionServiceItems.total })
    .from(executionServiceItems)
    .where(eq(executionServiceItems.executionOrderId, executionOrderId));
  return rows.reduce((sum, r) => sum + parseFloat(r.total ?? '0'), 0);
}

// Buscar totais de service items para múltiplos pedidos (para exibir na lista)
export async function getServiceItemsTotalsByOrders(orderIds: number[]) {
  if (orderIds.length === 0) return {} as Record<number, number>;
  const db = await getDb();
  if (!db) return {} as Record<number, number>;
  const rows = await db.select({
    executionOrderId: executionServiceItems.executionOrderId,
    total: executionServiceItems.total,
  }).from(executionServiceItems)
    .where(sql`${executionServiceItems.executionOrderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
  const result: Record<number, number> = {};
  for (const row of rows) {
    const id = row.executionOrderId;
    result[id] = (result[id] ?? 0) + parseFloat(row.total ?? '0');
  }
  return result;
}

// Buscar totais de upsell para múltiplos pedidos (para exibir na lista)
export async function getUpsellTotalsByOrders(orderIds: number[]): Promise<Record<number, number>> {
  if (orderIds.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select({
    executionOrderId: upsellItems.executionOrderId,
    total: upsellItems.total,
  }).from(upsellItems)
    .where(sql`${upsellItems.executionOrderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
  const result: Record<number, number> = {};
  for (const row of rows) {
    const id = row.executionOrderId;
    result[id] = (result[id] ?? 0) + parseFloat(row.total ?? '0');
  }
  return result;
}

//// ─── Mensagens Pré-programadas ────────────────────────────────────────────
export async function getPresetMessages(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (companyId !== undefined) {
    return db.select().from(presetMessages)
      .where(eq(presetMessages.companyId, companyId))
      .orderBy(presetMessages.createdAt);
  }
  return db.select().from(presetMessages).orderBy(presetMessages.createdAt);
}

export async function createPresetMessage(data: { title: string; message: string; companyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // preset_messages.companyId é NOT NULL (migration 0021)
  await db.insert(presetMessages).values({ title: data.title, message: data.message, companyId: data.companyId });
  return { success: true };
}

export async function updatePresetMessage(id: number, data: { title?: string; message?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(presetMessages).set(data).where(eq(presetMessages.id, id));
  return { success: true };
}

export async function deletePresetMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(presetMessages).where(eq(presetMessages.id, id));
  return { success: true };
}

// ==================== APP NOTIFICATIONS ====================
export async function createAppNotification(
  data: { type?: string; title: string; message?: string; referenceId?: number; referenceType?: string },
  companyId?: number
) {
  const db = await getDb();
  if (!db) return;
  const { appNotifications } = await import("../drizzle/schema");
  // ⚠️ Esta função NÃO recebia companyId — por isso as 228 notificações da
  // produção nasceram órfãs e ficavam invisíveis para a empresa que as gerou
  // (getAppNotifications filtra por companyId). A coluna segue aceitando NULL
  // para não perder o histórico antigo, mas toda notificação nova tem empresa.
  await db.insert(appNotifications).values({
    type: data.type ?? "info",
    title: data.title,
    message: data.message ?? null,
    referenceId: data.referenceId ?? null,
    referenceType: data.referenceType ?? null,
    createdAt: Date.now(),
    companyId: companyId ?? null,
  });
}

export async function getAppNotifications(limit = 20, companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const { appNotifications } = await import("../drizzle/schema");
  if (companyId !== undefined) {
    return db.select().from(appNotifications)
      .where(eq(appNotifications.companyId, companyId))
      .orderBy(desc(appNotifications.createdAt)).limit(limit);
  }
  return db.select().from(appNotifications).orderBy(desc(appNotifications.createdAt)).limit(limit);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  const { appNotifications } = await import("../drizzle/schema");
  await db.update(appNotifications).set({ readAt: Date.now() }).where(eq(appNotifications.id, id));
}

export async function markAllNotificationsRead(companyId?: number) {
  const db = await getDb();
  if (!db) return;
  const { appNotifications } = await import("../drizzle/schema");
  if (companyId !== undefined) {
    await db.update(appNotifications).set({ readAt: Date.now() })
      .where(and(eq(appNotifications.companyId, companyId), sql`read_at IS NULL`));
  } else {
    await db.update(appNotifications).set({ readAt: Date.now() }).where(sql`read_at IS NULL`);
  }
}

export async function clearAllNotifications(companyId?: number) {
  const db = await getDb();
  if (!db) return;
  const { appNotifications } = await import("../drizzle/schema");
  if (companyId !== undefined) {
    await db.delete(appNotifications).where(eq(appNotifications.companyId, companyId));
  } else {
    await db.delete(appNotifications);
  }
}

// ==================== COMPANIES (MULTI-TENANT) ====================

export async function getCompanies() {
  const db = await getDb();
  if (!db) return [];
  const { companies, companyCredentials, settings } = await import("../drizzle/schema");
  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const creds = await db.select().from(companyCredentials);
  const allSettings = await db.select().from(settings);
  return rows.map(c => {
    const cred = creds.find(cr => cr.companyId === c.id);
    const companyPhoneSetting = allSettings.find(s => s.companyId === c.id && s.key === 'company_phone');
    const companyEmailSetting = allSettings.find(s => s.companyId === c.id && s.key === 'company_email');
    return { 
      ...c, 
      loginEmail: cred?.email ?? null, 
      hasCredentials: !!cred, 
      lastLoginAt: cred?.lastLoginAt ?? null,
      companyPhone: companyPhoneSetting?.value ?? c.phone ?? null,
      companyEmail: companyEmailSetting?.value ?? c.email ?? null,
    };
  });
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { companies } = await import("../drizzle/schema");
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0];
}

export async function getCompanyBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { companies } = await import("../drizzle/schema");
  const result = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return result[0];
}

export async function createCompany(data: {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  slug?: string;
  plan?: "trial" | "basic" | "professional" | "premium";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companies } = await import("../drizzle/schema");
  // Gerar slug a partir do nome se não fornecido
  const slug = data.slug || data.name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
  // Trial de 14 dias
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  await db.insert(companies).values({
    name: data.name,
    cnpj: data.cnpj,
    email: data.email,
    phone: data.phone,
    slug,
    plan: data.plan ?? "trial",
    subscriptionStatus: "active",
    trialEndsAt,
    active: true,
  });
  const created = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return created[0];
}

export async function updateCompany(id: number, data: Partial<{
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  logoUrl: string;
  plan: "trial" | "basic" | "professional" | "premium";
  subscriptionStatus: "active" | "expired" | "blocked" | "cancelled";
  subscriptionExpiresAt: Date;
  trialEndsAt: Date | null;
  primaryColor: string;
  slug: string;
  active: boolean;
  ownerName: string;
  ownerPhone: string;
  ownerCargo: string;
  ownerAvatarUrl: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companies } = await import("../drizzle/schema");
  await db.update(companies).set(data).where(eq(companies.id, id));
}

export const updateCompanyById = updateCompany;

export async function deleteCompany(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companies } = await import("../drizzle/schema");
  await db.delete(companies).where(eq(companies.id, id));
}

export async function getCompanyMetrics() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, trial: 0, paid: 0, blocked: 0 };
  const { companies } = await import("../drizzle/schema");
  const all = await db.select().from(companies);
  return {
    total: all.length,
    active: all.filter(c => c.subscriptionStatus === "active").length,
    trial: all.filter(c => c.plan === "trial").length,
    paid: all.filter(c => c.plan !== "trial" && c.subscriptionStatus === "active").length,
    blocked: all.filter(c => c.subscriptionStatus === "blocked").length,
  };
}

export async function assignUserToCompany(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ companyId }).where(eq(users.id, userId));
}

// ─── Company Credentials (Login próprio por empresa) ─────────────────────────
export async function getCompanyCredentialByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const { companyCredentials } = await import("../drizzle/schema");
  const rows = await db.select().from(companyCredentials).where(eq(companyCredentials.email, email));
  return rows[0] ?? null;
}

export async function getCompanyCredentialByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const { companyCredentials } = await import("../drizzle/schema");
  const rows = await db.select().from(companyCredentials).where(eq(companyCredentials.companyId, companyId));
  return rows[0] ?? null;
}

export async function createCompanyCredential(data: { companyId: number; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companyCredentials } = await import("../drizzle/schema");
  await db.insert(companyCredentials).values(data);
}

export async function updateCompanyCredential(companyId: number, data: { passwordHash?: string; resetToken?: string | null; resetTokenExpiresAt?: Date | null; lastLoginAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companyCredentials } = await import("../drizzle/schema");
  await db.update(companyCredentials).set(data as any).where(eq(companyCredentials.companyId, companyId));
}

export async function getCompanyCredentialByResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const { companyCredentials } = await import("../drizzle/schema");
  const rows = await db.select().from(companyCredentials).where(eq(companyCredentials.resetToken, token));
  return rows[0] ?? null;
}

// ─── Access Requests ──────────────────────────────────────────────────────────
export async function createAccessRequest(data: {
  companyName: string;
  ownerName: string;
  email: string;
  phone?: string;
  city?: string;
  segment?: string;
  message?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { accessRequests } = await import("../drizzle/schema");
  await db.insert(accessRequests).values({ ...data, createdAt: Date.now() });
}

export async function listAccessRequests(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  const { accessRequests } = await import("../drizzle/schema");
  if (status) {
    return db.select().from(accessRequests).where(eq(accessRequests.status, status)).orderBy(accessRequests.createdAt);
  }
  return db.select().from(accessRequests).orderBy(accessRequests.createdAt);
}

export async function getAccessRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { accessRequests } = await import("../drizzle/schema");
  const rows = await db.select().from(accessRequests).where(eq(accessRequests.id, id)).limit(1);
  return rows[0] ?? null;
}
export async function updateAccessRequestStatus(
  id: number,
  status: "approved" | "rejected",
  reviewedBy: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { accessRequests } = await import("../drizzle/schema");
  await db.update(accessRequests).set({ status, reviewedAt: Date.now(), reviewedBy }).where(eq(accessRequests.id, id));
}

// ─── OS Agendadas por Semana (últimas 8 semanas) ─────────────────────────────
export async function getWeeklyExecutionOrders() {
  const db = await getDb();
  if (!db) return [];

  // Buscar OS das últimas 8 semanas
  const now = new Date();
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(now.getDate() - 56); // 8 semanas = 56 dias
  const startStr = eightWeeksAgo.toISOString().split('T')[0];

  const orders = await db.select({
    scheduledDate: executionOrders.scheduledDate,
    status: executionOrders.status,
  }).from(executionOrders)
    .where(gte(executionOrders.scheduledDate, startStr))
    .orderBy(executionOrders.scheduledDate);

  // Agrupar por semana (segunda-feira como início)
  const weekMap: Record<string, { label: string; total: number; done: number; pending: number }> = {};

  orders.forEach((o) => {
    const d = new Date(o.scheduledDate + 'T12:00:00');
    // Calcular início da semana (segunda-feira)
    const dayOfWeek = d.getDay(); // 0=Dom, 1=Seg...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const key = monday.toISOString().split('T')[0];
    const label = `${String(monday.getDate()).padStart(2,'0')}/${String(monday.getMonth()+1).padStart(2,'0')}`;

    if (!weekMap[key]) weekMap[key] = { label, total: 0, done: 0, pending: 0 };
    weekMap[key].total++;
    if (o.status === 'done') weekMap[key].done++;
    else weekMap[key].pending++;
  });

  return Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, v]) => v);
}

/// ==================== USER PROFILE ====================
export async function updateUserProfile(userId: number, data: {
  name?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.bio !== undefined && { bio: data.bio }),
    ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
  }).where(eq(users.id, userId));
}
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] ?? null;
}

// ─── Beta Feedbacks ───────────────────────────────────────────────────────────
export async function createBetaFeedback(data: {
  companyId: number;
  companyName?: string;
  categoria: string;
  oQueFuncionou?: string;
  oQueTravou?: string;
  oQueFalta?: string;
  nota?: number;
  createdAt: number;
}) {
  const db = await getDb();
  if (!db) return;
  const { betaFeedbacks } = await import("../drizzle/schema");
  await db.insert(betaFeedbacks).values(data);
}

export async function getBetaFeedbacks() {
  const db = await getDb();
  if (!db) return [];
  const { betaFeedbacks } = await import("../drizzle/schema");
  return db.select().from(betaFeedbacks).orderBy(desc(betaFeedbacks.createdAt));
}

// ─── Company Users (Múltiplos Usuários por Empresa) ──────────────────────────
export async function getCompanyUsers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: companyUsers.id,
    companyId: companyUsers.companyId,
    name: companyUsers.name,
    email: companyUsers.email,
    phone: companyUsers.phone,
    role: companyUsers.role,
    active: companyUsers.active,
    allowedModules: companyUsers.allowedModules,
    lastLoginAt: companyUsers.lastLoginAt,
    createdAt: companyUsers.createdAt,
  }).from(companyUsers).where(eq(companyUsers.companyId, companyId)).orderBy(companyUsers.createdAt);
}

export async function getCompanyUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  // Busca case-insensitive: normaliza email para minúsculas
  const normalizedEmail = email.toLowerCase().trim();
  const rows = await db.select().from(companyUsers).where(
    sql`LOWER(${companyUsers.email}) = ${normalizedEmail}`
  );
  return rows[0] ?? null;
}

export async function getCompanyUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(companyUsers).where(eq(companyUsers.id, id));
  return rows[0] ?? null;
}

export async function createCompanyUser(data: InsertCompanyUser) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(companyUsers).values(data);
  return { id: (result as any)[0]?.insertId ?? 0 };
}

export async function updateCompanyUser(id: number, companyId: number, data: { name?: string; email?: string; phone?: string | null; passwordHash?: string; role?: string; active?: boolean; allowedModules?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(companyUsers).set(data as any).where(and(eq(companyUsers.id, id), eq(companyUsers.companyId, companyId)));
  return { success: true };
}

export async function deleteCompanyUser(id: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(companyUsers).where(and(eq(companyUsers.id, id), eq(companyUsers.companyId, companyId)));
  return { success: true };
}

export async function updateCompanyUserLastLogin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(companyUsers).set({ lastLoginAt: new Date() }).where(eq(companyUsers.id, id));
}

// ==================== REATIVAÇÃO / RÉGUA DE RELACIONAMENTO ====================

export async function setClientReactivation(clientId: number, companyId: number, reactivationDays: number, lastServiceDate?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Calcula a data alvo: lastServiceDate + reactivationDays
  const baseDate = lastServiceDate ? new Date(lastServiceDate + 'T12:00:00') : new Date();
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + reactivationDays);
  const dueDateStr = dueDate.toISOString().split('T')[0];
  const baseDateStr = baseDate.toISOString().split('T')[0];
  await db.update(clients)
    .set({
      reactivationDays,
      reactivationDueDate: dueDateStr,
      lastServiceDate: lastServiceDate ?? baseDateStr,
    })
    .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)));
  return { success: true, dueDate: dueDateStr };
}

export async function getTodayReactivationClients(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split('T')[0];
  const conditions = [eq(clients.reactivationDueDate, today)];
  if (companyId) conditions.push(eq(clients.companyId, companyId));
  return db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    reactivationDays: clients.reactivationDays,
    reactivationDueDate: clients.reactivationDueDate,
    lastServiceDate: clients.lastServiceDate,
  }).from(clients).where(and(...conditions)).orderBy(clients.name);
}

export async function getAllReactivationClients(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [isNotNull(clients.reactivationDays)];
  if (companyId) conditions.push(eq(clients.companyId, companyId));
  const today = new Date().toISOString().split('T')[0];
  const rows = await db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    reactivationDays: clients.reactivationDays,
    reactivationDueDate: clients.reactivationDueDate,
    lastServiceDate: clients.lastServiceDate,
  }).from(clients).where(and(...conditions)).orderBy(clients.reactivationDueDate);
  return rows.map(r => ({
    ...r,
    isOverdue: r.reactivationDueDate ? r.reactivationDueDate < today : false,
    isDueToday: r.reactivationDueDate === today,
  }));
}

export async function removeClientReactivation(clientId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(clients)
    .set({ reactivationDays: null, reactivationDueDate: null, lastServiceDate: null })
    .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)));
  return { success: true };
}

// ─── Admin / Owner: Métricas Globais do Sistema ───────────────────────────────
export async function getSystemMetrics() {
  const db = await getDb();
  if (!db) return {
    totalCompanies: 0, activeCompanies: 0, trialCompanies: 0, blockedCompanies: 0,
    totalBudgets: 0, totalSales: 0, totalSalesValue: 0, totalClients: 0,
  };
  const { companies, budgets, sales: salesTable, clients: clientsTable } = await import("../drizzle/schema");
  const [allCompanies, allBudgets, allSales, allClients] = await Promise.all([
    db.select().from(companies),
    db.select({ id: budgets.id }).from(budgets),
    db.select({ id: salesTable.id, total: salesTable.total }).from(salesTable),
    db.select({ id: clientsTable.id }).from(clientsTable),
  ]);
  return {
    totalCompanies: allCompanies.length,
    activeCompanies: allCompanies.filter((c: any) => c.subscriptionStatus === "active" && c.active).length,
    trialCompanies: allCompanies.filter((c: any) => c.plan === "trial").length,
    blockedCompanies: allCompanies.filter((c: any) => c.subscriptionStatus === "blocked").length,
    totalBudgets: allBudgets.length,
    totalSales: allSales.length,
    totalSalesValue: allSales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0),
    totalClients: allClients.length,
  };
}

export async function getCompanyStats(companyId: number) {
  const db = await getDb();
  if (!db) return { budgets: 0, sales: 0, salesValue: 0, clients: 0, lastActivity: null };
  const { budgets, sales: salesTable, clients: clientsTable } = await import("../drizzle/schema");
  const [companyBudgets, companySales, companyClients] = await Promise.all([
    db.select({ id: budgets.id }).from(budgets).where(eq(budgets.companyId, companyId)),
    db.select({ id: salesTable.id, total: salesTable.total, createdAt: salesTable.createdAt }).from(salesTable).where(eq(salesTable.companyId, companyId)),
    db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.companyId, companyId)),
  ]);
  const lastSale = companySales.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return {
    budgets: companyBudgets.length,
    sales: companySales.length,
    salesValue: companySales.reduce((sum: number, s: any) => sum + (Number(s.totalValue) || 0), 0),
    clients: companyClients.length,
    lastActivity: lastSale?.createdAt ?? null,
  };
}


// ─── Faturamentos Mensais por Ano ───────────────────────────────
export async function getMonthlyRevenueByYear(year: number, companyId?: number) {
  const db = await getDb();
  if (!db) return { months: [], availableYears: [] };
  
  // Query única: busca total por mês E anos disponíveis em paralelo
  const baseWhere = companyId
    ? and(eq(sales.transactionType, 'receita'), eq(sales.companyId, companyId))
    : eq(sales.transactionType, 'receita');

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const yearWhere = companyId
    ? and(eq(sales.transactionType, 'receita'), eq(sales.companyId, companyId), gte(sales.saleDate, startOfYear), lte(sales.saleDate, endOfYear))
    : and(eq(sales.transactionType, 'receita'), gte(sales.saleDate, startOfYear), lte(sales.saleDate, endOfYear));

  // Executa as 2 queries em paralelo
  const [monthlyData, yearData] = await Promise.all([
    db.select({
      month: sql<number>`MONTH(${sales.saleDate})`,
      total: sql<number>`COALESCE(SUM(${sales.total}), 0)`,
    })
      .from(sales)
      .where(yearWhere)
      .groupBy(sql`MONTH(${sales.saleDate})`),
    db.select({
      year: sql<number>`YEAR(${sales.saleDate})`,
    })
      .from(sales)
      .where(baseWhere)
      .groupBy(sql`YEAR(${sales.saleDate})`)
      .orderBy(sql`YEAR(${sales.saleDate}) DESC`),
  ]);

  // Monta array fixo de 12 meses
  const months = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyData.find((m: any) => m.month === i + 1);
    return {
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      total: found ? Number(found.total) : 0,
    };
  });

  const availableYears = yearData.map((y: any) => Number(y.year)).sort((a: number, b: number) => b - a);

  return { months, availableYears };
}

// ─── Extrato Bancário ─────────────────────────────────────────────────────────

export async function createBankImport(data: {
  companyId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileType: 'pdf' | 'ofx' | 'csv' | 'other';
  referenceMonth: string;
  bankName?: string;
}) {
  const [result] = await rawExecute(
    `INSERT INTO bank_imports (companyId, fileName, fileUrl, fileKey, fileType, referenceMonth, bankName, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')`,
    [data.companyId, data.fileName, data.fileUrl, data.fileKey, data.fileType, data.referenceMonth, data.bankName ?? null]
  );
  return (result as any).insertId as number;
}

export async function updateBankImport(id: number, data: {
  status?: 'processing' | 'done' | 'error';
  totalTransactions?: number;
  pendingReview?: number;
  bankName?: string;
  errorMessage?: string;
}) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
  if (data.totalTransactions !== undefined) { sets.push('totalTransactions = ?'); vals.push(data.totalTransactions); }
  if (data.pendingReview !== undefined) { sets.push('pendingReview = ?'); vals.push(data.pendingReview); }
  if (data.bankName !== undefined) { sets.push('bankName = ?'); vals.push(data.bankName); }
  if (data.errorMessage !== undefined) { sets.push('errorMessage = ?'); vals.push(data.errorMessage); }
  if (sets.length === 0) return;
  vals.push(id);
  await rawExecute(`UPDATE bank_imports SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function getBankImports(companyId: number) {
  const [rows] = await rawExecute(
    `SELECT * FROM bank_imports WHERE companyId = ? ORDER BY createdAt DESC`,
    [companyId]
  );
  return rows as any[];
}

export async function createBankTransactions(transactions: Array<{
  companyId: number;
  importId: number;
  transactionDate: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
  isPersonal?: boolean;
  reviewStatus?: 'auto' | 'manual' | 'pending';
  aiConfidence?: number;
  aiSuggestedCategory?: string;
}>) {
  if (transactions.length === 0) return;
  const placeholders = transactions.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = transactions.flatMap(t => [
    t.companyId, t.importId, t.transactionDate, t.description,
    t.amount, t.type, t.category ?? null, t.isPersonal ? 1 : 0,
    t.reviewStatus ?? 'pending', t.aiConfidence ?? null, t.aiSuggestedCategory ?? null
  ]);
  await rawExecute(
    `INSERT INTO bank_transactions (companyId, importId, transactionDate, description, amount, type, category, isPersonal, reviewStatus, aiConfidence, aiSuggestedCategory) VALUES ${placeholders}`,
    values
  );
}

export async function getBankTransactions(companyId: number, filters: {
  importId?: number;
  reviewStatus?: string;
  referenceMonth?: string;
}) {
  let query = `SELECT bt.*, bi.referenceMonth, bi.bankName, bi.fileName
    FROM bank_transactions bt
    JOIN bank_imports bi ON bt.importId = bi.id
    WHERE bt.companyId = ?`;
  const vals: any[] = [companyId];
  if (filters.importId) { query += ' AND bt.importId = ?'; vals.push(filters.importId); }
  if (filters.reviewStatus) { query += ' AND bt.reviewStatus = ?'; vals.push(filters.reviewStatus); }
  if (filters.referenceMonth) { query += ' AND bi.referenceMonth = ?'; vals.push(filters.referenceMonth); }
  query += ' ORDER BY bt.transactionDate DESC, bt.id DESC';
  const [rows] = await rawExecute(query, vals);
  return rows as any[];
}

export async function updateBankTransaction(id: number, companyId: number, data: {
  category?: string;
  isPersonal?: boolean;
  reviewStatus?: 'auto' | 'manual' | 'pending';
  notes?: string;
}) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.category !== undefined) { sets.push('category = ?'); vals.push(data.category); }
  if (data.isPersonal !== undefined) { sets.push('isPersonal = ?'); vals.push(data.isPersonal ? 1 : 0); }
  if (data.reviewStatus !== undefined) { sets.push('reviewStatus = ?'); vals.push(data.reviewStatus); }
  if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
  if (sets.length === 0) return;
  vals.push(id, companyId);
  await rawExecute(`UPDATE bank_transactions SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`, vals);
}

export async function deleteBankImport(id: number, companyId: number) {
  await rawExecute('DELETE FROM bank_transactions WHERE importId = ? AND companyId = ?', [id, companyId]);
  await rawExecute('DELETE FROM bank_imports WHERE id = ? AND companyId = ?', [id, companyId]);
}
