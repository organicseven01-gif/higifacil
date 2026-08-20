import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  createBankImport,
  updateBankImport,
  getBankImports,
  createBankTransactions,
  getBankTransactions,
  updateBankTransaction,
  deleteBankImport,
} from "./db";

// Categorias disponíveis para classificação
export const BANK_CATEGORIES = [
  "Combustível",
  "Alimentação",
  "Equipamentos e Ferramentas",
  "Produtos de Limpeza",
  "Transporte e Frete",
  "Marketing e Publicidade",
  "Telefone e Internet",
  "Aluguel e Infraestrutura",
  "Impostos e Taxas",
  "Salários e Pagamentos",
  "Receita de Serviço",
  "Transferência",
  "Saque",
  "Pessoal (ignorar)",
  "Outros",
] as const;

// Função para detectar o banco a partir do conteúdo do PDF
function detectBankName(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes("nubank") || lower.includes("nu pagamentos")) return "Nubank";
  if (lower.includes("itaú") || lower.includes("itau")) return "Itaú";
  if (lower.includes("bradesco")) return "Bradesco";
  if (lower.includes("banco do brasil") || lower.includes("bb ")) return "Banco do Brasil";
  if (lower.includes("caixa econômica") || lower.includes("caixa economica")) return "Caixa Econômica";
  if (lower.includes("santander")) return "Santander";
  if (lower.includes("sicoob")) return "Sicoob";
  if (lower.includes("sicredi")) return "Sicredi";
  if (lower.includes("inter")) return "Banco Inter";
  if (lower.includes("c6 bank") || lower.includes("c6bank")) return "C6 Bank";
  if (lower.includes("picpay")) return "PicPay";
  if (lower.includes("mercado pago")) return "Mercado Pago";
  return "Banco não identificado";
}

// Processar extrato com IA — recebe URL do arquivo já no S3
async function processStatementWithAI(params: {
  fileUrl: string;
  fileType: string;
  referenceMonth: string;
  companyId: number;
  importId: number;
}) {
  const { fileUrl, fileType, referenceMonth, companyId, importId } = params;

  try {
    // Chamar LLM com o arquivo PDF
    const systemPrompt = `Você é um assistente especializado em análise de extratos bancários brasileiros.
Sua tarefa é extrair TODAS as transações do extrato fornecido e categorizá-las.

Categorias disponíveis:
${BANK_CATEGORIES.join(", ")}

Regras de categorização:
- Postos de gasolina, combustível → "Combustível"
- Restaurantes, iFood, lanchonetes, supermercados → "Alimentação"
- Ferramentas, equipamentos, Mercado Livre, Amazon, Shopee → "Equipamentos e Ferramentas"
- Produtos de limpeza, químicos, fornecedores → "Produtos de Limpeza"
- Uber, táxi, frete, motoboy → "Transporte e Frete"
- Google Ads, Meta Ads, marketing → "Marketing e Publicidade"
- Telefone, internet, Vivo, Claro, Tim → "Telefone e Internet"
- Aluguel, condomínio → "Aluguel e Infraestrutura"
- DAS, impostos, INSS, taxas → "Impostos e Taxas"
- Pagamento para funcionários, freelancers → "Salários e Pagamentos"
- Recebimento de clientes, PIX recebido de pessoa física → "Receita de Serviço"
- Transferência entre contas próprias → "Transferência"
- Saque em caixa eletrônico → "Saque"
- Netflix, Spotify, farmácia, escola, academia → "Pessoal (ignorar)"
- Qualquer coisa que não se encaixe → "Outros"

Para cada transação, informe também:
- confidence: número de 0 a 1 indicando sua confiança na categorização
  - 0.9+ = certeza alta (posto de gasolina, Netflix)
  - 0.7-0.89 = boa confiança (supermercado provavelmente alimentação)
  - 0.5-0.69 = incerto (PIX enviado para pessoa sem contexto)
  - abaixo de 0.5 = muito incerto → use "Outros"

Retorne APENAS o JSON, sem texto adicional.`;

    const userPrompt = `Extraia todas as transações deste extrato bancário do mês ${referenceMonth}.
Para cada transação, retorne: date (YYYY-MM-DD), description (texto original), amount (número positivo), type ("credit" para entrada, "debit" para saída), category, confidence.

O arquivo está em: ${fileUrl}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: fileType === "pdf"
          ? [
              { type: "text", text: userPrompt },
              { type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } },
            ]
          : userPrompt,
      },
    ];

    const response = await invokeLLM({
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bank_statement",
          strict: true,
          schema: {
            type: "object",
            properties: {
              bankName: { type: "string", description: "Nome do banco identificado" },
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    description: { type: "string" },
                    amount: { type: "number" },
                    type: { type: "string", enum: ["credit", "debit"] },
                    category: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["date", "description", "amount", "type", "category", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["bankName", "transactions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("IA não retornou resposta");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    const transactions = parsed.transactions ?? [];
    const bankName = parsed.bankName ?? "Banco não identificado";

    // Salvar transações no banco
    const toInsert = transactions.map((t: any) => ({
      companyId,
      importId,
      transactionDate: t.date,
      description: t.description,
      amount: Math.abs(Number(t.amount)),
      type: t.type as "credit" | "debit",
      category: t.confidence >= 0.7 ? t.category : undefined,
      isPersonal: t.category === "Pessoal (ignorar)" && t.confidence >= 0.7,
      reviewStatus: t.confidence >= 0.7 ? ("auto" as const) : ("pending" as const),
      aiConfidence: Number(t.confidence),
      aiSuggestedCategory: t.category,
    }));

    await createBankTransactions(toInsert);

    const pendingCount = toInsert.filter((t: any) => t.reviewStatus === "pending").length;

    await updateBankImport(importId, {
      status: "done",
      totalTransactions: toInsert.length,
      pendingReview: pendingCount,
      bankName,
      errorMessage: undefined,
    });

    return { success: true, bankName, total: toInsert.length, pending: pendingCount };
  } catch (err: any) {
    await updateBankImport(importId, {
      status: "error",
      errorMessage: err.message ?? "Erro desconhecido",
    });
    throw err;
  }
}

export const bankStatementRouter = router({
  // Iniciar importação: recebe URL do arquivo já no S3
  import: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string(),
        fileType: z.enum(["pdf", "ofx", "csv", "other"]).default("pdf"),
        referenceMonth: z.string(), // YYYY-MM
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.companyId ?? (ctx.user as any).companyId ?? null;
      if (!companyId) throw new Error("Empresa não encontrada");

      // Criar registro de importação
      const importId = await createBankImport({
        companyId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        fileType: input.fileType,
        referenceMonth: input.referenceMonth,
      });

      // Processar em background (não bloqueia a resposta)
      processStatementWithAI({
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        referenceMonth: input.referenceMonth,
        companyId,
        importId,
      }).catch((err) => {
        console.error("[BankStatement] Erro ao processar extrato:", err);
      });

      return { importId, status: "processing" };
    }),

  // Listar importações da empresa
  listImports: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.companyId ?? (ctx.user as any).companyId ?? null;
    if (!companyId) return [];
    return getBankImports(companyId);
  }),

  // Listar transações com filtros
  listTransactions: protectedProcedure
    .input(
      z.object({
        importId: z.number().optional(),
        reviewStatus: z.enum(["auto", "manual", "pending"]).optional(),
        referenceMonth: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.companyId ?? (ctx.user as any).companyId ?? null;
      if (!companyId) return [];
      return getBankTransactions(companyId, input);
    }),

  // Atualizar categoria de uma transação (revisão manual)
  updateTransaction: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        category: z.string().optional(),
        isPersonal: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.companyId ?? (ctx.user as any).companyId ?? null;
      if (!companyId) throw new Error("Empresa não encontrada");
      // Verificar se a transação pertence à empresa
      await updateBankTransaction(input.id, companyId, {
        category: input.category,
        isPersonal: input.isPersonal,
        reviewStatus: "manual",
        notes: input.notes,
      });
      return { success: true };
    }),

  // Deletar importação e suas transações
  deleteImport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.companyId ?? (ctx.user as any).companyId ?? null;
      if (!companyId) throw new Error("Empresa não encontrada");
      await deleteBankImport(input.id, companyId);
      return { success: true };
    }),

  // Categorias disponíveis
  getCategories: protectedProcedure.query(() => {
    return BANK_CATEGORIES;
  }),
});
