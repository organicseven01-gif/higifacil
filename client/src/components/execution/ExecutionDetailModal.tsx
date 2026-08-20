import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  X, MapPin, Phone, Wrench, CheckCircle2, XCircle, Loader2,
  Plus, Trash2, Camera, ShoppingBag, Edit2, FileText, User,
  MessageCircle, Receipt, RotateCcw, Users, ExternalLink, Star, Send, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import ExecutionFormModal from "./ExecutionFormModal";
import ExecutionReport from "./ExecutionReport";

function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const s = String(value).trim().replace(/,/g, '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(value: string | number | null | undefined) {
  const n = parseDecimal(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge className="bg-green-100 text-green-700 border-green-200">Concluído</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelado</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>;
}

interface Props {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ExecutionDetailModal({ orderId, onClose, onUpdated }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [upsellForm, setUpsellForm] = useState({ description: "", quantity: "1", unitPrice: "", isCarpet: false });
  const [addingUpsell, setAddingUpsell] = useState(false);
  const [observations, setObservations] = useState("");
  const [editingObs, setEditingObs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPhotoType, setUploadingPhotoType] = useState<"before" | "after" | "other">("other");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; type: string } | null>(null);
  const [showPresetMessages, setShowPresetMessages] = useState(false);

  // Modal de visualização de orçamento inline
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Modal de conclusão (confirmação simples)
  const [showConcludeModal, setShowConcludeModal] = useState(false);

  // Modal de pagamento pós-conclusão (abre após marcar como concluído)
  const [postConcludePayModal, setPostConcludePayModal] = useState<{ saleId: number; clientName: string; total: string } | null>(null);
  const [postConcludePayMethod, setPostConcludePayMethod] = useState<string>('pix');
  const [postConcludePayAmount, setPostConcludePayAmount] = useState<string>('');

  // Estados legados (mantidos para não quebrar outras partes)
  const [concludePaymentMethod, setConcludePaymentMethod] = useState<string>('pix');
  const [concludeInstallments, setConcludeInstallments] = useState(1);
  const [concludeNotes, setConcludeNotes] = useState('');
  const [concludeReceiptUrl, setConcludeReceiptUrl] = useState('');
  const [concludeReceiptKey, setConcludeReceiptKey] = useState('');
  const [uploadingConcludeReceipt, setUploadingConcludeReceipt] = useState(false);
  const concludeReceiptInputRef = useRef<HTMLInputElement>(null);

  const { data: presetMessages = [] } = trpc.presetMessages.list.useQuery();
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [reactivationDays, setReactivationDays] = useState<number | null>(180);

  const utils = trpc.useUtils();
  const { data: order, isLoading, refetch } = trpc.execution.getById.useQuery({ id: orderId });
  const { data: upsellItems = [], refetch: refetchUpsell } = trpc.execution.getUpsell.useQuery({ executionOrderId: orderId });
  const { data: photos = [], refetch: refetchPhotos } = trpc.execution.getPhotos.useQuery({ executionOrderId: orderId });

  // Queries para modais de orçamento e conclusão
  // Busca por budgetId (quando vinculado) ou por telefone (fallback)
  const { data: linkedBudgetById } = trpc.budgets.getById.useQuery(
    { id: order?.budgetId ?? 0 },
    { enabled: showBudgetModal && !!order?.budgetId }
  );
  const { data: linkedBudgetByPhone } = trpc.budgets.getLatestByPhone.useQuery(
    { phone: order?.clientPhone ?? '' },
    { enabled: showBudgetModal && !order?.budgetId && !!order?.clientPhone }
  );
  const linkedBudget = linkedBudgetById ?? linkedBudgetByPhone;
  // Para saber se existe orçamento (sem abrir o modal) — usado para exibir o botão
  const { data: existingBudgetByPhone } = trpc.budgets.getLatestByPhone.useQuery(
    { phone: order?.clientPhone ?? '' },
    { enabled: !order?.budgetId && !!order?.clientPhone }
  );
  const hasBudget = !!order?.budgetId || !!existingBudgetByPhone;
  const { data: linkedSale } = trpc.sales.getByBudgetId.useQuery(
    { budgetId: order?.budgetId ?? 0 },
    { enabled: showConcludeModal && !!order?.budgetId }
  );

  const createReviewLink = trpc.reviews.createLink.useMutation();

  const registerPaymentAfterConclude = trpc.sales.registerPayment.useMutation({
    onSuccess: () => {
      toast.success('Pagamento registrado! ✓');
      setPostConcludePayModal(null);
      onUpdated();
      onClose();
    },
    onError: (e) => toast.error(e.message || 'Erro ao registrar pagamento'),
  });

  const concludeWithPayment = trpc.sales.concludeWithPayment.useMutation({
    onSuccess: async (result) => {
      setShowConcludeModal(false);
      refetch();
      onUpdated();
      // Configurar reativação se definida
      if (reactivationDays && order?.clientId) {
        const today = new Date().toISOString().split('T')[0];
        setReactivationMutation.mutate({
          clientId: order.clientId,
          reactivationDays,
          lastServiceDate: today,
        });
      }
      // Se existe venda vinculada, abrir modal de pagamento
      if (result?.saleId) {
        setPostConcludePayMethod('pix');
        setPostConcludePayAmount('');
        setPostConcludePayModal({
          saleId: result.saleId,
          clientName: order?.clientName ?? '',
          total: String(grandTotal),
        });
      } else {
        // Não há venda vinculada, apenas fechar
        toast.success('Serviço concluído!');
        onClose();
      }
    },
    onError: (e) => toast.error(e.message || "Erro ao concluir serviço"),
  });

  const deleteOrder = trpc.execution.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento excluído!");
      utils.execution.list.invalidate();
      utils.execution.metrics.invalidate();
      onUpdated();
      onClose();
    },
    onError: () => toast.error("Erro ao excluir agendamento"),
  });

  const saveCancelledRecord = trpc.cancelled.create.useMutation();

  const rescheduleOrder = trpc.execution.update.useMutation({
    onSuccess: () => {
      toast.success("Reagendado com sucesso!");
      setShowRescheduleDialog(false);
      refetch();
      onUpdated();
    },
    onError: () => toast.error("Erro ao reagendar"),
  });

  const handleDeleteWithHistory = async () => {
    if (!order) return;
    // Salvar no histórico antes de excluir
    await saveCancelledRecord.mutateAsync({
      originalOrderId: order.id,
      clientName: order.clientName,
      clientPhone: order.clientPhone ?? undefined,
      serviceDescription: order.serviceDescription ?? undefined,
      scheduledDate: order.scheduledDate ?? undefined,
      scheduledTime: order.scheduledTime ?? undefined,
      assignedTo: order.assignedTo ?? undefined,
      totalValue: order.totalValue ?? undefined,
      reason: cancelReason || undefined,
    });
    deleteOrder.mutate({ id: order.id });
  };

  const handleReschedule = () => {
    if (!rescheduleDate) { toast.error("Selecione uma nova data"); return; }
    rescheduleOrder.mutate({ id: orderId, scheduledDate: rescheduleDate, scheduledTime: rescheduleTime || undefined });
  };

  const setReactivationMutation = trpc.crm.setReactivation.useMutation();

  const handleCompleteWithReview = async () => {
    if (!order) return;
    // 1. Marcar como concluído
    updateStatus.mutate({ id: orderId, status: "done" }, {
      onSuccess: async () => {
        // 2. Configurar reativação se definida
        if (reactivationDays && order.clientId) {
          const today = new Date().toISOString().split('T')[0];
          setReactivationMutation.mutate({
            clientId: order.clientId,
            reactivationDays,
            lastServiceDate: today,
          });
        }
        // 3. Gerar link de avaliação se tiver telefone
        if (order.clientPhone) {
          try {
            const result = await createReviewLink.mutateAsync({
              executionOrderId: orderId,
              clientName: order.clientName,
              clientPhone: order.clientPhone,
              serviceDescription: order.serviceDescription ?? undefined,
            });
            const appUrl = window.location.origin;
            const reviewUrl = `${appUrl}/avaliar/${result.token}`;
            const phone = order.clientPhone.replace(/\D/g, "");
            const firstName = order.clientName.split(" ")[0];
            const msg = `Olá, ${firstName}! 😊 Seu serviço foi concluído com sucesso!\n\nGostaríamos de saber como foi sua experiência. Por favor, avalie nosso atendimento clicando no link abaixo:\n\n⭐ ${reviewUrl}\n\nSua opinião é muito importante para nós! Obrigado pela confiança! 🙏`;
            const waUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, "_blank");
            toast.success("Serviço concluído! Link de avaliação gerado e WhatsApp aberto.");
          } catch {
            toast.success("Serviço concluído!");
          }
        } else {
          toast.success("Serviço concluído!");
        }
      },
    });
  };

  const updateStatus = trpc.execution.updateStatus.useMutation({
    onSuccess: () => { refetch(); onUpdated(); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const updateOrder = trpc.execution.update.useMutation({
    onSuccess: () => { toast.success("Observações salvas!"); refetch(); setEditingObs(false); },
    onError: () => toast.error("Erro ao salvar observações"),
  });

  const addUpsell = trpc.execution.addUpsell.useMutation({
    onSuccess: () => {
      toast.success("Item adicionado!");
      setUpsellForm({ description: "", quantity: "1", unitPrice: "", isCarpet: false });
      setAddingUpsell(false);
      refetchUpsell();
    },
    onError: (e) => toast.error(e.message || "Erro ao adicionar item"),
  });

  const deleteUpsell = trpc.execution.deleteUpsell.useMutation({
    onSuccess: () => {
      toast.success("Item removido!");
      refetchUpsell();
      utils.execution.getUpsellTotals.invalidate();
      utils.execution.list.invalidate();
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  const addPhoto = trpc.execution.addPhoto.useMutation({
    onSuccess: () => { toast.success("Foto adicionada!"); refetchPhotos(); },
    onError: () => toast.error("Erro ao adicionar foto"),
  });

  const deletePhoto = trpc.execution.deletePhoto.useMutation({
    onSuccess: () => { toast.success("Foto removida!"); refetchPhotos(); },
    onError: () => toast.error("Erro ao remover foto"),
  });

  const handleAddUpsell = () => {
    if (!upsellForm.description.trim()) { toast.error("Descrição é obrigatória"); return; }
    const qty = parseInt(upsellForm.quantity) || 1;
    const price = parseFloat(upsellForm.unitPrice) || 0;
    addUpsell.mutate({
      executionOrderId: orderId,
      description: upsellForm.description.trim(),
      quantity: qty,
      unitPrice: String(price),
      total: String(qty * price),
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after" | "other" = "other") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadingPhotoType(type);
    try {
      const formData = new FormData();
      formData.append("visibility", "public");
      formData.append("category", "execution-photos");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.url) throw new Error("Upload falhou");
      await addPhoto.mutateAsync({
        executionOrderId: orderId,
        photoUrl: data.url,
        photoKey: data.key,
        photoType: type,
      });
      toast.success(type === "before" ? "Foto 'Antes' adicionada!" : type === "after" ? "Foto 'Depois' adicionada!" : "Foto adicionada!");
    } catch {
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploadingPhoto(false);
      setUploadingPhotoType("other");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (fileInputBeforeRef.current) fileInputBeforeRef.current.value = "";
      if (fileInputAfterRef.current) fileInputAfterRef.current.value = "";
    }
  };

  const handleConcludeReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingConcludeReceipt(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "private");
      formData.append("category", "execution-receipts");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      // Upload privado: a API retorna url=null de propósito (ver server/storage.ts).
      // O que persiste é sempre a KEY — nunca uma URL, nem assinada.
      if (!data.key) throw new Error("Upload falhou");
      setConcludeReceiptUrl(data.key);
      setConcludeReceiptKey(data.key);
      toast.success("Comprovante anexado!");
    } catch {
      toast.error("Erro ao fazer upload do comprovante");
    } finally {
      setUploadingConcludeReceipt(false);
      if (concludeReceiptInputRef.current) concludeReceiptInputRef.current.value = "";
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "private");
      formData.append("category", "execution-receipts");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      // Upload privado: url vem null de propósito — persiste-se só a KEY.
      if (!data.key) throw new Error("Upload falhou");
      await updateOrder.mutateAsync({ id: orderId, receiptUrl: data.key, receiptKey: data.key });
      toast.success("Comprovante anexado!");
    } catch {
      toast.error("Erro ao fazer upload do comprovante");
    } finally {
      setUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

  const address = order
    ? [order.street, order.addressNumber, order.complement, order.neighborhood, order.city].filter(Boolean).join(", ")
    : "";
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null;
  const wazeUrl = address ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes` : null;

  const upsellTotal = upsellItems.reduce((sum: number, item: { total: string | null }) => sum + parseDecimal(item.total), 0);
  const orderValue = parseDecimal(order?.totalValue);
  const grandTotal = orderValue + upsellTotal;

  if (showEdit && order) {
    return (
      <ExecutionFormModal
        editOrder={order as Parameters<typeof ExecutionFormModal>[0]["editOrder"]}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); refetch(); onUpdated(); }}
      />
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Detalhes do Serviço</h2>
            {order && <StatusBadge status={order.status} />}
          </div>
          <div className="flex items-center gap-1">
            {order && (
              <button onClick={() => setShowEdit(true)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Editar">
                <Edit2 className="h-4 w-4 text-gray-500" />
              </button>
            )}
            {order && (
              <button onClick={() => setShowDeleteDialog(true)} className="p-1.5 rounded-lg hover:bg-red-50" title="Excluir agendamento">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : !order ? (
            <p className="text-center text-gray-500 py-8">Serviço não encontrado</p>
          ) : (
            <>
              {/* Dados do cliente */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-gray-800">{order.clientName}</span>
                  {order.orderNumber && (
                    <span className="text-xs text-gray-400 ml-auto">#{String(order.orderNumber).padStart(4, "0")}</span>
                  )}
                </div>

                {/* Telefone + botões WhatsApp */}
                {order.clientPhone && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`tel:${order.clientPhone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600">
                      <Phone className="h-3.5 w-3.5" />
                      {order.clientPhone}
                    </a>
                    <div className="flex gap-1.5 ml-auto">
                      <a
                        href={`https://wa.me/55${formatPhone(order.clientPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                      <a
                        href={`https://api.whatsapp.com/send?phone=55${formatPhone(order.clientPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition-colors"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Business
                      </a>
                      {presetMessages.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setShowPresetMessages(!showPresetMessages)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Mensagens
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {showPresetMessages && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 min-w-[220px] overflow-hidden">
                              <p className="text-xs font-semibold text-gray-500 uppercase px-3 pt-2 pb-1">Enviar mensagem</p>
                              {presetMessages.map((msg: any) => {
                                const clientName = order.clientName.split(' ')[0];
                                const addr = [order.street, order.addressNumber, order.complement, order.neighborhood].filter(Boolean).join(', ');
                                const text = msg.message
                                  .replace(/\{nome\}/g, clientName)
                                  .replace(/\{endereco\}/g, addr || 'endereço não informado');
                                const phone = order.clientPhone!.replace(/\D/g, '');
                                const waUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
                                return (
                                  <a
                                    key={msg.id}
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setShowPresetMessages(false)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-sm text-gray-800"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span className="truncate">{msg.title}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Endereço com botões de navegação */}
                {address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-600 flex-1">{address}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <a
                        href={mapsUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                        title="Abrir no Google Maps"
                      >
                        Maps
                      </a>
                      <a
                        href={wazeUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500 text-white text-xs font-medium hover:bg-cyan-600 transition-colors"
                        title="Abrir no Waze"
                      >
                        Waze
                      </a>
                    </div>
                  </div>
                )}

                {/* Equipe / Responsável */}
                {order.assignedTo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{order.assignedTo}</span>
                  </div>
                )}
              </div>

              {/* Serviço */}
              {order.serviceDescription && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-gray-800 text-sm">Serviço</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.serviceDescription.split(',').map((item, idx) => {
                      const label = item.trim();
                      if (!label) return null;
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          <Wrench className="h-3 w-3 shrink-0" />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Orçamento vinculado */}
              {hasBudget && (
                <div>
                  <button
                    onClick={() => setShowBudgetModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>
                      {order.budgetId
                        ? `Ver Orçamento #${String(order.budgetId).padStart(4, '0')}`
                        : existingBudgetByPhone
                          ? `Ver Orçamento #${String((existingBudgetByPhone as any).budgetNumber).padStart(4, '0')}`
                          : 'Ver Orçamento'
                      }
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 ml-auto text-indigo-400" />
                  </button>
                </div>
              )}
              {/* Horário e Valor */}
              <div className="flex gap-3">
                {order.scheduledTime && (
                  <div className="flex-1 bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-600 font-medium">Horário</p>
                    <p className="text-lg font-bold text-amber-700">{order.scheduledTime}</p>
                  </div>
                )}
                {orderValue > 0 && (
                  <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 font-medium">Valor OS</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(orderValue)}</p>
                  </div>
                )}
                {upsellTotal > 0 && (
                  <div className="flex-1 bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-600 font-medium">Upsell</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(upsellTotal)}</p>
                  </div>
                )}
              </div>

              {/* Total geral (OS + upsell) */}
              {upsellTotal > 0 && orderValue > 0 && (
                <div className="bg-gradient-to-r from-green-500/10 to-purple-500/10 border border-green-200 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total Geral (OS + Upsell)</span>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(grandTotal)}</span>
                </div>
              )}

              {/* Observações */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold text-gray-800 text-sm">Observações</span>
                  </div>
                  <button
                    onClick={() => { setObservations(order.observations ?? order.notes ?? ""); setEditingObs(true); }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {order.observations || order.notes ? "Editar" : "Adicionar"}
                  </button>
                </div>
                {editingObs ? (
                  <div className="space-y-2">
                    <textarea
                      value={observations}
                      onChange={e => setObservations(e.target.value)}
                      rows={3}
                      placeholder="Observações sobre o serviço..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setEditingObs(false)}>Cancelar</Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => updateOrder.mutate({ id: orderId, observations })}
                        disabled={updateOrder.isPending}
                      >
                        {updateOrder.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  (order.observations || order.notes) ? (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{order.observations || order.notes}</p>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhuma observação</p>
                  )
                )}
              </div>

              {/* Upsell */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-gray-800 text-sm">Upsell — Vendas em Campo</span>
                  </div>
                  <button
                    onClick={() => setAddingUpsell(v => !v)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </div>

                {addingUpsell && (
                  <div className="bg-purple-50 rounded-xl p-3 mb-3 space-y-2">
                    <Input
                      value={upsellForm.description}
                      onChange={e => setUpsellForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição do item vendido"
                      className="text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={upsellForm.quantity}
                        onChange={e => setUpsellForm(f => ({ ...f, quantity: e.target.value }))}
                        placeholder="Qtd"
                        min="1"
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={upsellForm.unitPrice}
                        onChange={e => setUpsellForm(f => ({ ...f, unitPrice: e.target.value }))}
                        placeholder="Valor unit. (R$)"
                        className="text-sm"
                      />
                    </div>
                    {/* Checkbox tapete */}
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={upsellForm.isCarpet}
                        onChange={e => setUpsellForm(f => ({ ...f, isCarpet: e.target.checked }))}
                        className="rounded"
                      />
                      É um tapete (abrirá o fluxo de cadastro de tapete)
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAddingUpsell(false)}>Cancelar</Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                        onClick={handleAddUpsell}
                        disabled={addUpsell.isPending}
                      >
                        {addUpsell.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                )}

                {upsellItems.length > 0 ? (
                  <div className="space-y-2">
                    {upsellItems.map((item: { id: number; description: string; quantity: number; unitPrice: string | null; total: string | null }) => (
                      <div key={item.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                          <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-gray-700">{formatCurrency(item.total)}</span>
                          <button
                            onClick={() => deleteUpsell.mutate({ id: item.id })}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 border-t">
                      <span className="text-sm font-semibold text-gray-700">Total Upsell</span>
                      <span className="text-sm font-bold text-purple-700">{formatCurrency(upsellTotal)}</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      onClick={() => {
                        utils.execution.list.invalidate();
                        utils.execution.getUpsellTotals.invalidate();
                        toast.success("Alterações salvas!");
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Salvar Alterações
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-2">Nenhum item de upsell registrado</p>
                )}
              </div>

              {/* Comprovante de Pagamento */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-gray-800 text-sm">Comprovante de Pagamento</span>
                  </div>
                  <button
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={uploadingReceipt}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    {uploadingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {order.receiptUrl ? "Substituir" : "Anexar"}
                  </button>
                  <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
                </div>
                {order.receiptUrl ? (
                  <button
                    type="button"
                    onClick={async () => {
                      // Arquivo privado: o banco guarda só a KEY. A URL de
                      // verdade (assinada, temporária) é resolvida agora,
                      // validando que o comprovante é desta empresa (ver
                      // storageRouter.getSignedUrl em server/routers.ts).
                      // Fallback: dado antigo, salvo como URL direta antes
                      // desta mudança — abre direto, sem passar pelo router.
                      if (/^https?:\/\//i.test(order.receiptUrl!)) {
                        window.open(order.receiptUrl!, "_blank", "noopener,noreferrer");
                        return;
                      }
                      try {
                        const { url } = await utils.client.storage.getSignedUrl.query({ key: order.receiptUrl! });
                        window.open(url, "_blank", "noopener,noreferrer");
                      } catch {
                        toast.error("Não foi possível abrir o comprovante.");
                      }
                    }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg p-3 w-full text-left"
                  >
                    <Receipt className="h-4 w-4" />
                    Ver comprovante anexado
                    <ExternalLink className="h-3.5 w-3.5 ml-auto" />
                  </button>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-2">Nenhum comprovante anexado</p>
                )}
              </div>

              {/* Fotos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-gray-800 text-sm">Fotos Antes / Depois</span>
                </div>
                {/* Inputs ocultos para cada tipo */}
                <input ref={fileInputBeforeRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, "before")} />
                <input ref={fileInputAfterRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, "after")} />
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, "other")} />

                <div className="grid grid-cols-2 gap-3">
                  {/* Coluna ANTES */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Antes</span>
                      <button
                        onClick={() => fileInputBeforeRef.current?.click()}
                        disabled={uploadingPhoto && uploadingPhotoType === "before"}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                      >
                        {uploadingPhoto && uploadingPhotoType === "before" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Adicionar
                      </button>
                    </div>
                    {photos.filter((p: any) => p.photoType === "before").length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {photos.filter((p: any) => p.photoType === "before").map((photo: { id: number; photoUrl: string }) => (
                          <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-orange-50 border border-orange-200 cursor-pointer">
                            <img
                              src={photo.photoUrl}
                              alt="Antes"
                              className="w-full h-full object-cover"
                              onClick={() => setLightboxPhoto({ url: photo.photoUrl, type: 'before' })}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePhoto.mutate({ id: photo.id }); }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputBeforeRef.current?.click()}
                        className="w-full aspect-square rounded-lg border-2 border-dashed border-orange-200 bg-orange-50 flex flex-col items-center justify-center gap-1 hover:bg-orange-100 transition-colors"
                      >
                        <Camera className="h-5 w-5 text-orange-400" />
                        <span className="text-xs text-orange-400">Foto antes</span>
                      </button>
                    )}
                  </div>

                  {/* Coluna DEPOIS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Depois</span>
                      <button
                        onClick={() => fileInputAfterRef.current?.click()}
                        disabled={uploadingPhoto && uploadingPhotoType === "after"}
                        className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                      >
                        {uploadingPhoto && uploadingPhotoType === "after" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Adicionar
                      </button>
                    </div>
                    {photos.filter((p: any) => p.photoType === "after" || p.photoType === "other").length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {photos.filter((p: any) => p.photoType === "after" || p.photoType === "other").map((photo: { id: number; photoUrl: string }) => (
                          <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-green-50 border border-green-200 cursor-pointer">
                            <img
                              src={photo.photoUrl}
                              alt="Depois"
                              className="w-full h-full object-cover"
                              onClick={() => setLightboxPhoto({ url: photo.photoUrl, type: 'after' })}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePhoto.mutate({ id: photo.id }); }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputAfterRef.current?.click()}
                        className="w-full aspect-square rounded-lg border-2 border-dashed border-green-200 bg-green-50 flex flex-col items-center justify-center gap-1 hover:bg-green-100 transition-colors"
                      >
                        <Camera className="h-5 w-5 text-green-400" />
                        <span className="text-xs text-green-400">Foto depois</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações de status */}
              <div className="pt-2 border-t space-y-2">
                {order.status === "pending" && (
                  <div className="space-y-3">
                    {/* Seletor de reativação */}
                    <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        🔔 Lembrar de reativar este cliente em:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[30, 60, 90, 120, 180, 365].map(d => (
                          <button
                            key={d}
                            onClick={() => setReactivationDays(reactivationDays === d ? null : d)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                              reactivationDays === d
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                        <button
                          onClick={() => setReactivationDays(null)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                            reactivationDays === null
                              ? "bg-gray-200 text-gray-700 border-gray-300"
                              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          Não lembrar
                        </button>
                      </div>
                      {reactivationDays && (
                        <p className="text-xs text-blue-600">
                          ✓ O sistema vai te lembrar de contatar este cliente em {reactivationDays} dias
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => updateStatus.mutate({ id: orderId, status: "cancelled" })}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => setShowConcludeModal(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Concluir Serviço
                    </Button>
                  </div>
                  </div>
                )}

                {order.status === "done" && (
                  <div className="space-y-2">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-green-700">Serviço Concluído</p>
                    </div>
                    {order.clientPhone && (
                      <Button
                        variant="outline"
                        className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-sm"
                        onClick={async () => {
                          try {
                            const result = await createReviewLink.mutateAsync({
                              executionOrderId: orderId,
                              clientName: order.clientName,
                              clientPhone: order.clientPhone!,
                              serviceDescription: order.serviceDescription ?? undefined,
                            });
                            const appUrl = window.location.origin;
                            const reviewUrl = `${appUrl}/avaliar/${result.token}`;
                            const phone = order.clientPhone!.replace(/\D/g, "");
                            const firstName = order.clientName.split(" ")[0];
                            const msg = `Olá, ${firstName}! 😊 Gostaríamos de saber como foi sua experiência.\n\n⭐ Avalie nosso serviço: ${reviewUrl}\n\nObrigado pela confiança! 🙏`;
                            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                            toast.success("Link de avaliação gerado!");
                          } catch {
                            toast.error("Erro ao gerar link de avaliação");
                          }
                        }}
                        disabled={createReviewLink.isPending}
                      >
                        {createReviewLink.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                        Enviar Link de Avaliação
                      </Button>
                    )}
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      onClick={() => setShowReport(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Relatório Antes/Depois
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 text-sm"
                      onClick={() => updateStatus.mutate({ id: orderId, status: "pending" })}
                      disabled={updateStatus.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reabrir como Pendente
                    </Button>
                  </div>
                )}

                {order.status === "cancelled" && (
                  <Button
                    variant="outline"
                    className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 text-sm"
                    onClick={() => updateStatus.mutate({ id: orderId, status: "pending" })}
                    disabled={updateStatus.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reativar como Pendente
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Modal: Relatório Antes/Depois */}
    {showReport && (
      <ExecutionReport orderId={orderId} onClose={() => setShowReport(false)} />
    )}

    {/* Lightbox: Visualizar foto em tamanho grande */}
    {lightboxPhoto && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        onClick={() => setLightboxPhoto(null)}
      >
        <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
          <div className="absolute -top-10 left-0 right-0 flex items-center justify-between">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              lightboxPhoto.type === 'before'
                ? 'bg-orange-500 text-white'
                : 'bg-green-500 text-white'
            }`}>
              {lightboxPhoto.type === 'before' ? '⬅ Antes' : 'Depois ➡'}
            </span>
            <button
              onClick={() => setLightboxPhoto(null)}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.type === 'before' ? 'Antes' : 'Depois'}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
          />
          <p className="text-white/50 text-xs text-center mt-3">Clique fora para fechar</p>
        </div>
      </div>
    )}

    {/* Dialog: Excluir ou Reagendar */}
    {showDeleteDialog && order && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">O que deseja fazer?</h3>
              <p className="text-sm text-gray-500">{order.clientName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setShowDeleteDialog(false); setShowRescheduleDialog(true); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <RotateCcw className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">Reagendar</span>
            </button>
            <button
              onClick={() => { setShowDeleteDialog(false); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all"
              style={{ cursor: 'pointer' }}
              onClickCapture={(e) => { e.stopPropagation(); setShowDeleteDialog(false); }}
            >
              <Trash2 className="h-6 w-6 text-red-500" />
              <span className="text-sm font-medium text-red-700">Excluir</span>
            </button>
          </div>
          {/* Se escolher excluir, mostrar campo de motivo inline */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium">Motivo do cancelamento (opcional):</p>
            <input
              type="text"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Ex: Cliente desistiu, reagendou..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)} disabled={deleteOrder.isPending || saveCancelledRecord.isPending}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteWithHistory}
                disabled={deleteOrder.isPending || saveCancelledRecord.isPending}
              >
                {(deleteOrder.isPending || saveCancelledRecord.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Modal: Visualizar Orçamento Vinculado */}
    {showBudgetModal && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">
                Orçamento #{String(order?.budgetId ?? 0).padStart(4, '0')}
              </h3>
            </div>
            <button onClick={() => setShowBudgetModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {!linkedBudget ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                {/* Dados do cliente */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cliente</p>
                  <p className="font-semibold text-gray-900">{(linkedBudget as any).clientName}</p>
                  {(linkedBudget as any).clientPhone && (
                    <p className="text-sm text-gray-600">{(linkedBudget as any).clientPhone}</p>
                  )}
                  {(linkedBudget as any).clientAddress && (
                    <p className="text-sm text-gray-500">{(linkedBudget as any).clientAddress}</p>
                  )}
                </div>

                {/* Itens */}
                {(linkedBudget as any).items && (linkedBudget as any).items.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Itens do Orçamento</p>
                    <div className="space-y-2">
                      {(linkedBudget as any).items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 truncate">{item.description}</p>
                            )}
                            <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-700 shrink-0 ml-2">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totais */}
                <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
                  {parseDecimal((linkedBudget as any).discountValue) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-700">{formatCurrency((linkedBudget as any).subtotal)}</span>
                    </div>
                  )}
                  {parseDecimal((linkedBudget as any).discountValue) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Desconto</span>
                      <span className="text-red-600">- {formatCurrency((linkedBudget as any).discountValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span className="text-indigo-700">Total</span>
                    <span className="text-indigo-900 text-lg">{formatCurrency((linkedBudget as any).total)}</span>
                  </div>
                </div>

                {/* Observações */}
                {(linkedBudget as any).notes && (
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">Observações</p>
                    <p className="text-sm text-amber-800">{(linkedBudget as any).notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Modal: Confirmar Conclusão do Serviço */}
    {showConcludeModal && order && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Concluir Serviço</h3>
            </div>
            <button onClick={() => setShowConcludeModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
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
              <p className="text-xs text-gray-500 mt-1">{order.clientName}</p>
            </div>

            <p className="text-sm text-gray-600">
              Ao confirmar, o serviço será marcado como concluído e você poderá registrar a forma de pagamento na próxima tela.
            </p>

            {/* Botões */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConcludeModal(false)}
                disabled={concludeWithPayment.isPending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => {
                  concludeWithPayment.mutate({
                    saleId: linkedSale?.id ?? undefined,
                    budgetId: order?.budgetId ?? undefined,
                    executionOrderId: orderId,
                    paymentMethod: 'pix', // será atualizado no próximo modal
                    total: String(grandTotal),
                    clientName: order.clientName,
                    clientPhone: order.clientPhone ?? undefined,
                    clientId: order.clientId ?? undefined,
                    description: order.serviceDescription
                      ? `Serviço: ${order.serviceDescription}`
                      : `OS #${String(orderId).padStart(4, '0')} - ${order.clientName}`,
                  });
                }}
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
        </div>
      </div>
    )}

    {/* Modal: Registrar Pagamento (após conclusão) */}
    {postConcludePayModal && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-bold text-gray-900">Registrar Pagamento</h3>
                <p className="text-xs text-gray-500">{postConcludePayModal.clientName} · {formatCurrency(Number(postConcludePayModal.total))}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setPostConcludePayModal(null);
                onUpdated();
                onClose();
              }}
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
                {[
                  { value: 'pix', label: 'PIX', icon: '⚡' },
                  { value: 'cash', label: 'Dinheiro', icon: '💵' },
                  { value: 'card_1x', label: 'Cartão 1x', icon: '💳' },
                  { value: 'card_2x', label: 'Cartão 2x', icon: '💳' },
                  { value: 'card_3x', label: 'Cartão 3x', icon: '💳' },
                  { value: 'boleto', label: 'Boleto', icon: '📄' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPostConcludePayMethod(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      postConcludePayMethod === opt.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
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
                placeholder={Number(postConcludePayModal.total).toFixed(2)}
                value={postConcludePayAmount}
                onChange={e => setPostConcludePayAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <p className="text-xs text-gray-400 mt-1">Deixe em branco para usar o valor total: {formatCurrency(Number(postConcludePayModal.total))}</p>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPostConcludePayModal(null);
                  onUpdated();
                  onClose();
                }}
                disabled={registerPaymentAfterConclude.isPending}
              >
                Pular
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => {
                  registerPaymentAfterConclude.mutate({
                    id: postConcludePayModal.saleId,
                    paymentMethod: postConcludePayMethod as any,
                    amountReceived: postConcludePayAmount || postConcludePayModal.total,
                  });
                }}
                disabled={registerPaymentAfterConclude.isPending}
              >
                {registerPaymentAfterConclude.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirmar Pago
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Dialog: Reagendar */}
    {showRescheduleDialog && order && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <RotateCcw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Reagendar Serviço</h3>
              <p className="text-sm text-gray-500">{order.clientName}</p>
            </div>
          </div>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nova Data *</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Novo Horário (opcional)</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowRescheduleDialog(false)} disabled={rescheduleOrder.isPending}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleReschedule}
              disabled={rescheduleOrder.isPending}
            >
              {rescheduleOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Reagendar
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
