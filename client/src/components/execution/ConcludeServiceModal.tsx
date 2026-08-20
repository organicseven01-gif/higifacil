/**
 * ConcludeServiceModal
 * Modal reutilizável para concluir um serviço com registro de pagamento.
 * Mesmo fluxo do ExecutionDetailModal: confirma → registra forma de pagamento → atualiza venda/financeiro.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  orderId: number;
  clientName: string;
  totalValue?: string | null;
  onClose: () => void;
  onConcluded: () => void;
}

function formatCurrency(value: number | string) {
  const n = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ConcludeServiceModal({ orderId, clientName, totalValue, onClose, onConcluded }: Props) {
  // Etapa: "confirm" → "payment"
  const [step, setStep] = useState<"confirm" | "payment">("confirm");
  const [payMethod, setPayMethod] = useState("pix");
  const [payAmount, setPayAmount] = useState("");
  const [saleIdAfterConclude, setSaleIdAfterConclude] = useState<number | null>(null);
  const [totalAfterConclude, setTotalAfterConclude] = useState<string>(totalValue ?? "0");

  const utils = trpc.useUtils();

  // Busca dados completos da OS para ter upsell e saleId
  const { data: order } = trpc.execution.getById.useQuery({ id: orderId });
  const { data: upsellItems = [] } = trpc.execution.getUpsell.useQuery({ executionOrderId: orderId });

  const upsellTotal = (upsellItems as any[]).reduce((sum: number, item: any) => {
    const v = parseFloat(String(item.total ?? "0").replace(",", "."));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const orderValue = parseFloat(String(order?.totalValue ?? totalValue ?? "0").replace(",", ".")) || 0;
  const grandTotal = orderValue + upsellTotal;

  const concludeWithPayment = trpc.sales.concludeWithPayment.useMutation({
    onSuccess: (result) => {
      utils.execution.list.invalidate();
      utils.execution.metrics.invalidate();
      utils.sales.list.invalidate();
      const saleId = (result as any)?.saleId;
      if (saleId) {
        setSaleIdAfterConclude(saleId);
        setTotalAfterConclude(String(grandTotal));
        setStep("payment");
      } else {
        toast.success("Serviço concluído!");
        onConcluded();
      }
    },
    onError: (e) => toast.error(e.message || "Erro ao concluir serviço"),
  });

  const registerPayment = trpc.sales.registerPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento registrado! ✓");
      utils.execution.list.invalidate();
      utils.sales.list.invalidate();
      onConcluded();
    },
    onError: (e) => toast.error(e.message || "Erro ao registrar pagamento"),
  });

  const handleConfirm = () => {
    concludeWithPayment.mutate({
      executionOrderId: orderId,
      saleId: order?.saleId ?? undefined,
      budgetId: order?.budgetId ?? undefined,
      paymentMethod: "pix",
      total: String(grandTotal),
      clientName: order?.clientName ?? clientName,
      clientPhone: order?.clientPhone ?? undefined,
      clientId: order?.clientId ?? undefined,
      description: order?.serviceDescription
        ? `Serviço: ${order.serviceDescription}`
        : `OS #${String(orderId).padStart(4, "0")} - ${clientName}`,
    });
  };

  const handleRegisterPayment = () => {
    if (!saleIdAfterConclude) return;
    registerPayment.mutate({
      id: saleIdAfterConclude,
      paymentMethod: payMethod as any,
      amountReceived: payAmount || totalAfterConclude,
    });
  };

  const paymentOptions = [
    { value: "pix", label: "PIX", icon: "⚡" },
    { value: "cash", label: "Dinheiro", icon: "💵" },
    { value: "card_1x", label: "Cartão 1x", icon: "💳" },
    { value: "card_2x", label: "Cartão 2x", icon: "💳" },
    { value: "card_3x", label: "Cartão 3x", icon: "💳" },
    { value: "boleto", label: "Boleto", icon: "📄" },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">

        {/* ===== ETAPA 1: CONFIRMAR CONCLUSÃO ===== */}
        {step === "confirm" && (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-bold text-gray-900">Concluir Serviço</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Resumo */}
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-600 font-medium mb-1">Total do serviço</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(grandTotal)}</p>
                {upsellTotal > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    OS: {formatCurrency(orderValue)} + Upsell: {formatCurrency(upsellTotal)}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{clientName}</p>
              </div>
              <p className="text-sm text-gray-600">
                Ao confirmar, o serviço será marcado como <strong>concluído</strong> e você poderá registrar a forma de pagamento na próxima tela.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={concludeWithPayment.isPending}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  onClick={handleConfirm}
                  disabled={concludeWithPayment.isPending}
                >
                  {concludeWithPayment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ===== ETAPA 2: REGISTRAR PAGAMENTO ===== */}
        {step === "payment" && (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-bold text-gray-900">Registrar Pagamento</h3>
                  <p className="text-xs text-gray-500">{clientName} · {formatCurrency(Number(totalAfterConclude))}</p>
                </div>
              </div>
              <button
                onClick={() => { onConcluded(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Forma de pagamento */}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Forma de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPayMethod(opt.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        payMethod === opt.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-green-300"
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Valor recebido */}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Valor recebido (R$)</p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={Number(totalAfterConclude).toFixed(2)}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Deixe em branco para usar o valor total: {formatCurrency(Number(totalAfterConclude))}
                </p>
              </div>
              {/* Botões */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { onConcluded(); }}
                  disabled={registerPayment.isPending}
                >
                  Pular
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  onClick={handleRegisterPayment}
                  disabled={registerPayment.isPending}
                >
                  {registerPayment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Pago
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
