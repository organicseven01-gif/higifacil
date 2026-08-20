import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ImageDown, FileDown } from "lucide-react";
import { toast } from "sonner";

interface BudgetItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
}

interface Props {
  budget: {
    budgetNumber?: number;
    clientName: string;
    clientPhone: string;
    clientAddress?: string;
    items: BudgetItem[];
    subtotal: number | string;
    discountValue: number | string;
    total: number | string;
    notes?: string;
    validDays: number;
    createdAt?: string | Date;
  };
  settings: {
    company_name: string;
    company_phone: string;
    company_address?: string;
    card_fee_3x?: string;
  };
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

export default function BudgetTemplateProfessional({
  budget,
  settings,
  logoUrl,
  primaryColor = "#1e3a5f",
  secondaryColor = "#22c55e",
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const total = parseFloat(String(budget.total)) || 0;
  const discountAmount = parseFloat(String(budget.discountValue)) || 0;
  const subtotal = parseFloat(String(budget.subtotal)) || 0;
  const hasDiscount = discountAmount > 0;
  const fee3x = parseFloat(settings.card_fee_3x ?? "5.0") || 0;
  const total3x = total * (1 + fee3x / 100);
  const parcel3x = total3x / 3;

  const dateStr = budget.createdAt
    ? new Date(budget.createdAt).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const capture = async () => {
    if (!cardRef.current) return null;
    setIsCapturing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      return dataUrl;
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await capture();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `orcamento-${budget.budgetNumber ?? "novo"}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Imagem baixada!");
  };

  const handleWhatsApp = async () => {
    const dataUrl = await capture();
    if (!dataUrl) return;
    const phone = budget.clientPhone.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent("Segue seu orçamento em anexo 📋")}`
      : `https://wa.me/?text=${encodeURIComponent("Segue seu orçamento em anexo 📋")}`;
    const link = document.createElement("a");
    link.download = `orcamento-${budget.budgetNumber ?? "novo"}.png`;
    link.href = dataUrl;
    link.click();
    setTimeout(() => window.open(url, "_blank"), 500);
  };

  return (
    <div className="space-y-4">
      {/* Card do orçamento */}
      <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden shadow-xl" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* Cabeçalho */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: primaryColor }}>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl"
                style={{ background: `${secondaryColor}33`, border: `2px solid ${secondaryColor}` }}
              >
                {(settings.company_name || "E").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-black text-lg leading-tight">{settings.company_name || "Empresa"}</p>
              {settings.company_phone && (
                <p className="text-white/70 text-sm">{settings.company_phone}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-widest">Orçamento</p>
            {budget.budgetNumber && (
              <p className="text-white font-black text-2xl">#{String(budget.budgetNumber).padStart(4, "0")}</p>
            )}
            <p className="text-white/60 text-xs mt-0.5">{dateStr}</p>
          </div>
        </div>

        {/* Barra colorida */}
        <div className="h-1.5" style={{ background: secondaryColor }} />

        {/* Dados do cliente */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Para</p>
          <p className="font-bold text-gray-800 text-lg">{budget.clientName}</p>
          {budget.clientPhone && <p className="text-gray-500 text-sm">{budget.clientPhone}</p>}
          {budget.clientAddress && <p className="text-gray-500 text-sm">{budget.clientAddress}</p>}
        </div>

        {/* Tabela de itens */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: `${primaryColor}15` }}>
                <th className="text-left py-2 px-3 font-bold text-gray-600 rounded-l-lg">Serviço</th>
                <th className="text-center py-2 px-2 font-bold text-gray-600 w-12">Qtd</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600 w-24">Unitário</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600 rounded-r-lg w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {budget.items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="py-2.5 px-3 text-gray-700 font-medium">{item.name}</td>
                  <td className="py-2.5 px-2 text-center text-gray-500">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-gray-800">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totais */}
          <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
            {hasDiscount && (
              <>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              </>
            )}
            <div
              className="flex justify-between items-center py-2 px-3 rounded-xl mt-2"
              style={{ background: `${primaryColor}10` }}
            >
              <span className="font-black text-gray-800 text-base">TOTAL</span>
              <span className="font-black text-xl" style={{ color: primaryColor }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Condições de pagamento */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3 text-center border-2"
            style={{ borderColor: `${secondaryColor}50`, background: `${secondaryColor}08` }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: secondaryColor }}>À Vista</p>
            <p className="font-black text-xl" style={{ color: primaryColor }}>{formatCurrency(total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Pix / Dinheiro</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: primaryColor }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Cartão até 3x</p>
            <p className="font-black text-xl text-white">{formatCurrency(parcel3x)}<span className="text-sm font-semibold">/parc.</span></p>
            <p className="text-xs text-white/50 mt-0.5">Total: {formatCurrency(total3x)}</p>
          </div>
        </div>

        {/* Observações */}
        {budget.notes && (
          <div className="px-6 pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Observações</p>
              <p className="text-sm text-amber-800 leading-relaxed">{budget.notes}</p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ background: `${primaryColor}08`, borderTop: `1px solid ${primaryColor}15` }}
        >
          <p className="text-xs text-gray-400">Válido por <strong className="text-gray-600">{budget.validDays} dias</strong></p>
          <div className="h-1 w-16 rounded-full" style={{ background: secondaryColor }} />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          disabled={isCapturing}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          <ImageDown className="h-4 w-4" />
          {isCapturing ? "Gerando..." : "Baixar Imagem"}
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={isCapturing}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {isCapturing ? "Gerando..." : "Enviar WhatsApp"}
        </button>
      </div>
    </div>
  );
}
