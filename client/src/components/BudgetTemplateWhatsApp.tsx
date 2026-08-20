import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface BudgetItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
}

interface BudgetTemplateWhatsAppProps {
  budget: {
    clientName: string;
    clientPhone: string;
    items: BudgetItem[];
    subtotal: number | string;
    discountValue: number | string;
    total: number | string;
    paymentConditions?: string | null;
    notes?: string | null;
    validDays: number;
  };
  settings: {
    company_name: string;
    company_phone: string;
    pix_key?: string;
    card_fee_3x?: string;
    // Modelo Profissional
    whatsapp_header_text?: string;
    whatsapp_differentials?: string;
    whatsapp_closing_text?: string;
    whatsapp_template_model?: string;
  };
  primaryColor?: string;
  secondaryColor?: string;
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

const DEFAULT_DIFFERENTIALS = [
  "Atendimento realizado por profissionais identificados",
  "Produtos específicos para cada tipo de tecido",
  "Processo seguro para crianças e pets",
  "Remoção de sujeiras, odores e ácaros",
  "Serviço realizado em domicílio",
];

const DEFAULT_HEADER_TEXT =
  "Preparamos uma proposta personalizada para a higienização dos seus itens, utilizando produtos específicos para remoção de sujeiras, ácaros, odores e microrganismos.";

const DEFAULT_CLOSING_TEXT =
  "Caso deseje agendar, basta responder esta mensagem e reservaremos um horário para você.";

export default function BudgetTemplateWhatsApp({
  budget,
  settings,
  primaryColor = "#1e3a5f",
  secondaryColor = "#22c55e",
}: BudgetTemplateWhatsAppProps) {
  const [copied, setCopied] = useState(false);

  const total = parseFloat(String(budget.total)) || 0;
  const discountAmount = parseFloat(String(budget.discountValue)) || 0;
  const subtotal = parseFloat(String(budget.subtotal)) || 0;
  const hasDiscount = discountAmount > 0;
  const fee3x = parseFloat(settings.card_fee_3x ?? "5.0") || 0;
  const total3x = total * (1 + fee3x / 100);
  const parcel3x = total3x / 3;

  // Parse diferenciais — linha por linha ou array JSON
  const parseDifferentials = (): string[] => {
    const raw = settings.whatsapp_differentials;
    if (!raw) return DEFAULT_DIFFERENTIALS;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // não é JSON, tratar como texto linha a linha
    }
    return raw.split("\n").map((l) => l.trim()).filter(Boolean);
  };

  const differentials = parseDifferentials();
  const headerText = settings.whatsapp_header_text || DEFAULT_HEADER_TEXT;
  const closingText = settings.whatsapp_closing_text || DEFAULT_CLOSING_TEXT;
  const companyName = settings.company_name || "Nossa Empresa";

  // Gera o texto da mensagem no Modelo Profissional
  const generateMessage = () => {
    let msg = "";

    // 1. CABEÇALHO
    msg += `🌿 *PROPOSTA DE HIGIENIZAÇÃO*\n`;
    msg += `*${companyName.toUpperCase()}*\n\n`;
    msg += `Olá, *${budget.clientName}*! 😊\n\n`;
    msg += `${headerText}\n`;
    msg += `\n━━━━━━━━━━━━━━\n\n`;

    // 2. SERVIÇOS
    budget.items.forEach((item) => {
      const qty = item.quantity > 1 ? `${item.quantity}x ` : "";
      msg += `✅ ${qty}${item.name} — ${formatCurrency(item.subtotal)}\n`;
    });

    msg += `\n━━━━━━━━━━━━━━\n\n`;

    // 3. RESUMO FINANCEIRO
    if (hasDiscount) {
      msg += `Subtotal: ${formatCurrency(subtotal)}\n`;
      msg += `Desconto: -${formatCurrency(discountAmount)}\n`;
    }
    msg += `💰 *Investimento Total: ${formatCurrency(total)}*\n\n`;

    // Parcelamento
    msg += `💳 *Parcelamento disponível:*\n`;
    msg += `• 3x de ${formatCurrency(parcel3x)}\n\n`;
    msg += `ou\n\n`;

    // PIX
    if (settings.pix_key) {
      msg += `💵 *À vista via Pix*\n`;
      msg += `Chave: ${settings.pix_key}\n`;
    } else {
      msg += `💵 *À vista via Pix*\n`;
    }

    msg += `\n━━━━━━━━━━━━━━\n\n`;

    // 4. GARANTIAS E DIFERENCIAIS
    differentials.forEach((d) => {
      msg += `✨ ${d}\n`;
    });

    msg += `\n━━━━━━━━━━━━━━\n\n`;

    // 5. FECHAMENTO
    msg += `⏰ *Proposta válida por ${budget.validDays} dias.*\n\n`;
    msg += `${closingText}\n\n`;

    if (settings.company_phone) {
      msg += `📱 ${settings.company_phone}\n`;
    }
    msg += `*${companyName}*\n`;
    msg += `\n━━━━━━━━━━━━━━`;

    if (budget.notes) {
      msg += `\n\n📝 *Observações:*\n${budget.notes}`;
    }

    return msg;
  };

  const message = generateMessage();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  const handleOpenWhatsApp = () => {
    const phone = budget.clientPhone.replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    const url = phone
      ? `https://wa.me/55${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-border">
      {/* Header colorido */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: primaryColor }}
      >
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Modelo Profissional</p>
          <p className="text-white font-black text-lg leading-tight">{budget.clientName}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${secondaryColor}33`, border: `2px solid ${secondaryColor}` }}
        >
          <MessageCircle className="h-5 w-5" style={{ color: secondaryColor }} />
        </div>
      </div>

      {/* Prévia da mensagem estilo WhatsApp */}
      <div className="bg-[#e5ddd5] px-4 py-4">
        <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm max-w-[90%]">
          <pre
            className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed"
            style={{ fontFamily: "inherit" }}
          >
            {message}
          </pre>
          <p className="text-right text-[10px] text-gray-400 mt-1">✓✓</p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="bg-white px-4 py-4 grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border-2"
          style={{
            borderColor: secondaryColor,
            color: secondaryColor,
            background: copied ? `${secondaryColor}15` : "transparent",
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar mensagem"}
        </button>
        <button
          onClick={handleOpenWhatsApp}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
          style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Abrir WhatsApp
        </button>
      </div>
    </div>
  );
}
