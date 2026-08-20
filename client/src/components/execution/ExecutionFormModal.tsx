import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Search, User, Plus, Trash2, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import GoogleCalendarPrompt from "./GoogleCalendarPrompt";
import { buildGoogleCalendarUrl, buildAddress } from "@/lib/googleCalendar";

interface ServiceItem {
  serviceName: string;
  serviceId?: number;
  quantity: number;
  unitPrice: string;
}

interface Props {
  defaultDate?: string;
  initialServiceItems?: Array<{ serviceName: string; serviceId?: number; quantity: number; unitPrice: string }>;
  /** Pré-preenche o formulário SEM entrar em modo de edição (fluxo de venda) */
  initialData?: {
    clientName?: string;
    clientPhone?: string;
    street?: string;
    addressNumber?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    saleId?: number;
    budgetId?: number;
  };
  editOrder?: {
    id: number;
    clientName: string;
    clientPhone?: string | null;
    street?: string | null;
    addressNumber?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    serviceDescription?: string | null;
    totalValue?: string | null;
    scheduledDate: string;
    scheduledTime?: string | null;
    assignedTo?: string | null;
    notes?: string | null;
  };
  onClose: () => void;
  onSaved: (result?: { scheduledDate: string; assignedTo: string; serviceItems: Array<{ serviceName: string; quantity: number; unitPrice: string }>; confirmToken?: string }) => void;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Etapas do formulário
type Step = "client" | "services" | "schedule" | "confirm";

export default function ExecutionFormModal({ defaultDate, editOrder, initialData, initialServiceItems, onClose, onSaved }: Props) {
  const linkedSaleId = initialData?.saleId;
  const linkedBudgetId = initialData?.budgetId;
  const isEdit = !!editOrder;
  const today = defaultDate ?? new Date().toISOString().split("T")[0];

  // Etapa atual (só para novo agendamento)
  // Se vier com cliente pré-preenchido via initialData, pula direto para serviços
  const hasPrefilledClient = !isEdit && !!initialData?.clientName;
  const [step, setStep] = useState<Step>(isEdit ? "services" : hasPrefilledClient ? "services" : "client");

  // Dados do cliente
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(undefined);
  const [clientMode, setClientMode] = useState<"search" | "new">("search"); // buscar ou cadastrar novo
  const [clientForm, setClientForm] = useState({
    name: editOrder?.clientName ?? initialData?.clientName ?? "",
    phone: editOrder?.clientPhone ?? initialData?.clientPhone ?? "",
    email: "",
    street: editOrder?.street ?? initialData?.street ?? "",
    addressNumber: editOrder?.addressNumber ?? initialData?.addressNumber ?? "",
    complement: editOrder?.complement ?? initialData?.complement ?? "",
    neighborhood: editOrder?.neighborhood ?? initialData?.neighborhood ?? "",
    city: editOrder?.city ?? initialData?.city ?? "",
    state: editOrder?.state ?? initialData?.state ?? "",
    notes: "",
  });

  // Dados do agendamento
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: editOrder?.scheduledDate ?? today,
    scheduledTime: editOrder?.scheduledTime ?? "",
    assignedTo: editOrder?.assignedTo ?? "",
    notes: editOrder?.notes ?? "",
  });
  const [assignedMemberId, setAssignedMemberId] = useState<number | undefined>(undefined);

  // Serviços
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(
    initialServiceItems && initialServiceItems.length > 0
      ? initialServiceItems
      : [{ serviceName: editOrder?.serviceDescription ?? "", quantity: 1, unitPrice: editOrder?.totalValue ?? "" }]
  );
  const [serviceSearches, setServiceSearches] = useState<string[]>(
    (initialServiceItems?.length ?? 0) > 0 ? initialServiceItems!.map(() => "") : [""]
  );
  const [showServiceDropdowns, setShowServiceDropdowns] = useState<boolean[]>(
    (initialServiceItems?.length ?? 0) > 0 ? initialServiceItems!.map(() => false) : [false]
  );

  // Queries
  const { data: clients = [] } = trpc.clients.list.useQuery(
    { search: clientSearch },
    { enabled: showClientSearch && clientSearch.length >= 2 }
  );
  const { data: activeMembers = [] } = trpc.teams.activeMembers.useQuery();
  const { data: companyUsers = [] } = trpc.companyUsers.list.useQuery();
  const tecnicos = (companyUsers as any[]).filter((u: any) => u.role === 'tecnico');
  const { data: services = [] } = trpc.services.list.useQuery(
    { search: serviceSearches.find(s => s.length >= 1) ?? "", activeOnly: true },
    { enabled: serviceSearches.some(s => s.length >= 1) }
  );

  // Mutations
  const createClientMutation = trpc.clients.create.useMutation();
  const createSaleMutation = trpc.sales.create.useMutation();
  const create = trpc.execution.create.useMutation();
  const update = trpc.execution.update.useMutation();
  const setServiceItemsMutation = trpc.execution.setServiceItems.useMutation();

  const isLoading = create.isPending || update.isPending || setServiceItemsMutation.isPending ||
    createClientMutation.isPending || createSaleMutation.isPending;

  // Somatório automático
  const totalSum = useMemo(() => {
    return serviceItems.reduce((sum, item) => {
      const price = parseFloat(item.unitPrice.replace(",", ".")) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [serviceItems]);

  const setClient = (field: string, value: string) => setClientForm(f => ({ ...f, [field]: value }));
  const setSchedule = (field: string, value: string) => setScheduleForm(f => ({ ...f, [field]: value }));

  const addServiceItem = () => {
    setServiceItems(prev => [...prev, { serviceName: "", quantity: 1, unitPrice: "" }]);
    setServiceSearches(prev => [...prev, ""]);
    setShowServiceDropdowns(prev => [...prev, false]);
  };

  const removeServiceItem = (idx: number) => {
    if (serviceItems.length === 1) return;
    setServiceItems(prev => prev.filter((_, i) => i !== idx));
    setServiceSearches(prev => prev.filter((_, i) => i !== idx));
    setShowServiceDropdowns(prev => prev.filter((_, i) => i !== idx));
  };

  const updateServiceItem = (idx: number, field: keyof ServiceItem, value: string | number) => {
    setServiceItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Selecionar cliente da busca
  const selectClient = (c: any) => {
    setClientForm(f => ({
      ...f,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      street: c.street ?? "",
      addressNumber: c.addressNumber ?? "",
      complement: c.complement ?? "",
      neighborhood: c.neighborhood ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
    }));
    setSelectedClientId(c.id);
    setClientSearch(c.name);
    setShowClientSearch(false);
    setClientMode("search");
  };

  // Avançar da etapa de cliente
  const handleClientNext = () => {
    if (!clientForm.name.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (!clientForm.phone.trim() && clientMode === "new") { toast.error("Telefone é obrigatório para cadastrar novo cliente"); return; }
    setStep("services");
  };

  // Avançar da etapa de serviços
  const handleServicesNext = () => {
    const valid = serviceItems.filter(i => i.serviceName.trim());
    if (valid.length === 0) { toast.error("Adicione pelo menos um serviço"); return; }
    setStep("schedule");
  };

  // Submit final
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (!scheduleForm.scheduledDate) { toast.error("Data é obrigatória"); return; }

    try {
      let finalClientId = selectedClientId;

      // 1. Cadastrar cliente novo se necessário
      if (clientMode === "new" && clientForm.phone.trim()) {
        const result = await createClientMutation.mutateAsync({
          name: clientForm.name.trim(),
          phone: clientForm.phone.trim(),
          email: clientForm.email || undefined,
          street: clientForm.street || undefined,
          addressNumber: clientForm.addressNumber || undefined,
          complement: clientForm.complement || undefined,
          neighborhood: clientForm.neighborhood || undefined,
          city: clientForm.city || undefined,
          state: clientForm.state || undefined,
          notes: clientForm.notes || undefined,
        });
        finalClientId = (result as any).id;
      }

      // 2. Criar venda (se não há venda já vinculada e há valor)
      let finalSaleId = linkedSaleId;
      const validItems = serviceItems.filter(i => i.serviceName.trim());
      if (!linkedSaleId && totalSum > 0 && !isEdit) {
        const sale = await createSaleMutation.mutateAsync({
          clientName: clientForm.name.trim(),
          clientPhone: clientForm.phone || undefined,
          clientId: finalClientId,
          total: String(totalSum),
          paymentMethod: 'pix',
          paymentStatus: 'pending',
          scheduledDate: scheduleForm.scheduledDate,
          serviceStatus: 'scheduled',
          description: validItems.map(i => `${i.quantity}x ${i.serviceName}`).join(", "),
          budgetId: linkedBudgetId,
        });
        finalSaleId = (sale as any).id;
      }

      // 3. Criar/atualizar ordem de execução
      const firstService = validItems[0]?.serviceName || "";
      const payload = {
        clientName: clientForm.name.trim(),
        clientPhone: clientForm.phone || undefined,
        clientId: finalClientId,
        street: clientForm.street || undefined,
        addressNumber: clientForm.addressNumber || undefined,
        complement: clientForm.complement || undefined,
        neighborhood: clientForm.neighborhood || undefined,
        city: clientForm.city || undefined,
        state: clientForm.state || undefined,
        serviceDescription: validItems.length === 1
          ? firstService
          : validItems.map(i => i.serviceName).join(", "),
        totalValue: totalSum > 0 ? String(totalSum) : undefined,
        saleId: finalSaleId,
        budgetId: linkedBudgetId,
        scheduledDate: scheduleForm.scheduledDate,
        scheduledTime: scheduleForm.scheduledTime || undefined,
        assignedTo: scheduleForm.assignedTo || undefined,
        assignedMemberId: assignedMemberId,
        notes: scheduleForm.notes || undefined,
      };

      if (isEdit && editOrder) {
        await update.mutateAsync({ id: editOrder.id, ...payload });
        if (validItems.length > 0) {
          await setServiceItemsMutation.mutateAsync({
            executionOrderId: editOrder.id,
            items: validItems.map(i => ({
              serviceName: i.serviceName.trim(),
              serviceId: i.serviceId,
              quantity: i.quantity,
              unitPrice: i.unitPrice || "0",
            })),
          });
        }
        toast.success("Agendamento atualizado!");
      } else {
        const data = await create.mutateAsync(payload);
        if (validItems.length > 0 && (data as any)?.id) {
          await setServiceItemsMutation.mutateAsync({
            executionOrderId: (data as any).id,
            items: validItems.map(i => ({
              serviceName: i.serviceName.trim(),
              serviceId: i.serviceId,
              quantity: i.quantity,
              unitPrice: i.unitPrice || "0",
            })),
          });
        }
        toast.success(clientMode === "new" ? "Cliente cadastrado e agendamento criado!" : "Agendamento criado!");

        // Montar URL do Google Agenda para o prompt de backup
        const address = buildAddress({
          street: clientForm.street,
          addressNumber: clientForm.addressNumber,
          complement: clientForm.complement,
          neighborhood: clientForm.neighborhood,
          city: clientForm.city,
          state: clientForm.state,
        });
        const serviceLabel = validItems.length > 0
          ? validItems.map(i => `${i.quantity > 1 ? i.quantity + "x " : ""}${i.serviceName.trim()}`).join(", ")
          : "";
        const calUrl = buildGoogleCalendarUrl({
          clientName: clientForm.name.trim(),
          clientPhone: clientForm.phone || undefined,
          scheduledDate: scheduleForm.scheduledDate,
          scheduledTime: scheduleForm.scheduledTime || undefined,
          serviceDescription: serviceLabel,
          address: address || undefined,
          assignedTo: scheduleForm.assignedTo || undefined,
          notes: scheduleForm.notes || undefined,
          totalValue: totalSum > 0 ? fmt(totalSum) : undefined,
        });
        setGcalUrl(calUrl);
        // Chama onSaved mas não fecha o modal ainda (o prompt vai fechar)
        onSaved({
          scheduledDate: scheduleForm.scheduledDate,
          assignedTo: scheduleForm.assignedTo || "",
          serviceItems: validItems.map(i => ({ serviceName: i.serviceName.trim(), quantity: i.quantity, unitPrice: i.unitPrice || "0" })),
        });
        return; // sai antes de chamar onSaved abaixo
      }

      onSaved({
        scheduledDate: scheduleForm.scheduledDate,
        assignedTo: scheduleForm.assignedTo || "",
        serviceItems: validItems.map(i => ({ serviceName: i.serviceName.trim(), quantity: i.quantity, unitPrice: i.unitPrice || "0" })),
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar agendamento");
    }
  };

  // Estado do prompt do Google Agenda (só para novos agendamentos)
  const [gcalUrl, setGcalUrl] = useState<string | null>(null);

  // Labels das etapas
  const steps: { id: Step; label: string }[] = [
    { id: "client", label: "Cliente" },
    { id: "services", label: "Serviços" },
    { id: "schedule", label: "Agendamento" },
  ];
  const stepIndex = steps.findIndex(s => s.id === step);

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Editar Agendamento" : "Novo Agendamento"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Indicador de etapas (apenas para novo) */}
        {!isEdit && (
          <div className="flex items-center px-5 pt-4 pb-2 gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  i < stepIndex ? "bg-green-500 text-white" :
                  i === stepIndex ? "bg-blue-600 text-white" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === stepIndex ? "text-blue-600" : "text-gray-400"}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-green-400" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ===== ETAPA 1: CLIENTE ===== */}
          {(step === "client" || isEdit) && (
            <div className="space-y-4">
              {!isEdit && (
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setClientMode("search")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                      clientMode === "search" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                    }`}
                  >
                    <Search className="h-4 w-4" /> Buscar cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => { setClientMode("new"); setSelectedClientId(undefined); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                      clientMode === "new" ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" /> Novo cliente
                  </button>
                </div>
              )}

              {/* Busca de cliente existente */}
              {clientMode === "search" && !isEdit && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Buscar cliente *</Label>
                  <div className="relative">
                    <Input
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true); setSelectedClientId(undefined); setClientForm(f => ({ ...f, name: e.target.value })); }}
                      placeholder="Digite nome ou telefone..."
                      className="pr-9"
                      autoFocus
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {showClientSearch && clientSearch.length >= 2 && clients.length > 0 && (
                    <div className="border rounded-xl mt-1 shadow-lg bg-white max-h-48 overflow-y-auto z-20 relative">
                      {clients.slice(0, 8).map((c: any) => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0"
                          onClick={() => selectClient(c)}
                        >
                          <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.phone} {c.city ? `• ${c.city}` : ""}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {showClientSearch && clientSearch.length >= 2 && clients.length === 0 && (
                    <div className="border rounded-xl mt-1 p-3 bg-yellow-50 text-center">
                      <p className="text-sm text-yellow-700">Nenhum cliente encontrado.</p>
                      <button type="button" onClick={() => { setClientMode("new"); setClientForm(f => ({ ...f, name: clientSearch })); }}
                        className="text-sm text-blue-600 font-medium mt-1 underline">
                        Cadastrar como novo cliente
                      </button>
                    </div>
                  )}

                  {/* Dados do cliente selecionado */}
                  {selectedClientId && clientForm.name && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">{clientForm.name}</span>
                      </div>
                      {clientForm.phone && <p className="text-xs text-blue-600">{clientForm.phone}</p>}
                      {clientForm.city && <p className="text-xs text-blue-600">{clientForm.street ? `${clientForm.street}, ${clientForm.addressNumber} — ` : ""}{clientForm.city}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Formulário de novo cliente ou edição */}
              {(clientMode === "new" || isEdit) && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</Label>
                      <Input value={clientForm.name} onChange={e => setClient("name", e.target.value)} placeholder="Nome completo" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">Telefone {clientMode === "new" ? "*" : ""}</Label>
                      <Input value={clientForm.phone} onChange={e => setClient("phone", e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                    {clientMode === "new" && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</Label>
                        <Input value={clientForm.email} onChange={e => setClient("email", e.target.value)} placeholder="email@exemplo.com" type="email" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 block">Endereço</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input value={clientForm.street} onChange={e => setClient("street", e.target.value)} placeholder="Rua / Av." />
                      </div>
                      <Input value={clientForm.addressNumber} onChange={e => setClient("addressNumber", e.target.value)} placeholder="Nº" />
                    </div>
                    <Input value={clientForm.complement} onChange={e => setClient("complement", e.target.value)} placeholder="Complemento (apto, bloco, casa...)" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={clientForm.neighborhood} onChange={e => setClient("neighborhood", e.target.value)} placeholder="Bairro" />
                      <Input value={clientForm.city} onChange={e => setClient("city", e.target.value)} placeholder="Cidade" />
                    </div>
                  </div>

                  {clientMode === "new" && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">Observações do cliente</Label>
                      <Textarea value={clientForm.notes} onChange={e => setClient("notes", e.target.value)} placeholder="Informações adicionais sobre o cliente..." rows={2} className="resize-none" />
                    </div>
                  )}
                </div>
              )}

              {!isEdit && (
                <Button type="button" onClick={handleClientNext} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
                  Próximo: Serviços →
                </Button>
              )}
            </div>
          )}

          {/* ===== ETAPA 2: SERVIÇOS ===== */}
          {(step === "services" || isEdit) && (
            <div className="space-y-3">
              {/* Card do cliente pré-preenchido (vindo do fluxo de venda) */}
              {hasPrefilledClient && clientForm.name && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 truncate">{clientForm.name}</p>
                    {clientForm.phone && <p className="text-xs text-blue-600">{clientForm.phone}</p>}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">Serviços *</Label>
                <button type="button" onClick={addServiceItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="h-3.5 w-3.5" /> Adicionar serviço
                </button>
              </div>

              <div className="space-y-2">
                {serviceItems.map((item, idx) => (
                  <div key={idx} className="border rounded-xl p-3 bg-gray-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 shrink-0">#{idx + 1}</span>
                      <div className="flex-1 relative">
                        <Input
                          value={serviceSearches[idx] || item.serviceName}
                          onChange={e => {
                            const val = e.target.value;
                            setServiceSearches(prev => prev.map((s, i) => i === idx ? val : s));
                            updateServiceItem(idx, "serviceName", val);
                            setShowServiceDropdowns(prev => prev.map((v, i) => i === idx ? true : v));
                          }}
                          placeholder="Nome do serviço..."
                          className="text-sm"
                        />
                        {showServiceDropdowns[idx] && (serviceSearches[idx]?.length ?? 0) >= 1 && services.length > 0 && (
                          <div className="absolute z-50 w-full bg-white border rounded-xl shadow-lg top-full mt-1 max-h-48 overflow-y-auto">
                            {services.slice(0, 8).map((s: any) => (
                              <button key={s.id} type="button"
                                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                                onMouseDown={() => {
                                  updateServiceItem(idx, "serviceName", s.name);
                                  updateServiceItem(idx, "serviceId", s.id);
                                  if (s.price && parseFloat(s.price) > 0) {
                                    updateServiceItem(idx, "unitPrice", String(parseFloat(s.price)));
                                  }
                                  setServiceSearches(prev => prev.map((v, i) => i === idx ? "" : v));
                                  setShowServiceDropdowns(prev => prev.map((v, i) => i === idx ? false : v));
                                }}
                                onTouchEnd={() => {
                                  updateServiceItem(idx, "serviceName", s.name);
                                  updateServiceItem(idx, "serviceId", s.id);
                                  if (s.price && parseFloat(s.price) > 0) {
                                    updateServiceItem(idx, "unitPrice", String(parseFloat(s.price)));
                                  }
                                  setServiceSearches(prev => prev.map((v, i) => i === idx ? "" : v));
                                  setShowServiceDropdowns(prev => prev.map((v, i) => i === idx ? false : v));
                                }}
                              >
                                <span className="font-medium text-gray-800">{s.name}</span>
                                {s.price && <span className="text-gray-400 ml-2 text-xs">{fmt(parseFloat(s.price))}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {serviceItems.length > 1 && (
                        <button type="button" onClick={() => removeServiceItem(idx)} className="p-1 text-red-400 hover:text-red-600 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Qtd</Label>
                        <Input type="number" min="1" value={item.quantity}
                          onChange={e => updateServiceItem(idx, "quantity", parseInt(e.target.value) || 1)} className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Valor (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={item.unitPrice}
                          onChange={e => updateServiceItem(idx, "unitPrice", e.target.value)} placeholder="0,00" className="text-sm" />
                      </div>
                    </div>
                    {item.unitPrice && parseFloat(item.unitPrice) > 0 && (
                      <p className="text-xs text-right text-gray-500">
                        Subtotal: <span className="font-semibold text-gray-700">{fmt(parseFloat(item.unitPrice) * item.quantity)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {totalSum > 0 && (
                <div className="flex justify-end">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-right">
                    <p className="text-xs text-blue-600 font-medium">Total dos Serviços</p>
                    <p className="text-lg font-bold text-blue-700">{fmt(totalSum)}</p>
                  </div>
                </div>
              )}

              {!isEdit && (
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setStep("client")} className="flex-1">← Voltar</Button>
                  <Button type="button" onClick={handleServicesNext} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Próximo: Agendar →</Button>
                </div>
              )}
            </div>
          )}

          {/* ===== ETAPA 3: AGENDAMENTO ===== */}
          {(step === "schedule" || isEdit) && (
            <div className="space-y-4">
              {/* Data e Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Data *</Label>
                  <Input
                    type="date"
                    value={scheduleForm.scheduledDate}
                    onChange={e => setSchedule("scheduledDate", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Horário</Label>
                  <Input
                    type="time"
                    value={scheduleForm.scheduledTime}
                    onChange={e => setSchedule("scheduledTime", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Técnico Responsável */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1 block">
                  <User className="h-3.5 w-3.5" /> Técnico Responsável
                </Label>
                {tecnicos.length > 0 ? (
                  <select value={scheduleForm.assignedTo} onChange={e => setSchedule('assignedTo', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Sem técnico definido</option>
                    {tecnicos.map((u: any) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                ) : activeMembers.length > 0 ? (
                  <select value={assignedMemberId ?? ''} onChange={e => {
                    const val = e.target.value;
                    if (!val) { setAssignedMemberId(undefined); setSchedule('assignedTo', ''); }
                    else {
                      const member = activeMembers.find((m: any) => m.id === Number(val));
                      setAssignedMemberId(Number(val));
                      setSchedule('assignedTo', member?.name ?? '');
                    }
                  }} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Sem responsável definido</option>
                    {activeMembers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                    ))}
                  </select>
                ) : (
                  <Input value={scheduleForm.assignedTo} onChange={e => setSchedule('assignedTo', e.target.value)} placeholder="Nome do técnico" />
                )}
              </div>

              {/* Observações */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Informações Adicionais</Label>
                <Textarea value={scheduleForm.notes} onChange={e => setSchedule("notes", e.target.value)}
                  placeholder="Observações sobre o serviço, acesso ao local, etc." rows={3} className="resize-none" />
              </div>

              {/* Resumo antes de confirmar (apenas novo) */}
              {!isEdit && (
                <div className="bg-gray-50 rounded-xl p-3 border text-sm space-y-1">
                  <p className="font-semibold text-gray-700 mb-2">Resumo do agendamento:</p>
                  <p className="text-gray-600">👤 <span className="font-medium">{clientForm.name}</span>{clientForm.phone ? ` — ${clientForm.phone}` : ""}</p>
                  {clientForm.city && <p className="text-gray-500 text-xs">{clientForm.street ? `${clientForm.street}, ${clientForm.addressNumber}` : ""} {clientForm.complement ? `— ${clientForm.complement}` : ""} {clientForm.city}</p>}
                  <p className="text-gray-600">🛋️ {serviceItems.filter(i => i.serviceName.trim()).map(i => `${i.quantity}x ${i.serviceName}`).join(", ")}</p>
                  {totalSum > 0 && <p className="text-green-700 font-semibold">💰 {fmt(totalSum)}</p>}
                  <p className="text-gray-600">📅 {new Date(scheduleForm.scheduledDate + "T12:00:00").toLocaleDateString("pt-BR")}{scheduleForm.scheduledTime ? ` às ${scheduleForm.scheduledTime}` : ""}</p>
                  {scheduleForm.assignedTo && <p className="text-gray-600">👷 {scheduleForm.assignedTo}</p>}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                {!isEdit && (
                  <Button type="button" variant="outline" onClick={() => setStep("services")} className="flex-1" disabled={isLoading}>
                    ← Voltar
                  </Button>
                )}
                {isEdit && (
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isEdit ? "Salvar" : "✅ Confirmar Agendamento"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>

    {/* Prompt de backup no Google Agenda (aparece após criar novo agendamento) */}
    {gcalUrl && (
      <GoogleCalendarPrompt
        calendarUrl={gcalUrl}
        onClose={() => {
          setGcalUrl(null);
          onClose();
        }}
      />
    )}
    </>
  );
}
