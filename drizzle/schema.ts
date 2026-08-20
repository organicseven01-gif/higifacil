import {
  decimal,
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Empresas (Multi-Tenant) ──────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  logoUrl: varchar("logoUrl", { length: 1024 }),
  plan: mysqlEnum("plan", ["trial", "basic", "professional", "premium"]).notNull().default("trial"),
  planType: mysqlEnum("planType", ["free", "solo", "dupla", "equipe"]).default("free"),
  trialEndsAt: timestamp("trialEndsAt"),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "expired", "blocked", "cancelled"]).notNull().default("active"),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripeSubscriptionStatus: varchar("stripeSubscriptionStatus", { length: 50 }),
  primaryColor: varchar("primaryColor", { length: 30 }).default("#1a4a8a"),
  slug: varchar("slug", { length: 100 }),
  ownerName: varchar("ownerName", { length: 255 }),
  ownerPhone: varchar("ownerPhone", { length: 30 }),
  ownerCargo: varchar("ownerCargo", { length: 100 }),
  ownerAvatarUrl: varchar("ownerAvatarUrl", { length: 1024 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── Credenciais de Login por Empresa ────────────────────────────────────────
export const companyCredentials = mysqlTable("company_credentials", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyCredential = typeof companyCredentials.$inferSelect;
export type InsertCompanyCredential = typeof companyCredentials.$inferInsert;

// ─── Usuários Sub-Empresa (Múltiplos Acessos por Empresa) ──────────────────────
export const companyUsers = mysqlTable("company_users", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["master", "vendedor", "tecnico", "secretaria"]).notNull().default("tecnico"),
  active: boolean("active").notNull().default(true),
  allowedModules: text("allowedModules"), // JSON array de módulos permitidos
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyUser = typeof companyUsers.$inferSelect;
export type InsertCompanyUser = typeof companyUsers.$inferInsert;

// ─── Solicitações de Acesso ──────────────────────────────────────────────────
export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  segment: varchar("segment", { length: 100 }),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
});
export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "master", "vendedor", "secretaria", "funcionario"]).default("user").notNull(),
  companyId: int("companyId"),
  phone: varchar("phone", { length: 30 }),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categorias de Serviço ─────────────────────────────────────────────────
export const serviceCategories = mysqlTable("service_categories", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull().default("🔧"),
  description: text("description"),
  color: varchar("color", { length: 30 }).default("#6366f1"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = typeof serviceCategories.$inferInsert;

// Tabela de Serviços
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  serviceCode: int("serviceCode"),  // código sequencial exíbição: #001, #002...
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("Geral"),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  active: boolean("active").notNull().default(true),
  companyId: int("companyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// Tabela de Clientes
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 320 }),
  // Endereço detalhado
  cep: varchar("cep", { length: 10 }),
  street: varchar("street", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  // Observações e fotos
  notes: text("notes"),
  photos: text("photos"), // JSON array: [{type: string, url: string}]
  // Reativação / régua de relacionamento
  reactivationDays: int("reactivationDays"), // prazo em dias para recontato (ex: 90)
  reactivationDueDate: varchar("reactivationDueDate", { length: 10 }), // data alvo YYYY-MM-DD
  lastServiceDate: varchar("lastServiceDate", { length: 10 }), // data do último serviço YYYY-MM-DD
  companyId: int("companyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Client = typeof clients.$inferSelect;;
export type InsertClient = typeof clients.$inferInsert;

// Tabela de Fotos dos Móveis dos Clientes
export const clientPhotos = mysqlTable("client_photos", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  furnitureType: varchar("furnitureType", { length: 255 }).notNull(), // ex: Sofá 3 lugares
  photoUrl: varchar("photoUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientPhoto = typeof clientPhotos.$inferSelect;
export type InsertClientPhoto = typeof clientPhotos.$inferInsert;

// Tabela de Orçamentos
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  budgetNumber: int("budgetNumber"),
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }).notNull(),
  clientAddress: text("clientAddress"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discountType: mysqlEnum("discountType", ["percent", "fixed"]).default("fixed"),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["pending", "sent", "accepted", "rejected"]).default("pending").notNull(),
  notes: text("notes"),
  videos: text("videos"), // JSON array of video URLs
  validDays: int("validDays").notNull().default(7),
  paymentConditions: text("paymentConditions"),
  selectedInfoPageId: varchar("selectedInfoPageId", { length: 100 }), // ID da página de informações selecionada
  isTimbrado: boolean("isTimbrado").notNull().default(false), // se o orçamento é timbrado (formal)
   sold: boolean("sold").notNull().default(false), // se o orçamento foi vendido
  soldAt: timestamp("soldAt"),                    // data/hora da venda
  companyId: int("companyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// Tabela de Itens do Orçamento
export const budgetItems = mysqlTable("budget_items", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  serviceId: int("serviceId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = typeof budgetItems.$inferInsert;

// Tabela de Configurações da Empresa
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  companyId: int("companyId").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  uniqKeyCompany: uniqueIndex("settings_key_company_unique").on(t.key, t.companyId),
}));

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// Tabela de Análise de Concorrência
export const competitors = mysqlTable("competitors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  services: text("services"),           // descrição dos serviços oferecidos (legado)
  siteUrl: varchar("siteUrl", { length: 500 }),       // link do site da empresa
  priceRange: varchar("priceRange", { length: 255 }), // faixa de preços praticados (legado)
  instagramUrl: varchar("instagramUrl", { length: 500 }), // link do Instagram
  googleUrl: varchar("googleUrl", { length: 500 }),   // link do Google Maps/Business
  googleReviews: int("googleReviews").default(0),     // quantidade de avaliações
  googleRating: decimal("googleRating", { precision: 2, scale: 1 }), // média de estrelas
  notes: text("notes"),                 // observações livres
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
   companyId: int("companyId").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = typeof competitors.$inferInsert;

// Tabela de Critérios de Avaliação de Concorrência
export const competitorCriteria = mysqlTable("competitor_criteria", {
  id: int("id").autoincrement().primaryKey(),
  // companyId NOT NULL + FK: os critérios de comparação são de cada empresa.
  // Antes esta tabela não tinha empresa e era compartilhada por todos os
  // clientes do SaaS (falha de isolamento multiempresa).
  companyId: int("companyId").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 100 }),  // ex: minutos, horas, estrelas, sim/não
  type: mysqlEnum("type", ["number", "text", "rating", "boolean"]).default("text").notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompetitorCriteria = typeof competitorCriteria.$inferSelect;
export type InsertCompetitorCriteria = typeof competitorCriteria.$inferInsert;

// Tabela de Scores: cruzamento empresa x critério
export const competitorScores = mysqlTable("competitor_scores", {
  id: int("id").autoincrement().primaryKey(),
  // companyId NOT NULL + FK: as notas dadas aos concorrentes são informação
  // estratégica da empresa. Antes esta tabela era compartilhada entre todas.
  companyId: int("companyId").notNull().references(() => companies.id),
  competitorId: int("competitorId").notNull(),
  criteriaId: int("criteriaId").notNull(),
  value: varchar("value", { length: 500 }),  // valor do critério para esta empresa
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompetitorScore = typeof competitorScores.$inferSelect;
export type InsertCompetitorScore = typeof competitorScores.$inferInsert;

// Tabela de Serviços e Preços por Empresa Concorrente
export const competitorServices = mysqlTable("competitor_services", {
  id: int("id").autoincrement().primaryKey(),
  competitorId: int("competitorId").notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  price: varchar("price", { length: 100 }),  // ex: R$ 120,00 ou R$ 80 a R$ 150
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompetitorService = typeof competitorServices.$inferSelect;
export type InsertCompetitorService = typeof competitorServices.$inferInsert;


// ─── Lavanderia de Tapetes ────────────────────────────────────────────────────
export const carpetOrders = mysqlTable("carpet_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: int("orderNumber"),                        // número sequencial: #0001
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }).notNull(),
  // Dados do tapete
  carpetType: varchar("carpetType", { length: 100 }),     // persa, sisal, felpudo, vinil, etc.
  carpetSize: varchar("carpetSize", { length: 50 }),      // ex: 2x3m, 1.5x2m
  carpetColor: varchar("carpetColor", { length: 100 }),
  observations: text("observations"),                     // manchas, danos, etc.
  // Datas
  collectedAt: timestamp("collectedAt").defaultNow().notNull(), // data de recolhimento
  expectedDelivery: timestamp("expectedDelivery").notNull(),    // previsão de entrega
  deliveredAt: timestamp("deliveredAt"),                        // data real de entrega
  // Status do fluxo
  status: mysqlEnum("status", ["collected", "washing", "ready", "delivered"]).default("collected").notNull(),
  // Financeiro
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  paid: boolean("paid").notNull().default(false),
  notes: text("notes"),                                   // observações internas
  companyId: int("companyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CarpetOrder = typeof carpetOrders.$inferSelect;
export type InsertCarpetOrder = typeof carpetOrders.$inferInsert;

// Fotos dos tapetes (antes/depois)
export const carpetPhotos = mysqlTable("carpet_photos", {
  id: int("id").autoincrement().primaryKey(),
  carpetOrderId: int("carpetOrderId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoType: mysqlEnum("photoType", ["before", "after", "other"]).default("before").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CarpetPhoto = typeof carpetPhotos.$inferSelect;
export type InsertCarpetPhoto = typeof carpetPhotos.$inferInsert;

// ─── Tags de Tapetes ──────────────────────────────────────────────────────────
export const carpetTags = mysqlTable("carpet_tags", {
  id: int("id").autoincrement().primaryKey(),
  // companyId NOT NULL + FK: cada empresa tem as próprias etiquetas de tapete.
  // Antes esta tabela era compartilhada entre todas as empresas.
  companyId: int("companyId").notNull().references(() => companies.id),
  name: varchar("name", { length: 80 }).notNull(),
  color: varchar("color", { length: 30 }).notNull().default("#6366f1"), // hex ou oklch
  category: mysqlEnum("category", ["type", "color", "dirt", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CarpetTag = typeof carpetTags.$inferSelect;
export type InsertCarpetTag = typeof carpetTags.$inferInsert;

// ─── Itens de Tapete (múltiplos tapetes por OS) ─────────────────────────────
export const carpetItems = mysqlTable("carpet_items", {
  id: int("id").autoincrement().primaryKey(),
  carpetOrderId: int("carpetOrderId").notNull(),
  carpetType: varchar("carpetType", { length: 100 }),   // persa, sisal, felpudo, etc.
  carpetSize: varchar("carpetSize", { length: 50 }),    // ex: 2x3m, 1.5x2m
  carpetColor: varchar("carpetColor", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CarpetItem = typeof carpetItems.$inferSelect;
export type InsertCarpetItem = typeof carpetItems.$inferInsert;

// Tabela de junção: OS ↔ Tags (many-to-many)
export const carpetOrderTags = mysqlTable("carpet_order_tags", {
  id: int("id").autoincrement().primaryKey(),
  carpetOrderId: int("carpetOrderId").notNull(),
  tagId: int("tagId").notNull(),
});
export type CarpetOrderTag = typeof carpetOrderTags.$inferSelect;
export type InsertCarpetOrderTag = typeof carpetOrderTags.$inferInsert;

// ─── Vendas ───────────────────────────────────────────────────────────────────
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  saleCode: int("saleCode"),                          // código sequencial #0001
  budgetId: int("budgetId"),                          // vínculo com orçamento (opcional)
  transactionType: mysqlEnum("transactionType", ["receita", "despesa"]).default("receita").notNull(),
  description: varchar("description", { length: 500 }),  // descrição da transação
  category: varchar("category", { length: 100 }),         // categoria (opcional)
  clientName: varchar("clientName", { length: 255 }).notNull().default(""),
  clientPhone: varchar("clientPhone", { length: 30 }),
  clientId: int("clientId"),                          // vínculo com cliente cadastrado
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "card", "cash", "boleto", "card_1x", "card_2x", "card_3x", "card_2x_ant", "card_3x_ant"]).notNull().default("pix"),
  installments: int("installments").default(1),       // número de parcelas (cartão)
  amountReceived: decimal("amountReceived", { precision: 10, scale: 2 }), // valor efetivamente recebido
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "partial", "paid"]).default("pending").notNull(),
  notes: text("notes"),
  saleDate: timestamp("saleDate").defaultNow().notNull(),
  scheduledDate: varchar("scheduledDate", { length: 10 }),
  serviceStatus: mysqlEnum("serviceStatus", ["scheduled", "completed"]).notNull().default("completed"),
  paymentDueDays: int("paymentDueDays"),              // prazo em dias para pagamento programado (ex: 40)
  paymentDueDate: varchar("paymentDueDate", { length: 10 }), // data de vencimento calculada YYYY-MM-DD
  companyId: int("companyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// Comprovantes de pagamento vinculados à venda
export const saleReceipts = mysqlTable("sale_receipts", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  receiptUrl: text("receiptUrl").notNull(),
  receiptKey: varchar("receiptKey", { length: 500 }),
  receiptType: mysqlEnum("receiptType", ["pix", "card", "cash", "boleto", "other"]).default("other").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SaleReceipt = typeof saleReceipts.$inferSelect;
export type InsertSaleReceipt = typeof saleReceipts.$inferInsert;

// ─── Execução / Dia a Dia ────────────────────────────────────────────────────
export const executionOrders = mysqlTable("execution_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: int("orderNumber"),                          // número sequencial #0001
  // Vínculo com venda (opcional — pode ser agendamento manual)
  saleId: int("saleId"),
  // Dados do cliente
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }),
  // Endereço de execução
  street: varchar("street", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  // Serviço
  serviceDescription: text("serviceDescription"),          // descrição livre do serviço
  totalValue: decimal("totalValue", { precision: 10, scale: 2 }).default("0"),
  // Agendamento
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(), // YYYY-MM-DD
  scheduledTime: varchar("scheduledTime", { length: 5 }),            // HH:MM
  // Status simples: pendente → concluído
  status: mysqlEnum("status", ["pending", "done", "cancelled"]).default("pending").notNull(),
  // Funcionário responsável
  assignedTo: varchar("assignedTo", { length: 255 }),
  assignedMemberId: int("assignedMemberId"),
  teamId: int("teamId"),
  // Comprovante de pagamento
  receiptUrl: text("receiptUrl"),
  receiptKey: varchar("receiptKey", { length: 500 }),
  // Observações gerais
  observations: text("observations"),
  // Vínculo com orçamento
  budgetId: int("budgetId"),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  companyId: int("companyId").notNull(),
  // Confirmação do cliente
  confirmToken: varchar("confirmToken", { length: 64 }),
  clientConfirmed: boolean("clientConfirmed").default(false),
  clientConfirmedAt: timestamp("clientConfirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ExecutionOrder = typeof executionOrders.$inferSelect;
export type InsertExecutionOrder = typeof executionOrders.$inferInsert;

// ─── Upsell (Vendas em Campo) ────────────────────────────────────────────────
export const upsellItems = mysqlTable("upsell_items", {
  id: int("id").autoincrement().primaryKey(),
  executionOrderId: int("executionOrderId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  isCarpet: boolean("isCarpet").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UpsellItem = typeof upsellItems.$inferSelect;
export type InsertUpsellItem = typeof upsellItems.$inferInsert;

// ─── Itens de Serviço por Agendamento ──────────────────────────────────────────────────
export const executionServiceItems = mysqlTable("execution_service_items", {
  id: int("id").autoincrement().primaryKey(),
  executionOrderId: int("executionOrderId").notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  serviceId: int("serviceId"),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExecutionServiceItem = typeof executionServiceItems.$inferSelect;
export type InsertExecutionServiceItem = typeof executionServiceItems.$inferInsert;

// ─── Fotos de Execução ───────────────────────────────────────────────────────
export const executionPhotos = mysqlTable("execution_photos", {
  id: int("id").autoincrement().primaryKey(),
  executionOrderId: int("executionOrderId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoKey: varchar("photoKey", { length: 500 }),
  photoType: mysqlEnum("photoType", ["before", "after", "other"]).default("before").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExecutionPhoto = typeof executionPhotos.$inferSelect;
export type InsertExecutionPhoto = typeof executionPhotos.$inferInsert;

// ─── Equipes de Trabalho ─────────────────────────────────────────────────────
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 30 }).default("#6366f1"),
  active: boolean("active").notNull().default(true),
  companyId: int("companyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── Membros das Equipes ─────────────────────────────────────────────────────
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  role: varchar("role", { length: 100 }).default("Técnico"), // ex: Técnico, Auxiliar, Motorista
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ─── OS de Tapetes na Execução ───────────────────────────────────────────────
export const executionCarpets = mysqlTable("execution_carpets", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: int("orderNumber"),
  // Vínculo com OS de execução (opcional)
  executionOrderId: int("executionOrderId"),
  // Dados do cliente
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }),
  // Endereço
  street: varchar("street", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  // Dados do tapete
  carpetType: varchar("carpetType", { length: 100 }), // lã, sintético, sisal, vinil, etc.
  widthMeters: decimal("widthMeters", { precision: 5, scale: 2 }), // largura em metros
  lengthMeters: decimal("lengthMeters", { precision: 5, scale: 2 }), // comprimento em metros
  squareMeters: decimal("squareMeters", { precision: 6, scale: 2 }), // m² calculado
  // Tipo de sujidade: leve, moderada, pesada
  dirtLevel: mysqlEnum("dirtLevel", ["light", "moderate", "heavy"]).default("light").notNull(),
  // Observações e detalhes
  observations: text("observations"),
  // Agendamento
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(), // YYYY-MM-DD
  scheduledTime: varchar("scheduledTime", { length: 5 }),
  // Responsável
  assignedTo: varchar("assignedTo", { length: 255 }),
  assignedMemberId: int("assignedMemberId"),
  // Status
  status: mysqlEnum("status", ["pending", "done", "cancelled"]).default("pending").notNull(),
  totalValue: decimal("totalValue", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ExecutionCarpet = typeof executionCarpets.$inferSelect;
export type InsertExecutionCarpet = typeof executionCarpets.$inferInsert;

// Fotos das OS de tapetes de execução
export const executionCarpetPhotos = mysqlTable("execution_carpet_photos", {
  id: int("id").autoincrement().primaryKey(),
  executionCarpetId: int("executionCarpetId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoKey: varchar("photoKey", { length: 500 }),
  photoType: mysqlEnum("photoType", ["before", "after", "other"]).default("before").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExecutionCarpetPhoto = typeof executionCarpetPhotos.$inferSelect;
export type InsertExecutionCarpetPhoto = typeof executionCarpetPhotos.$inferInsert;

// ─── Avaliações Pós-Serviço ──────────────────────────────────────────────────
export const serviceReviews = mysqlTable("service_reviews", {
  id: int("id").autoincrement().primaryKey(),
  // Vínculo com OS de execução
  executionOrderId: int("executionOrderId").notNull(),
  // Token único para acesso público (sem login)
  token: varchar("token", { length: 64 }).notNull().unique(),
  // Dados do cliente (copiados no momento da criação)
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }),
  serviceDescription: text("serviceDescription"),
  // Avaliação
  rating: int("rating"), // 1-5 estrelas (null = ainda não avaliado)
  comment: text("comment"),
  // Controle
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ServiceReview = typeof serviceReviews.$inferSelect;
export type InsertServiceReview = typeof serviceReviews.$inferInsert;

// ─── Histórico de Cancelamentos ──────────────────────────────────────────────
export const cancelledOrders = mysqlTable("cancelled_orders", {
  id: int("id").autoincrement().primaryKey(),
  // Dados da OS cancelada (copiados no momento do cancelamento)
  originalOrderId: int("originalOrderId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }),
  serviceDescription: text("serviceDescription"),
  scheduledDate: varchar("scheduledDate", { length: 20 }),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  assignedTo: varchar("assignedTo", { length: 255 }),
  totalValue: decimal("totalValue", { precision: 10, scale: 2 }),
  // Motivo do cancelamento
  reason: varchar("reason", { length: 500 }),
  cancelledAt: timestamp("cancelledAt").defaultNow().notNull(),
  companyId: int("companyId").notNull(),
});
export type CancelledOrder = typeof cancelledOrders.$inferSelect;
export type InsertCancelledOrder = typeof cancelledOrders.$inferInsert;

// ─── Mensagens Pré-programadas ────────────────────────────────────────────────
export const presetMessages = mysqlTable("preset_messages", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  companyId: int("companyId").notNull(),
});
export type PresetMessage = typeof presetMessages.$inferSelect;
export type InsertPresetMessage = typeof presetMessages.$inferInsert;

export const appNotifications = mysqlTable("app_notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull().default("info"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  referenceId: int("reference_id"),
  referenceType: varchar("reference_type", { length: 50 }),
  readAt: bigint("read_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  companyId: int("companyId"),
});
export type InsertAppNotification = typeof appNotifications.$inferInsert;

// ─── Feedbacks Beta ───────────────────────────────────────────────────────────
export const betaFeedbacks = mysqlTable("beta_feedbacks", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  companyName: varchar("companyName", { length: 200 }),
  categoria: varchar("categoria", { length: 50 }).notNull().default("geral"), // geral, bug, sugestao, elogio
  oQueFuncionou: text("oQueFuncionou"),
  oQueTravou: text("oQueTravou"),
  oQueFalta: text("oQueFalta"),
  nota: int("nota"), // 1 a 5
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type BetaFeedback = typeof betaFeedbacks.$inferSelect;
export type InsertBetaFeedback = typeof betaFeedbacks.$inferInsert;

// ─── Funcionalidades por Plano ────────────────────────────────────────────────
// Controla quais funcionalidades cada plano (solo/dupla/equipe) pode acessar
export const planFeatures = mysqlTable("plan_features", {
  id: int("id").autoincrement().primaryKey(),
  featureKey: varchar("featureKey", { length: 100 }).notNull(), // ex: "financeiro", "tapetes", "crm"
  featureLabel: varchar("featureLabel", { length: 200 }).notNull(), // ex: "Módulo Financeiro"
  featureDescription: text("featureDescription"), // descrição da funcionalidade
  soloEnabled: boolean("soloEnabled").notNull().default(false),
  duplaEnabled: boolean("duplaEnabled").notNull().default(false),
  equipeEnabled: boolean("equipeEnabled").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  featureKeyUniq: uniqueIndex("plan_features_key_unique").on(t.featureKey),
}));
export type PlanFeature = typeof planFeatures.$inferSelect;
export type InsertPlanFeature = typeof planFeatures.$inferInsert;

// ─── Respostas do Quiz de Onboarding ─────────────────────────────────────────
// Guarda as respostas do quiz da landing page para análise de perfil
export const quizResponses = mysqlTable("quiz_responses", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 100 }), // identificador anônimo antes do cadastro
  companyId: int("companyId"), // preenchido após cadastro
  q1WorkStyle: varchar("q1WorkStyle", { length: 50 }), // solo / dupla / equipe
  q2QuoteMethod: varchar("q2QuoteMethod", { length: 50 }), // whatsapp / papel / fala_preco
  q3AfterClose: varchar("q3AfterClose", { length: 50 }), // agenda / planilha / memoria
  suggestedPlan: varchar("suggestedPlan", { length: 20 }), // solo / dupla / equipe
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuizResponse = typeof quizResponses.$inferSelect;
export type InsertQuizResponse = typeof quizResponses.$inferInsert;

// ─── Extrato Bancário ─────────────────────────────────────────────────────────

// Registra cada upload de extrato bancário
export const bankImports = mysqlTable("bank_imports", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileType: mysqlEnum("fileType", ["pdf", "ofx", "csv", "other"]).default("pdf").notNull(),
  referenceMonth: varchar("referenceMonth", { length: 7 }).notNull(), // YYYY-MM
  bankName: varchar("bankName", { length: 100 }), // Nubank, Itaú, Bradesco, etc.
  status: mysqlEnum("status", ["processing", "done", "error"]).default("processing").notNull(),
  totalTransactions: int("totalTransactions").default(0),
  pendingReview: int("pendingReview").default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BankImport = typeof bankImports.$inferSelect;
export type InsertBankImport = typeof bankImports.$inferInsert;

// Cada transação extraída do extrato bancário
export const bankTransactions = mysqlTable("bank_transactions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  importId: int("importId").notNull(), // FK para bankImports
  // Dados da transação
  transactionDate: varchar("transactionDate", { length: 10 }).notNull(), // YYYY-MM-DD
  description: varchar("description", { length: 500 }).notNull(), // descrição original do banco
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // positivo = entrada, negativo = saída
  type: mysqlEnum("type", ["credit", "debit"]).notNull(), // crédito ou débito
  // Categorização
  category: varchar("category", { length: 100 }), // Combustível, Alimentação, Equipamentos, etc.
  isPersonal: boolean("isPersonal").notNull().default(false), // true = pessoal, não entra nos relatórios
  reviewStatus: mysqlEnum("reviewStatus", ["auto", "manual", "pending"]).default("pending").notNull(),
  // auto = IA categorizou com confiança
  // manual = usuário categorizou manualmente
  // pending = aguardando revisão
  aiConfidence: decimal("aiConfidence", { precision: 3, scale: 2 }), // 0.00 a 1.00
  aiSuggestedCategory: varchar("aiSuggestedCategory", { length: 100 }), // sugestão da IA
  // Vínculo com venda (opcional — para reconciliação)
  linkedSaleId: int("linkedSaleId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = typeof bankTransactions.$inferInsert;
