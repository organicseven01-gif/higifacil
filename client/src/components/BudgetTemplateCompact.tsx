import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ImageDown } from "lucide-react";
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
    items: BudgetItem[];
    subtotal: number | string;
    discountValue: number | string;
    total: number | string;
    notes?: string;
    validDays: number;
  };
  settings: {
    company_name: string;
    company_phone: string;
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

export default function BudgetTemplateCompact({
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

  const capture = async () => {
    if (!cardRef.current) return null;
    setIsCapturing(true);
    try {
      return await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
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
      ? `https://wa.me/55${phone}?text=${encodeURIComponent("Segue seu orçamento 📋")}`
      : `https://wa.me/?text=${encodeURIComponent("Segue seu orçamento 📋")}`;
    const link = document.createElement("a");
    link.download = `orcamento-${budget.budgetNumber ?? "novo"}.png`;
    link.href = dataUrl;
    link.click();
    setTimeout(() => window.open(url, "_blank"), 500);
  };

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(145deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Linha superior decorativa */}
        <div className="h-1" style={{ background: secondaryColor }} />

        {/* Cabeçalho compacto: logo + empresa + número */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-4">
          {logoUrl ? (
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" }}
            >
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-2xl"
              style={{ background: `${secondaryColor}33`, border: `2px solid ${secondaryColor}` }}
            >
              {(settings.company_name || "E").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base leading-tight truncate">{settings.company_name}</p>
            <p className="text-white/60 text-xs mt-0.5 truncate">{settings.company_phone}</p>
          </div>
          {budget.budgetNumber && (
            <div className="text-right shrink-0">
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Orç.</p>
              <p className="font-black text-white text-lg leading-tight">#{String(budget.budgetNumber).padStart(4, "0")}</p>
            </div>
          )}
        </div>

        {/* Destaque: cliente + valor total */}
        <div
          className="mx-4 rounded-2xl px-4 py-4 mb-4"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest">Para</p>
              <p className="text-white font-black text-base leading-tight">{budget.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-widest">Total</p>
              <p className="font-black text-2xl leading-tight" style={{ color: secondaryColor }}>
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de serviços compacta */}
        <div className="px-4 mb-4 space-y-1.5">
          {budget.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: secondaryColor }} />
                <span className="text-white/90 text-sm truncate">{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
              </div>
              <span className="text-white font-bold text-sm shrink-0 ml-2">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}

          {hasDiscount && (
            <div className="flex justify-between items-center py-1 px-3">
              <span className="text-white/50 text-xs">Subtotal</span>
              <span className="text-white/50 text-xs">{formatCurrency(subtotal)}</span>
            </div>
          )}
          {hasDiscount && (
            <div className="flex justify-between items-center py-1 px-3">
              <span className="text-red-300 text-xs">Desconto</span>
              <span className="text-red-300 text-xs">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
        </div>

        {/* Pagamento: 2 colunas */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          <div
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: `${secondaryColor}22`, border: `1px solid ${secondaryColor}55` }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: secondaryColor }}>À Vista</p>
            <p className="font-black text-white text-lg leading-tight">{formatCurrency(total)}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Pix / Dinheiro</p>
          </div>
          <div
            className="rounded-xl px-3 py-3 text-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Cartão 3x</p>
            <p className="text-white font-black text-lg leading-tight">{formatCurrency(parcel3x)}<span className="text-xs font-semibold">/parc.</span></p>
            <p className="text-white/40 text-[10px] mt-0.5">Total: {formatCurrency(total3x)}</p>
          </div>
        </div>

        {/* Observações */}
        {budget.notes && (
          <div className="px-4 pb-4">
            <div
              className="rounded-xl px-3 py-3"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Obs.</p>
              <p className="text-white/80 text-xs leading-relaxed">{budget.notes}</p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <p className="text-white/40 text-xs">Válido por <span className="text-white/60 font-semibold">{budget.validDays} dias</span></p>
          <div className="h-0.5 w-12 rounded-full" style={{ background: secondaryColor }} />
        </div>

        {/* Linha inferior decorativa */}
        <div className="h-1" style={{ background: secondaryColor }} />
      </div>

      {/* Botões */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          disabled={isCapturing}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          <ImageDown className="h-4 w-4" />
          {isCapturing ? "Gerando..." : "Baixar Imagem"}
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={isCapturing}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
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
