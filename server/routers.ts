import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { checkRateLimit, getRateLimitRetryAfter, resetRateLimit } from "./_core/rateLimiter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, managementProcedure, router, ownerProcedure } from "./_core/trpc";
import { notifyOwner } from './_core/notification';
import { sendAppointmentEmail, sendPlanChangedEmail } from './email';
import { accessRequestsRouter } from './accessRequestsRouter';
import { companyUsersRouter } from './companyUsersRouter';
import { getPrivateSignedUrl, companyIdFromKey } from './storage';
import {
  getServices, getServiceById, createService, updateService, deleteService,
  getClients, getClientById, createClient, updateClient, deleteClient,
  getClientMetrics, getTopClients, getClientPhotos, addClientPhoto, deleteClientPhoto, getBudgetsByClient,
  getBudgets, getBudgetById, getBudgetItems, createBudget, updateBudget, deleteBudget,
  addBudgetItem, updateBudgetItem, deleteBudgetItem, deleteAllBudgetItems,
  getSettings, upsertSetting,
  getCompetitors, getCompetitorById, createCompetitor, updateCompetitor, deleteCompetitor,
  getCriteria, createCriteria, updateCriteria, deleteCriteria,
  getScores, upsertScore,
  getCompetitorServices, createCompetitorService, updateCompetitorService, deleteCompetitorService,
  getServiceCategories, createServiceCategory, updateServiceCategory, deleteServiceCategory,
  toggleBudgetSold, getYesterdayUnsoldBudgets,
  getCarpetOrders, getCarpetOrderById, createCarpetOrder, updateCarpetOrder, deleteCarpetOrder,
  getCarpetMetrics, getCarpetPhotos, addCarpetPhoto, deleteCarpetPhoto,
  getCarpetItems, setCarpetItems,
  getAllCarpetTags, createCarpetTag, deleteCarpetTag, getTagsForOrder, addTagToOrder, removeTagFromOrder, setTagsForOrder, getOrderIdsByTag,
  getSales, getSaleById, createSale, updateSale, deleteSale, getSaleMetrics, getMonthlyRevenueByYear,
  getSalesByClientId, getSaleReceipts, addSaleReceipt, deleteSaleReceipt, updateClientLTV,
  getPendingSales, deleteSaleByBudgetId, getCarpetOrdersByPhone,
  getUsers, setUserRole,
  getExecutionOrders, getExecutionOrderById, createExecutionOrder, updateExecutionOrder, deleteExecutionOrder, getExecutionMetrics,
  getUpsellItems, createUpsellItem, deleteUpsellItem,
  getExecutionServiceItems, setExecutionServiceItems, getServiceItemsTotalsByOrders, getUpsellTotalsByOrders,
  getPresetMessages, createPresetMessage, updatePresetMessage, deletePresetMessage,
  createAppNotification, getAppNotifications, markNotificationRead, markAllNotificationsRead,
  clearAllNotifications,
  getExecutionPhotos, addExecutionPhoto, deleteExecutionPhoto,
  getTeams, getTeamById, createTeam, updateTeam, deleteTeam,
  getTeamMembers, getAllActiveMembers, createTeamMember, updateTeamMember, deleteTeamMember,
  getExecutionCarpets, getExecutionCarpetById, createExecutionCarpet, updateExecutionCarpet, deleteExecutionCarpet,
  getExecutionCarpetPhotos, addExecutionCarpetPhoto, deleteExecutionCarpetPhoto, updateCarpetPhotoCaption,
  getExecutionDashboardMetrics,
  getWeeklyExecutionOrders, getUpsellTotal,
  getExecutionOrdersByClient, getExecutionOrdersByPhone,
  getClientHistoryForAI, getInactiveClients, getMostSoldServices,
  setClientReactivation, getTodayReactivationClients, getAllReactivationClients, removeClientReactivation,
  createServiceReview, getReviewByToken, submitReview, getReviewsByExecutionOrder, getReviewStats, getReviewsByClientPhone,
  createCancelledOrder, getCancelledOrders,
  getCompanies, getCompanyById, createCompany, updateCompany, updateCompanyById, deleteCompany, getCompanyMetrics, assignUserToCompany,
  getCompanyCredentialByCompanyId,
  getCompanyCredentialByEmail,
  createCompanyCredential,
  updateCompanyCredential,
  getCompanyCredentialByResetToken,
  updateUserProfile,
  getUserById,
  createBetaFeedback,
  getBetaFeedbacks,
  getSystemMetrics,
  getCompanyStats,
  getDb,
  rawExecute,
} from "./db";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { invokeLLM } from './_core/llm';
import { eq, sql, and } from 'drizzle-orm';
import { services } from '../drizzle/schema';
import { sendPasswordResetEmail, sendWelcomeEmail } from './email';
import { demoRouter } from './demoRouter';
import { bankStatementRouter } from './bankStatementRouter';
import { demoBookingsRouter } from './demoBookingsRouter';

/**
 * Exige que a sessão tenha uma empresa para CRIAR registros.
 *
 * `ctx.companyId` é null para o dono do sistema (login OAuth da Manus), que
 * enxerga todas as empresas. Isso é correto para LEITURA, mas na escrita era o
 * que gerava registro órfão: a coluna companyId ficava vazia e o dado
 * desaparecia do sistema (15 clientes, 12 orçamentos e 4 vendas na produção).
 *
 * Agora falha com mensagem clara em vez de gravar dado inacessível. Quem
 * precisa cadastrar deve entrar pelo login da empresa.
 */
function exigirEmpresa(companyId: number | null | undefined): number {
  if (!companyId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Nenhuma empresa selecionada na sessão. Entre com o login da empresa " +
        "para cadastrar registros (o acesso de dono do sistema é apenas para consulta).",
    });
  }
  return companyId;
}

// ==================== STORAGE ROUTER (Cloudflare R2) ====================
// Único jeito de resolver acesso a um arquivo do bucket PRIVADO (comprovantes,
// extratos). O banco só guarda a `key` do objeto — nunca uma URL — e é aqui
// que validamos que quem está pedindo pertence à empresa dona do arquivo
// antes de gerar o link assinado (ver server/storage.ts para o porquê).
const storageRouter = router({
  getSignedUrl: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const companyId = exigirEmpresa(ctx.companyId);
      const donoDaKey = companyIdFromKey(input.key);
      if (donoDaKey === null || donoDaKey !== companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este arquivo não pertence à sua empresa.",
        });
      }
      const url = await getPrivateSignedUrl(input.key);
      return { url };
    }),
});

// ==================== SERVICES ROUTER ====================
const servicesRouter = router({
   list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      activeOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getServices(input?.search, input?.category, input?.activeOnly, ctx.companyId ?? undefined);
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const svc = await getServiceById(input.id, ctx.companyId ?? undefined);
      if (!svc) return undefined;
      return svc;
    }),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      price: z.string(),
      category: z.string().default("Geral"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      active: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      await createService(input, exigirEmpresa(ctx.companyId));
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      price: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().nullable().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateService(id, data, ctx.companyId ?? undefined);
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteService(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),
  // Toggle all services in a category on/off (cascade)
  toggleCategory: protectedProcedure
    .input(z.object({ category: z.string(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const conditions: any[] = [eq(services.category, input.category)];
      if (ctx.companyId) conditions.push(eq(services.companyId, ctx.companyId));
      await db.update(services).set({ active: input.active }).where(and(...conditions));
      // Cascade: if disabling impermeabilização, also disable higienização + impermeabilização
      if (!input.active && input.category === 'Impermeabilização') {
        const cascadeConditions: any[] = [eq(services.category, 'Higienização + Impermeabilização')];
        if (ctx.companyId) cascadeConditions.push(eq(services.companyId, ctx.companyId));
        await db.update(services).set({ active: false }).where(and(...cascadeConditions));
      }
      return { success: true };
    }),
  // Initialize company services from default catalog
  initFromCatalog: managementProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const existing = await db.select({ cnt: sql<number>`COUNT(*)` }).from(services).where(eq(services.companyId, ctx.companyId!));
      if (Number(existing[0]?.cnt) > 0) return { success: false, message: 'Empresa já possui serviços cadastrados' };
      // Copy from default catalog using raw SQL
      await db.execute(sql`
        INSERT INTO services (name, price, category, description, active, companyId, createdAt, updatedAt)
        SELECT name, price, category, description, 1, ${ctx.companyId}, NOW(), NOW()
        FROM default_services_catalog
        ORDER BY sortOrder
      `);
      return { success: true };
    }),
});

// ==================== CLIENTS ROUTER ====================
const clientAddressSchema = z.object({
  cep: z.string().optional(),
  street: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
});

const clientsRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return getClients(input?.search, ctx.companyId ?? undefined);
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return getClientById(input.id, ctx.companyId ?? undefined);
    }),
  metrics: protectedProcedure
    .query(async ({ ctx }) => {
      return getClientMetrics(ctx.companyId ?? undefined);
    }),
  topClients: protectedProcedure
    .query(async ({ ctx }) => {
      return getTopClients(10, ctx.companyId ?? undefined);
    }),

  getPhotos: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return getClientPhotos(input.clientId);
    }),

  addPhoto: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      furnitureType: z.string().min(1),
      photoUrl: z.string().url(),
      fileKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await addClientPhoto(input);
      return { success: true };
    }),

  deletePhoto: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteClientPhoto(input.id);
      return { success: true };
    }),

  getBudgets: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      return getBudgetsByClient(input.phone);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      notes: z.string().optional(),
    }).merge(clientAddressSchema))
    .mutation(async ({ input, ctx }) => {
      const result = await createClient(input, exigirEmpresa(ctx.companyId));
      const insertId = (result as any)[0]?.insertId ?? (result as any).insertId ?? 0;
      return { success: true, id: insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      notes: z.string().optional(),
    }).merge(clientAddressSchema))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateClient(id, data, ctx.companyId ?? undefined);
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteClient(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),
});

// ==================== BUDGETS ROUTER ====================
const budgetsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getBudgets(input?.search, input?.status, ctx.companyId ?? undefined);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Isolamento aplicado já na query (não só em checagem posterior)
      const budget = await getBudgetById(input.id, ctx.companyId ?? undefined);
      if (!budget) return null;
      const items = await getBudgetItems(input.id, ctx.companyId ?? undefined);
      return { ...budget, items };
    }),

  // Buscar orçamento mais recente por telefone (para exibir na OS sem budgetId)
  getLatestByPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input, ctx }) => {
      // Isolamento aplicado na query. Antes havia um filtro em memória que
      // aceitava orçamentos órfãos (`!b.companyId`), permitindo que qualquer
      // empresa visse orçamento sem dono — removido.
      const results = await getBudgetsByClient(input.phone, ctx.companyId ?? undefined);
      if (!results || results.length === 0) return null;
      // Retornar o mais recente com seus itens
      const latest = results[0];
      const items = await getBudgetItems(latest.id, ctx.companyId ?? undefined);
      return { ...latest, items };
    }),

  create: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      clientName: z.string(),
      clientPhone: z.string(),
      clientAddress: z.string().optional(),
      subtotal: z.string().default("0"),
      discountType: z.enum(["percent", "fixed"]).default("fixed"),
      discountValue: z.string().default("0"),
      total: z.string().default("0"),
      notes: z.string().optional(),
      videos: z.string().optional(),
      validDays: z.number().default(7),
      paymentConditions: z.string().optional(),
      selectedInfoPageId: z.string().optional(),
      isTimbrado: z.boolean().optional().default(false),
      items: z.array(z.object({
        serviceId: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        quantity: z.number().min(1),
        unitPrice: z.string(),
        subtotal: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { items, ...budgetData } = input;
      const result = await createBudget(budgetData, exigirEmpresa(ctx.companyId));
      const insertId = (result as any)[0]?.insertId;
      if (insertId && items.length > 0) {
        for (const item of items) {
          await addBudgetItem({ ...item, budgetId: insertId }, ctx.companyId ?? undefined);
        }
      }
      // Buscar o budgetNumber gerado para retornar ao frontend
      const created = insertId ? await getBudgetById(insertId, ctx.companyId ?? undefined) : null;
      return { success: true, id: insertId, budgetNumber: created?.budgetNumber ?? null };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      clientAddress: z.string().optional(),
      subtotal: z.string().optional(),
      discountType: z.enum(["percent", "fixed"]).optional(),
      discountValue: z.string().optional(),
      total: z.string().optional(),
      status: z.enum(["pending", "sent", "accepted", "rejected"]).optional(),
      notes: z.string().optional(),
      videos: z.string().optional(),
      validDays: z.number().optional(),
      paymentConditions: z.string().optional(),
      selectedInfoPageId: z.string().nullable().optional(),
      items: z.array(z.object({
        serviceId: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        quantity: z.number().min(1),
        unitPrice: z.string(),
        subtotal: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, items, ...budgetData } = input;
      await updateBudget(id, budgetData, ctx.companyId ?? undefined);
      if (items !== undefined) {
        await deleteAllBudgetItems(id, ctx.companyId ?? undefined);
        for (const item of items) {
          await addBudgetItem({ ...item, budgetId: id }, ctx.companyId ?? undefined);
        }
      }
      // Sincronizar venda vinculada ao orcamento
      if (budgetData.total || budgetData.clientName || budgetData.clientPhone) {
        const { sales: salesTable } = await import('../drizzle/schema');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const linkedSaleConds: any[] = [eq(salesTable.budgetId, id)];
        if (ctx.companyId) linkedSaleConds.push(eq(salesTable.companyId, ctx.companyId));
        const [linkedSale] = await db.select({ id: salesTable.id }).from(salesTable).where(and(...linkedSaleConds)).limit(1);
        if (linkedSale) {
          const saleUpdate: Record<string, any> = {};
          if (budgetData.total) saleUpdate.total = budgetData.total;
          if (budgetData.clientName) saleUpdate.clientName = budgetData.clientName;
          if (budgetData.clientPhone) saleUpdate.clientPhone = budgetData.clientPhone;
          await updateSale(linkedSale.id, saleUpdate, ctx.companyId ?? undefined);
        }
      }
      // Sincronizar execucao vinculada ao orcamento
      if (budgetData.clientName || budgetData.clientPhone || budgetData.clientAddress) {
        const { executionOrders: eoTable } = await import('../drizzle/schema');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const linkedExecConds: any[] = [eq(eoTable.budgetId, id)];
        if (ctx.companyId) linkedExecConds.push(eq(eoTable.companyId, ctx.companyId));
        const [linkedExec] = await db.select({ id: eoTable.id }).from(eoTable).where(and(...linkedExecConds)).limit(1);
        if (linkedExec) {
          const execUpdate: Record<string, any> = {};
          if (budgetData.clientName) execUpdate.clientName = budgetData.clientName;
          if (budgetData.clientPhone) execUpdate.clientPhone = budgetData.clientPhone;
          if (budgetData.clientAddress) execUpdate.clientAddress = budgetData.clientAddress;
          await updateExecutionOrder(linkedExec.id, execUpdate, ctx.companyId ?? undefined);
        }
      }
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteBudget(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "sent", "accepted", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateBudget(input.id, { status: input.status }, ctx.companyId ?? undefined);
      return { success: true };
    }),

  reactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verifica se o orçamento está realmente recusado antes de reativar
      const budget = await getBudgetById(input.id);
      if (!budget) throw new TRPCError({ code: 'NOT_FOUND', message: 'Orçamento não encontrado' });
      if (budget.status !== 'rejected') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas orçamentos recusados podem ser reativados' });
      }
      // Move de volta para pendente e desmarca como vendido
      await updateBudget(input.id, { status: 'pending', sold: false }, ctx.companyId ?? undefined);
      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Busca o orçamento original com seus itens (restrito à empresa)
      const original = await getBudgetById(input.id, ctx.companyId ?? undefined);
      if (!original) throw new Error("Orçamento não encontrado");
      const originalItems = await getBudgetItems(input.id, ctx.companyId ?? undefined);

      // Cria cópia com status pendente
      const result = await createBudget({
        clientId: original.clientId,
        clientName: original.clientName,
        clientPhone: original.clientPhone,
        clientAddress: original.clientAddress || "",
        subtotal: String(original.subtotal),
        discountType: (original.discountType as "fixed" | "percent") || "fixed",
        discountValue: String(original.discountValue || "0"),
        total: String(original.total),
        notes: original.notes || "",
        videos: original.videos || "",
        validDays: original.validDays || 7,
        paymentConditions: original.paymentConditions || "",
        status: "pending",
      }, exigirEmpresa(ctx.companyId));
      const newId = (result as any)[0]?.insertId;

      // Copia todos os itens
      if (newId && originalItems.length > 0) {
        for (const item of originalItems) {
          await addBudgetItem({
            budgetId: newId,
            serviceId: item.serviceId || undefined,
            name: item.name,
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            subtotal: String(item.subtotal),
          }, ctx.companyId ?? undefined);
        }
      }
      return { success: true, id: newId };
    }),
});

// ==================== SETTINGS ROUTER ====================
const SETTINGS_DEFAULTS = {
  card_fee_1x: "0",
  card_fee_2x: "3.5",
  card_fee_3x: "5.0",
  valid_days: "7",
  company_name: "",
  company_phone: "",
  company_email: "",
  company_cnpj: "",
  company_owner: "",
  owner_name: "",
  company_address: "",
  company_city: "",
  company_state: "",
  company_description: "",
  google_rating: "",
  google_review_count: "",
  show_sobre_nos: "false",
  show_google_reviews: "false",
  pix_key: "",
  pix_key_type: "cpf",
  bank_name: "",
  bank_agency: "",
  bank_account: "",
  bank_account_type: "",
  monthly_goal: "0",
  logo_url: "",
  primary_color: "",
  secondary_color: "",
  budget_template: "premium",
  deslocamento_ativo: "false",
  payment_methods_config: JSON.stringify([
    { id: "cash", label: "Espécie", enabled: true, discountPercent: 10 },
    { id: "pix", label: "À Vista (Pix / Débito)", enabled: true, discountPercent: 5 },
    { id: "credit_cash", label: "Crédito à Vista", enabled: true, discountPercent: 0 },
    { id: "installments", label: "Cartão Parcelado", enabled: true, discountPercent: 0, maxInstallments: 8, addFee: false }
  ]),
  info_pages: JSON.stringify([
    {
      id: "higienizacao",
      name: "Higienização",
      text: "⏰Tempo estimado de limpeza: 2h a 4h (dependendo do nível de sujeira e tamanho do estofado).\n\n💦Período estimado de secagem total em 4h. Podendo ser maior ou menor de acordo com a ventilação do ambiente.\n\n⚠️ Não recomendamos abafar o local até a SECAGEM TOTAL ⚠️\n\n🔴Não há garantia TOTAL em remoção de manchas ou odores, mas fazemos o possível para eliminar; com produtos, técnicas e maquinários profissionais.\n\n♻️Ao final do serviço seu estofado ficará levemente úmido. 98% de todo líquido aplicado, é extraído! Produtos biodegradaveis e antialérgicos.\n\n🔒Garantimos a remoção de sujeiras e microorganismos.\n\n❌Não nos responsabilizamos por aparecimento de ferrugem, tintas de canetas, espuma, cola ou madeiramento sacando no tecido. O cliente será avisado imediatamente sobre qualquer intercorrência."
    },
    {
      id: "impermeabilizacao",
      name: "Impermeabilização",
      text: "🛡️ A impermeabilização cria uma barreira protetora no tecido, repelindo líquidos e dificultando a penetração de sujeiras.\n\n⏰ Tempo de aplicação: 30 min a 1h dependendo do tamanho do estofado.\n\n💧 O produto é aplicado após a higienização completa e secagem do estofado.\n\n✅ Eficiência máxima após 24h da aplicação. Evite uso intenso neste período.\n\n♻️ Produtos biodegradaveis, antialérgicos e seguros para crianças e animais.\n\n⚠️ A impermeabilização não remove manchas já existentes, apenas protege contra novas.\n\n🔄 Recomendamos reaplicar a cada 12 meses para manter a proteção ideal."
    },
    {
      id: "tapete",
      name: "Tapete",
      text: "🧹 A limpeza de tapetes é realizada com máquinas extratoras profissionais que removem sujeiras profundas, ácaros e microorganismos.\n\n⏰ Tempo de limpeza: 30 min a 2h dependendo do tamanho e estado do tapete.\n\n💦 Secagem: 4 a 8 horas. Em dias úmidos ou sem ventilação, pode levar até 12h.\n\n⚠️ Não dobre ou enrole o tapete antes de secar completamente.\n\n🔴 Manchas antigas ou profundas podem não ser totalmente removidas dependendo do tipo de fibra e tempo de exposição.\n\n♻️ Utilizamos produtos biodegradaveis, seguros para crianças e animais de estimação.\n\n🔒 Garantimos a remoção de sujeiras, ácaros e microorganismos."
    }
  ]),
};

function buildSettingsObject(rows: { key: string; value: string }[]) {
  const obj: Record<string, string> = {};
  for (const row of rows) obj[row.key] = row.value;
  return {
    card_fee_1x: obj.card_fee_1x ?? SETTINGS_DEFAULTS.card_fee_1x,
    card_fee_2x: obj.card_fee_2x ?? SETTINGS_DEFAULTS.card_fee_2x,
    card_fee_3x: obj.card_fee_3x ?? SETTINGS_DEFAULTS.card_fee_3x,
    valid_days: obj.valid_days ?? SETTINGS_DEFAULTS.valid_days,
    company_name: obj.company_name ?? SETTINGS_DEFAULTS.company_name,
    company_phone: obj.company_phone ?? SETTINGS_DEFAULTS.company_phone,
    company_email: obj.company_email ?? SETTINGS_DEFAULTS.company_email,
    company_cnpj: obj.company_cnpj ?? SETTINGS_DEFAULTS.company_cnpj,
    company_owner: obj.company_owner ?? SETTINGS_DEFAULTS.company_owner,
    owner_name: obj.owner_name ?? SETTINGS_DEFAULTS.owner_name,
    company_address: obj.company_address ?? SETTINGS_DEFAULTS.company_address,
    company_city: obj.company_city ?? SETTINGS_DEFAULTS.company_city,
    company_state: obj.company_state ?? SETTINGS_DEFAULTS.company_state,
    company_description: obj.company_description ?? SETTINGS_DEFAULTS.company_description,
    google_rating: obj.google_rating ?? SETTINGS_DEFAULTS.google_rating,
    google_review_count: obj.google_review_count ?? SETTINGS_DEFAULTS.google_review_count,
    show_sobre_nos: obj.show_sobre_nos ?? SETTINGS_DEFAULTS.show_sobre_nos,
    show_google_reviews: obj.show_google_reviews ?? SETTINGS_DEFAULTS.show_google_reviews,
    pix_key: obj.pix_key ?? SETTINGS_DEFAULTS.pix_key,
    pix_key_type: obj.pix_key_type ?? SETTINGS_DEFAULTS.pix_key_type,
    bank_name: obj.bank_name ?? SETTINGS_DEFAULTS.bank_name,
    bank_agency: obj.bank_agency ?? SETTINGS_DEFAULTS.bank_agency,
    bank_account: obj.bank_account ?? SETTINGS_DEFAULTS.bank_account,
    bank_account_type: obj.bank_account_type ?? SETTINGS_DEFAULTS.bank_account_type,
    monthly_goal: obj.monthly_goal ?? SETTINGS_DEFAULTS.monthly_goal,
    logo_url: obj.logo_url ?? SETTINGS_DEFAULTS.logo_url,
    primary_color: obj.primary_color ?? SETTINGS_DEFAULTS.primary_color,
    secondary_color: obj.secondary_color ?? SETTINGS_DEFAULTS.secondary_color,
    budget_template: obj.budget_template ?? SETTINGS_DEFAULTS.budget_template,
    deslocamento_ativo: obj.deslocamento_ativo ?? SETTINGS_DEFAULTS.deslocamento_ativo,
    payment_methods_config: obj.payment_methods_config ?? SETTINGS_DEFAULTS.payment_methods_config,
    info_pages: obj.info_pages ?? SETTINGS_DEFAULTS.info_pages,
  };
}

const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getSettings(ctx.companyId ?? undefined);
    return buildSettingsObject(rows);
  }),
  // Busca configurações de uma empresa específica pelo companyId do orçamento.
  // Usado no BudgetPreview para garantir que logo/cores/template sejam sempre da empresa dona do orçamento.
  getByCompanyId: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      // ctx.companyId === null significa dono do sistema (Manus OAuth) — pode ver qualquer empresa.
      // Se for empresa cliente, só pode ver as próprias configurações.
      const isOwner = ctx.companyId === null;
      if (!isOwner && ctx.companyId !== input.companyId) {
        // Retorna defaults — não vaza dados de outras empresas
        return buildSettingsObject([]);
      }
      const rows = await getSettings(input.companyId);
      return buildSettingsObject(rows);
    }),
  save: protectedProcedure
    .input(z.object({
      card_fee_1x: z.string().optional(),
      card_fee_2x: z.string().optional(),
      card_fee_3x: z.string().optional(),
      valid_days: z.string().optional(),
      company_name: z.string().optional(),
      company_phone: z.string().optional(),
      company_email: z.string().optional(),
      company_cnpj: z.string().optional(),
      company_owner: z.string().optional(),
      company_address: z.string().optional(),
      company_city: z.string().optional(),
      company_description: z.string().optional(),
      google_rating: z.string().optional(),
      google_review_count: z.string().optional(),
      show_sobre_nos: z.string().optional(),
      show_google_reviews: z.string().optional(),
      pix_key: z.string().optional(),
      pix_key_type: z.string().optional(),
      bank_name: z.string().optional(),
      bank_agency: z.string().optional(),
      bank_account: z.string().optional(),
      bank_account_type: z.string().optional(),
      monthly_goal: z.string().optional(),
      logo_url: z.string().optional(),
      primary_color: z.string().optional(),
      secondary_color: z.string().optional(),
      budget_template: z.string().optional(),
      deslocamento_ativo: z.string().optional(),
      payment_methods_config: z.string().optional(),
      info_page_text: z.string().optional(),
      timbrado_responsavel: z.string().optional(),
      // Modelo WhatsApp Profissional
      whatsapp_header_text: z.string().optional(),
      whatsapp_differentials: z.string().optional(),
      whatsapp_closing_text: z.string().optional(),
      whatsapp_template_model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) await upsertSetting(key, value, exigirEmpresa(ctx.companyId));
      }
      return { success: true };
    }),
});

// ==================== COMPETITORS ROUTER ====================
const competitorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCompetitors(ctx.companyId ?? undefined);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      services: z.string().optional(),
      siteUrl: z.string().optional(),
      priceRange: z.string().optional(),
      instagramUrl: z.string().optional(),
      googleUrl: z.string().optional(),
      googleReviews: z.number().int().min(0).optional(),
      googleRating: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // O companyId é obrigatório aqui: sem ele o concorrente ficava órfão
      // (companyId NULL) e nunca aparecia na listagem da própria empresa.
      await createCompetitor({
        name: input.name,
        services: input.services ?? null,
        siteUrl: input.siteUrl ?? null,
        priceRange: input.priceRange ?? null,
        instagramUrl: input.instagramUrl ?? null,
        googleUrl: input.googleUrl ?? null,
        googleReviews: input.googleReviews ?? 0,
        googleRating: input.googleRating ?? null,
        notes: input.notes ?? null,
        lastUpdatedAt: new Date(),
      }, exigirEmpresa(ctx.companyId));
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      services: z.string().optional(),
      siteUrl: z.string().optional(),
      priceRange: z.string().optional(),
      instagramUrl: z.string().optional(),
      googleUrl: z.string().optional(),
      googleReviews: z.number().int().min(0).optional(),
      googleRating: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateCompetitor(id, {
        ...data,
        siteUrl: data.siteUrl ?? undefined,
        googleRating: data.googleRating ?? undefined,
        lastUpdatedAt: new Date(),
      }, ctx.companyId ?? undefined);
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteCompetitor(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),
});

// ==================== COMPETITOR SERVICES ROUTER ====================
const competitorServicesRouter = router({
  list: protectedProcedure
    .input(z.object({ competitorId: z.number() }))
    .query(async ({ input }) => getCompetitorServices(input.competitorId)),

  create: protectedProcedure
    .input(z.object({
      competitorId: z.number(),
      serviceName: z.string().min(1),
      price: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await createCompetitorService(input);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      serviceName: z.string().min(1).optional(),
      price: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCompetitorService(id, data);
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCompetitorService(input.id);
      return { success: true };
    }),
});

// ==================== CRITERIA ROUTER ====================
const criteriaRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getCriteria(ctx.companyId ?? undefined)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      unit: z.string().optional(),
      type: z.enum(["number", "text", "rating", "boolean"]).default("text"),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      await createCriteria(input as any, ctx.companyId ?? undefined);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      unit: z.string().optional(),
      type: z.enum(["number", "text", "rating", "boolean"]).optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateCriteria(id, data, ctx.companyId ?? undefined);
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteCriteria(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),
});

// ==================== SCORES ROUTER ====================
const scoresRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getScores(ctx.companyId ?? undefined)),

  upsert: protectedProcedure
    .input(z.object({
      competitorId: z.number(),
      criteriaId: z.number(),
      value: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertScore(input.competitorId, input.criteriaId, input.value, input.notes, ctx.companyId ?? undefined);
      return { success: true };
    }),
});

// ==================== SERVICE CATEGORIES ROUTER ====================
const serviceCategoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getServiceCategories(ctx.companyId ?? undefined)),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      emoji: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await createServiceCategory(input, exigirEmpresa(ctx.companyId));
      return { success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      emoji: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateServiceCategory(id, data, ctx.companyId ?? undefined);
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteServiceCategory(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),
});

// ==================== CARPET ROUTER (LAVANDERIA) ====================
const carpetRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input, ctx }) => getCarpetOrders(input, ctx.companyId ?? undefined)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Isolamento aplicado na query
      const order = await getCarpetOrderById(input.id, ctx.companyId ?? undefined);
      return order;
    }),

  metrics: protectedProcedure
    .query(async ({ ctx }) => getCarpetMetrics(ctx.companyId ?? undefined)),

  getItems: protectedProcedure
    .input(z.object({ carpetOrderId: z.number() }))
    .query(async ({ input }) => getCarpetItems(input.carpetOrderId)),
  setItems: protectedProcedure
    .input(z.object({
      carpetOrderId: z.number(),
      items: z.array(z.object({
        carpetType: z.string().optional(),
        carpetSize: z.string().optional(),
        carpetColor: z.string().optional(),
        price: z.number().min(0),
        observations: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      await setCarpetItems(input.carpetOrderId, input.items.map(item => ({
        ...item,
        price: String(item.price),
      })) as any);
      return { success: true };
    }),
  create: protectedProcedure
    .input(z.object({
      clientName: z.string().min(1),
      clientPhone: z.string().min(1),
      carpetType: z.string().optional(),
      carpetSize: z.string().optional(),
      carpetColor: z.string().optional(),
      observations: z.string().optional(),
      collectedAt: z.date().optional(),
      expectedDelivery: z.date(),
      price: z.number().min(0),
      notes: z.string().optional(),
      items: z.array(z.object({
        carpetType: z.string().optional(),
        carpetSize: z.string().optional(),
        carpetColor: z.string().optional(),
        price: z.number().min(0),
        observations: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { items, ...orderData } = input;
      const result = await createCarpetOrder({
        ...orderData,
        collectedAt: orderData.collectedAt ?? new Date(),
        price: String(orderData.price),
        companyId: ctx.companyId ?? undefined,
      } as any);
      // Salvar itens individuais se fornecidos
      const orderId = (result as any).insertId;
      if (items && items.length > 0 && orderId) {
        await setCarpetItems(orderId, items.map(item => ({
          ...item,
          price: String(item.price),
        })) as any);
      }
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().min(1).optional(),
      clientPhone: z.string().min(1).optional(),
      carpetType: z.string().optional(),
      carpetSize: z.string().optional(),
      carpetColor: z.string().optional(),
      observations: z.string().optional(),
      collectedAt: z.date().optional(),
      expectedDelivery: z.date().optional(),
      deliveredAt: z.date().nullable().optional(),
      status: z.enum(['collected', 'washing', 'ready', 'delivered']).optional(),
      price: z.number().min(0).optional(),
      paid: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar ownership antes de atualizar
      if (ctx.companyId) {
        const existing = await getCarpetOrderById(input.id, ctx.companyId);
        if (!existing) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
      }
      const { id, price, ...rest } = input;
      await updateCarpetOrder(id, {
        ...rest,
        ...(price !== undefined ? { price: String(price) } : {}),
      } as any, ctx.companyId ?? undefined);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['collected', 'washing', 'ready', 'delivered']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar ownership antes de atualizar
      const order = await getCarpetOrderById(input.id, ctx.companyId ?? undefined);
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tapete não encontrado' });
      const updates: any = { status: input.status };
      if (input.status === 'delivered') updates.deliveredAt = new Date();
      await updateCarpetOrder(input.id, updates, ctx.companyId ?? undefined);
      // Tapetes são apenas controle interno — não geram venda financeira.
      return { success: true };
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteCarpetOrder(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),

  getPhotos: protectedProcedure
    .input(z.object({ carpetOrderId: z.number() }))
    .query(async ({ input }) => getCarpetPhotos(input.carpetOrderId)),

  addPhoto: protectedProcedure
    .input(z.object({
      carpetOrderId: z.number(),
      photoUrl: z.string().url(),
      photoType: z.enum(['before', 'after', 'other']).default('before'),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await addCarpetPhoto(input as any);
      return { success: true };
    }),

  updatePhotoCaption: protectedProcedure
    .input(z.object({ id: z.number(), caption: z.string() }))
    .mutation(async ({ input }) => {
      await updateCarpetPhotoCaption(input.id, input.caption);
      return { success: true };
    }),

  deletePhoto: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCarpetPhoto(input.id);
      return { success: true };
    }),

  getByClientPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => getCarpetOrdersByPhone(input.phone)),
});

// ==================== CARPET TAGS ROUTER ====================
const carpetTagsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => getAllCarpetTags(ctx.companyId ?? undefined)),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(80),
      color: z.string().default('#6366f1'),
      category: z.enum(['type', 'color', 'dirt', 'other']).default('other'),
    }))
    .mutation(async ({ input, ctx }) => createCarpetTag(input as any, ctx.companyId ?? undefined)),
  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => { await deleteCarpetTag(input.id, ctx.companyId ?? undefined); return { success: true }; }),
  getForOrder: protectedProcedure
    .input(z.object({ carpetOrderId: z.number() }))
    .query(async ({ input, ctx }) => getTagsForOrder(input.carpetOrderId, ctx.companyId ?? undefined)),
  addToOrder: protectedProcedure
    .input(z.object({ carpetOrderId: z.number(), tagId: z.number() }))
    .mutation(async ({ input, ctx }) => { await addTagToOrder(input, ctx.companyId ?? undefined); return { success: true }; }),
  removeFromOrder: protectedProcedure
    .input(z.object({ carpetOrderId: z.number(), tagId: z.number() }))
    .mutation(async ({ input, ctx }) => { await removeTagFromOrder(input.carpetOrderId, input.tagId, ctx.companyId ?? undefined); return { success: true }; }),
  setForOrder: protectedProcedure
    .input(z.object({ carpetOrderId: z.number(), tagIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => { await setTagsForOrder(input.carpetOrderId, input.tagIds, ctx.companyId ?? undefined); return { success: true }; }),
  getOrderIdsByTag: protectedProcedure
    .input(z.object({ tagId: z.number() }))
    .query(async ({ input, ctx }) => getOrderIdsByTag(input.tagId, ctx.companyId ?? undefined)),
});

// ==================== SALES ROUTER ====================
const salesRouter = router({
  getByClientId: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input, ctx }) => getSalesByClientId(input.clientId, ctx.companyId ?? undefined)),
  list: protectedProcedure
    .input(z.object({
      paymentMethod: z.string().optional(),
      paymentStatus: z.string().optional(),
      search: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input, ctx }) => getSales(input, ctx.companyId ?? undefined)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => getSaleById(input.id, ctx.companyId ?? undefined)),

  create: protectedProcedure
    .input(z.object({
      budgetId: z.number().optional(),
      clientName: z.string().default(""),
      clientPhone: z.string().optional(),
      clientId: z.number().optional(),
      total: z.string(),
      paymentMethod: z.string().default('pix'),
      installments: z.number().optional(),
      amountReceived: z.string().optional(),
      paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
      notes: z.string().optional(),
      saleDate: z.date().optional(),
      scheduledDate: z.string().optional(),
      serviceStatus: z.enum(['scheduled', 'completed']).optional(),
      transactionType: z.enum(['receita', 'despesa']).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      paymentDueDays: z.number().optional(),   // prazo em dias para pagamento programado
      paymentDueDate: z.string().optional(),   // data de vencimento calculada YYYY-MM-DD
    }))
    .mutation(async ({ input, ctx }) => {
      const sale = await createSale(input as any, exigirEmpresa(ctx.companyId));
      // Atualiza LTV do cliente se tiver telefone e pagamento confirmado
      if (input.clientPhone && input.paymentStatus === 'paid') {
        await updateClientLTV(input.clientPhone);
      }
      // Auto-configura reativação de 180 dias para o cliente (se não tiver uma já definida)
      if (input.clientId && ctx.companyId) {
        const today = new Date().toISOString().split('T')[0];
        await setClientReactivation(input.clientId, ctx.companyId, 180, today);
      }
      return sale;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      budgetId: z.number().optional(),
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      clientId: z.number().optional(),
      total: z.string().optional(),
      paymentMethod: z.enum(['pix', 'card', 'cash', 'boleto', 'card_1x', 'card_2x', 'card_3x', 'card_2x_ant', 'card_3x_ant']).optional(),
      installments: z.number().optional(),
      amountReceived: z.string().optional(),
      paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
      notes: z.string().optional(),
      saleDate: z.date().optional(),
      scheduledDate: z.string().optional(),
      serviceStatus: z.enum(['scheduled', 'completed']).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const sale = await updateSale(id, data as any, ctx.companyId ?? undefined);
      // Atualiza LTV se pagamento confirmado
      if (data.clientPhone && data.paymentStatus === 'paid') {
        await updateClientLTV(data.clientPhone);
      }
      return sale;
    }),

  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteSale(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),

  metrics: protectedProcedure
    .query(async ({ ctx }) => getSaleMetrics(ctx.companyId ?? undefined)),

  getReceipts: protectedProcedure
    .input(z.object({ saleId: z.number() }))
    .query(async ({ input, ctx }) => getSaleReceipts(input.saleId, ctx.companyId ?? undefined)),

  addReceipt: protectedProcedure
    .input(z.object({
      saleId: z.number(),
      receiptUrl: z.string(),
      receiptKey: z.string().optional(),
      receiptType: z.enum(['pix', 'card', 'cash', 'boleto', 'other']).optional(),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => addSaleReceipt(input as any, ctx.companyId ?? undefined)),

  deleteReceipt: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteSaleReceipt(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),

  deleteByBudgetId: managementProcedure
    .input(z.object({ budgetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteSaleByBudgetId(input.budgetId, ctx.companyId ?? undefined);
      return { success: true };
    }),

  pending: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input, ctx }) => getPendingSales({ ...input, companyId: ctx.companyId ?? undefined })),

  // Marca o serviço como realizado (muda serviceStatus para completed e paymentStatus para pending)
  markAsCompleted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const sale = await updateSale(input.id, {
        serviceStatus: 'completed',
        paymentStatus: 'pending',
      } as any, ctx.companyId ?? undefined);
      return sale;
    }),

  // Registra o pagamento após o serviço ser realizado
  registerPayment: protectedProcedure
    .input(z.object({
      id: z.number(),
      paymentMethod: z.enum(['pix', 'card', 'cash', 'boleto', 'card_1x', 'card_2x', 'card_3x', 'card_2x_ant', 'card_3x_ant']),
      installments: z.number().optional(),
      notes: z.string().optional(),
      amountReceived: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, amountReceived, ...data } = input;
      const sale = await updateSale(id, {
        ...data,
        paymentStatus: 'paid',
        amountReceived: amountReceived ?? undefined,
      } as any, ctx.companyId ?? undefined);
      // Atualiza LTV do cliente
      const saleData = await getSaleById(id, ctx.companyId ?? undefined);
      if (saleData?.clientPhone) {
        await updateClientLTV(saleData.clientPhone);
      }
      return sale;
    }),

  monthlyRevenue: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input, ctx }) => getMonthlyRevenueByYear(input.year, ctx.companyId ?? undefined)),

  // Busca venda vinculada a um orçamento (para evitar duplicatas)
  getByBudgetId: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const { sales: salesTable } = await import('../drizzle/schema');
      const [sale] = await db.select().from(salesTable).where(eq(salesTable.budgetId, input.budgetId)).limit(1);
      return sale ?? null;
    }),

  // Conclui o serviço: atualiza venda existente OU cria nova venda + registra pagamento + up-sell
  concludeWithPayment: protectedProcedure
    .input(z.object({
      saleId: z.number().optional(),           // se existir, atualiza; se não, cria
      budgetId: z.number().optional(),         // fallback: busca venda pelo orçamento vinculado
      executionOrderId: z.number(),
      paymentMethod: z.enum(['pix', 'card', 'cash', 'boleto', 'card_1x', 'card_2x', 'card_3x', 'card_2x_ant', 'card_3x_ant']),
      installments: z.number().optional(),
      total: z.string(),
      amountReceived: z.string().optional(),
      notes: z.string().optional(),
      receiptUrl: z.string().optional(),
      receiptKey: z.string().optional(),
      // Dados da OS para criar venda quando não existe
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      clientId: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { saleId, budgetId, executionOrderId, receiptUrl, receiptKey, total, amountReceived, notes,
              clientName, clientPhone, clientId, description, ...paymentData } = input;

      let resolvedSaleId = saleId;

      // Anti-duplicata: busca em 3 camadas antes de criar nova venda
      if (!resolvedSaleId) {
        const db = await getDb();
        if (db) {
          const { sales: salesTable, executionOrders: execTable } = await import('../drizzle/schema');

          // Camada 1: saleId direto na própria OS (agendamento criado a partir de venda)
          // Restringe à empresa do usuário para não resolver uma OS de outra empresa.
          const execConds: any[] = [eq(execTable.id, executionOrderId)];
          if (ctx.companyId) execConds.push(eq(execTable.companyId, ctx.companyId));
          const [execOrder] = await db.select().from(execTable).where(and(...execConds)).limit(1);
          if (execOrder?.saleId) {
            resolvedSaleId = execOrder.saleId;
          }

          // Camada 2: venda vinculada ao budgetId da OS
          if (!resolvedSaleId && (budgetId || execOrder?.budgetId)) {
            const bid = budgetId ?? execOrder?.budgetId;
            if (bid) {
              const saleConds: any[] = [eq(salesTable.budgetId, bid)];
              if (ctx.companyId) saleConds.push(eq(salesTable.companyId, ctx.companyId));
              const [existingSale] = await db.select().from(salesTable).where(and(...saleConds)).limit(1);
              if (existingSale) resolvedSaleId = existingSale.id;
            }
          }
        }
      }

      // Atualiza a venda existente — NUNCA cria nova venda
      if (resolvedSaleId) {
        await updateSale(resolvedSaleId, {
          ...paymentData,
          total,
          paymentStatus: 'paid',
          serviceStatus: 'completed',
          amountReceived: amountReceived ?? total,
          notes: notes ?? undefined,
        } as any, ctx.companyId ?? undefined);
      }

      // 2. Marcar execução como concluída
      await updateExecutionOrder(executionOrderId, { status: 'done' } as any);

      // 3. Salvar comprovante se enviado
      if (receiptUrl && receiptKey && resolvedSaleId) {
        await addSaleReceipt({ saleId: resolvedSaleId, receiptUrl, receiptKey, receiptType: 'other' } as any, ctx.companyId ?? undefined);
      }

      // 4. Atualizar LTV do cliente
      if (resolvedSaleId) {
        const saleData = await getSaleById(resolvedSaleId, ctx.companyId ?? undefined);
        if (saleData?.clientPhone) {
          await updateClientLTV(saleData.clientPhone);
        }
      }

      return { success: true, saleId: resolvedSaleId ?? null };
    }),
});

// ==================== USERS MANAGEMENT ROUTER ====================
const usersRouter = router({
  list: protectedProcedure.query(async () => getUsers()),
  setRole: protectedProcedure
    .input(z.object({
      openId: z.string(),
      role: z.enum(['user', 'admin', 'master', 'secretaria', 'funcionario']),
    }))
    .mutation(async ({ input }) => {
      await setUserRole(input.openId, input.role);
      return { success: true };
    }),
});

// ==================== EXECUTION ROUTER ====================
const executionRouter = router({
  list: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
      assignedTo: z.string().optional(),
      clientSearch: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => getExecutionOrders(input, ctx.companyId ?? undefined)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => getExecutionOrderById(input.id, ctx.companyId ?? undefined)),

  metrics: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => getExecutionMetrics(input?.date, ctx.companyId ?? undefined)),

  dashboardMetrics: protectedProcedure
    .input(z.object({
      month: z.string().optional(),
      year: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => getExecutionDashboardMetrics(input?.month, input?.year, ctx.companyId ?? undefined)),

  weeklyOrders: protectedProcedure
    .query(async () => getWeeklyExecutionOrders()),
  weeklyStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const { executionOrders: eoTable } = await import('../drizzle/schema');
      const { and: andOp, eq: eqOp, gte: gteOp, lte: lteOp } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return { doneThisWeek: 0, totalThisWeek: 0 };
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const conditions: any[] = [
        gteOp(eoTable.scheduledDate, fmt(monday)),
        lteOp(eoTable.scheduledDate, fmt(sunday)),
      ];
      if (ctx.companyId) conditions.push(eqOp(eoTable.companyId, ctx.companyId));
      const orders = await db.select({ status: eoTable.status })
        .from(eoTable)
        .where(andOp(...conditions));
      return {
        doneThisWeek: orders.filter((o: any) => o.status === 'done').length,
        totalThisWeek: orders.length,
      };
    }),
  upsellList: protectedProcedure
    .input(z.object({
      month: z.string().optional(),
      year: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const now = new Date();
      const targetMonth = input?.month ? parseInt(input.month) : now.getMonth() + 1;
      const targetYear = input?.year ? parseInt(input.year) : now.getFullYear();
      const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      const endDay = new Date(targetYear, targetMonth, 0).getDate();
      const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      const { getDb } = await import('./db');
      const { executionOrders: eoTable, upsellItems: uiTable } = await import('../drizzle/schema');
      const { gte, lte, and: andOp, eq: eqOp } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      const conds: any[] = [
        gte(eoTable.scheduledDate, startDate),
        lte(eoTable.scheduledDate, endDate),
      ];
      if (ctx.companyId) conds.push(eqOp(eoTable.companyId, ctx.companyId));
      const orders = await db.select({
        id: eoTable.id,
        clientName: eoTable.clientName,
        clientPhone: eoTable.clientPhone,
        scheduledDate: eoTable.scheduledDate,
        status: eoTable.status,
      }).from(eoTable).where(andOp(...conds));
      if (orders.length === 0) return [];
      const orderIds = orders.map((o: any) => o.id);
      const { sql: sqlFn } = await import('drizzle-orm');
      const upsells = await db.select({
        executionOrderId: uiTable.executionOrderId,
        description: uiTable.description,
        total: uiTable.total,
      }).from(uiTable)
        .where(sqlFn`${uiTable.executionOrderId} IN (${sqlFn.join(orderIds.map((id: number) => sqlFn`${id}`), sqlFn`, `)})`);
      const upsellsByOrder: Record<number, { description: string; total: string }[]> = {};
      for (const u of upsells) {
        if (!upsellsByOrder[u.executionOrderId]) upsellsByOrder[u.executionOrderId] = [];
        upsellsByOrder[u.executionOrderId].push({ description: u.description, total: u.total });
      }
      return orders
        .filter((o: any) => (upsellsByOrder[o.id] ?? []).length > 0)
        .map((o: any) => ({
          ...o,
          upsells: upsellsByOrder[o.id] ?? [],
          upsellTotal: (upsellsByOrder[o.id] ?? []).reduce((s: number, u: any) => s + parseFloat(u.total ?? '0'), 0),
        }));
    }),

  create: protectedProcedure
    .input(z.object({
      saleId: z.number().optional(),
      budgetId: z.number().optional(),
      clientId: z.number().optional(),
      clientName: z.string().min(1),
      clientPhone: z.string().optional(),
      street: z.string().optional(),
      addressNumber: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      serviceDescription: z.string().optional(),
      totalValue: z.string().optional(),
      scheduledDate: z.string(),
      scheduledTime: z.string().optional(),
      assignedTo: z.string().optional(),
      assignedMemberId: z.number().optional(),
      teamId: z.number().optional(),
      observations: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createExecutionOrder({ ...input, companyId: ctx.companyId ?? undefined } as any);
      // Enviar e-mail de notificação para o gestor da empresa
      try {
        const settingsRows = await getSettings(ctx.companyId ?? undefined);
        const settingsObj: Record<string, string> = {};
        for (const row of settingsRows) settingsObj[row.key] = row.value;
        const companyEmail = settingsObj['company_email'];
        const companyName = settingsObj['company_name'] || 'Higifácil';
        if (companyEmail) {
          const dateFormatted = new Date(input.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR');
          await sendAppointmentEmail({
            to: companyEmail,
            companyName,
            clientName: input.clientName,
            scheduledDate: dateFormatted,
            scheduledTime: input.scheduledTime,
            serviceDescription: input.serviceDescription,
            totalValue: input.totalValue,
            assignedTo: input.assignedTo,
            createdBy: ctx.user.name ?? ctx.user.openId,
          }).catch(() => {}); // Não falhar se e-mail falhar
        }
      } catch { /* silencioso */ }
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      street: z.string().optional(),
      addressNumber: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      serviceDescription: z.string().optional(),
      totalValue: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      status: z.enum(['pending', 'done', 'cancelled']).optional(),
      assignedTo: z.string().optional(),
      assignedMemberId: z.number().optional(),
      teamId: z.number().optional(),
      observations: z.string().optional(),
      receiptUrl: z.string().optional(),
      receiptKey: z.string().optional(),
      notes: z.string().optional(),
      completedAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateExecutionOrder(id, data as any, ctx.companyId ?? undefined);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'done', 'cancelled']),
    }))
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === 'done') updateData.completedAt = new Date();
      await updateExecutionOrder(input.id, updateData as any, ctx.companyId ?? undefined);
      // Criar notificação interna quando OS for concluída
      if (input.status === 'done') {
        const order = await getExecutionOrderById(input.id, ctx.companyId ?? undefined);
        const upsellTotal = await getUpsellTotal(input.id);
        if (order) {
          const upsellInfo = upsellTotal > 0
            ? ` | Upsell: R$ ${upsellTotal.toFixed(2).replace('.', ',')}`
            : '';
          await createAppNotification({
            type: 'success',
            title: `OS Concluída: ${order.clientName}`,
            message: `${order.serviceDescription ?? 'Serviço'}${upsellInfo}`,
            referenceId: input.id,
            referenceType: 'execution_order',
          }, ctx.companyId ?? undefined).catch(() => {});
        }
      }
      return { success: true };
    }),
  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteExecutionOrder(input.id, ctx.companyId ?? undefined);
      return { success: true };
    }),

  // Upsell items
  getUpsell: protectedProcedure
    .input(z.object({ executionOrderId: z.number() }))
    .query(async ({ input }) => getUpsellItems(input.executionOrderId)),

  addUpsell: protectedProcedure
    .input(z.object({
      executionOrderId: z.number(),
      description: z.string().min(1),
      quantity: z.number().default(1),
      unitPrice: z.string(),
      total: z.string(),
    }))
    .mutation(async ({ input }) => createUpsellItem(input as any)),

  deleteUpsell: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteUpsellItem(input.id);
      return { success: true };
    }),

  // Service Items (múltiplos serviços por agendamento)
  getServiceItems: protectedProcedure
    .input(z.object({ executionOrderId: z.number() }))
    .query(async ({ input }) => getExecutionServiceItems(input.executionOrderId)),
  setServiceItems: protectedProcedure
    .input(z.object({
      executionOrderId: z.number(),
      items: z.array(z.object({
        serviceName: z.string().min(1),
        serviceId: z.number().optional(),
        quantity: z.number().min(1).default(1),
        unitPrice: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      await setExecutionServiceItems(input.executionOrderId, input.items);
      // Atualizar totalValue da OS com o somatório
      const total = input.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
      await updateExecutionOrder(input.executionOrderId, { totalValue: String(total) }, ctx.companyId ?? undefined);
      return { success: true, total };
    }),
  getServiceItemsTotals: protectedProcedure
    .input(z.object({ orderIds: z.array(z.number()) }))
    .query(async ({ input }) => getServiceItemsTotalsByOrders(input.orderIds)),
  getUpsellTotals: protectedProcedure
    .input(z.object({ orderIds: z.array(z.number()) }))
    .query(async ({ input }) => getUpsellTotalsByOrders(input.orderIds)),
  // Photos
  getPhotos: protectedProcedure
    .input(z.object({ executionOrderId: z.number() }))
    .query(async ({ input }) => getExecutionPhotos(input.executionOrderId)),

  addPhoto: protectedProcedure
    .input(z.object({
      executionOrderId: z.number(),
      photoUrl: z.string(),
      photoKey: z.string().optional(),
      photoType: z.enum(['before', 'after', 'other']).default('before'),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input }) => addExecutionPhoto(input as any)),

  deletePhoto: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteExecutionPhoto(input.id);
      return { success: true };
    }),

  // Histórico de OS por cliente
  getByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => getExecutionOrdersByClient(input.clientId)),

  getByPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => getExecutionOrdersByPhone(input.phone)),
  // Buscar OS vinculada a uma venda (para exibir upsell na tela de Vendas)
  getBySaleId: protectedProcedure
    .input(z.object({ saleId: z.number() }))
    .query(async ({ input }) => {
      const { getDb } = await import('./db');
      const { executionOrders, upsellItems } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return null;
      const [order] = await db.select().from(executionOrders).where(eq(executionOrders.saleId, input.saleId)).limit(1);
      if (!order) return null;
      const upsell = await db.select().from(upsellItems).where(eq(upsellItems.executionOrderId, order.id));
      return { order, upsellItems: upsell };
    }),

  // Pública: buscar OS por token de confirmação
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const { executionOrders } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select().from(executionOrders).where(eq(executionOrders.confirmToken, input.token)).limit(1);
      if (!order) throw new Error("Token inválido ou expirado");
      return order;
    }),
  // Pública: cliente confirma presença
  confirmByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const { executionOrders } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select().from(executionOrders).where(eq(executionOrders.confirmToken, input.token)).limit(1);
      if (!order) throw new Error("Token inválido");
      await db.update(executionOrders)
        .set({ clientConfirmed: true, clientConfirmedAt: new Date() })
        .where(eq(executionOrders.confirmToken, input.token));
      return { success: true, clientName: order.clientName, scheduledDate: order.scheduledDate };
    }),
});
// ==================== TEAMS ROUTER =====================
const teamsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getTeams(ctx.companyId ?? undefined)),
  listWithMembers: protectedProcedure.query(async ({ ctx }) => {
    const allTeams = await getTeams();
    const allMembers = await getTeamMembers();
    return allTeams.map((t: any) => ({
      ...t,
      members: allMembers.filter((m: any) => m.teamId === t.id),
    }));
  }),
  activeMembers: protectedProcedure.query(async () => getAllActiveMembers()),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createTeam(input as any);
      return { success: true, id: result.id };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateTeam(id, data as any);
      return { success: true };
    }),
  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTeam(input.id);
      return { success: true };
    }),
  // Members
  addMember: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      name: z.string().min(1),
      phone: z.string().optional(),
      role: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createTeamMember(input as any);
      return { success: true, id: result.id };
    }),
  updateMember: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      role: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateTeamMember(id, data as any);
      return { success: true };
    }),
  deleteMember: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTeamMember(input.id);
      return { success: true };
    }),
});

// ==================== EXECUTION CARPETS ROUTER ====================
const executionCarpetsRouter = router({
  list: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => getExecutionCarpets(input ?? {})),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => getExecutionCarpetById(input.id)),
  create: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      clientName: z.string().min(1),
      clientPhone: z.string().optional(),
      street: z.string().optional(),
      addressNumber: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      carpetType: z.string().optional(),
      widthMeters: z.string().optional(),
      lengthMeters: z.string().optional(),
      squareMeters: z.string().optional(),
      dirtLevel: z.enum(['light', 'moderate', 'heavy']).default('light'),
      observations: z.string().optional(),
      scheduledDate: z.string(),
      scheduledTime: z.string().optional(),
      assignedTo: z.string().optional(),
      assignedMemberId: z.number().optional(),
      totalValue: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createExecutionCarpet(input as any);
      return { success: true, id: result.id, orderNumber: result.orderNumber };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      street: z.string().optional(),
      addressNumber: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      carpetType: z.string().optional(),
      widthMeters: z.string().optional(),
      lengthMeters: z.string().optional(),
      squareMeters: z.string().optional(),
      dirtLevel: z.enum(['light', 'moderate', 'heavy']).optional(),
      observations: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      assignedTo: z.string().optional(),
      assignedMemberId: z.number().optional(),
      status: z.enum(['pending', 'done', 'cancelled']).optional(),
      totalValue: z.string().optional(),
      notes: z.string().optional(),
      completedAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateExecutionCarpet(id, data as any);
      return { success: true };
    }),
  delete: managementProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteExecutionCarpet(input.id);
      return { success: true };
    }),
  // Photos
  getPhotos: protectedProcedure
    .input(z.object({ executionCarpetId: z.number() }))
    .query(async ({ input }) => getExecutionCarpetPhotos(input.executionCarpetId)),
  addPhoto: protectedProcedure
    .input(z.object({
      executionCarpetId: z.number(),
      photoUrl: z.string(),
      photoKey: z.string().optional(),
      photoType: z.enum(['before', 'after', 'other']).default('before'),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input }) => addExecutionCarpetPhoto(input as any)),
  deletePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteExecutionCarpetPhoto(input.id);
      return { success: true };
    }),
});

// ==================== AI ROUTER ====================
const aiRouter = router({
  suggestBudget: protectedProcedure
    .input(z.object({
      clientName: z.string(),
      clientPhone: z.string().optional(),
      context: z.string().optional(), // ex: "sofá 3 lugares, muito sujo"
    }))
    .mutation(async ({ input }) => {
      const [history, popularServices] = await Promise.all([
        input.clientPhone ? getClientHistoryForAI(input.clientPhone) : Promise.resolve({ budgets: [], sales: [], executions: [] }),
        getMostSoldServices(8),
      ]);

      const historyText = history.executions.length > 0
        ? `Histórico do cliente: ${history.executions.map((e: any) => `${e.serviceDescription} (${e.scheduledDate})`).join('; ')}`
        : 'Cliente novo, sem histórico.';

      const popularText = popularServices.length > 0
        ? `Serviços mais vendidos: ${popularServices.map((s: any) => `${s.name} (média R$${Number(s.avgPrice).toFixed(0)})`).join(', ')}`
        : '';

      const prompt = `Você é um assistente de orçamentos para uma empresa de higienização de estofados chamada SOS Limpa Tudo.

Cliente: ${input.clientName}
${historyText}
${popularText}
${input.context ? `Contexto adicional: ${input.context}` : ''}

Com base nessas informações, sugira:
1. Uma lista de serviços recomendados (máximo 4 itens) com nome e valor estimado em reais
2. Uma observação personalizada para o orçamento (2-3 frases, tom profissional e amigável)
3. Um desconto sugerido (0%, 5% ou 10%) com justificativa

Responda em JSON com este formato exato:
{
  "services": [{"name": string, "price": number, "reason": string}],
  "notes": string,
  "discount": number,
  "discountReason": string
}`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em orçamentos de higienização de estofados. Sempre responda em JSON válido.' },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'budget_suggestion',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                services: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      price: { type: 'number' },
                      reason: { type: 'string' },
                    },
                    required: ['name', 'price', 'reason'],
                    additionalProperties: false,
                  },
                },
                notes: { type: 'string' },
                discount: { type: 'number' },
                discountReason: { type: 'string' },
              },
              required: ['services', 'notes', 'discount', 'discountReason'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      return parsed;
    }),

  generateReactivationMessage: protectedProcedure
    .input(z.object({
      clientName: z.string(),
      clientPhone: z.string(),
      daysSinceContact: z.number().nullable(),
      lastService: z.string().optional(),
      companyName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Crie uma mensagem de WhatsApp para reativar um cliente de higienização de estofados.

Empresa: ${input.companyName || 'SOS Limpa Tudo'}
Cliente: ${input.clientName}
${input.daysSinceContact ? `Último contato: há ${input.daysSinceContact} dias` : 'Cliente sem histórico de serviços'}
${input.lastService ? `Último serviço: ${input.lastService}` : ''}

A mensagem deve:
- Ser informal e amigável, mas profissional
- Mencionar o tempo sem contato (se disponível)
- Oferecer uma nova higienização
- Ter no máximo 3 parágrafos curtos
- Terminar com CTA claro
- NÃO usar emojis em excesso (máximo 2)

Responda em JSON com: { "message": string, "subject": string }`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Você escreve mensagens de WhatsApp para empresas de higienização. Responda em JSON válido.' },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'reactivation_message',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                subject: { type: 'string' },
              },
              required: ['message', 'subject'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      return JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    }),
});

// ==================== CRM ROUTER ====================
const crmRouter = router({
  inactiveClients: protectedProcedure
    .input(z.object({ daysSince: z.number().default(180) }))
    .query(async ({ input, ctx }) => {
      return getInactiveClients(input.daysSince, ctx.companyId ?? undefined);
    }),

  // Reativação / Régua de Relacionamento
  todayReactivations: protectedProcedure
    .query(async ({ ctx }) => {
      return getTodayReactivationClients(ctx.companyId ?? undefined);
    }),

  allReactivations: protectedProcedure
    .query(async ({ ctx }) => {
      return getAllReactivationClients(ctx.companyId ?? undefined);
    }),

  setReactivation: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      reactivationDays: z.number().min(1).max(3650),
      lastServiceDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return setClientReactivation(
        input.clientId,
        ctx.companyId ?? 0,
        input.reactivationDays,
        input.lastServiceDate,
      );
    }),

  removeReactivation: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return removeClientReactivation(input.clientId, ctx.companyId ?? 0);
    }),

  // Gerador de mensagens de relacionamento por IA
  generateRelationshipMessage: protectedProcedure
    .input(z.object({
      clientName: z.string(),
      style: z.enum(['positivo', 'biblico', 'feriado', 'fimdesemana', 'semana', 'aleatorio']).default('aleatorio'),
    }))
    .mutation(async ({ input }) => {
      const styleGuide: Record<string, string> = {
        positivo: 'uma mensagem positiva e motivacional, sobre esperança e dias melhores',
        biblico: 'uma mensagem com referência bíblica ou cristã, com versículo ou benção, algo que transmita fé e paz',
        feriado: 'uma mensagem desejando um ótimo feriado, leve e acolhedora',
        fimdesemana: 'uma mensagem desejando um ótimo fim de semana, descontraída e calorosa',
        semana: 'uma mensagem desejando uma ótima semana, com energia positiva',
        aleatorio: 'uma mensagem aleatória entre: positiva/motivacional, bíblica/cristã, desejo de bom fim de semana ou boa semana',
      };
      const guide = styleGuide[input.style] ?? styleGuide.aleatorio;
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que gera mensagens de relacionamento para um prestador de serviços enviar a seus clientes pelo WhatsApp. As mensagens devem ser: calorosas, pessoais, curtas (máximo 3 linhas), nunca mencionar serviços, preços ou vendas, e sempre terminar com um emoji de coração. Use o nome do cliente no início da mensagem. Escreva em português brasileiro informal e acolhedor. Não use asteriscos nem formatação markdown.`,
          },
          {
            role: 'user',
            content: `Gere ${guide} para o cliente chamado ${input.clientName}. A mensagem deve ser única e parecer genuinamente pessoal.`,
          },
        ],
      });
      const message = (response as any)?.choices?.[0]?.message?.content ?? '';
      return { message: message.trim() };
    }),
});
// ==================== REVIEW ROUTER =====================
// ==================== CANCELLED ORDERS ROUTER ====================
const cancelledRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getCancelledOrders(ctx.companyId ?? undefined)),
  create: protectedProcedure
    .input(z.object({
      originalOrderId: z.number().optional(),
      clientName: z.string(),
      clientPhone: z.string().optional(),
      serviceDescription: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      assignedTo: z.string().optional(),
      totalValue: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await createCancelledOrder({
        originalOrderId: input.originalOrderId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        serviceDescription: input.serviceDescription,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        assignedTo: input.assignedTo,
        totalValue: input.totalValue,
        reason: input.reason,
        companyId: exigirEmpresa(ctx.companyId),
      });
      return { success: true };
    }),
});

const reviewRouter = router({
  submit: publicProcedure
    .input(z.object({ token: z.string(), rating: z.number().min(1).max(5), comment: z.string().optional() }))
    .mutation(async ({ input }) => {
      const review = await getReviewByToken(input.token);
      if (!review) throw new Error('Link invalido.');
      if (review.respondedAt) throw new Error('Ja avaliado.');
      return submitReview(input.token, input.rating, input.comment);
    }),
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const review = await getReviewByToken(input.token);
      if (!review) throw new Error('Link invalido.');
      return review;
    }),
  getByExecution: protectedProcedure
    .input(z.object({ executionOrderId: z.number() }))
    .query(async ({ input }) => {
      return getReviewsByExecutionOrder(input.executionOrderId);
    }),
  stats: protectedProcedure
    .query(async () => {
      return getReviewStats();
    }),
  getByClientPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      return getReviewsByClientPhone(input.phone);
    }),
  createLink: protectedProcedure
    .input(z.object({
      executionOrderId: z.number(),
      clientName: z.string(),
      clientPhone: z.string().optional(),
      serviceDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      await createServiceReview({
        executionOrderId: input.executionOrderId,
        token,
        clientName: input.clientName,
        clientPhone: input.clientPhone ?? null,
        serviceDescription: input.serviceDescription ?? null,
      });
      return { token };
    }),
});

const presetMessagesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getPresetMessages(ctx.companyId ?? undefined);
  }),
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), message: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return createPresetMessage({ ...input, companyId: exigirEmpresa(ctx.companyId) });
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), message: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updatePresetMessage(id, data);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deletePresetMessage(input.id);
    }),
});

const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getAppNotifications(30, ctx.companyId ?? undefined);
  }),
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.companyId ?? undefined);
    return { success: true };
  }),
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await clearAllNotifications(ctx.companyId ?? undefined);
    return { success: true };
  }),
});

// ==================== APP ROUTER ====================
// ==================== COMPANIES ROUTER (MASTER ADMIN) ====================
const companiesRouter = router({
  list: protectedProcedure.query(async () => {
    return getCompanies();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCompanyById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      cnpj: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return createCompany(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      cnpj: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      logoUrl: z.string().optional(),
      plan: z.enum(["trial", "basic", "professional", "premium"]).optional(),
      subscriptionStatus: z.enum(["active", "expired", "blocked", "cancelled"]).optional(),
      subscriptionExpiresAt: z.date().optional(),
      primaryColor: z.string().optional(),
      slug: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCompany(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCompany(input.id);
      return { success: true };
    }),

  metrics: protectedProcedure.query(async () => {
    return getCompanyMetrics();
  }),

  assignUser: protectedProcedure
    .input(z.object({ userId: z.number(), companyId: z.number() }))
    .mutation(async ({ input }) => {
      await assignUserToCompany(input.userId, input.companyId);
      return { success: true };
    }),
});

// ==================== COMPANY AUTH ROUTER ====================
const COMPANY_SESSION_COOKIE = "company_session";

const companyAuthRouter = router({
  // Login da empresa com e-mail e senha
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: 5 tentativas por minuto por IP
      const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) {
        const retryAfter = getRateLimitRetryAfter(ip);
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Muitas tentativas de login. Aguarde ${retryAfter} segundos antes de tentar novamente.` });
      }
      const credential = await getCompanyCredentialByEmail(input.email);
      if (!credential) throw new Error("E-mail ou senha inválidos");
      const valid = await bcrypt.compare(input.password, credential.passwordHash);
      if (!valid) throw new Error("E-mail ou senha inválidos");
      // Buscar dados da empresa
      const company = await getCompanyById(credential.companyId);
      if (!company || !company.active) throw new Error("Empresa inativa ou não encontrada");
      if (company.subscriptionStatus === "blocked") throw new Error("Acesso bloqueado. Entre em contato com o suporte.");
      // Login bem-sucedido: resetar contador
      resetRateLimit(ip);
      // Atualizar lastLoginAt
      await updateCompanyCredential(credential.companyId, { lastLoginAt: new Date() });
      // Criar token JWT assinado com JWT_SECRET
      const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
      const token = await new SignJWT({ companyId: company.id, email: input.email })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);
      const cookieOpts = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COMPANY_SESSION_COOKIE, token, {
        ...cookieOpts,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      return { success: true, company: { id: company.id, name: company.name, plan: company.plan } };
    }),

  // Logout da empresa
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COMPANY_SESSION_COOKIE, { path: '/' });
    return { success: true };
  }),

  // Sessao atual da empresa
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[COMPANY_SESSION_COOKIE];
    if (!token) return null;
    try {
      const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
      const companyId = payload.companyId as number;
      const email = payload.email as string;
      if (!companyId) return null;
      const company = await getCompanyById(companyId);
      if (!company || !company.active) return null;
      return { id: company.id, name: company.name, plan: company.plan, planType: company.planType ?? "free", email };
    } catch { return null; }
  }),

  // Master: definir/redefinir senha de uma empresa
  setPassword: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'master' && ctx.user.role !== 'admin') throw new Error("Acesso negado");
      const hash = await bcrypt.hash(input.password, 10);
      const existing = await getCompanyCredentialByCompanyId(input.companyId);
      if (existing) {
        await updateCompanyCredential(input.companyId, { passwordHash: hash });
      } else {
        await createCompanyCredential({ companyId: input.companyId, email: input.email, passwordHash: hash });
      }
      return { success: true };
    }),

  // Solicitar reset de senha (gera token)
  requestReset: publicProcedure
    .input(z.object({ email: z.string().email(), origin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const credential = await getCompanyCredentialByEmail(input.email);
      if (!credential) return { success: true }; // não revelar se e-mail existe
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await updateCompanyCredential(credential.companyId, { resetToken: token, resetTokenExpiresAt: expiresAt });
      // Buscar nome da empresa
      const company = await getCompanyById(credential.companyId);
      const companyName = company?.name ?? 'Cliente';
      // Montar link de reset
      const baseUrl = input.origin ?? 'https://higifacil.com.br';
      const resetLink = `${baseUrl}/redefinir-senha?token=${token}`;
      // Enviar e-mail real
      await sendPasswordResetEmail({ to: input.email, companyName, resetLink });
      return { success: true };
    }),

  // Redefinir senha com token
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const credential = await getCompanyCredentialByResetToken(input.token);
      if (!credential) throw new Error("Token inválido ou expirado");
      if (!credential.resetTokenExpiresAt || credential.resetTokenExpiresAt < new Date()) {
        throw new Error("Token expirado. Solicite um novo.");
      }
      const hash = await bcrypt.hash(input.newPassword, 10);
      await updateCompanyCredential(credential.companyId, { passwordHash: hash, resetToken: null, resetTokenExpiresAt: null });
      return { success: true };
    }),

  // Verificar se empresa já tem credenciais
  hasCredentials: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const cred = await getCompanyCredentialByCompanyId(input.companyId);
      return { hasCredentials: !!cred, email: cred?.email ?? null };
    }),

  // Login com Google — verifica token Google e faz login pelo e-mail
  loginWithGoogle: publicProcedure
    .input(z.object({
      googleToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar token Google via endpoint de userinfo
      const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { Authorization: `Bearer ${input.googleToken}` },
      });
      if (!googleRes.ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token Google inválido' });
      const googleUser = await googleRes.json() as { email?: string; name?: string; sub?: string };
      const email = googleUser.email;
      if (!email) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail não encontrado no token Google' });

      // Buscar empresa pelo e-mail
      const credential = await getCompanyCredentialByEmail(email);
      if (!credential) throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma conta encontrada com este e-mail Google. Entre em contato com o suporte.' });

      const company = await getCompanyById(credential.companyId);
      if (!company || !company.active) throw new TRPCError({ code: 'FORBIDDEN', message: 'Empresa inativa ou não encontrada' });
      if (company.subscriptionStatus === 'blocked') throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso bloqueado. Entre em contato com o suporte.' });

      // Criar sessão JWT
      const secretKey = new TextEncoder().encode(ENV.cookieSecret || 'fallback-secret-change-me');
      const token = await new SignJWT({ companyId: company.id, email })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secretKey);
      const isProduction = process.env.NODE_ENV === 'production';
      ctx.res.cookie(COMPANY_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      await updateCompanyCredential(credential.companyId, { lastLoginAt: new Date() });
      return { success: true, company: { id: company.id, name: company.name, plan: company.plan } };
    }),
  // Buscar perfil da empresa logada
  getCompanyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const loginMethod = ctx.user?.loginMethod ?? "";
      if (!loginMethod.startsWith("company")) throw new TRPCError({ code: "FORBIDDEN" });
      const companyId = ctx.user!.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const company = await getCompanyById(companyId);
      if (!company) throw new TRPCError({ code: "NOT_FOUND" });
      const credential = await getCompanyCredentialByCompanyId(companyId);
      return {
        name: company.name,
        email: credential?.email ?? company.email ?? "",
        phone: company.phone ?? "",
        ownerName: company.ownerName ?? "",
        ownerPhone: company.ownerPhone ?? "",
        ownerCargo: company.ownerCargo ?? "",
        ownerAvatarUrl: company.ownerAvatarUrl ?? "",
      };
    }),

  // Atualizar perfil do proprietário
  updateCompanyProfile: protectedProcedure
    .input(z.object({
      ownerName: z.string().max(255).optional(),
      ownerPhone: z.string().max(30).optional(),
      ownerCargo: z.string().max(100).optional(),
      ownerAvatarUrl: z.string().max(1024).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const loginMethod = ctx.user?.loginMethod ?? "";
      if (!loginMethod.startsWith("company")) throw new TRPCError({ code: "FORBIDDEN" });
      const companyId = ctx.user!.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await updateCompanyById(companyId, {
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        ownerCargo: input.ownerCargo,
        ownerAvatarUrl: input.ownerAvatarUrl,
      });
      return { success: true };
    }),

  // Trocar senha com confirmação da senha atual
  changePasswordWithConfirmation: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, "Informe a senha atual"),
      newPassword: z.string().min(8, "Senha mínima de 8 caracteres")
        .regex(/[A-Z]/, "Senha deve ter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Senha deve ter ao menos um número"),
    }))
    .mutation(async ({ ctx, input }) => {
      const loginMethod = ctx.user?.loginMethod ?? "";
      if (!loginMethod.startsWith("company")) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas empresas podem usar este endpoint" });
      const companyId = ctx.user!.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const credential = await getCompanyCredentialByCompanyId(companyId);
      if (!credential) throw new TRPCError({ code: "NOT_FOUND", message: "Credenciais não encontradas" });
      const valid = await bcrypt.compare(input.currentPassword, credential.passwordHash);
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Senha atual incorreta" });
      const hash = await bcrypt.hash(input.newPassword, 10);
      await updateCompanyCredential(companyId, { passwordHash: hash });
      return { success: true };
    }),

  // Trocar senha da empresa master logada (sem precisar da senha atual — apenas no primeiro acesso)
  changeMyPassword: protectedProcedure
    .input(z.object({
      newPassword: z.string().min(8, "Senha mínima de 8 caracteres")
        .regex(/[A-Z]/, "Senha deve ter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Senha deve ter ao menos um número"),
    }))
    .mutation(async ({ ctx, input }) => {
      const loginMethod = ctx.user?.loginMethod ?? "";
      if (!loginMethod.startsWith("company")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas empresas podem usar este endpoint" });
      }
      const companyId = ctx.user!.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const hash = await bcrypt.hash(input.newPassword, 10);
      await updateCompanyCredential(companyId, { passwordHash: hash });
      return { success: true };
    }),
});

// ==================== ADMIN ROUTER (Dono do Sistema) ====================
const adminRouter = router({
  // Métricas globais do sistema
    systemMetrics: protectedProcedure.query(async () => {
    return getSystemMetrics();
  }),
  // Listar todas as empresas com stats
  listCompanies: protectedProcedure.query(async () => {
    return getCompanies();
  }),
  // Stats de uma empresa específica
  companyStats: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return getCompanyStats(input.companyId);
    }),

  // Criar empresa + credenciais
  createCompanyWithCredentials: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
      cnpj: z.string().optional(),
      // Planos reais: free = Cortesia, solo = Mensal, equipe = Anual
      plan: z.enum(["free", "solo", "equipe"]).default("free"),
      trialDays: z.number().min(1).max(365).optional(), // apenas para plan=free
      requestId: z.number().optional(), // para marcar solicitação como aprovada
    }))
    .mutation(async ({ input, ctx }) => {
      const company = await createCompany({ name: input.name, email: input.email, phone: input.phone, cnpj: input.cnpj });
      if (!company?.id) throw new Error("Falha ao criar empresa");
      // Atualizar planType e trialEndsAt conforme plano
      const planUpdates: Record<string, unknown> = { planType: input.plan, subscriptionStatus: "active" };
      if (input.plan === "free") {
        const days = input.trialDays ?? 30;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + days);
        planUpdates.trialEndsAt = trialEndsAt;
      } else {
        planUpdates.trialEndsAt = null;
        planUpdates.subscriptionExpiresAt = null;
      }
      await updateCompany(company.id, planUpdates as any);
      const passwordHash = await bcrypt.hash(input.password, 10);
      await createCompanyCredential({ companyId: company.id, email: input.email, passwordHash });
      // Marcar solicitação como aprovada se requestId fornecido
      if (input.requestId) {
        const { updateAccessRequestStatus } = await import("./db");
        await updateAccessRequestStatus(input.requestId, "approved", ctx.user?.name ?? "master");
      }
      // Enviar e-mail de boas-vindas
      const planLabels: Record<string, string> = { free: "Cortesia", solo: "Mensal", equipe: "Anual" };
      try {
        await sendWelcomeEmail({
          to: input.email,
          companyName: input.name,
          email: input.email,
          tempPassword: input.password,
          planName: planLabels[input.plan] ?? "Cortesia",
        });
      } catch (e) {
        console.error("[createCompanyWithCredentials] Falha ao enviar e-mail:", e);
      }
      return { success: true, companyId: company.id };
    }),

  // Bloquear / desbloquear empresa
  toggleBlock: protectedProcedure
    .input(z.object({ companyId: z.number(), block: z.boolean() }))
    .mutation(async ({ input }) => {
      await updateCompany(input.companyId, {
        subscriptionStatus: input.block ? "blocked" : "active",
        active: !input.block,
      });
      return { success: true };
    }),

  // Atualizar empresa (plano, status, dados)
  updateCompany: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      cnpj: z.string().optional(),
      plan: z.enum(["trial", "basic", "professional", "premium"]).optional(),
      subscriptionStatus: z.enum(["active", "expired", "blocked", "cancelled"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCompany(id, data);
      return { success: true };
    }),

  // Redefinir senha de acesso de uma empresa
  resetCompanyPassword: protectedProcedure
    .input(z.object({ companyId: z.number(), newPassword: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const passwordHash = await bcrypt.hash(input.newPassword, 10);
      await updateCompanyCredential(input.companyId, { passwordHash });
      return { success: true };
    }),

  // Listar solicitações de acesso
  listAccessRequests: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input }) => {
      const { accessRequests } = await import("../drizzle/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      const rows = input.status
        ? await db.select().from(accessRequests).where(eqFn(accessRequests.status, input.status as any))
        : await db.select().from(accessRequests);
      return rows;
    }),

  // Listar feedbacks beta
  listFeedbacks: protectedProcedure.query(async () => {
    return getBetaFeedbacks();
  }),
});

export const appRouter = router({
  storage: storageRouter,
  demo: demoRouter,
  bankStatement: bankStatementRouter,
  demoBookings: demoBookingsRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Limpa o cookie OAuth (Manus)
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Limpa o cookie de sessão de empresa master (login por e-mail/senha)
      ctx.res.clearCookie(COMPANY_SESSION_COOKIE, { path: '/' });
      // Limpa o cookie de sessão de sub-usuário da empresa
      ctx.res.clearCookie('company_user_session', { path: '/' });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserById(ctx.user.id);
      }),
  }),
  services: servicesRouter,
  clients: clientsRouter,
  budgets: budgetsRouter,
  budgetSold: router({
    toggle: protectedProcedure
      .input(z.object({ id: z.number(), sold: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await toggleBudgetSold(input.id, input.sold, ctx.companyId ?? undefined);
        return { success: true };
      }),
    yesterdayUnsold: protectedProcedure
      .query(async () => {
        return getYesterdayUnsoldBudgets();
      }),
  }),
  weeklySummary: router({
    pendingList: protectedProcedure
      .query(async ({ ctx }) => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const allBudgets = await getBudgets(undefined, undefined, ctx.companyId ?? undefined);
        return allBudgets
          .filter((b: any) => b.status === 'pending' && b.createdAt >= oneWeekAgo)
          .map((b: any) => ({
            id: b.id,
            budgetNumber: b.budgetNumber,
            clientName: b.clientName,
            clientPhone: b.clientPhone,
            total: b.total,
            createdAt: b.createdAt,
            status: b.status,
          }));
      }),
    send: protectedProcedure
    .mutation(async ({ ctx }) => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allBudgets = await getBudgets(undefined, undefined, ctx.companyId ?? undefined);
      const pendingBudgets = allBudgets.filter((b: any) =>
        b.status === 'pending' && b.createdAt >= oneWeekAgo
      );
      if (pendingBudgets.length === 0) {
        return { success: true, count: 0, message: 'Nenhum orçamento pendente esta semana' };
      }
      const totalValue = pendingBudgets.reduce((sum: number, b: any) => sum + parseFloat(String(b.total ?? 0)), 0);
      const clientList = pendingBudgets.slice(0, 5).map((b: any) => `• ${b.clientName} — R$ ${parseFloat(String(b.total ?? 0)).toFixed(2).replace('.', ',')}`).join('\n');
      const moreText = pendingBudgets.length > 5 ? `\n...e mais ${pendingBudgets.length - 5} orçamento(s)` : '';
      await notifyOwner({
        title: `📊 Resumo Semanal — ${pendingBudgets.length} orçamento(s) aberto(s)`,
        content: `Você tem ${pendingBudgets.length} orçamento(s) pendente(s) esta semana, totalizando R$ ${totalValue.toFixed(2).replace('.', ',')} em negócios por fechar.\n\n${clientList}${moreText}\n\nQue tal entrar em contato com esses clientes hoje?`,
      });
      return { success: true, count: pendingBudgets.length, totalValue };
    }),
  }),
  settings: settingsRouter,
  onboarding: router({
    complete: protectedProcedure
      .input(z.object({
        serviceType: z.enum(['higienizacao', 'ambos']),
        // Etapa 1 — dados da empresa
        ownerName: z.string().optional(),
        companyName: z.string().optional(),
        companyPhone: z.string().optional(),
        companyEmail: z.string().optional(),
        companyCnpj: z.string().optional(),
        companyAddress: z.string().optional(),
        companyCity: z.string().optional(),
        companyState: z.string().optional(),
        // Etapa 3 — modelo de orçamento
        budgetTemplate: z.enum(['premium', 'whatsapp', 'timbrado']).optional(),
        companyDescription: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        // Etapa 4 — formas de pagamento
        payEspecie: z.boolean().optional(),
        payCredito: z.boolean().optional(),
        payCreditoParcelado: z.boolean().optional(),
        // Etapa 5 — perguntas de perfil
        howFoundUs: z.string().optional(),
        mainChallenge: z.string().optional(),
        currentWorkflow: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const empresa = exigirEmpresa(ctx.companyId);
        await upsertSetting('onboarding_done', 'true', empresa);
        await upsertSetting('service_type', input.serviceType, empresa);
        // Se escolheu ambos, ativa impermeabilização automaticamente
        if (input.serviceType === 'ambos') {
          await upsertSetting('has_impermeabilizacao', 'true', empresa);
        }
        // Criar serviços padrão baseados no tipo selecionado (apenas se a empresa não tiver serviços)
        const compId = empresa;
        if (ctx.companyId) {
          const [existingRows] = await rawExecute(
            `SELECT COUNT(*) as cnt FROM services WHERE companyId = ? LIMIT 1`,
            [ctx.companyId]
          );
          const existingCount = Number((existingRows as any[])[0]?.cnt ?? 0);
          if (existingCount === 0) {
            // Serviços de higienização (sempre criados)
            const higienizacaoServices = [
              { name: 'Higienização Sofá 2 Lugares', price: '150.00', category: 'Higienização' },
              { name: 'Higienização Sofá 3 Lugares', price: '200.00', category: 'Higienização' },
              { name: 'Higienização Sofá 4 Lugares', price: '250.00', category: 'Higienização' },
              { name: 'Higienização Sofá 5 Lugares', price: '300.00', category: 'Higienização' },
              { name: 'Higienização Colchão Solteiro', price: '120.00', category: 'Higienização' },
              { name: 'Higienização Colchão Casal', price: '160.00', category: 'Higienização' },
              { name: 'Higienização Colchão Queen', price: '180.00', category: 'Higienização' },
              { name: 'Higienização Colchão King', price: '200.00', category: 'Higienização' },
              { name: 'Higienização Poltrona', price: '80.00', category: 'Higienização' },
              { name: 'Higienização Cadeira', price: '50.00', category: 'Higienização' },
            ];
            for (const svc of higienizacaoServices) {
              await createService({ name: svc.name, price: svc.price, category: svc.category, active: true }, compId);
            }
            // Serviços de impermeabilização (apenas se 'ambos')
            if (input.serviceType === 'ambos') {
              const impermeabilizacaoServices = [
                { name: 'Impermeabilização Sofá 2 Lugares', price: '120.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Sofá 3 Lugares', price: '160.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Sofá 4 Lugares', price: '200.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Sofá 5 Lugares', price: '240.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Colchão Solteiro', price: '100.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Colchão Casal', price: '130.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Colchão Queen', price: '150.00', category: 'Impermeabilização' },
                { name: 'Impermeabilização Colchão King', price: '170.00', category: 'Impermeabilização' },
              ];
              for (const svc of impermeabilizacaoServices) {
                await createService({ name: svc.name, price: svc.price, category: svc.category, active: true }, compId);
              }
            }
          }
        }
        // Salvar dados da empresa
        if (input.ownerName) await upsertSetting('owner_name', input.ownerName, empresa);
        if (input.companyName) await upsertSetting('company_name', input.companyName, empresa);
        if (input.companyPhone) await upsertSetting('company_phone', input.companyPhone, empresa);
        if (input.companyEmail) await upsertSetting('company_email', input.companyEmail, empresa);
        if (input.companyCnpj) await upsertSetting('company_cnpj', input.companyCnpj, empresa);
        if (input.companyAddress) await upsertSetting('company_address', input.companyAddress, empresa);
        if (input.companyCity) await upsertSetting('company_city', input.companyCity, empresa);
        if (input.companyState) await upsertSetting('company_state', input.companyState, empresa);
        // Salvar modelo de orçamento e configurações Premium
        if (input.budgetTemplate) await upsertSetting('budget_template', input.budgetTemplate, empresa);
        if (input.companyDescription) await upsertSetting('company_description', input.companyDescription, empresa);
        if (input.primaryColor) await upsertSetting('primary_color', input.primaryColor, empresa);
        if (input.secondaryColor) await upsertSetting('secondary_color', input.secondaryColor, empresa);
        // Salvar formas de pagamento
        if (input.payEspecie !== undefined) await upsertSetting('pay_especie', input.payEspecie ? 'true' : 'false', empresa);
        if (input.payCredito !== undefined) await upsertSetting('pay_credito', input.payCredito ? 'true' : 'false', empresa);
        if (input.payCreditoParcelado !== undefined) await upsertSetting('pay_credito_parcelado', input.payCreditoParcelado ? 'true' : 'false', empresa);
        // Salvar respostas de perfil
        if (input.howFoundUs) await upsertSetting('how_found_us', input.howFoundUs, empresa);
        if (input.mainChallenge) await upsertSetting('main_challenge', input.mainChallenge, empresa);
        if (input.currentWorkflow) await upsertSetting('current_workflow', input.currentWorkflow, empresa);
        return { success: true };
      }),
    skip: protectedProcedure
      .mutation(async ({ ctx }) => {
        await upsertSetting('onboarding_done', 'true', exigirEmpresa(ctx.companyId));
        return { success: true };
      }),
    status: protectedProcedure
      .query(async ({ ctx }) => {
        const rows = await getSettings(ctx.companyId ?? undefined);
        const obj: Record<string, string> = {};
        for (const row of rows) obj[row.key] = row.value;
        // Se já marcou como feito, retorna done
        if (obj.onboarding_done === 'true') {
          return { done: true, serviceType: (obj.service_type as 'higienizacao' | 'ambos' | undefined) ?? null };
        }
        // Auto-detectar empresas existentes: se tem orçamentos ou serviços, marca como done automaticamente
        if (ctx.companyId) {
          const [budgetRows] = await rawExecute(
            `SELECT COUNT(*) as cnt FROM budgets WHERE companyId = ? LIMIT 1`,
            [ctx.companyId]
          );
          const budgetCount = (budgetRows as any[])[0]?.cnt ?? 0;
          const [serviceRows] = await rawExecute(
            `SELECT COUNT(*) as cnt FROM services WHERE companyId = ? LIMIT 1`,
            [ctx.companyId]
          );
          const serviceCount = (serviceRows as any[])[0]?.cnt ?? 0;
          if (Number(budgetCount) > 0 || Number(serviceCount) > 0) {
            // Empresa já tem dados — marca onboarding como feito silenciosamente
            await upsertSetting('onboarding_done', 'true', ctx.companyId);
            return { done: true, serviceType: (obj.service_type as 'higienizacao' | 'ambos' | undefined) ?? null };
          }
        }
        return {
          done: false,
          serviceType: (obj.service_type as 'higienizacao' | 'ambos' | undefined) ?? null,
        };
      }),
  }),
  competitors: competitorsRouter,
  criteria: criteriaRouter,
  scores: scoresRouter,
  competitorServices: competitorServicesRouter,
   serviceCategories: serviceCategoriesRouter,
  carpet: carpetRouter,
  carpetTags: carpetTagsRouter,
  sales: salesRouter,
  users: usersRouter,
  execution: executionRouter,
  teams: teamsRouter,
  executionCarpets: executionCarpetsRouter,
  ai: aiRouter,
  crm: crmRouter,
  reviews: reviewRouter,
  cancelled: cancelledRouter,
  presetMessages: presetMessagesRouter,
  notifications: notificationsRouter,
  companies: companiesRouter,
  companyAuth: companyAuthRouter,
  admin: adminRouter,
  accessRequests: accessRequestsRouter,
  companyUsers: companyUsersRouter,
  betaFeedback: router({
    create: protectedProcedure
      .input(z.object({
        categoria: z.enum(['geral', 'bug', 'sugestao', 'elogio']).default('geral'),
        oQueFuncionou: z.string().optional(),
        oQueTravou: z.string().optional(),
        oQueFalta: z.string().optional(),
        nota: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const company = await getCompanyById(ctx.companyId!);
        await createBetaFeedback({
          companyId: ctx.companyId!,
          companyName: company?.name ?? 'Desconhecida',
          ...input,
          createdAt: Date.now(),
        });
        await notifyOwner({ title: '💬 Novo Feedback Beta', content: `Empresa: ${company?.name ?? ctx.companyId}\nCategoria: ${input.categoria}\nNota: ${input.nota ?? '-'}/5\nO que funcionou: ${input.oQueFuncionou ?? '-'}\nO que travou: ${input.oQueTravou ?? '-'}\nO que falta: ${input.oQueFalta ?? '-'}` });
        return { success: true };
      }),
    list: protectedProcedure
      .query(async ({ ctx }) => {
        // Apenas master pode ver todos os feedbacks
        if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'master') {
          return [];
        }
        return getBetaFeedbacks();
      }),
  }),
  planFeatures: router({
    // Listar todas as funcionalidades por plano
    list: publicProcedure.query(async () => {
      const { planFeatures } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(planFeatures).orderBy(planFeatures.sortOrder);
      return rows;
    }),
    // Criar funcionalidade
    create: protectedProcedure
      .input(z.object({
        featureKey: z.string().min(1),
        featureLabel: z.string().min(1),
        featureDescription: z.string().optional(),
        soloEnabled: z.boolean().default(false),
        duplaEnabled: z.boolean().default(false),
        equipeEnabled: z.boolean().default(true),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { planFeatures } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("DB not available");
        await db.insert(planFeatures).values(input);
        return { success: true };
      }),
    // Atualizar funcionalidade
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        featureKey: z.string().optional(),
        featureLabel: z.string().optional(),
        featureDescription: z.string().optional(),
        soloEnabled: z.boolean().optional(),
        duplaEnabled: z.boolean().optional(),
        equipeEnabled: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { planFeatures } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("DB not available");
        const { id, ...data } = input;
        await db.update(planFeatures).set({ ...data, updatedAt: new Date() }).where(eqFn(planFeatures.id, id));
        return { success: true };
      }),
    // Deletar funcionalidade
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { planFeatures } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("DB not available");
        await db.delete(planFeatures).where(eqFn(planFeatures.id, input.id));
        return { success: true };
      }),
    // Seed com funcionalidades padrão
    seed: protectedProcedure.mutation(async () => {
      const { planFeatures } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const defaultFeatures = [
        { featureKey: "orcamentos", featureLabel: "Orçamentos", featureDescription: "Criar e enviar orçamentos profissionais em PDF", soloEnabled: true, duplaEnabled: true, equipeEnabled: true, sortOrder: 1 },
        { featureKey: "clientes", featureLabel: "Gestão de Clientes", featureDescription: "Cadastro e histórico de clientes", soloEnabled: true, duplaEnabled: true, equipeEnabled: true, sortOrder: 2 },
        { featureKey: "catalogo", featureLabel: "Catálogo de Serviços", featureDescription: "Cadastro de serviços e preços", soloEnabled: true, duplaEnabled: true, equipeEnabled: true, sortOrder: 3 },
        { featureKey: "dashboard", featureLabel: "Dashboard de Resumo", featureDescription: "Visão geral do negócio", soloEnabled: true, duplaEnabled: true, equipeEnabled: true, sortOrder: 4 },
        { featureKey: "vendas", featureLabel: "Vendas e Pagamentos", featureDescription: "Registro de vendas e formas de pagamento", soloEnabled: false, duplaEnabled: true, equipeEnabled: true, sortOrder: 5 },
        { featureKey: "agendamentos", featureLabel: "Agendamentos + Maps", featureDescription: "Calendário de execução com navegação Google Maps", soloEnabled: false, duplaEnabled: true, equipeEnabled: true, sortOrder: 6 },
        { featureKey: "execucao", featureLabel: "Execução de OS", featureDescription: "Módulo de execução de ordens de serviço", soloEnabled: false, duplaEnabled: true, equipeEnabled: true, sortOrder: 7 },
        { featureKey: "usuarios", featureLabel: "Gestão de Usuários", featureDescription: "Gerenciar técnicos e secretárias", soloEnabled: false, duplaEnabled: true, equipeEnabled: true, sortOrder: 8 },
        { featureKey: "financeiro", featureLabel: "Módulo Financeiro", featureDescription: "Receitas, despesas e fluxo de caixa", soloEnabled: false, duplaEnabled: false, equipeEnabled: true, sortOrder: 9 },
        { featureKey: "tapetes", featureLabel: "Tapetes (Lavanderia)", featureDescription: "Controle de entrada, lavagem e entrega de tapetes", soloEnabled: false, duplaEnabled: false, equipeEnabled: true, sortOrder: 10 },
        { featureKey: "crm", featureLabel: "CRM de Clientes", featureDescription: "Reativação automática e acompanhamento de clientes", soloEnabled: false, duplaEnabled: false, equipeEnabled: true, sortOrder: 11 },
        { featureKey: "concorrentes", featureLabel: "Análise de Concorrência", featureDescription: "Monitoramento de preços dos concorrentes", soloEnabled: false, duplaEnabled: false, equipeEnabled: true, sortOrder: 12 },
        { featureKey: "relatorios", featureLabel: "Relatórios Avançados", featureDescription: "Relatórios detalhados de desempenho", soloEnabled: false, duplaEnabled: false, equipeEnabled: true, sortOrder: 13 },
        { featureKey: "upsell", featureLabel: "Upsell Automático", featureDescription: "Sugestões automáticas de serviços adicionais", soloEnabled: false, duplaEnabled: false, equipeEnabled: true, sortOrder: 14 },
      ];
      // Inserir apenas os que não existem
      for (const feat of defaultFeatures) {
        try {
          await db.insert(planFeatures).values(feat);
        } catch {
          // Ignora duplicatas (featureKey unique)
        }
      }
      return { success: true, count: defaultFeatures.length };
    }),
  }),
  quizResponses: router({
    // Salvar resposta do quiz (público - visitantes anônimos)
    save: publicProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        q1WorkStyle: z.string().optional(),
        q2QuoteMethod: z.string().optional(),
        q3AfterClose: z.string().optional(),
        suggestedPlan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { quizResponses } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) return { success: false };
        await db.insert(quizResponses).values({
          sessionId: input.sessionId,
          q1WorkStyle: input.q1WorkStyle,
          q2QuoteMethod: input.q2QuoteMethod,
          q3AfterClose: input.q3AfterClose,
          suggestedPlan: input.suggestedPlan,
        });
        return { success: true };
      }),
    // Listar todas as respostas (apenas dono)
    list: ownerProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        const { quizResponses } = await import("../drizzle/schema");
        const { desc: descFn } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select()
          .from(quizResponses)
          .orderBy(descFn(quizResponses.createdAt))
          .limit(input.limit);
        return rows;
      }),
    // Estatísticas agregadas do quiz
    stats: ownerProcedure.query(async () => {
      const { quizResponses } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(quizResponses);
      const total = rows.length;
      if (total === 0) return { total: 0, byPlan: {}, byQ1: {}, byQ2: {}, byQ3: {}, byDay: [] };

      // Distribuição por plano sugerido
      const byPlan: Record<string, number> = {};
      const byQ1: Record<string, number> = {};
      const byQ2: Record<string, number> = {};
      const byQ3: Record<string, number> = {};
      const byDayMap: Record<string, number> = {};

      for (const r of rows) {
        if (r.suggestedPlan) byPlan[r.suggestedPlan] = (byPlan[r.suggestedPlan] || 0) + 1;
        if (r.q1WorkStyle) byQ1[r.q1WorkStyle] = (byQ1[r.q1WorkStyle] || 0) + 1;
        if (r.q2QuoteMethod) byQ2[r.q2QuoteMethod] = (byQ2[r.q2QuoteMethod] || 0) + 1;
        if (r.q3AfterClose) byQ3[r.q3AfterClose] = (byQ3[r.q3AfterClose] || 0) + 1;
        const day = new Date(r.createdAt).toISOString().slice(0, 10);
        byDayMap[day] = (byDayMap[day] || 0) + 1;
      }

      // Últimos 30 dias ordenados
      const byDay = Object.entries(byDayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, count]) => ({ date, count }));

      return { total, byPlan, byQ1, byQ2, byQ3, byDay };
    }),
  }),

  // ─── Stripe Checkout ─────────────────────────────────────────────────────
  stripe: router({
    // Checkout para usuários NÃO logados (novos clientes)
    createCheckoutPublic: publicProcedure
      .input(z.object({
        plan: z.enum(["solo", "dupla", "equipe", "mensal", "anual"]),
        origin: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const Stripe = (await import("stripe")).default;
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || "", {
          apiVersion: "2026-02-25.clover" as any,
        });
        // Mensal = solo (R$49,90/mês) | Anual = equipe (R$490/ano)
        const PRICE_IDS: Record<string, string> = {
          solo:   process.env.STRIPE_PRICE_SOLO  ?? "price_1TcOY8AMXLA9niY2gjDQiOsl",
          mensal: process.env.STRIPE_PRICE_SOLO  ?? "price_1TcOY8AMXLA9niY2gjDQiOsl",
          dupla:  process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM",
          equipe: process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM",
          anual:  process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM",
        };
        // Normalizar para planType interno do banco (solo/equipe)
        const PLAN_INTERNAL: Record<string, string> = {
          mensal: "solo", anual: "equipe", solo: "solo", dupla: "solo", equipe: "equipe",
        };
        const internalPlan = PLAN_INTERNAL[input.plan] ?? "solo";
        const priceId = PRICE_IDS[input.plan];
        if (!priceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Price ID para o plano "${input.plan}" ainda não configurado.`,
          });
        }
        const session = await stripeClient.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: input.email,
          allow_promotion_codes: true,
          metadata: {
            new_company: "true",
            company_name: input.name,
            company_email: input.email,
            price_id: priceId,
            plan: internalPlan, // sempre salva planType interno (solo/equipe)
          },
          success_url: `${input.origin}/bem-vindo?plano=${input.plan}&email=${encodeURIComponent(input.email)}`,
          cancel_url: `${input.origin}/planos?cancelado=true`,
        });
        return { url: session.url };
      }),

    createCheckout: protectedProcedure
      .input(z.object({
        plan: z.enum(["solo", "dupla", "equipe", "mensal", "anual"]),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const Stripe = (await import("stripe")).default;
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || "", {
          apiVersion: "2026-02-25.clover" as any,
        });
        // Mensal = solo (R$49,90/mês) | Anual = equipe (R$490/ano)
        const PRICE_IDS: Record<string, string> = {
          solo:   process.env.STRIPE_PRICE_SOLO  ?? "price_1TcOY8AMXLA9niY2gjDQiOsl",
          mensal: process.env.STRIPE_PRICE_SOLO  ?? "price_1TcOY8AMXLA9niY2gjDQiOsl",
          dupla:  process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM",
          equipe: process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM",
          anual:  process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM",
        };
        const PLAN_INTERNAL: Record<string, string> = {
          mensal: "solo", anual: "equipe", solo: "solo", dupla: "solo", equipe: "equipe",
        };
        const internalPlan = PLAN_INTERNAL[input.plan] ?? "solo";
        const priceId = PRICE_IDS[input.plan];
        if (!priceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Price ID para o plano "${input.plan}" ainda não configurado. Entre em contato com o suporte.`,
          });
        }
        const companyId = ctx.companyId;
        if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Empresa não encontrada" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { companies: companiesTable } = await import("../drizzle/schema");
        const { eq: eqFn2 } = await import("drizzle-orm");
        const [company] = await db
          .select({ email: companiesTable.email, name: companiesTable.name })
          .from(companiesTable)
          .where(eqFn2(companiesTable.id, companyId))
          .limit(1);
        const session = await stripeClient.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: company?.email ?? undefined,
          client_reference_id: companyId.toString(),
          metadata: {
            company_id: companyId.toString(),
            price_id: priceId,
            plan: internalPlan, // sempre salva planType interno (solo/equipe)
          },
          allow_promotion_codes: true,
          success_url: `${input.origin}/dashboard?plano=ativado`,
          cancel_url: `${input.origin}/planos?cancelado=true`,
        });
        return { url: session.url };
      }),

    getSubscriptionDetails: protectedProcedure.query(async ({ ctx }) => {
      const companyId = ctx.companyId;
      if (!companyId) return null;
      const db = await getDb();
      if (!db) return null;
      const { companies: companiesTable } = await import("../drizzle/schema");
      const { eq: eqFn2 } = await import("drizzle-orm");
      const [company] = await db
        .select({
          planType: companiesTable.planType,
          subscriptionStatus: companiesTable.subscriptionStatus,
          trialEndsAt: companiesTable.trialEndsAt,
          stripeSubscriptionId: companiesTable.stripeSubscriptionId,
          stripeCustomerId: companiesTable.stripeCustomerId,
        })
        .from(companiesTable)
        .where(eqFn2(companiesTable.id, companyId))
        .limit(1);
      if (!company) return null;
      let renewalDate: string | null = null;
      let cancelAtPeriodEnd = false;
      if (company.stripeSubscriptionId) {
        try {
          const Stripe = (await import("stripe")).default;
          const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2026-02-25.clover" as any,
          });
          const sub = await stripeClient.subscriptions.retrieve(company.stripeSubscriptionId);
          renewalDate = new Date((sub as any).current_period_end * 1000).toISOString();
          cancelAtPeriodEnd = (sub as any).cancel_at_period_end ?? false;
        } catch (e) {
          // ignore stripe errors
        }
      }
      // Verificar se trial expirou (planType=free com trialEndsAt no passado)
      const now = new Date();
      const trialExpired = company.planType === "free" &&
        company.trialEndsAt !== null &&
        company.trialEndsAt !== undefined &&
        new Date(company.trialEndsAt) < now;
      return {
        planType: company.planType ?? "free",
        subscriptionStatus: company.subscriptionStatus ?? "active",
        trialEndsAt: company.trialEndsAt ? new Date(company.trialEndsAt).toISOString() : null,
        trialExpired,
        stripeSubscriptionId: company.stripeSubscriptionId,
        renewalDate,
        cancelAtPeriodEnd,
      };
    }),

    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      const companyId = ctx.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { companies: companiesTable } = await import("../drizzle/schema");
      const { eq: eqFn2 } = await import("drizzle-orm");
      const [company] = await db
        .select({ stripeSubscriptionId: companiesTable.stripeSubscriptionId })
        .from(companiesTable)
        .where(eqFn2(companiesTable.id, companyId))
        .limit(1);
      if (!company?.stripeSubscriptionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma assinatura ativa encontrada." });
      }
      const Stripe = (await import("stripe")).default;
      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2026-02-25.clover" as any,
      });
      await stripeClient.subscriptions.update(company.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      return { success: true };
    }),

    getMyPlan: protectedProcedure.query(async ({ ctx }) => {
      const companyId = ctx.companyId;
      if (!companyId) return { planType: "free" as const, subscriptionStatus: "active" as const };
      const db = await getDb();
      if (!db) return { planType: "free" as const, subscriptionStatus: "active" as const };
      const { companies: companiesTable } = await import("../drizzle/schema");
      const { eq: eqFn2 } = await import("drizzle-orm");
      const [company] = await db
        .select({ planType: companiesTable.planType, subscriptionStatus: companiesTable.subscriptionStatus })
        .from(companiesTable)
        .where(eqFn2(companiesTable.id, companyId))
        .limit(1);
      return { planType: company?.planType ?? "free", subscriptionStatus: company?.subscriptionStatus ?? "active" };
    }),
  }),

  // ─── Admin: Controle de Plano por Empresa ─────────────────────────────────
  adminPlan: router({
    listCompanyPlans: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { companies: companiesTable } = await import("../drizzle/schema");
      const { desc: descFn2 } = await import("drizzle-orm");
      const rows = await db
        .select({
          id: companiesTable.id,
          name: companiesTable.name,
          email: companiesTable.email,
          planType: companiesTable.planType,
          subscriptionStatus: companiesTable.subscriptionStatus,
          trialEndsAt: companiesTable.trialEndsAt,
          active: companiesTable.active,
          createdAt: companiesTable.createdAt,
        })
        .from(companiesTable)
        .orderBy(descFn2(companiesTable.createdAt));
      return rows;
    }),

    setCompanyPlan: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        planType: z.enum(["free", "solo", "dupla", "equipe"]),
        trialDays: z.number().min(1).max(365).optional(), // apenas para planType=free
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { companies: companiesTable } = await import("../drizzle/schema");
        const { eq: eqFn2 } = await import("drizzle-orm");

        // Buscar dados atuais da empresa antes de atualizar
        const { companyCredentials: credsTable } = await import("../drizzle/schema");
        const [company] = await db
          .select({
            name: companiesTable.name,
            email: companiesTable.email,
            planType: companiesTable.planType,
          })
          .from(companiesTable)
          .where(eqFn2(companiesTable.id, input.companyId))
          .limit(1);

        // Buscar e-mail de login nas credenciais
        const [creds] = await db
          .select({ email: credsTable.email })
          .from(credsTable)
          .where(eqFn2(credsTable.companyId, input.companyId))
          .limit(1);

        const oldPlan = company?.planType ?? "free";

        // Calcular trialEndsAt se for Cortesia com prazo
        let trialEndsAt: Date | null = null;
        if (input.planType === "free" && input.trialDays) {
          trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + input.trialDays);
        }

        await db
          .update(companiesTable)
          .set({
            planType: input.planType,
            subscriptionStatus: "active",
            trialEndsAt: trialEndsAt,
          })
          .where(eqFn2(companiesTable.id, input.companyId));

        // Enviar e-mail de notificação se o plano mudou e há e-mail cadastrado
        const emailTo = creds?.email || company?.email;
        if (emailTo && oldPlan !== input.planType) {
          sendPlanChangedEmail({
            to: emailTo,
            companyName: company?.name ?? "Empresa",
            oldPlan,
            newPlan: input.planType,
          }).catch((err) => console.error("[Email] Erro ao enviar e-mail de plano:", err));
        }

        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
