import { jsPDF } from "jspdf";

interface BudgetItem {
  id: number;
  name: string;
  quantity: number;
  subtotal: string | number;
}

interface BudgetData {
  id: number;
  budgetNumber?: number | null;
  clientName: string;
  clientPhone: string;
  clientAddress?: string | null;
  createdAt: Date | string;
  validDays?: number | null;
  notes?: string | null;
  items: BudgetItem[];
  subtotal: string | number;
  discountValue?: string | number | null;
  total: string | number;
  paymentConditions?: string | null;
}

interface SettingsData {
  company_name?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_cnpj?: string | null;
  company_address?: string | null;
  company_city?: string | null;
  company_owner?: string | null;
  company_whatsapp?: string | null;
  company_instagram?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  pix_key?: string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  bank_account_type?: string | null;
  card_fee_3x?: string | null;
  payment_methods_config?: string | null;
  proposal_header?: string | null;
  proposal_validity_days?: number | null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => resolve({ dataUrl, format: blob.type.includes("png") ? "PNG" : "JPEG", width: img.width, height: img.height });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawSectionHeader(doc: jsPDF, text: string, y: number, x: number, width: number, color: { r: number; g: number; b: number }): number {
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(x, y - 3, width, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(text, x + 4, y + 2.5);
  return y + 8 + 4;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 20): number {
  const pageHeight = doc.internal.pageSize.height;
  if (y + needed > pageHeight - 15) {
    doc.addPage();
    return 15;
  }
  return y;
}

export async function generateBudgetPdf(
  budget: BudgetData,
  settings: SettingsData | null | undefined,
  options: { download?: boolean } = {}
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const primaryColor = settings?.primary_color || "#0d1b4b";
  const accentColor = settings?.secondary_color || "#00e676";
  const primary = hexToRgb(primaryColor);
  const accent = hexToRgb(accentColor);

  const pageWidth = doc.internal.pageSize.width;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = 12;

  // ─── LOGO ────────────────────────────────────────────────────────────────
  let logoData: { dataUrl: string; format: string; width: number; height: number } | null = null;
  if (settings?.logo_url) {
    try {
      logoData = await loadImageAsDataUrl(settings.logo_url);
    } catch {
      logoData = null;
    }
  }

  const logoMaxW = 40;
  const logoMaxH = 20;
  let logoEndX = marginLeft;

  if (logoData) {
    try {
      const ratio = logoData.width / logoData.height;
      let lw = logoMaxW;
      let lh = lw / ratio;
      if (lh > logoMaxH) { lh = logoMaxH; lw = lh * ratio; }
      doc.addImage(logoData.dataUrl, logoData.format, marginLeft, y, lw, lh);
      logoEndX = marginLeft + lw + 4;
    } catch {
      logoEndX = marginLeft;
    }
  }

  // ─── CABEÇALHO DA EMPRESA ────────────────────────────────────────────────
  const companyName = settings?.company_name || "Minha Empresa";
  let fontSize = 14;
  if (companyName.length > 25) fontSize = 12;
  if (companyName.length > 35) fontSize = 10;

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.text(companyName, logoEndX, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  let headerY = y + 10;
  if (settings?.company_owner) { doc.text(settings.company_owner, logoEndX, headerY); headerY += 4; }
  if (settings?.company_cnpj) { doc.text(`CNPJ: ${settings.company_cnpj}`, logoEndX, headerY); headerY += 4; }
  if (settings?.company_address) {
    const lines = doc.splitTextToSize(settings.company_address, 70);
    doc.text(lines.slice(0, 2), logoEndX, headerY);
    headerY += lines.slice(0, 2).length * 4;
  }

  // Contatos à direita
  const rightX = pageWidth - marginRight;
  let rightY = y + 2;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(budget.createdAt), rightX, rightY, { align: "right" });
  rightY += 6;
  doc.setFont("helvetica", "normal");
  if (settings?.company_email) { doc.text(settings.company_email, rightX, rightY, { align: "right" }); rightY += 4; }
  if (settings?.company_phone) { doc.text(`Tel: ${settings.company_phone}`, rightX, rightY, { align: "right" }); rightY += 4; }
  if (settings?.company_whatsapp) { doc.text(`WhatsApp: ${settings.company_whatsapp}`, rightX, rightY, { align: "right" }); rightY += 4; }
  if (settings?.company_instagram) { doc.text(`Instagram: ${settings.company_instagram}`, rightX, rightY, { align: "right" }); rightY += 4; }

  y = Math.max(y + logoMaxH + 2, headerY, rightY) + 2;

  // Cabeçalho personalizado (proposal_header)
  if (settings?.proposal_header) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const headerLines = doc.splitTextToSize(settings.proposal_header, contentWidth);
    doc.text(headerLines.slice(0, 2), marginLeft, y);
    y += headerLines.slice(0, 2).length * 4 + 2;
  }

  // Linha separadora colorida
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(1.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 6;

  // ─── NÚMERO DO ORÇAMENTO ─────────────────────────────────────────────────
  const budgetNum = budget.budgetNumber
    ? `ORC-${String(budget.budgetNumber).padStart(3, "0")}-${new Date(budget.createdAt).getFullYear()}`
    : `ORC-${String(budget.id).substring(0, 8).toUpperCase()}`;

  y = drawSectionHeader(doc, `Orçamento ${budgetNum}`, y, marginLeft, contentWidth, accent);

  // ─── DADOS DO CLIENTE ─────────────────────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Cliente: ${budget.clientName}`, marginLeft + 2, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (budget.clientPhone) { doc.text(`Tel: ${budget.clientPhone}`, marginLeft + 2, y); y += 5; }
  if (budget.clientAddress) {
    const addrLines = doc.splitTextToSize(`Endereço: ${budget.clientAddress}`, contentWidth - 4);
    doc.text(addrLines, marginLeft + 2, y);
    y += addrLines.length * 4 + 2;
  }

  y += 4;
  y = checkPageBreak(doc, y, 30);

  // ─── VALIDADE ─────────────────────────────────────────────────────────────
  y = drawSectionHeader(doc, "Informações", y, marginLeft, contentWidth, accent);

  const validDays = budget.validDays || 7;
  const validUntil = new Date(budget.createdAt);
  validUntil.setDate(validUntil.getDate() + validDays);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Validade: ${validDays} dias (até ${validUntil.toLocaleDateString("pt-BR")})`, marginLeft + 2, y);
  y += 5;

  y += 4;
  y = checkPageBreak(doc, y, 40);

  // ─── TABELA DE ITENS ──────────────────────────────────────────────────────
  y = drawSectionHeader(doc, "Serviços / Produtos", y, marginLeft, contentWidth, accent);

  // Cabeçalho da tabela
  const col1X = marginLeft + 3;
  const col2X = marginLeft + contentWidth * 0.55;
  const col3X = marginLeft + contentWidth * 0.72;
  const col4X = marginLeft + contentWidth * 0.86;
  const rowH = 7;

  doc.setFillColor(230, 230, 230);
  doc.rect(marginLeft, y - 3, contentWidth, rowH, "F");
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Descrição", col1X, y + 1);
  doc.text("Unidade", col2X, y + 1);
  doc.text("Preço Unit.", col3X, y + 1);
  doc.text("Total", pageWidth - marginRight - 2, y + 1, { align: "right" });
  y += rowH + 1;

  // Linhas dos itens
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  for (const item of budget.items) {
    y = checkPageBreak(doc, y, 10);

    const subtotal = parseFloat(String(item.subtotal)) || 0;
    const unitPrice = item.quantity > 0 ? subtotal / item.quantity : subtotal;

    // Fundo alternado
    doc.setFillColor(248, 248, 248);
    doc.rect(marginLeft, y - 3, contentWidth, rowH, "F");
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y + rowH - 3, pageWidth - marginRight, y + rowH - 3);

    doc.setTextColor(30, 30, 30);
    // Descrição (pode ser longa — truncar se necessário)
    const descLines = doc.splitTextToSize(item.name, contentWidth * 0.5);
    doc.text(descLines[0], col1X, y + 1);

    doc.text(String(item.quantity), col2X, y + 1);
    doc.text(formatCurrency(unitPrice), col3X, y + 1);
    doc.text(formatCurrency(subtotal), pageWidth - marginRight - 2, y + 1, { align: "right" });
    y += rowH;
  }

  // ─── TOTAIS ───────────────────────────────────────────────────────────────
  const subtotalVal = parseFloat(String(budget.subtotal)) || 0;
  const discountVal = parseFloat(String(budget.discountValue)) || 0;
  const totalVal = parseFloat(String(budget.total)) || 0;
  const hasDiscount = discountVal > 0;

  y += 2;
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 4;

  if (hasDiscount) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", pageWidth - marginRight - 40, y);
    doc.text(formatCurrency(subtotalVal), pageWidth - marginRight - 2, y, { align: "right" });
    y += 5;

    doc.setTextColor(180, 0, 0);
    doc.text("Desconto:", pageWidth - marginRight - 40, y);
    doc.text(`- ${formatCurrency(discountVal)}`, pageWidth - marginRight - 2, y, { align: "right" });
    y += 5;
  }

  // Total em destaque
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(pageWidth - marginRight - 60, y - 4, 60, 10, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", pageWidth - marginRight - 58, y + 2.5);
  doc.text(formatCurrency(totalVal), pageWidth - marginRight - 2, y + 2.5, { align: "right" });
  y += 14;

  y = checkPageBreak(doc, y, 40);

  // ─── CONDIÇÕES DE PAGAMENTO ───────────────────────────────────────────────
  y = drawSectionHeader(doc, "Condições de Pagamento", y, marginLeft, contentWidth, accent);

  // PIX
  if (settings?.pix_key) {
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Chave PIX:", marginLeft + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(settings.pix_key, marginLeft + 28, y);
    y += 5;
  }

  // Pagamento à vista e parcelado
  const pixTotal = totalVal;
  const card3xTotal = totalVal * (1 + (parseFloat(settings?.card_fee_3x || "5") / 100));
  const card3xInstallment = card3xTotal / 3;

  // Dois blocos lado a lado
  const blockW = (contentWidth - 8) / 2;
  const blockH = 22;

  // Bloco PIX/À vista
  doc.setFillColor(240, 248, 240);
  doc.rect(marginLeft, y, blockW, blockH, "F");
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, y, blockW, blockH, "S");

  doc.setTextColor(0, 100, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("À VISTA (PIX / DÉBITO)", marginLeft + blockW / 2, y + 5, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(pixTotal), marginLeft + blockW / 2, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Pagamento à vista", marginLeft + blockW / 2, y + 20, { align: "center" });

  // Bloco Cartão
  const block2X = marginLeft + blockW + 8;
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(block2X, y, blockW, blockH, "F");

  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CARTÃO PARCELADO", block2X + blockW / 2, y + 5, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`3x de ${formatCurrency(card3xInstallment)}`, block2X + blockW / 2, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Total: ${formatCurrency(card3xTotal)}`, block2X + blockW / 2, y + 20, { align: "center" });

  y += blockH + 8;

  // Dados bancários
  if (settings?.bank_name || settings?.bank_agency || settings?.bank_account) {
    y = checkPageBreak(doc, y, 25);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Dados Bancários:", marginLeft + 2, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    if (settings?.bank_name) { doc.text(`Banco: ${settings.bank_name}`, marginLeft + 4, y); y += 4; }
    if (settings?.bank_agency) { doc.text(`Agência: ${settings.bank_agency}`, marginLeft + 4, y); y += 4; }
    if (settings?.bank_account) { doc.text(`Conta: ${settings.bank_account}`, marginLeft + 4, y); y += 4; }
    if (settings?.bank_account_type) { doc.text(`Tipo: ${settings.bank_account_type}`, marginLeft + 4, y); y += 4; }
  }

  y = checkPageBreak(doc, y, 20);

  // ─── OBSERVAÇÕES ──────────────────────────────────────────────────────────
  if (budget.notes) {
    y = drawSectionHeader(doc, "Observações", y, marginLeft, contentWidth, accent);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(budget.notes, contentWidth - 4);
    doc.text(notesLines, marginLeft + 2, y);
    y += notesLines.length * 4 + 6;
  }

  y = checkPageBreak(doc, y, 30);

  // ─── ASSINATURAS ──────────────────────────────────────────────────────────
  y += 10;
  const sigW = (contentWidth - 20) / 2;
  const sigY = y;

  // Linha empresa
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, sigY, marginLeft + sigW, sigY);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(settings?.company_name || "Empresa", marginLeft + sigW / 2, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Prestador de Serviço", marginLeft + sigW / 2, sigY + 9, { align: "center" });

  // Linha cliente
  const sig2X = pageWidth - marginRight - sigW;
  doc.line(sig2X, sigY, pageWidth - marginRight, sigY);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(budget.clientName, sig2X + sigW / 2, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Cliente", sig2X + sigW / 2, sigY + 9, { align: "center" });

  y += 20;

  // ─── RODAPÉ ───────────────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const city = settings?.company_city ? `${settings.company_city} — ` : "";
  doc.text(`${city}Válido até ${validUntil.toLocaleDateString("pt-BR")}`, pageWidth / 2, pageHeight - 3, { align: "center" });

  // Retornar como Blob
  const pdfBlob = doc.output("blob");

  if (options.download !== false) {
    const clientName = budget.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
    doc.save(`orcamento-${clientName}.pdf`);
  }

  return pdfBlob;
}

export async function generateBudgetJpeg(
  budget: BudgetData,
  settings: SettingsData | null | undefined,
  options: { download?: boolean } = {}
): Promise<Blob> {
  // Para JPEG, geramos o PDF e convertemos para imagem usando canvas
  // Mas como isso requer pdf.js, vamos usar uma abordagem mais simples:
  // Renderizar o HTML do orçamento em um canvas usando html2canvas
  // Por enquanto, retornamos o PDF como fallback
  return generateBudgetPdf(budget, settings, options);
}
