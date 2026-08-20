/**
 * budgetRenderer.ts
 * Geração de JPEG/PDF do orçamento via Puppeteer (server-side).
 * Elimina completamente os problemas de linhas brancas, corte e rgba borders
 * que ocorriam com as bibliotecas de captura client-side (html2canvas, dom-to-image-more).
 */

import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface BudgetRenderData {
  budget: {
    id: number;
    budgetNumber?: number | null;
    clientName: string;
    clientPhone: string;
    clientAddress?: string | null;
    subtotal: string | number;
    discountValue: string | number;
    total: string | number;
    notes?: string | null;
    videos?: string | null;
    validDays: number;
    paymentConditions?: string | null;
    createdAt: Date | string;
    items: Array<{
      id: number;
      name: string;
      quantity: number;
      unitPrice: string | number;
      subtotal: string | number;
    }>;
  };
  settings: {
    company_name?: string;
    company_phone?: string;
    company_email?: string;
    company_cnpj?: string;
    company_owner?: string;
    company_address?: string;
    company_city?: string;
    company_description?: string;
    google_rating?: string;
    google_review_count?: string;
    pix_key?: string;
    bank_name?: string;
    bank_agency?: string;
    bank_account?: string;
    bank_account_type?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    budget_template?: string;
    payment_methods_config?: string;
    info_pages?: string;
  };
  selectedInfoPageId?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Gerador de HTML do template premium ─────────────────────────────────────
function generatePremiumHtml(data: BudgetRenderData): string {
  const { budget, settings } = data;

  const bgBase = settings.primary_color || "#0d1b4b";
  const accentColor = settings.secondary_color || "#00e676";
  const cardBg = bgBase;

  const subtotal = parseFloat(String(budget.subtotal)) || 0;
  const discountAmount = parseFloat(String(budget.discountValue)) || 0;
  const total = parseFloat(String(budget.total)) || 0;
  const hasDiscount = discountAmount > 0;

  // Formas de pagamento
  type PaymentMethodCfg = {
    id: string; label: string; enabled: boolean; discountPercent: number;
    maxInstallments?: number; addFee?: boolean; installmentRates?: number[];
  };
  const DEFAULT_PAYMENT_METHODS: PaymentMethodCfg[] = [
    { id: "cash", label: "Espécie", enabled: true, discountPercent: 10 },
    { id: "pix", label: "À Vista (Pix / Débito)", enabled: true, discountPercent: 5 },
    { id: "credit_cash", label: "Crédito à Vista", enabled: true, discountPercent: 0 },
    { id: "installments", label: "Cartão Parcelado", enabled: true, discountPercent: 0, maxInstallments: 8, addFee: false, installmentRates: [0,0,0,0,0,0,0,0,0,0,0,0] },
  ];
  let paymentMethodsCfg: PaymentMethodCfg[] = DEFAULT_PAYMENT_METHODS;
  if (settings.payment_methods_config) {
    try {
      const parsed = JSON.parse(settings.payment_methods_config);
      if (Array.isArray(parsed)) paymentMethodsCfg = parsed;
    } catch { /* usa default */ }
  }
  const enabledPaymentMethods = paymentMethodsCfg.filter(m => m.enabled);
  const colCount = enabledPaymentMethods.length;

  // Sobre nós
  const companyDescription = settings.company_description || "";
  const googleRating = settings.google_rating || "";
  const googleReviewCount = settings.google_review_count || "";
  const hasDescription = !!companyDescription.trim();
  const hasGoogleRating = !!googleRating.trim();
  const hasSobreNos = hasDescription || hasGoogleRating;

  // Itens
  const itemsHtml = budget.items.map((item, index) => {
    const rowBg = index % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)";
    return `
      <div style="display:flex;align-items:center;padding:13px 14px;background:${rowBg};border-top:1px solid rgba(255,255,255,0.06);">
        <div style="width:46px;color:#fff;font-weight:900;text-align:center;font-size:15px;flex-shrink:0;">${String(item.quantity).padStart(2, "0")}</div>
        <div style="flex:1;color:rgba(255,255,255,0.88);font-size:13px;text-align:center;padding:0 8px;line-height:1.4;">${escapeHtml(item.name)}</div>
        <div style="width:84px;color:#fff;font-weight:700;text-align:right;font-size:13px;flex-shrink:0;">${formatCurrency(item.subtotal)}</div>
      </div>`;
  }).join("");

  // Total/subtotal rows
  let totalRowsHtml = "";
  if (hasDiscount) {
    totalRowsHtml = `
      <div style="display:flex;align-items:center;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.12);">
        <div style="flex:1;color:rgba(255,255,255,0.5);font-size:12px;text-align:right;padding-right:12px;">Subtotal</div>
        <div style="width:84px;color:rgba(255,255,255,0.7);font-size:12px;font-weight:600;text-align:right;">${formatCurrency(subtotal)}</div>
      </div>
      <div style="display:flex;align-items:center;padding:8px 14px;background:rgba(0,0,0,0.12);">
        <div style="flex:1;font-size:13px;text-align:right;padding-right:12px;font-weight:800;color:${accentColor};">Desconto</div>
        <div style="width:84px;font-size:13px;font-weight:800;text-align:right;color:${accentColor};">- ${formatCurrency(discountAmount)}</div>
      </div>
      <div style="display:flex;align-items:center;padding:13px 14px;border-top:1.5px solid ${accentColor};background:rgba(255,255,255,0.06);">
        <div style="flex:1;color:#fff;font-weight:900;font-size:14px;text-align:right;padding-right:12px;text-transform:uppercase;letter-spacing:1.5px;">TOTAL</div>
        <div style="width:84px;color:#fff;font-weight:900;font-size:16px;text-align:right;">${formatCurrency(total)}</div>
      </div>`;
  } else if (budget.items.length > 2) {
    totalRowsHtml = `
      <div style="display:flex;align-items:center;padding:13px 14px;border-top:1.5px solid ${accentColor};background:rgba(255,255,255,0.06);">
        <div style="flex:1;color:#fff;font-weight:900;font-size:14px;text-align:right;padding-right:12px;text-transform:uppercase;letter-spacing:1.5px;">TOTAL</div>
        <div style="width:84px;color:#fff;font-weight:900;font-size:16px;text-align:right;">${formatCurrency(total)}</div>
      </div>`;
  }

  // Formas de pagamento
  const gridCols = colCount <= 2 ? `repeat(${colCount}, 1fr)` : colCount === 3 ? "1fr 1fr 1fr" : "1fr 1fr";
  const paymentBlocksHtml = enabledPaymentMethods.map((method, idx) => {
    const baseValue = total * (1 - method.discountPercent / 100);
    const installments = method.id === "installments" ? (method.maxInstallments ?? 8) : 1;
    const installmentFeeRate = method.id === "installments"
      ? ((method.installmentRates ?? [])[installments - 1] ?? 0) / 100
      : 0;
    const discounted = method.id === "installments" && (method.addFee ?? false)
      ? baseValue * (1 + installmentFeeRate)
      : baseValue;
    const isHighlight = idx === enabledPaymentMethods.length - 1;

    let valueHtml = "";
    if (method.id === "installments") {
      valueHtml = `
        <p style="font-weight:900;font-size:${colCount <= 2 ? "22px" : "16px"};color:${isHighlight ? "#000" : "#fff"};margin:0;line-height:1;">${installments}x ${formatCurrency(discounted / installments)}</p>
        <p style="font-size:9px;color:${isHighlight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.45)"};margin-top:5px;">Total: ${formatCurrency(discounted)}</p>`;
    } else {
      valueHtml = `
        <p style="font-weight:900;font-size:${colCount <= 2 ? "22px" : "16px"};color:${isHighlight ? "#000" : "#fff"};margin:0;line-height:1;">${formatCurrency(discounted)}</p>
        ${method.discountPercent > 0 ? `<p style="font-size:9px;color:${isHighlight ? "rgba(0,0,0,0.6)" : accentColor};margin-top:5px;font-weight:700;">-${method.discountPercent}% de desconto</p>` : ""}`;
    }

    return `
      <div style="padding:14px 10px;border-radius:14px;text-align:center;background:${isHighlight ? accentColor : "rgba(255,255,255,0.06)"};border:${isHighlight ? "none" : `1.5px solid ${accentColor}`};">
        <p style="font-weight:900;font-size:9px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;color:${isHighlight ? "rgba(0,0,0,0.75)" : accentColor};">${escapeHtml(method.label.toUpperCase())}</p>
        ${valueHtml}
      </div>`;
  }).join("");

  const paymentFallback = enabledPaymentMethods.length === 0
    ? `<div style="grid-column:1/-1;padding:16px;border-radius:14px;text-align:center;background:rgba(255,255,255,0.06);border:1.5px solid ${accentColor}50;"><p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">Configure as formas de pagamento nas Configurações</p></div>`
    : "";

  // Sobre Nós
  let sobreNosHtml = "";
  if (hasSobreNos) {
    let descHtml = "";
    if (hasDescription) {
      descHtml = `
        <div style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px;">
            <div style="height:2px;width:14px;border-radius:2px;background:${accentColor};flex-shrink:0;"></div>
            <p style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:${accentColor};margin:0;">CONHEÇA A NOSSA EMPRESA</p>
          </div>
          <p style="color:#fff;font-weight:700;font-size:13px;margin:0 0 5px;">${escapeHtml(settings.company_name || "")}</p>
          <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:0;line-height:1.55;">${escapeHtml(companyDescription)}</p>
        </div>`;
    }

    let ratingHtml = "";
    if (hasGoogleRating) {
      const ratingNum = parseFloat(googleRating) || 0;
      const starsHtml = [1,2,3,4,5].map(i => {
        const filled = ratingNum >= i ? accentColor : "rgba(255,255,255,0.15)";
        return `<svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:${filled};display:inline-block;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
      }).join("");
      ratingHtml = `
        <div style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;flex-shrink:0;display:inline-block;">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <p style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.7);margin:0;">Avaliações Google</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div>
              <span style="font-size:30px;font-weight:900;color:#fff;line-height:1;display:block;">${escapeHtml(googleRating)}</span>
              <span style="font-size:10px;color:rgba(255,255,255,0.4);">de 5</span>
            </div>
            <div>
              <div style="display:flex;gap:2px;margin-bottom:3px;">${starsHtml}</div>
              ${googleReviewCount ? `<p style="font-size:10px;margin:0;"><span style="color:${accentColor};font-weight:700;">${escapeHtml(googleReviewCount)} avaliações</span><span style="color:rgba(255,255,255,0.4);"> no Google</span></p>` : ""}
            </div>
          </div>
          ${googleReviewCount ? `<div style="display:flex;align-items:center;gap:5px;margin-top:4px;"><div style="width:6px;height:6px;border-radius:50%;background:${accentColor};flex-shrink:0;"></div><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0;">+${escapeHtml(googleReviewCount)} clientes satisfeitos recomendam a ${escapeHtml(settings.company_name || "nossa empresa")}</p></div>` : ""}
        </div>`;
    }

    sobreNosHtml = `
      <div style="display:flex;align-items:center;gap:10px;margin:4px 0 12px;">
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.12);"></div>
        <p style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin:0;white-space:nowrap;">SOBRE NÓS</p>
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.12);"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${descHtml}${ratingHtml}
      </div>`;
  }

  // Logo
  const logoHtml = settings.logo_url
    ? `<img src="${escapeHtml(settings.logo_url)}" style="width:72px;height:72px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,0.08);padding:6px;flex-shrink:0;" />`
    : "";

  // Endereço do cliente
  const addressHtml = budget.clientAddress
    ? `<div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);margin-top:8px;">
        <p style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;">ENDEREÇO</p>
        <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:0;">${escapeHtml(budget.clientAddress)}</p>
      </div>`
    : "";

  // Observações
  const notesHtml = budget.notes
    ? `<div style="padding:0 16px 16px;">
        <div style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">
          <p style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">OBSERVAÇÕES</p>
          <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:0;line-height:1.6;white-space:pre-wrap;">${escapeHtml(budget.notes)}</p>
        </div>
      </div>`
    : "";

  const budgetNumStr = budget.budgetNumber
    ? `${String(budget.budgetNumber).padStart(3, "0")}-${new Date(budget.createdAt).getFullYear()}`
    : `#${budget.id}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orçamento ${budgetNumStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: ${cardBg}; font-family: 'Segoe UI', Arial, sans-serif; }
  </style>
</head>
<body>
  <div style="background:${cardBg};width:700px;font-family:'Segoe UI',Arial,sans-serif;">
    <!-- Top accent bar -->
    <div style="height:5px;background:${accentColor};"></div>

    <!-- Header -->
    <div style="padding:22px 20px 14px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="flex:1;">
          ${settings.company_name ? `<p style="color:${accentColor};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;opacity:0.9;">${escapeHtml(settings.company_name)}</p>` : ""}
          <h1 style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;margin:0;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,0.4);">INVESTIMENTO</h1>
          <p style="color:rgba(255,255,255,0.65);font-size:12px;margin-top:8px;margin-bottom:0;">Data: <strong style="color:#fff;">${formatDate(budget.createdAt)}</strong></p>
          <p style="color:rgba(255,255,255,0.65);font-size:12px;margin-top:3px;margin-bottom:0;">Válido por: <strong style="color:#fff;">${budget.validDays} dias</strong></p>
        </div>
        ${logoHtml}
      </div>

      <!-- Client info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
          <p style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;">CLIENTE</p>
          <p style="color:#fff;font-weight:700;font-size:15px;margin:0;word-break:break-word;">${escapeHtml(budget.clientName)}</p>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
          <p style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;">CONTATO</p>
          <p style="color:#fff;font-weight:700;font-size:15px;margin:0;">${escapeHtml(budget.clientPhone || "—")}</p>
        </div>
      </div>
      ${addressHtml}
    </div>

    <!-- Items table -->
    <div style="padding:0 16px 16px;">
      <div style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <!-- Header verde -->
        <div style="display:flex;align-items:center;padding:11px 14px;background:${accentColor};">
          <div style="width:46px;text-align:center;font-weight:900;font-size:11px;color:#000;flex-shrink:0;letter-spacing:0.5px;">QUANT.</div>
          <div style="flex:1;font-weight:900;font-size:11px;color:#000;text-align:center;padding:0 8px;letter-spacing:0.5px;">DESCRIÇÃO</div>
          <div style="width:84px;font-weight:900;font-size:11px;color:#000;text-align:right;flex-shrink:0;letter-spacing:0.5px;">VALOR</div>
        </div>
        ${itemsHtml}
        ${totalRowsHtml}
      </div>
    </div>

    <!-- Condições de Pagamento -->
    <div style="padding:0 16px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.12);"></div>
        <p style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin:0;white-space:nowrap;">CONDIÇÕES DE PAGAMENTO</p>
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.12);"></div>
      </div>
      <div style="display:grid;grid-template-columns:${gridCols};gap:8px;margin-bottom:16px;">
        ${paymentBlocksHtml}
        ${paymentFallback}
      </div>
      ${sobreNosHtml}
    </div>

    ${notesHtml}

    <!-- Bottom accent bar -->
    <div style="margin-top:20px;height:5px;background:${accentColor};"></div>
  </div>
</body>
</html>`;
}

// ─── Gerador de HTML da página de informações ─────────────────────────────────
function generateInfoPageHtml(data: BudgetRenderData, infoPageText: string): string {
  const { settings } = data;
  const bgBase = settings.primary_color || "#0d1b4b";
  const accentColor = settings.secondary_color || "#00e676";

  const lines = infoPageText.split("\n").map(l =>
    `<p style="margin:0 0 14px;line-height:1.7;">${escapeHtml(l)}</p>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informações</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: ${bgBase}; font-family: 'Segoe UI', Arial, sans-serif; }
  </style>
</head>
<body>
  <div style="background:${bgBase};width:700px;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="height:10px;background:${accentColor};"></div>
    <div style="padding:28px 32px 36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:4px;height:36px;border-radius:4px;background:${accentColor};flex-shrink:0;"></div>
        <div>
          <p style="color:${accentColor};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">INFORMAÇÕES IMPORTANTES</p>
          <p style="color:#fff;font-size:22px;font-weight:900;margin:0;">${escapeHtml(settings.company_name || "")}</p>
        </div>
      </div>
      <div style="color:rgba(255,255,255,0.9);font-size:14px;line-height:1.8;">
        ${lines}
      </div>
    </div>
    <div style="height:8px;background:${accentColor};opacity:0.6;"></div>
  </div>
</body>
</html>`;
}

// ─── Captura via Puppeteer ────────────────────────────────────────────────────
let browserInstance: any = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Em produção (Cloud Run/serverless): usar @sparticuz/chromium
    const chromium = await import("@sparticuz/chromium");
    const executablePath = await chromium.default.executablePath();
    browserInstance = await puppeteerCore.launch({
      args: chromium.default.args,
      // @sparticuz/chromium >= 137 não exporta mais `defaultViewport`;
      // cada captura já chama page.setViewport() com o tamanho real logo
      // depois de abrir a página, então isso aqui é só o estado inicial.
      defaultViewport: { width: 800, height: 600, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    });
  } else {
    // Em desenvolvimento: usar o Chrome bundled do Puppeteer
    browserInstance = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
      headless: true,
    });
  }
  return browserInstance;
}

async function captureHtmlAsJpeg(html: string, width: number = 700): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Aguarda imagens carregarem
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const imgs = Array.from(document.images);
        if (imgs.every(img => img.complete)) { resolve(); return; }
        let loaded = 0;
        const onLoad = () => { loaded++; if (loaded === imgs.length) resolve(); };
        imgs.forEach(img => { img.addEventListener("load", onLoad); img.addEventListener("error", onLoad); });
        setTimeout(resolve, 3000);
      });
    });
    // Mede a altura real do conteúdo
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width, height: bodyHeight, deviceScaleFactor: 2 });
    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 95,
      clip: { x: 0, y: 0, width, height: bodyHeight },
    });
    // Puppeteer retorna Uint8Array, converter para Buffer para envio correto pelo Express
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────
export async function renderBudgetAsJpeg(data: BudgetRenderData): Promise<Buffer> {
  const html = generatePremiumHtml(data);
  return captureHtmlAsJpeg(html, 700);
}

export async function renderInfoPageAsJpeg(data: BudgetRenderData, infoPageText: string): Promise<Buffer> {
  const html = generateInfoPageHtml(data, infoPageText);
  return captureHtmlAsJpeg(html, 700);
}

export async function renderBudgetAsPdf(data: BudgetRenderData, infoPageText?: string): Promise<Buffer> {
  const { settings } = data;
  const bgBase = settings.primary_color || "#0d1b4b";
  const accentColor = settings.secondary_color || "#00e676";

  // Gera JPEG da página 1
  const page1Jpeg = await renderBudgetAsJpeg(data);

  // Gera JPEG da página 2 (se houver)
  let page2Jpeg: Buffer | null = null;
  if (infoPageText && infoPageText.trim()) {
    page2Jpeg = await renderInfoPageAsJpeg(data, infoPageText);
  }

  // Monta HTML com as imagens embutidas para gerar PDF
  const page1Base64 = page1Jpeg.toString("base64");
  const page2Base64 = page2Jpeg ? page2Jpeg.toString("base64") : null;

  const pagesHtml = `
    <div class="page">
      <img src="data:image/jpeg;base64,${page1Base64}" style="width:100%;display:block;" />
    </div>
    ${page2Base64 ? `<div class="page"><img src="data:image/jpeg;base64,${page2Base64}" style="width:100%;display:block;" /></div>` : ""}
  `;

  const pdfHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${bgBase}; }
    .page { page-break-after: always; width: 100%; }
    .page:last-child { page-break-after: avoid; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(pdfHtml, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    // Puppeteer retorna Uint8Array, converter para Buffer para envio correto pelo Express
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
