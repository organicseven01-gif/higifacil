import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Pencil, Download, CheckCircle, XCircle, Copy, ImageDown, FileDown, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import React, { useRef, useState, useEffect } from "react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import RegisterSaleModal from "@/components/RegisterSaleModal";
import BudgetTemplateWhatsApp from "@/components/BudgetTemplateWhatsApp";

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  accepted: "Aceito",
  rejected: "Recusado",
};

const statusClass: Record<string, string> = {
  pending: "badge-pending",
  sent: "badge-sent",
  accepted: "badge-accepted",
  rejected: "badge-rejected",
};

export default function BudgetPreview() {
  const params = useParams<{ id: string }>();
  const budgetId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: budget, isLoading } = trpc.budgets.getById.useQuery({ id: budgetId }, { enabled: !!budgetId });

  // Busca as configurações da empresa DONA do orçamento (não do usuário logado).
  // Isso garante que logo, cores e template sejam sempre da empresa correta.
  const budgetCompanyId = budget?.companyId ?? null;
  const { data: settingsData } = trpc.settings.getByCompanyId.useQuery(
    { companyId: budgetCompanyId! },
    { enabled: !!budgetCompanyId }
  );

  const fee3x = parseFloat(settingsData?.card_fee_3x ?? "5.0") || 0;

  const budgetCardRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Páginas de Informações (múltiplas) — usa info_pages (JSON array)
  const [showRegisterSale, setShowRegisterSale] = useState(false);

  // Template: se o orçamento foi criado como timbrado, usa o template profissional
  // independente das configurações da empresa
  const selectedTemplate = (budget as any)?.isTimbrado
    ? "profissional"
    : (settingsData as any)?.budget_template || "premium";

  // Company branding — sempre da empresa dona do orçamento
  const companyLogoUrl = settingsData?.logo_url as string | undefined;
  const primaryColor = settingsData?.primary_color as string | undefined;
  const secondaryColor = settingsData?.secondary_color as string | undefined;

  const updateStatusMutation = trpc.budgets.updateStatus.useMutation({
    onSuccess: () => { utils.budgets.getById.invalidate({ id: budgetId }); utils.budgets.list.invalidate(); },
  });

  const reactivateMutation = trpc.budgets.reactivate.useMutation({
    onSuccess: () => {
      utils.budgets.getById.invalidate({ id: budgetId });
      utils.budgets.list.invalidate();
      toast.success("Orçamento reativado! Movido de volta para Pendentes.");
    },
    onError: (e) => toast.error("Erro ao reativar orçamento", { description: e.message }),
  });

  const deleteSaleByBudgetMutation = trpc.sales.deleteByBudgetId.useMutation({
    onSuccess: () => {},
    onError: () => {},
  });

  const duplicateMutation = trpc.budgets.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Orçamento duplicado!", {
        action: {
          label: "Editar cópia",
          onClick: () => setLocation(`/orcamentos/${data.id}/editar`),
        },
      });
    },
    onError: () => toast.error("Erro ao duplicar orçamento"),
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-2 sm:px-4 space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 rounded-md bg-muted animate-pulse mr-auto" />
          <div className="h-7 w-16 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-20 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Card skeleton */}
        <div
          className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(160deg, oklch(0.22 0.14 264) 0%, oklch(0.28 0.16 264) 40%, oklch(0.32 0.17 264) 65%, oklch(0.50 0.22 152) 100%)",
          }}
        >
          {/* Top bar */}
          <div className="h-2.5" style={{ background: "linear-gradient(90deg, oklch(0.87 0.24 152), oklch(0.78 0.22 152))" }} />

          {/* Header skeleton */}
          <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-4 sm:pb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-8 w-48 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-white/10 animate-pulse shrink-0" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="h-16 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-16 rounded-xl bg-white/10 animate-pulse" />
            </div>
          </div>

          {/* Table skeleton */}
          <div className="px-4 sm:px-8 pb-5 sm:pb-6">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
              <div className="h-10 bg-white/20 animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center px-4 py-3 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)" }}>
                  <div className="h-4 w-8 rounded bg-white/10 animate-pulse" />
                  <div className="flex-1 h-4 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
                </div>
              ))}
              <div className="flex justify-end px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="h-8 w-32 rounded-lg bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="px-4 sm:px-8 pb-6">
            <div className="h-3 w-full rounded bg-white/10 animate-pulse mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-24 rounded-xl bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="h-2.5" style={{ background: "linear-gradient(90deg, oklch(0.87 0.24 152), oklch(0.78 0.22 152))" }} />
        </div>

        {/* Buttons skeleton */}
        <div className="h-12 rounded-2xl bg-muted animate-pulse" />
        <div className="h-4 w-40 mx-auto rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 rounded-2xl bg-muted animate-pulse" />
          <div className="h-12 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    </DashboardLayout>
  );

  if (!budget) return (
    <DashboardLayout>
      <div className="text-center py-16 text-muted-foreground">Orçamento não encontrado</div>
    </DashboardLayout>
  );

  const subtotal = parseFloat(String(budget.subtotal)) || 0;
  const discountAmount = parseFloat(String(budget.discountValue)) || 0;
  const total = parseFloat(String(budget.total)) || 0;
  const hasDiscount = discountAmount > 0;

  // Cores do template premium — fiel ao modelo de referência
  // Cor principal: fundo do card (azul escuro por padrão)
  // Cor secundária: acentos verdes (barra, cabeçalho da tabela, botão cartão)
  const bgBase = primaryColor || "#0d1b4b"; // azul escuro sólido
  const accentColor = secondaryColor || "#00e676"; // verde brilhante
  // Fundo sólido com degradê sutil apenas no fundo (como na referência)
  const cardBg = `linear-gradient(180deg, ${bgBase} 0%, ${bgBase}f8 70%, ${bgBase}ee 100%)`;
  const accentBar = accentColor;
  const accentBg = accentColor;
  const accentTextColor = accentColor;

  // Formas de pagamento configuráveis
  type PaymentMethodCfg = { id: string; label: string; enabled: boolean; discountPercent: number; maxInstallments?: number; addFee?: boolean; installmentRates?: number[] };
  const DEFAULT_PAYMENT_METHODS: PaymentMethodCfg[] = [
    { id: "cash", label: "Espécie", enabled: true, discountPercent: 10 },
    { id: "pix", label: "À Vista (Pix / Débito)", enabled: true, discountPercent: 5 },
    { id: "credit_cash", label: "Crédito à Vista", enabled: true, discountPercent: 0 },
    { id: "installments", label: "Cartão Parcelado", enabled: true, discountPercent: 0, maxInstallments: 8, addFee: false, installmentRates: [0,0,0,0,0,0,0,0,0,0,0,0] },
  ];
  const paymentMethodsCfg: PaymentMethodCfg[] = (() => {
    const raw = (settingsData as any)?.payment_methods_config;
    if (!raw) return DEFAULT_PAYMENT_METHODS;
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : DEFAULT_PAYMENT_METHODS; } catch { return DEFAULT_PAYMENT_METHODS; }
  })();
  const enabledPaymentMethods = paymentMethodsCfg.filter(m => m.enabled);
  const colCount = enabledPaymentMethods.length;

  // Dados dinâmicos do Sobre Nós
  const companyDescription = (settingsData as any)?.company_description as string | undefined;
  const googleRating = (settingsData as any)?.google_rating as string | undefined;
  const googleReviewCount = (settingsData as any)?.google_review_count as string | undefined;
  const showSobreNos = (settingsData as any)?.show_sobre_nos === "true";
  const showGoogleReviews = (settingsData as any)?.show_google_reviews === "true";
  const hasDescription = showSobreNos && !!(companyDescription && companyDescription.trim());
  const hasGoogleRating = showGoogleReviews && !!(googleRating && googleRating.trim());
  const hasSobreNos = hasDescription || hasGoogleRating;

  // Converte dataURL para Blob (compatível com Safari/iOS)
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  // Detecta iOS (iPhone/iPad) onde <a download> não funciona para imagens
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);

  // Download compatível com Safari/iOS
  // No iOS: abre em nova aba com instruções para salvar na galeria
  // Em outros: usa <a download> normalmente
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    if (isIOS && blob.type.startsWith("image/")) {
      // iOS Safari: abrir em nova aba para salvar manualmente
      const newTab = window.open(url, "_blank");
      if (!newTab) {
        // Fallback se popup bloqueado
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      // Não revogar imediatamente para a aba conseguir carregar
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  // ─── Captura do card visual com html2canvas ──────────────────────────────
  // Captura o card exatamente como aparece na tela e gera JPEG ou PDF

  const captureCardAsDataUrl = async (): Promise<string> => {
    const el = budgetCardRef.current;
    if (!el) throw new Error("Card não encontrado");
    // Rolar até o topo do card para garantir captura completa
    el.scrollIntoView({ block: "start" });
    await new Promise(r => setTimeout(r, 500));
    // Chamar duas vezes: primeira garante carregamento de fontes/imagens, segunda captura o resultado final
    await toJpeg(el, { quality: 0.92, pixelRatio: 2, cacheBust: true }).catch(() => {});
    const dataUrl = await toJpeg(el, { quality: 0.92, pixelRatio: 2, cacheBust: true });
    return dataUrl;
  };

  const handleDownloadJpeg = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCardAsDataUrl();
      const blob = dataUrlToBlob(dataUrl);
      const clientName = budget.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      triggerDownload(blob, `orcamento-${clientName}.jpg`);
      if (isIOS) {
        toast.info("📱 iPhone: toque e segure a imagem → 'Salvar na Fotos'", { duration: 6000 });
      } else {
        toast.success("Imagem JPEG baixada com sucesso!");
      }
    } catch (e: any) {
      console.error("Erro ao gerar JPEG:", e);
      toast.error("Erro ao gerar imagem: " + (e.message || "Tente novamente."));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCardAsDataUrl();
      const el = budgetCardRef.current!;
      // Dimensões: largura A4 em pontos (595.28), altura proporcional
      const pdfWidth = 595.28;
      const pdfHeight = (el.scrollHeight / el.scrollWidth) * pdfWidth;
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
        unit: "pt",
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      const clientName = budget.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      const blob = pdf.output("blob");
      triggerDownload(blob, `orcamento-${clientName}.pdf`);
      toast.success("PDF gerado e baixado com sucesso!");
    } catch (e: any) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Erro ao gerar PDF: " + (e.message || "Tente novamente."));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSendWhatsAppWithImage = async (channel: "app" | "business" = "app") => {
    setIsCapturing(true);
    try {
      // No iOS, window.open() só funciona em resposta direta ao toque do usuário.
      // Por isso abrimos o WhatsApp PRIMEIRO (ainda no mesmo evento de toque),
      // e depois geramos e baixamos a imagem.
      handleSendWhatsApp(channel);

      // Gerar e baixar a imagem em paralelo
      const dataUrl = await captureCardAsDataUrl();
      const blob = dataUrlToBlob(dataUrl);
      const clientName = budget.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      triggerDownload(blob, `orcamento-${clientName}.jpg`);

      if (isIOS) {
        toast.info("📱 Imagem aberta! Toque e segure → 'Salvar na Fotos'. Depois volte ao WhatsApp e anexe.", { duration: 8000 });
      } else {
        toast.info("📲 Imagem baixada! Agora é só anexar no WhatsApp e enviar.", { duration: 5000 });
      }
    } catch (e: any) {
      console.error("Erro ao gerar imagem para WhatsApp:", e);
      toast.error("Erro ao gerar imagem: " + (e.message || "Tente novamente."));
    } finally {
      setIsCapturing(false);
    }
  };

  // ─── Compartilhamento Android via Web Share API ──────────────────────────
  // Igual ao iPhone: compartilha só a imagem pelo menu nativo,
  // depois abre WhatsApp com mensagem curta de saudação separada.
  const handleShareAndroid = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCardAsDataUrl();
      const blob = dataUrlToBlob(dataUrl);
      const clientName = budget.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      const file = new File([blob], `orcamento-${clientName}.jpg`, { type: "image/jpeg" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Compartilha só a imagem — sem texto junto para não aparecer o bloco de texto no Android
        await navigator.share({
          files: [file],
          title: `Orçamento - ${budget.clientName}`,
        });
        updateStatusMutation.mutate({ id: budgetId, status: "sent" });
        // Após compartilhar a imagem, abre WhatsApp com a mensagem curta de saudação
        setTimeout(() => handleSendWhatsApp("app"), 800);
      } else {
        // Fallback: baixar imagem e abrir WhatsApp com a mensagem
        triggerDownload(blob, `orcamento-${clientName}.jpg`);
        toast.info("📲 Imagem baixada! Agora é só anexar no WhatsApp e enviar.", { duration: 5000 });
        handleSendWhatsApp("app");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Erro ao compartilhar no Android:", e);
      toast.error("Erro ao compartilhar: " + (e.message || "Tente novamente."));
    } finally {
      setIsCapturing(false);
    }
  };

  // ─── Compartilhamento nativo (Web Share API) ─────────────────────────────
  // No iPhone, abre o menu nativo com WhatsApp, WhatsApp Business, Salvar na Fotos, etc.
  // Em Android também funciona. Em desktop, cai no fallback de download + WhatsApp.
  const handleShareNative = async () => {
    setIsCapturing(true);
    try {
      // Gerar a imagem do card
      const dataUrl = await captureCardAsDataUrl();
      const blob = dataUrlToBlob(dataUrl);
      const clientName = budget.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      const file = new File([blob], `orcamento-${clientName}.jpg`, { type: "image/jpeg" });

      // Verificar se o browser suporta compartilhamento de arquivos
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Orçamento - ${budget.clientName}`,
          text: `Olá, ${budget.clientName}! Segue seu orçamento. Qualquer dúvida é só chamar! 😊`,
        });
      } else if (navigator.share) {
        // Fallback: compartilhar só o texto/link (sem arquivo)
        await navigator.share({
          title: `Orçamento - ${budget.clientName}`,
          text: `Olá, ${budget.clientName}! Segue seu orçamento. Qualquer dúvida é só chamar! 😊`,
          url: `${window.location.origin}/orcamentos/${budgetId}/visualizar`,
        });
      } else {
        // Desktop: baixar imagem e abrir WhatsApp
        triggerDownload(blob, `orcamento-${clientName}.jpg`);
        toast.info("📲 Imagem baixada! Agora é só anexar no WhatsApp e enviar.", { duration: 5000 });
        handleSendWhatsApp("app");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return; // Usuário fechou o menu — não é erro
      console.error("Erro ao compartilhar:", e);
      toast.error("Erro ao compartilhar: " + (e.message || "Tente novamente."));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSendWhatsApp = (channel: "app" | "business" = "app") => {
    const phone = budget.clientPhone.replace(/\D/g, "");
    const previewUrl = `${window.location.origin}/orcamentos/${budgetId}/visualizar`;

    // Mensagem curta de saudação — a imagem do orçamento já traz todos os detalhes
    const companyName = (settingsData as any)?.company_name || "";
    let message = companyName ? `🌟 *PROPOSTA DE INVESTIMENTO - ${companyName.toUpperCase()}* 🌟\n\n` : `🌟 *PROPOSTA DE INVESTIMENTO* 🌟\n\n`;
    message += `Olá, *${budget.clientName}*! 😊\n\n`;
    message += `Segue sua proposta personalizada! Qualquer dúvida, estamos à disposição. 🙏`;
    message += `\n\n🔗 *Visualize sua proposta completa:*\n${previewUrl}`;

    const encodedMessage = encodeURIComponent(message);
    const baseUrl = channel === "business"
      ? `https://wa.me/55${phone}?text=${encodedMessage}`
      : `https://wa.me/55${phone}?text=${encodedMessage}`;
    window.open(baseUrl, "_blank");
    updateStatusMutation.mutate({ id: budgetId, status: "sent" });
    toast.success(channel === "business" ? "Abrindo WhatsApp Business..." : "Abrindo WhatsApp...");
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4 px-2 sm:px-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button onClick={() => setLocation("/orcamentos")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mr-auto">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </button>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass[budget.status]}`}>
            {statusLabels[budget.status]}
          </span>
          <Button variant="outline" size="sm" onClick={() => setLocation(`/orcamentos/${budgetId}/editar`)} className="gap-1">
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateMutation.mutate({ id: budgetId })}
            disabled={duplicateMutation.isPending}
            className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{duplicateMutation.isPending ? "Duplicando..." : "Duplicar"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadJpeg} disabled={isCapturing} className="gap-1">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isCapturing ? "Gerando..." : isIOS ? "Salvar Imagem" : "Baixar JPEG"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isCapturing} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isCapturing ? "Gerando..." : "Baixar PDF"}</span>
          </Button>
        </div>



        {/* ===== TEMPLATE: WHATSAPP ===== */}
        {selectedTemplate === "whatsapp" && (
          <BudgetTemplateWhatsApp
            budget={budget}
            settings={{
              company_name: settingsData?.company_name ?? "",
              company_phone: settingsData?.company_phone ?? "",
              pix_key: settingsData?.pix_key ?? "",
              card_fee_3x: settingsData?.card_fee_3x ?? "5.0",
            }}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        )}

        {/* ===== TEMPLATE: PROFISSIONAL — layout branco formal baseado no modelo ===== */}
        {selectedTemplate === "profissional" && (
          <div
            ref={budgetCardRef}
            style={{
              background: "#ffffff",
              fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {/* Cabeçalho da empresa */}
            <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                {/* Dados da empresa - esquerda */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 900, fontSize: "16px", color: "#111827", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {settingsData?.company_name || ""}
                  </p>
                  {(settingsData as any)?.company_owner && (
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>{(settingsData as any).company_owner}</p>
                  )}
                  {(settingsData as any)?.company_cnpj && (
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>CNPJ: {(settingsData as any).company_cnpj}</p>
                  )}
                  {(settingsData as any)?.company_address && (
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>{(settingsData as any).company_address}</p>
                  )}
                </div>
                {/* Contatos - direita */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: "11px", color: "#374151", margin: "0 0 3px" }}>
                    {formatDate(budget.createdAt)}
                  </p>
                  {settingsData?.company_phone && (
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>📱 {settingsData.company_phone}</p>
                  )}
                  {(settingsData as any)?.company_email && (
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>✉ {(settingsData as any).company_email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Número do orçamento */}
            <div style={{ background: "#f3f4f6", padding: "10px 24px" }}>
              <p style={{ fontWeight: 800, fontSize: "15px", color: "#111827", margin: 0 }}>
                Orçamento {budget.budgetNumber ? `${String(budget.budgetNumber).padStart(3, "0")}-${new Date(budget.createdAt).getFullYear()}` : `#${budget.id}`}
              </p>
            </div>

            {/* Dados do cliente */}
            <div style={{ padding: "12px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 3px" }}>
                <strong>Cliente:</strong> {budget.clientName}
              </p>
              {budget.clientPhone && (
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 2px" }}>📞 {budget.clientPhone}</p>
              )}
              {budget.clientAddress && (
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>📍 {budget.clientAddress}</p>
              )}
            </div>

            {/* Tabela de serviços */}
            <div style={{ padding: "16px 24px" }}>
              <p style={{ fontWeight: 700, fontSize: "13px", color: "#111827", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Serviços</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                    <th style={{ textAlign: "left", padding: "6px 0", color: "#6b7280", fontWeight: 600, fontSize: "11px" }}>Descrição</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600, fontSize: "11px", whiteSpace: "nowrap" }}>Preço unitário</th>
                    <th style={{ textAlign: "center", padding: "6px 8px", color: "#6b7280", fontWeight: 600, fontSize: "11px" }}>Qtd.</th>
                    <th style={{ textAlign: "right", padding: "6px 0", color: "#6b7280", fontWeight: 600, fontSize: "11px" }}>Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.items.map((item: any) => {
                    const unitPrice = item.quantity > 0 ? parseFloat(String(item.subtotal)) / item.quantity : parseFloat(String(item.subtotal));
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 0", color: "#111827", fontWeight: 600, lineHeight: 1.4 }}>{item.name}</td>
                        <td style={{ padding: "8px 8px", color: "#374151", textAlign: "right", whiteSpace: "nowrap" }}>{formatCurrency(unitPrice)}</td>
                        <td style={{ padding: "8px 8px", color: "#374151", textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ padding: "8px 0", color: "#111827", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total */}
              <div style={{ borderTop: "2px solid #111827", marginTop: "8px", paddingTop: "8px" }}>
                {hasDiscount && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Subtotal</span>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{formatCurrency(subtotal)}</span>
                  </div>
                )}
                {hasDiscount && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#dc2626" }}>Desconto</span>
                    <span style={{ fontSize: "12px", color: "#dc2626" }}>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>Total</span>
                  <span style={{ fontSize: "15px", fontWeight: 900, color: "#111827" }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Seção de Pagamento */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", background: "#fafafa" }}>
              <p style={{ fontWeight: 700, fontSize: "13px", color: "#111827", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pagamento</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Meios de pagamento */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Meios de pagamento</p>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                    Transferência bancária, dinheiro, cartão de crédito, cartão de débito ou pix
                  </p>
                  {settingsData?.pix_key && (
                    <div style={{ marginTop: "10px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "#374151", margin: "0 0 2px" }}>Chave PIX</p>
                      <p style={{ fontSize: "12px", color: "#111827", fontWeight: 600, margin: 0 }}>{settingsData.pix_key}</p>
                    </div>
                  )}
                </div>
                {/* Dados bancários */}
                {((settingsData as any)?.bank_name || (settingsData as any)?.bank_agency || (settingsData as any)?.bank_account) && (
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Dados bancários</p>
                    {(settingsData as any)?.bank_name && <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 1px" }}>Banco: {(settingsData as any).bank_name}</p>}
                    {(settingsData as any)?.bank_agency && <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 1px" }}>Agência: {(settingsData as any).bank_agency}</p>}
                    {(settingsData as any)?.bank_account && <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 1px" }}>Conta: {(settingsData as any).bank_account}</p>}
                    {(settingsData as any)?.bank_account_type && <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 1px" }}>Tipo: {(settingsData as any).bank_account_type}</p>}
                    {(settingsData as any)?.company_cnpj && <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Titular (CPF/CNPJ): {(settingsData as any).company_cnpj}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Cidade e data */}
            <div style={{ padding: "10px 24px", textAlign: "center", borderTop: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                {(settingsData as any)?.company_city ? `${(settingsData as any).company_city}, ` : ""}{formatDate(budget.createdAt)}
              </p>
            </div>

            {/* Assinaturas */}
            <div style={{ padding: "20px 24px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #374151", paddingTop: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>
                    {(budget as any)?.isTimbrado && (settingsData as any)?.timbrado_responsavel
                      ? (settingsData as any).timbrado_responsavel
                      : settingsData?.company_name || "Empresa"}
                  </p>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                    {(budget as any)?.isTimbrado ? "Representante Legal" : settingsData?.company_name || ""}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #374151", paddingTop: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{budget.clientName}</p>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Cliente / Contratante</p>
                </div>
              </div>
            </div>

            {/* Observações */}
            {budget.notes && (
              <div style={{ padding: "10px 24px 16px", borderTop: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Observações</p>
                <p style={{ fontSize: "11px", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{budget.notes}</p>
              </div>
            )}

            {/* Validade */}
            <div style={{ padding: "8px 24px 16px", borderTop: "1px solid #f3f4f6" }}>
              {(() => {
                const validUntil = new Date(budget.createdAt);
                validUntil.setDate(validUntil.getDate() + (budget.validDays || 7));
                return (
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0, textAlign: "center" }}>
                    Válido até <strong>{validUntil.toLocaleDateString('pt-BR')}</strong> ({budget.validDays} dias a partir da emissão)
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        {/* ===== TEMPLATE: PREMIUM (default) — fiel ao modelo de referência ===== */}
        {selectedTemplate === "premium" && (
        <div
          ref={budgetCardRef}
          style={{
            background: cardBg,
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          }}
        >
          {/* Top accent bar — verde sólido como na referência */}
          <div style={{ height: "5px", background: accentColor }} />

          {/* Header — INVESTIMENTO + nome da empresa */}
          <div style={{ padding: "22px 20px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                {/* Nome da empresa em destaque acima do título */}
                {settingsData?.company_name && (
                  <p style={{ color: accentColor, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 6px", opacity: 0.9 }}>
                    {settingsData.company_name}
                  </p>
                )}
                <h1 style={{ fontSize: "clamp(20px,6vw,28px)", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px", margin: 0, lineHeight: 1, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>INVESTIMENTO</h1>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", marginTop: "8px", marginBottom: 0 }}>
                  Data: <strong style={{ color: "#fff" }}>{formatDate(budget.createdAt)}</strong>
                </p>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", marginTop: "3px", marginBottom: 0 }}>
                  {(() => {
                    const validUntil = new Date(budget.createdAt);
                    validUntil.setDate(validUntil.getDate() + (budget.validDays || 7));
                    return (
                      <>
                        Válido até: <strong style={{ color: "#fff" }}>{validUntil.toLocaleDateString('pt-BR')}</strong>
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>

            {/* Client info — dois cards lado a lado */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
              <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 4px" }}>CLIENTE</p>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "15px", margin: 0, wordBreak: "break-word" }}>{budget.clientName}</p>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 4px" }}>CONTATO</p>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "15px", margin: 0 }}>{budget.clientPhone || "—"}</p>
              </div>
            </div>
            {budget.clientAddress && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", marginTop: "8px" }}>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 4px" }}>ENDEREÇO</p>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", margin: 0 }}>{budget.clientAddress}</p>
              </div>
            )}
          </div>

          {/* Tabela de itens — cabeçalho verde sólido como na referência */}
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              {/* Cabeçalho verde sólido */}
              <div style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: accentColor }}>
                <div style={{ width: "46px", textAlign: "center", fontWeight: 900, fontSize: "11px", color: "#000", flexShrink: 0, letterSpacing: "0.5px" }}>QUANT.</div>
                <div style={{ flex: 1, fontWeight: 900, fontSize: "11px", color: "#000", textAlign: "center", padding: "0 8px", letterSpacing: "0.5px" }}>DESCRIÇÃO</div>
                <div style={{ width: "84px", fontWeight: 900, fontSize: "11px", color: "#000", textAlign: "right", flexShrink: 0, letterSpacing: "0.5px" }}>VALOR</div>
              </div>

              {/* Linhas dos itens */}
              {budget.items.map((item: any, index: number) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex", alignItems: "center", padding: "13px 14px",
                    background: index % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)",
                    borderTop: "1px solid rgba(255,255,255,0.06)"
                  }}
                >
                  <div style={{ width: "46px", color: "#fff", fontWeight: 900, textAlign: "center", fontSize: "15px", flexShrink: 0 }}>
                    {String(item.quantity).padStart(2, "0")}
                  </div>
                  <div style={{ flex: 1, color: "rgba(255,255,255,0.88)", fontSize: "13px", textAlign: "center", padding: "0 8px", lineHeight: 1.4 }}>
                    {item.name}
                  </div>
                  <div style={{ width: "84px", color: "#fff", fontWeight: 700, textAlign: "right", fontSize: "13px", flexShrink: 0 }}>
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}

              {/* Subtotal + Desconto */}
              {hasDiscount && (
                <>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.12)" }}>
                    <div style={{ flex: 1, color: "rgba(255,255,255,0.5)", fontSize: "12px", textAlign: "right", paddingRight: "12px" }}>Subtotal</div>
                    <div style={{ width: "84px", color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 600, textAlign: "right" }}>{formatCurrency(subtotal)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", background: "rgba(0,0,0,0.12)" }}>
                    <div style={{ flex: 1, fontSize: "13px", textAlign: "right", paddingRight: "12px", fontWeight: 800, color: accentColor }}>Desconto</div>
                    <div style={{ width: "84px", fontSize: "13px", fontWeight: 800, textAlign: "right", color: accentColor }}>- {formatCurrency(discountAmount)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderTop: `1.5px solid ${accentColor}60`, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ flex: 1, color: "#fff", fontWeight: 900, fontSize: "14px", textAlign: "right", paddingRight: "12px", textTransform: "uppercase", letterSpacing: "1.5px" }}>TOTAL</div>
                    <div style={{ width: "84px", color: "#fff", fontWeight: 900, fontSize: "16px", textAlign: "right" }}>{formatCurrency(total)}</div>
                  </div>
                </>
              )}

              {/* Total sem desconto (quando há mais de 2 itens) */}
              {!hasDiscount && budget.items.length > 2 && (
                <div style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderTop: `1.5px solid ${accentColor}60`, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ flex: 1, color: "#fff", fontWeight: 900, fontSize: "14px", textAlign: "right", paddingRight: "12px", textTransform: "uppercase", letterSpacing: "1.5px" }}>TOTAL</div>
                  <div style={{ width: "84px", color: "#fff", fontWeight: 900, fontSize: "16px", textAlign: "right" }}>{formatCurrency(total)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer — Condições de Pagamento */}
          <div style={{ padding: "0 16px 0" }}>
            {/* Separador CONDIÇÕES DE PAGAMENTO */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2.5px", margin: 0, whiteSpace: "nowrap" }}>CONDIÇÕES DE PAGAMENTO</p>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* Blocos de pagamento — dinâmicos baseados nas configurações */}
            <div style={{
              display: "grid",
              gridTemplateColumns: colCount <= 2 ? `repeat(${colCount}, 1fr)` : colCount === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: "8px",
              marginBottom: "16px"
            }}>
              {enabledPaymentMethods.map((method, idx) => {
                const baseValue = total * (1 - method.discountPercent / 100);
                const installments = method.id === "installments" ? (method.maxInstallments ?? 8) : 1;
                // Taxa de juros da parcela configurada (ex: 2x=5%, 3x=8%)
                const installmentFeeRate = method.id === "installments"
                  ? ((method.installmentRates ?? [])[installments - 1] ?? 0) / 100
                  : 0;
                // Se addFee=true, juros acrescentam ao total; senão, apenas informativo
                const discounted = method.id === "installments" && (method.addFee ?? false)
                  ? baseValue * (1 + installmentFeeRate)
                  : baseValue;
                const isHighlight = idx === enabledPaymentMethods.length - 1; // último é o destaque
                return (
                  <div key={method.id} style={{
                    padding: "14px 10px", borderRadius: "14px", textAlign: "center",
                    background: isHighlight ? accentColor : "rgba(255,255,255,0.06)",
                    border: isHighlight ? "none" : `1.5px solid ${accentColor}50`,
                    boxShadow: isHighlight ? `0 8px 28px ${accentColor}60` : "none",
                  }}>
                    <p style={{
                      fontWeight: 900, fontSize: "9px", textTransform: "uppercase",
                      letterSpacing: "1px", margin: "0 0 6px",
                      color: isHighlight ? "rgba(0,0,0,0.75)" : accentColor,
                    }}>{method.label.toUpperCase()}</p>
                    {method.id === "installments" ? (
                      <>
                        <p style={{ fontWeight: 900, fontSize: colCount <= 2 ? "22px" : "16px", color: isHighlight ? "#000" : "#fff", margin: 0, lineHeight: 1 }}>
                          {formatCurrency(discounted)}
                        </p>
                        <p style={{ fontSize: "9px", color: isHighlight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.55)", marginTop: "5px", fontWeight: 600 }}>
                          {installments}x {formatCurrency(discounted / installments)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 900, fontSize: colCount <= 2 ? "22px" : "16px", color: isHighlight ? "#000" : "#fff", margin: 0, lineHeight: 1 }}>
                          {formatCurrency(discounted)}
                        </p>
                        {method.discountPercent > 0 && (
                          <p style={{ fontSize: "9px", color: isHighlight ? "rgba(0,0,0,0.6)" : accentColor, marginTop: "5px", fontWeight: 700 }}>
                            -{method.discountPercent}% de desconto
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {/* Fallback se nenhuma forma estiver ativada */}
              {enabledPaymentMethods.length === 0 && (
                <div style={{ gridColumn: "1 / -1", padding: "16px", borderRadius: "14px", textAlign: "center", background: "rgba(255,255,255,0.06)", border: `1.5px solid ${accentColor}50` }}>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: 0 }}>Configure as formas de pagamento nas Configurações</p>
                </div>
              )}
            </div>

            {/* Sobre Nós — dinâmico: só exibe se houver descrição ou avaliação Google */}
            {hasSobreNos && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 12px" }}>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2.5px", margin: 0, whiteSpace: "nowrap" }}>SOBRE NÓS</p>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
                </div>

                {/* Layout vertical — um acima do outro */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}>
                  {/* Descrição da empresa */}
                  {hasDescription && (
                    <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                        <div style={{ height: "2px", width: "14px", borderRadius: "2px", background: accentColor, flexShrink: 0 }} />
                        <p style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px", color: accentColor, margin: 0 }}>CONHEÇA A NOSSA EMPRESA</p>
                      </div>
                      <p style={{ color: "#fff", fontWeight: 700, fontSize: "13px", margin: "0 0 5px" }}>{settingsData?.company_name || ""}</p>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", margin: 0, lineHeight: 1.55 }}>{companyDescription}</p>
                    </div>
                  )}

                  {/* Avaliação Google */}
                  {hasGoogleRating && (
                    <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", flexShrink: 0 }}>
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: 0 }}>Avaliações Google</p>
                        </div>
                        <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", margin: 0 }}>Ver todas →</p>
                      </div>
                      {/* Nota grande + estrelas lado a lado */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <div>
                          <span style={{ fontSize: "30px", fontWeight: 900, color: "#fff", lineHeight: 1, display: "block" }}>{googleRating}</span>
                          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>de 5</span>
                        </div>
                        <div>
                          <div style={{ display: "flex", gap: "2px", marginBottom: "3px" }}>
                            {[1,2,3,4,5].map(i => (
                              <svg key={i} viewBox="0 0 24 24" style={{ width: "13px", height: "13px", fill: parseFloat(googleRating || "0") >= i ? accentColor : "rgba(255,255,255,0.15)" }}>
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                              </svg>
                            ))}
                          </div>
                          {googleReviewCount && (
                            <p style={{ fontSize: "10px", margin: 0 }}>
                              <span style={{ color: accentColor, fontWeight: 700 }}>{googleReviewCount} avaliações</span>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}> no Google</span>
                            </p>
                          )}
                        </div>
                      </div>
                      {googleReviewCount && (
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: accentColor, flexShrink: 0 }} />
                          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                            +{googleReviewCount} clientes satisfeitos recomendam a {settingsData?.company_name || "nossa empresa"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom accent bar — verde sólido */}
          <div style={{ marginTop: "20px", height: "5px", background: accentColor }} />
        </div>
        )}

        {/* Action Buttons — exibidos para todos os templates visuais (não WhatsApp) */}
        {selectedTemplate !== "whatsapp" && (
        <div className="no-print space-y-3">

          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadJpeg}
              disabled={isCapturing}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #1565C0, #1976D2)",
                boxShadow: "0 6px 20px rgba(21, 101, 192, 0.4)"
              }}
            >
              <ImageDown className="h-5 w-5" />
              {isCapturing ? "Gerando..." : isIOS ? "Salvar Imagem" : "Baixar JPEG"}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isCapturing}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #C62828, #E53935)",
                boxShadow: "0 6px 20px rgba(198, 40, 40, 0.4)"
              }}
            >
              <FileDown className="h-5 w-5" />
              {isCapturing ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>

          {/* Compartilhar / WhatsApp */}
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Enviar para o cliente</p>

          {/* Botão iPhone: usa Web Share API nativa — NÃO ALTERAR */}
          {isIOS && (
            <>
              <button
                onClick={handleShareNative}
                disabled={isCapturing}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)" }}
              >
                <Share2 className="h-5 w-5" />
                {isCapturing ? "Gerando imagem..." : "Compartilhar Orçamento"}
              </button>
              <p className="text-center text-xs text-muted-foreground">Abre o menu do iPhone — escolha WhatsApp, WhatsApp Business ou Salvar na Fotos</p>
            </>
          )}

          {/* Botão Android: Web Share API com arquivo — menu nativo do Android */}
          {isAndroid && (
            <>
              <button
                onClick={handleShareAndroid}
                disabled={isCapturing}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)" }}
              >
                <Share2 className="h-5 w-5" />
                {isCapturing ? "Gerando imagem..." : "Compartilhar Orçamento"}
              </button>
              <p className="text-center text-xs text-muted-foreground">Abre o menu do Android — escolha WhatsApp ou salve a imagem</p>
            </>
          )}

          {/* Botão Desktop: baixar imagem + abrir WhatsApp */}
          {!isIOS && !isAndroid && (
            <>
              <button
                onClick={handleShareNative}
                disabled={isCapturing}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)" }}
              >
                <Share2 className="h-5 w-5" />
                {isCapturing ? "Gerando imagem..." : "Compartilhar Orçamento"}
              </button>
              <p className="text-center text-xs text-muted-foreground">Compartilha a imagem do orçamento diretamente</p>
            </>
          )}
        </div>
        )}

        {/* Status Actions — sempre visíveis */}
        <div className="no-print grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (budget.status === "accepted") {
                // Já é aceito, desmarcar
                updateStatusMutation.mutate({ id: budgetId, status: "pending" });
                toast.success("Desmarcado como vendido");
              } else {
                // Abrir modal de registro de venda
                setShowRegisterSale(true);
              }
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${budget.status === "accepted" ? "bg-green-500 text-white" : "bg-white border border-border text-foreground hover:bg-green-50"}`}
          >
            <CheckCircle className="h-4 w-4" /> {budget.status === "accepted" ? "Vendido ✓" : "Marcar como Vendido"}
          </button>
          {budget.status === "rejected" ? (
            <button
              onClick={() => reactivateMutation.mutate({ id: budgetId })}
              disabled={reactivateMutation.isPending}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Reativar Orçamento
            </button>
          ) : (
            <button
              onClick={() => {
                updateStatusMutation.mutate({ id: budgetId, status: "rejected" });
                // Remove venda vinculada ao marcar como recusado
                deleteSaleByBudgetMutation.mutate({ budgetId });
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all bg-white border border-border text-foreground hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" /> Marcar como Recusado
            </button>
          )}
        </div>
      </div>



      {/* Modal Registrar Venda */}
      {showRegisterSale && (
        <RegisterSaleModal
          budget={{
            id: budgetId,
            budgetNumber: budget.budgetNumber ?? undefined,
            clientName: budget.clientName,
            clientPhone: budget.clientPhone,
            total: budget.total,
            createdAt: budget.createdAt,
          }}
          onClose={() => setShowRegisterSale(false)}
          onSuccess={() => {
            utils.budgets.getById.invalidate({ id: budgetId });
            utils.budgets.list.invalidate();
            setShowRegisterSale(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
