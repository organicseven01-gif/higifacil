// ⚠️ PRIMEIRO import, sempre: carrega o .env de forma independente do
// diretório de trabalho. Precisa vir antes de qualquer módulo que leia
// process.env no momento do import (ex: _core/env.ts). Ver loadEnv.ts.
import { logEnvDiagnostics } from "./loadEnv";

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook } from "../stripeWebhook";
import { getBudgetById, getBudgetItems, getSettings, getClients, createClient } from "../db";
import { ENV, validarEnvProducao, isCronAuthorized } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Primeira coisa, antes de qualquer outra inicialização: aborta o boot se
  // o ambiente de produção estiver com JWT_SECRET ausente/fraco. Ver
  // server/_core/env.ts para o motivo.
  validarEnvProducao();

  const app = express();
  const server = createServer(app);
  // Stripe webhook MUST be registered BEFORE express.json() for raw body access
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Force landing page to be served without redirect (bypass Cloudflare redirects)
  app.get('/', (req, res, next) => {
    // Always serve landing page without any redirect
    // This ensures the landing page is accessible even if Cloudflare is redirecting
    next();
  });

  // File upload endpoint — accepts multipart/form-data with a "file" field,
  // plus dois campos de texto: "visibility" ("public"|"private", default
  // "private" — nunca público por omissão) e "category" (pasta lógica, ex:
  // "clients", "sale-receipts"). A empresa vem da SESSÃO, nunca do cliente.
  //
  // ⚠️ Os campos de texto precisam vir ANTES do arquivo no FormData (é assim
  // que o navegador ordena as partes do multipart quando você usa
  // formData.append() nessa ordem) — o busboy processa "field" antes de
  // "file" só se a parte chegar antes no corpo da requisição.
  app.post("/api/upload", async (req, res) => {
    const ctx = await createContext({ req, res } as any);
    const session = ctx.user;
    if (!session) return res.status(401).json({ error: "Não autorizado" });
    const companyId = session.companyId;
    if (!companyId) {
      return res.status(400).json({
        error: "Nenhuma empresa na sessão. Entre com o login da empresa para enviar arquivos.",
      });
    }

    const { storagePut, buildStorageKey } = await import("../storage");

    import("busboy").then(({ default: Busboy }) => {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: 16 * 1024 * 1024 } });
      let filePromise: Promise<void> | null = null;
      let visibility: "public" | "private" = "private"; // default seguro: nunca público por omissão
      let category = "uploads";

      bb.on("field", (name: string, value: string) => {
        if (name === "visibility" && (value === "public" || value === "private")) {
          visibility = value;
        }
        if (name === "category" && /^[a-z0-9-]{1,40}$/.test(value)) {
          category = value;
        }
      });

      bb.on("file", (_fieldname: string, stream: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
        filePromise = (async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of stream) chunks.push(chunk as Buffer);
          const buffer = Buffer.concat(chunks);
          const key = buildStorageKey(companyId, category, info.filename || "arquivo");
          const { url, key: savedKey } = await storagePut(key, buffer, info.mimeType || "image/jpeg", visibility);
          if (!res.headersSent) res.json({ url, key: savedKey });
        })();
      });

      bb.on("finish", () => {
        if (filePromise) {
          filePromise.catch((err: any) => {
            if (!res.headersSent) res.status(500).json({ error: err.message });
          });
        } else {
          if (!res.headersSent) res.status(400).json({ error: "No file received" });
        }
      });

      bb.on("error", (err: any) => {
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });

      req.pipe(bb);
    }).catch((err: any) => {
      res.status(500).json({ error: err.message });
    });
  });

  // Image proxy endpoint — fetches external images server-side to avoid CORS issues
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "Missing url parameter" });
    try {
      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch image" });
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Maps routes endpoint — estimates tolls based on highway names from Directions API
  app.get("/api/maps/routes", async (req, res) => {
    const { origin, destination } = req.query as { origin: string; destination: string };
    if (!origin || !destination) return res.status(400).json({ error: "Missing origin or destination" });
    try {
      const { makeRequest } = await import("./map");
      const data = await makeRequest<any>("/maps/api/directions/json", {
        origin,
        destination,
        mode: "driving",
        language: "pt-BR",
        region: "br",
      });
      if (data.status !== "OK" || !data.routes?.length) {
        return res.json({ tollCost: 0, distanceKm: 0, highways: [], estimated: false });
      }
      const route = data.routes[0];
      const leg = route.legs[0];
      const distanceKm = (leg.distance?.value ?? 0) / 1000;
      const summary = (route.summary || "").toLowerCase();
      const steps: string[] = (leg.steps || []).map((s: any) =>
        (s.html_instructions || "").toLowerCase().replace(/<[^>]+>/g, " ")
      );
      const allText = summary + " " + steps.join(" ");

      // Known toll highways in São Paulo state with approximate one-way toll values (BRL)
      const tollTable: { pattern: RegExp; name: string; toll: number }[] = [
        { pattern: /bandeirantes|sp-348/, name: "Rod. dos Bandeirantes", toll: 7.10 },
        { pattern: /anhanguera|sp-330/, name: "Rod. Anhanguera", toll: 5.80 },
        { pattern: /castello branco|sp-280/, name: "Rod. Castello Branco", toll: 6.50 },
        { pattern: /raposo tavares|sp-270/, name: "Rod. Raposo Tavares", toll: 5.20 },
        { pattern: /imigrantes|sp-160/, name: "Via Imigrantes", toll: 8.20 },
        { pattern: /anchieta|sp-150/, name: "Rod. Anchieta", toll: 8.20 },
        { pattern: /dutra|br-116/, name: "Rod. Presidente Dutra", toll: 6.90 },
        { pattern: /fernão dias|br-381/, name: "Rod. Fernão Dias", toll: 7.40 },
        { pattern: /rodoanel|sp-21/, name: "Rodoanel", toll: 4.80 },
        { pattern: /dom pedro|sp-065/, name: "Rod. Dom Pedro I", toll: 6.20 },
        { pattern: /marechal rondon|sp-300/, name: "Rod. Marechal Rondon", toll: 5.50 },
        { pattern: /ayrton senna|sp-070/, name: "Rod. Ayrton Senna", toll: 5.90 },
        { pattern: /carvalho pinto|sp-099/, name: "Rod. Carvalho Pinto", toll: 5.40 },
        { pattern: /régis bittencourt|br-116/, name: "Rod. Régis Bittencourt", toll: 7.80 },
      ];

      const matchedHighways: string[] = [];
      let totalToll = 0;
      for (const entry of tollTable) {
        if (entry.pattern.test(allText)) {
          matchedHighways.push(entry.name);
          totalToll += entry.toll;
        }
      }

      return res.json({
        tollCost: totalToll,
        distanceKm: Math.round(distanceKm * 10) / 10,
        highways: matchedHighways,
        estimated: true,
        summary: route.summary,
      });
    } catch (err: any) {
      console.error("[maps/routes] Error:", err.message);
      return res.json({ tollCost: 0, distanceKm: 0, highways: [], estimated: false });
    }
  });

  // ─── Endpoint de geração de JPEG/PDF via Puppeteer ─────────────────────────
  // POST /api/budgets/:id/render?format=jpeg|jpeg_page2|pdf&infoPageId=xxx
  // Retorna o arquivo diretamente para download, sem linhas brancas ou cortes.
  app.post("/api/budgets/:id/render", async (req, res) => {
    const budgetId = parseInt(req.params.id);
    const format = (req.query.format as string) || "jpeg";
    const infoPageId = req.query.infoPageId as string | undefined;

    if (isNaN(budgetId)) return res.status(400).json({ error: "ID inválido" });

    try {
      // Buscar dados do orçamento
      const budget = await getBudgetById(budgetId);
      if (!budget) return res.status(404).json({ error: "Orçamento não encontrado" });
      
      // Marcar orçamento como "enviado" (sent) quando for renderizado
      if (budget.status === "pending") {
        const { updateBudget } = await import("../db");
        await updateBudget(budgetId, { status: "sent" });
      }

      const items = await getBudgetItems(budgetId);
      const settingsRows = await getSettings(budget.companyId ?? undefined);
      const settingsObj: Record<string, string> = {};
      for (const row of settingsRows) settingsObj[row.key] = row.value;

      // Resolver a página de informações selecionada
      let infoPageText: string | undefined;
      if (infoPageId && infoPageId !== "__none__") {
        const rawInfoPages = settingsObj.info_pages;
        if (rawInfoPages) {
          try {
            const pages = JSON.parse(rawInfoPages);
            const found = Array.isArray(pages) ? pages.find((p: any) => p.id === infoPageId) : null;
            if (found) infoPageText = found.text;
          } catch { /* ignora */ }
        }
      }

      const { renderBudgetAsJpeg, renderInfoPageAsJpeg, renderBudgetAsPdf } = await import("../budgetRenderer");

      const renderData = {
        budget: { ...budget, items },
        settings: settingsObj,
        selectedInfoPageId: infoPageId ?? null,
      };

      const clientName = (budget.clientName || "orcamento").replace(/\s+/g, "-");
      const budgetNum = budget.budgetNumber
        ? `${String(budget.budgetNumber).padStart(3, "0")}-${new Date(budget.createdAt).getFullYear()}`
        : `${budgetId}`;

      if (format === "pdf") {
        const pdfBuffer = await renderBudgetAsPdf(renderData, infoPageText);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="orcamento-${clientName}-${budgetNum}.pdf"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.setHeader("X-Budget-Status-Updated", "true");
        return res.send(pdfBuffer);
      } else if (format === "jpeg_page2" && infoPageText) {
        // Retorna apenas a página 2 como JPEG
        const jpegBuffer = await renderInfoPageAsJpeg(renderData, infoPageText);
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Content-Disposition", `attachment; filename="orcamento-${clientName}-${budgetNum}-pag2.jpg"`);
        res.setHeader("Content-Length", jpegBuffer.length);
        res.setHeader("X-Budget-Status-Updated", "true");
        return res.send(jpegBuffer);
      } else {
        // JPEG da página 1
        const jpegBuffer = await renderBudgetAsJpeg(renderData);
        const suffix = infoPageText ? "-pag1" : "";
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Content-Disposition", `attachment; filename="orcamento-${clientName}-${budgetNum}${suffix}.jpg"`);
        res.setHeader("Content-Length", jpegBuffer.length);
        res.setHeader("X-Budget-Status-Updated", "true");
        return res.send(jpegBuffer);
      }
    } catch (err: any) {
      console.error("[render] Erro:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Endpoint para servir a landing page (contorna Cloudflare redirect)
  app.get("/api/landing-page", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    // Retorna um HTML que redireciona para a landing page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Higifácil - Sistema de Orçamentos</title>
          <script>
            // Tenta carregar a landing page via iframe
            window.location.href = window.location.origin + '/';
          </script>
        </head>
        <body>
          <p>Redirecionando para a landing page...</p>
        </body>
      </html>
    `);
  });

  // ─── Heartbeat: bloquear trials vencidos (job diário) ──────────────────────
  // Protegido por CRON_SECRET próprio (substituiu a dependência do header
  // x-manus-cron-task-uid, que só a Manus injetava). O agendador da
  // infraestrutura escolhida (ex: Railway Cron Jobs) deve chamar esta rota
  // 1x/dia enviando "Authorization: Bearer <CRON_SECRET>". Sem a variável
  // configurada, ou com o valor errado, a rota sempre responde 403 — nunca
  // libera por omissão.
  app.post("/api/scheduled/expire-trials", async (req, res) => {
    try {
      if (!isCronAuthorized(req.headers["authorization"], ENV.cronSecret)) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { getDb } = await import("../db");
      const { companies } = await import("../../drizzle/schema");
      const { lte, and, eq, isNotNull } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return res.json({ ok: true, skipped: "no-db" });

      const now = new Date();
      // Bloquear empresas com planType=free, trialEndsAt no passado e subscriptionStatus=active
      const result = await db
        .update(companies)
        .set({ subscriptionStatus: "expired", active: false })
        .where(
          and(
            eq(companies.planType, "free"),
            eq(companies.subscriptionStatus, "active"),
            isNotNull(companies.trialEndsAt),
            lte(companies.trialEndsAt, now)
          )
        );
      const affectedRows = (result as any)[0]?.affectedRows ?? 0;
      console.log(`[expire-trials] Bloqueadas ${affectedRows} empresa(s) com trial vencido`);
      return res.json({ ok: true, expired: affectedRows });
    } catch (err: any) {
      console.error("[expire-trials] Erro:", err);
      return res.status(500).json({ error: err.message, timestamp: new Date().toISOString() });
    }
  });

  // ─── Exportar clientes (GET /api/clients/export) ──────────────────────────
  app.get("/api/clients/export", async (req: any, res: any) => {
    try {
      // Verificar autenticação via contexto tRPC
      const ctx = await createContext({ req, res } as any);
      const session = ctx.user;
      if (!session) return res.status(401).json({ error: "Não autorizado" });

      const XLSX = await import("xlsx");
      const allClients = await getClients(undefined, session.companyId ?? undefined);

      const rows = (allClients as any[]).map((c: any) => ({
        "Nome": c.name ?? "",
        "Telefone": c.phone ?? "",
        "Email": c.email ?? "",
        "CEP": c.cep ?? "",
        "Rua": c.street ?? "",
        "Número": c.addressNumber ?? "",
        "Complemento": c.complement ?? "",
        "Bairro": c.neighborhood ?? "",
        "Cidade": c.city ?? "",
        "Estado": c.state ?? "",
        "Observações": c.notes ?? "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      // Larguras das colunas
      ws["!cols"] = [30,18,30,12,30,10,20,20,20,5,40].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="clientes-higifacil.xlsx"`);
      return res.send(buf);
    } catch (err: any) {
      console.error("[export-clients]", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Modelo de planilha (GET /api/clients/template) ────────────────────────
  app.get("/api/clients/template", async (_req: any, res: any) => {
    try {
      const XLSX = await import("xlsx");
      const headers = ["Nome", "Telefone", "Email", "CEP", "Rua", "Número", "Complemento", "Bairro", "Cidade", "Estado", "Observações"];
      const example = ["Maria Silva", "11999990000", "maria@email.com", "01310100", "Av. Paulista", "1000", "Apto 12", "Bela Vista", "São Paulo", "SP", "Cliente VIP"];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, example]);
      ws["!cols"] = [30,18,30,12,30,10,20,20,20,5,40].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="modelo-importacao-clientes.xlsx"`);
      return res.send(buf);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Importar clientes (POST /api/clients/import) ──────────────────────────
  app.post("/api/clients/import", async (req: any, res: any) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const session = ctx.user;
      if (!session) return res.status(401).json({ error: "Não autorizado" });
      // Importar clientes exige empresa: sem ela os registros nasceriam órfãos
      // e ficariam invisíveis no sistema (ver migration 0021).
      const empresaImport = session.companyId;
      if (!empresaImport) {
        return res.status(400).json({
          error: "Nenhuma empresa na sessão. Entre com o login da empresa para importar clientes.",
        });
      }

      // O body vem como base64 da planilha
      const { fileBase64 } = req.body as { fileBase64: string };
      if (!fileBase64) return res.status(400).json({ error: "Arquivo não enviado" });

      const XLSX = await import("xlsx");
      const buf = Buffer.from(fileBase64, "base64");
      const wb = XLSX.read(buf, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Buscar clientes existentes para detectar duplicatas
      const existing = await getClients(undefined, session.companyId ?? undefined);
      const existingPhones = new Set((existing as any[]).map((c: any) => c.phone?.replace(/\D/g, "")));

      const results = { imported: 0, skipped: 0, errors: [] as string[] };

      for (const row of rows) {
        const name = String(row["Nome"] ?? "").trim();
        const phone = String(row["Telefone"] ?? "").replace(/\D/g, "");
        if (!name || !phone) { results.skipped++; continue; }
        if (existingPhones.has(phone)) { results.skipped++; continue; }

        try {
          await createClient({
            name,
            phone,
            email: String(row["Email"] ?? "").trim() || undefined,
            cep: String(row["CEP"] ?? "").trim() || undefined,
            street: String(row["Rua"] ?? "").trim() || undefined,
            addressNumber: String(row["Número"] ?? "").trim() || undefined,
            complement: String(row["Complemento"] ?? "").trim() || undefined,
            neighborhood: String(row["Bairro"] ?? "").trim() || undefined,
            city: String(row["Cidade"] ?? "").trim() || undefined,
            state: String(row["Estado"] ?? "").trim() || undefined,
            notes: String(row["Observações"] ?? "").trim() || undefined,
          }, empresaImport);
          existingPhones.add(phone);
          results.imported++;
        } catch (e: any) {
          results.errors.push(`${name}: ${e.message}`);
        }
      }

      return res.json(results);
    } catch (err: any) {
      console.error("[import-clients]", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Prévia de importação (POST /api/clients/import-preview) ───────────────
  app.post("/api/clients/import-preview", async (req: any, res: any) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const session = ctx.user;
      if (!session) return res.status(401).json({ error: "Não autorizado" });

      const { fileBase64 } = req.body as { fileBase64: string };
      if (!fileBase64) return res.status(400).json({ error: "Arquivo não enviado" });

      const XLSX = await import("xlsx");
      const buf = Buffer.from(fileBase64, "base64");
      const wb = XLSX.read(buf, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const existing = await getClients(undefined, session.companyId ?? undefined);
      const existingPhones = new Set((existing as any[]).map((c: any) => c.phone?.replace(/\D/g, "")));

      const preview = rows.slice(0, 100).map((row: any) => {
        const name = String(row["Nome"] ?? "").trim();
        const phone = String(row["Telefone"] ?? "").replace(/\D/g, "");
        const duplicate = existingPhones.has(phone);
        return {
          name, phone,
          email: String(row["Email"] ?? "").trim(),
          city: String(row["Cidade"] ?? "").trim(),
          state: String(row["Estado"] ?? "").trim(),
          duplicate,
          valid: !!(name && phone),
        };
      });

      return res.json({ total: rows.length, preview });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    logEnvDiagnostics();
  });
}

startServer().catch(console.error);
