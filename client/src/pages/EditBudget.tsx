import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Search, ShoppingCart, X, Calendar, Clock, User, Users, MapPin, MessageCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useParams } from "wouter";
import AddressSearch from "@/components/AddressSearch";
import CalculadoraDeslocamento, { type DeslocamentoResult } from "@/components/CalculadoraDeslocamento";

type BudgetItem = {
  serviceId?: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function parseCurrency(value: string) {
  return parseFloat(String(value).replace(",", ".")) || 0;
}

export default function EditBudget() {
  const params = useParams<{ id: string }>();
  const budgetId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [videos, setVideos] = useState("");
  const [validDays, setValidDays] = useState(7);
  const [paymentConditions, setPaymentConditions] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoryChipsRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [sold, setSold] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [salePaymentMethod, setSalePaymentMethod] = useState<'pix'|'card'|'cash'|'boleto'>('pix');
  const [saleInstallments, setSaleInstallments] = useState(1);
  const [saleAmountReceived, setSaleAmountReceived] = useState('');
  const [salePaymentStatus, setSalePaymentStatus] = useState<'pending'|'partial'|'paid'>('paid');
  const [saleNotes, setSaleNotes] = useState('');
  const [salePaymentDueDays, setSalePaymentDueDays] = useState<number | undefined>(undefined); // prazo em dias para pagamento programado
  // Modal de agendamento de execução
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [execDate, setExecDate] = useState('');
  const [execTime, setExecTime] = useState('');
  const [execMemberId, setExecMemberId] = useState<number | undefined>(undefined);
  const [execAssignedTo, setExecAssignedTo] = useState('');
  const [execTeamId, setExecTeamId] = useState<number | undefined>(undefined);
  const [execAddress, setExecAddress] = useState({ cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  // IA
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiSuggestion, setAISuggestion] = useState<{ services: {name: string; price: number; reason: string}[]; notes: string; discount: number; discountReason: string } | null>(null);

  const { data: budget } = trpc.budgets.getById.useQuery({ id: budgetId }, { enabled: !!budgetId });
  const { data: services = [] } = trpc.services.list.useQuery({ search: serviceSearch || selectedCategory || undefined, activeOnly: true });
  const { data: serviceCategories = [] } = trpc.serviceCategories.list.useQuery();
  const { data: activeMembers = [] } = trpc.teams.activeMembers.useQuery();
  const { data: teamsData = [] } = trpc.teams.list.useQuery();
  const { data: settingsData } = trpc.settings.get.useQuery();
  const [deslocamento, setDeslocamento] = useState<DeslocamentoResult | null>(null);
  // Páginas de informações para download
  type InfoPageOption = { id: string; name: string; text: string; };
  const rawInfoPages = (settingsData as any)?.info_pages as string | undefined;
  const infoPageOptions: InfoPageOption[] = (() => {
    if (!rawInfoPages) return [];
    try { const p = JSON.parse(rawInfoPages); return Array.isArray(p) ? p : []; } catch { return []; }
  })();
  const infoPagesEnabled = infoPageOptions.length > 0;
  const [selectedInfoPageId, setSelectedInfoPageId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // Membros filtrados pela equipe selecionada no modal de execução
  const filteredExecMembers = execTeamId
    ? activeMembers.filter((m: any) => m.teamId === execTeamId)
    : activeMembers;

  useEffect(() => {
    if (budget && !loaded) {
      setClientName(budget.clientName || "");
      setClientPhone(budget.clientPhone || "");
      setItems(budget.items.map((item) => ({
        serviceId: item.serviceId || undefined,
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        subtotal: String(item.subtotal),
      })));
      setDiscountType((budget.discountType as "fixed" | "percent") || "fixed");
      setDiscountValue(String(budget.discountValue || "0"));
      setNotes(budget.notes || "");
      setVideos(budget.videos || "");
      setValidDays(budget.validDays || 7);
      setPaymentConditions(budget.paymentConditions || "");
      setSold(budget.sold || false);
      // Pré-selecionar a página de informações salva no orçamento
      const savedInfoPageId = (budget as any).selectedInfoPageId as string | null | undefined;
      if (savedInfoPageId !== undefined) {
        setSelectedInfoPageId(savedInfoPageId ?? null);
      }
      setLoaded(true);
    }
  }, [budget, loaded]);

  const toggleSoldMutation = trpc.budgetSold.toggle.useMutation({
    onSuccess: () => utils.budgets.list.invalidate(),
    onError: () => toast.error("Erro ao atualizar status de venda"),
  });

  const createExecutionMutation = trpc.execution.create.useMutation({
    onSuccess: () => {
      toast.success("OS de execução criada! Acesse a aba Execução.");
      setShowExecutionModal(false);
      utils.execution.list.invalidate();
    },
    onError: () => toast.error("Erro ao criar OS de execução"),
  });

  const aiSuggestMutation = trpc.ai.suggestBudget.useMutation({
    onSuccess: (data) => {
      setAISuggestion(data);
      toast.success('Sugestões da IA prontas!');
    },
    onError: () => toast.error('Erro ao gerar sugestões. Tente novamente.'),
  });

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venda registrada! Agora agende a execução.");
      setShowSaleModal(false);
      // Abrir modal de agendamento de execução automaticamente
      setShowExecutionModal(true);
    },
    onError: () => toast.error("Erro ao registrar venda"),
  });

  const deleteSaleByBudgetMutation = trpc.sales.deleteByBudgetId.useMutation({
    onSuccess: () => toast.info("Venda vinculada removida."),
    onError: () => {},
  });

  const updateMutation = trpc.budgets.update.useMutation({
    onSuccess: () => {
      utils.budgets.list.invalidate();
      toast.success("Orçamento atualizado!");
      setLocation(`/orcamentos/${budgetId}/visualizar`);
    },
    onError: () => toast.error("Erro ao atualizar orçamento"),
  });

  const subtotal = items.reduce((sum, item) => sum + parseCurrency(item.subtotal), 0);
  const discountAmount = discountType === "percent"
    ? subtotal * (parseCurrency(discountValue) / 100)
    : parseCurrency(discountValue);
  const custoDeslocamento = deslocamento?.custoTotal ?? 0;
  const total = Math.max(0, subtotal - discountAmount + custoDeslocamento);

  const addItem = (service?: any) => {
    setItems((prev) => [...prev, {
      serviceId: service?.id,
      name: service?.name || "",
      description: service?.description || "",
      quantity: 1,
      unitPrice: service ? String(service.price) : "0",
      subtotal: service ? String(service.price) : "0",
    }]);
    setShowServiceDropdown(false);
    setServiceSearch("");
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(value) : updated[index].quantity;
        const price = field === "unitPrice" ? parseCurrency(String(value)) : parseCurrency(updated[index].unitPrice);
        updated[index].subtotal = String((qty * price).toFixed(2));
      }
      return updated;
    });
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!clientName.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (items.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    updateMutation.mutate({
      id: budgetId,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      subtotal: subtotal.toFixed(2),
      discountType,
      discountValue: discountAmount.toFixed(2),
      total: total.toFixed(2),
      notes,
      videos,
      validDays,
      paymentConditions,
      selectedInfoPageId: selectedInfoPageId === "__none__" ? null : (selectedInfoPageId ?? undefined),
      items: items.map((item) => ({
        serviceId: item.serviceId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    });
  };

  if (!budget) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/orcamentos")} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Editar Orçamento</h1>
            <p className="text-muted-foreground text-sm">Cliente: {budget.clientName}</p>
          </div>
        </div>

        {/* Client Info (editável) */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.38 0.18 264)" }}>1</span>
            Cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome do Cliente *</label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo do cliente"
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contato (WhatsApp)</label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(14) 99999-9999"
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Itens do Orçamento</h2>
              <p className="text-xs text-muted-foreground mt-1">Revise a descrição, quantidade e valores antes de salvar.</p>
            </div>
            {items.length > 0 && <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{items.length} {items.length === 1 ? "item" : "itens"}</span>}
          </div>
          {items.length > 0 && (
            <div className="mb-4">
              {/* Mobile: um cartão por item, sem truncar a descrição */}
              <div className="sm:hidden space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Descrição do serviço</label>
                        <textarea
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          rows={2}
                          placeholder="Ex.: Higienização de sofá 3 lugares"
                          className="min-h-[72px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <button type="button" aria-label={`Remover item ${index + 1}`} onClick={() => removeItem(index)} className="mt-1 shrink-0 rounded-lg p-2 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Quantidade</label>
                        <Input type="number" min="1" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateItem(index, "quantity", 1); }} className="h-11 text-base text-center" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Valor unitário (R$)</label>
                        <Input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} className="h-11 text-base text-right" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/70 pt-2">
                      <span className="text-xs font-medium text-muted-foreground">Subtotal do item</span>
                      <span className="text-base font-bold" style={{ color: "oklch(0.32 0.14 240)" }}>{formatCurrency(parseCurrency(item.subtotal))}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: tabela com coluna de descrição flexível */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-full text-left pb-2 text-muted-foreground font-medium">Descrição do serviço</th>
                      <th className="text-center pb-2 text-muted-foreground font-medium w-20">Qtd</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium w-32">Valor Unit.</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium w-32">Subtotal</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2 pr-3">
                          <Input value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} className="h-10 w-full text-sm" placeholder="Nome do serviço" />
                        </td>
                        <td className="py-2 px-2">
                          <Input type="number" min="1" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateItem(index, "quantity", 1); }} className="h-10 text-sm text-center" />
                        </td>
                        <td className="py-2 px-2">
                          <Input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} className="h-10 text-sm text-right" />
                        </td>
                        <td className="py-2 pl-2 text-right font-semibold" style={{ color: "oklch(0.32 0.14 240)" }}>
                          {formatCurrency(parseCurrency(item.subtotal))}
                        </td>
                        <td className="py-2 pl-2">
                          <button type="button" aria-label={`Remover item ${index + 1}`} onClick={() => removeItem(index)} className="rounded-lg p-2 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Category Chips */}
          {serviceCategories.length > 0 && (
            <div ref={categoryChipsRef} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              <button
                type="button"
                onClick={() => { setSelectedCategory(null); setServiceSearch(""); setShowServiceDropdown(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 border ${
                  selectedCategory === null
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                <span>Todos</span>
              </button>
              {serviceCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    const newCat = selectedCategory === cat.name ? null : cat.name;
                    setSelectedCategory(newCat);
                    setServiceSearch("");
                    setShowServiceDropdown(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 border ${
                    selectedCategory === cat.name
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {cat.emoji && <span className="text-base leading-none">{cat.emoji}</span>}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={selectedCategory ? `Buscar em ${selectedCategory}...` : "Buscar por nome ou código (#001)..."}
                value={serviceSearch}
                onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                onFocus={() => setShowServiceDropdown(true)}
                className="pl-9"
              />
              {showServiceDropdown && services.length > 0 && (
                <>
                  {/* Mobile: modal full-screen */}
                  <div className="fixed inset-0 z-50 flex flex-col bg-background sm:hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white">
                      <button
                        onClick={() => setShowServiceDropdown(false)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <X className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          autoFocus
                          placeholder="Buscar por nome ou código (#001)..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => { addItem(service); setShowServiceDropdown(false); }}
                          className="w-full text-left px-4 py-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0 block"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {service.serviceCode != null && (
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0 mt-0.5">
                                  #{String(service.serviceCode).padStart(3, '0')}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-foreground text-base break-words">{service.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{service.category}</p>
                              </div>
                            </div>
                            <span className="font-bold text-base shrink-0" style={{ color: "oklch(0.32 0.14 240)" }}>
                              {formatCurrency(parseFloat(String(service.price)))}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Desktop: dropdown normal */}
                  <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto hidden sm:block">
                    {services.map((service) => (
                      <button key={service.id} onClick={() => addItem(service)} className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {service.serviceCode != null && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">
                                #{String(service.serviceCode).padStart(3, '0')}
                              </span>
                            )}
                            <p className="font-medium text-foreground text-sm">{service.name}</p>
                          </div>
                          <span className="font-semibold text-sm shrink-0" style={{ color: "oklch(0.32 0.14 240)" }}>
                            {formatCurrency(parseFloat(String(service.price)))}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => addItem()} className="gap-1 shrink-0">
              <Plus className="h-4 w-4" /> Manual
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="gap-1 shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="h-4 w-4" />
              IA
              {showAIPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          {/* Painel de Sugestões de IA */}
          {showAIPanel && (
            <div className="mt-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-purple-800">Assistente de Orçamento com IA</p>
              </div>
              <p className="text-xs text-purple-600">Descreva o que o cliente precisa e a IA vai sugerir serviços, valores e uma observação personalizada.</p>
              <Input
                placeholder="Ex: sofá 3 lugares muito sujo, cadeira de escritório, cliente VIP..."
                value={aiContext}
                onChange={e => setAIContext(e.target.value)}
                className="bg-white border-purple-200 focus:ring-purple-400"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!clientName.trim()) { toast.error('Preencha o nome do cliente primeiro'); return; }
                  aiSuggestMutation.mutate({ clientName, clientPhone: clientPhone || undefined, context: aiContext || undefined });
                }}
                disabled={aiSuggestMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {aiSuggestMutation.isPending ? 'Gerando sugestões...' : 'Gerar Sugestões'}
              </Button>

              {aiSuggestion && (
                <div className="space-y-3 pt-2 border-t border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Serviços Sugeridos</p>
                  {aiSuggestion.services.map((svc, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white border border-purple-100">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{svc.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-purple-700">{formatCurrency(svc.price)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={() => {
                            setItems(prev => [...prev, { name: svc.name, description: '', quantity: 1, unitPrice: String(svc.price), subtotal: String(svc.price) }]);
                            toast.success(`"${svc.name}" adicionado ao orçamento`);
                          }}
                        >
                          <Plus className="h-3 w-3" /> Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {aiSuggestion.discount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div>
                        <p className="text-xs font-semibold text-amber-700">Desconto Sugerido: {aiSuggestion.discount}%</p>
                        <p className="text-xs text-amber-600">{aiSuggestion.discountReason}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => { setDiscountType('percent'); setDiscountValue(String(aiSuggestion.discount)); toast.success('Desconto aplicado!'); }}
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Observação Sugerida</p>
                    <p className="text-xs text-blue-600">{aiSuggestion.notes}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => { setNotes(aiSuggestion.notes); toast.success('Observação aplicada!'); }}
                    >
                      Usar esta observação
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deslocamento - sempre disponível como opção */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.55 0.18 30)" }}>D</span>
            Deslocamento
            <span className="ml-auto text-xs font-normal text-muted-foreground">Opcional — calcule o custo de ida ao cliente</span>
          </h2>
          <CalculadoraDeslocamento
            onResult={setDeslocamento}
            initialResult={deslocamento}
          />
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Valores e Desconto</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground shrink-0">Desconto</span>
              <div className="flex gap-2 flex-1">
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "fixed" | "percent")} className="h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="fixed">R$ fixo</option>
                  <option value="percent">% percentual</option>
                </select>
                <Input type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="flex-1" />
              </div>
              <span className="text-red-500 font-medium shrink-0">- {formatCurrency(discountAmount)}</span>
            </div>
            {custoDeslocamento > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Deslocamento</span>
                <span className="font-semibold text-orange-600">+ {formatCurrency(custoDeslocamento)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 px-4 rounded-xl" style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
              <span className="text-white font-semibold text-lg">TOTAL</span>
              <span className="text-white font-bold text-2xl">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Informações Adicionais</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Validade (dias)</label>
                <Input type="number" min="1" value={validDays === 0 ? "" : validDays} onChange={(e) => setValidDays(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)} onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) setValidDays(1); }} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Condições de Pagamento</label>
                <Input value={paymentConditions} onChange={(e) => setPaymentConditions(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            {/* Seletor de Página de Informações para Download */}
            {infoPagesEnabled && infoPageOptions.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">📄 Página de Informações no Download</label>
                <div className="flex flex-wrap gap-2">
                  {infoPageOptions.map((page) => {
                    const isActive = selectedInfoPageId === page.id || (!selectedInfoPageId && page.id === infoPageOptions[0]?.id);
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setSelectedInfoPageId(page.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          isActive ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {page.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedInfoPageId("__none__")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      selectedInfoPageId === "__none__" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    Sem página
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Esta página será incluída ao baixar o PDF ou JPEG.</p>
              </div>
            )}
          </div>
        </div>

        {/* Checkbox Vendido */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => {
              const newSold = !sold;
              setSold(newSold);
              toggleSoldMutation.mutate({ id: budgetId, sold: newSold });
              if (newSold) {
                // Abre modal de registro de venda ao marcar como vendido
                setSaleAmountReceived(String(total.toFixed(2)));
                setShowSaleModal(true);
                // Pré-preencher data de execução com amanhã
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setExecDate(tomorrow.toISOString().split('T')[0]);
                setExecTime('08:00');
              } else {
                // Remove venda vinculada ao desmarcar como vendido
                deleteSaleByBudgetMutation.mutate({ budgetId });
              }
            }}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
              sold
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground/40 hover:border-green-400"
            }`}
          >
            {sold && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div>
            <p className={`font-semibold text-sm ${sold ? "text-green-500" : "text-muted-foreground"}`}>
              {sold ? "Orçamento Vendido!" : "Marcar como Vendido"}
            </p>
            <p className="text-xs text-muted-foreground">
              {sold ? "Clique para desmarcar" : "Clique para confirmar a venda"}
            </p>
          </div>
          {sold && (
            <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-500">
              VENDIDO
            </span>
          )}
        </div>

        {/* Modal de Registro de Venda */}
        {showSaleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  <h2 className="text-lg font-bold text-foreground">Registrar Venda</h2>
                </div>
                <button onClick={() => setShowSaleModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">Orçamento marcado como vendido. Registre os detalhes do pagamento.</p>
                {/* Método de pagamento — usa configurações da empresa */}
                {(() => {
                  type PaymentCfg = { id: string; label: string; enabled: boolean; discountPercent: number; maxInstallments?: number; addFee?: boolean; installmentRates?: number[] };
                  const DEFAULT_PM: PaymentCfg[] = [
                    { id: 'pix', label: 'PIX / Débito', enabled: true, discountPercent: 5 },
                    { id: 'cash', label: 'Espécie', enabled: true, discountPercent: 10 },
                    { id: 'credit_cash', label: 'Crédito à Vista', enabled: true, discountPercent: 0 },
                    { id: 'installments', label: 'Cartão Parcelado', enabled: true, discountPercent: 0, maxInstallments: 8 },
                  ];
                  const pmCfgRaw = (settingsData as any)?.payment_methods_config;
                  const pmCfg: PaymentCfg[] = (() => {
                    if (!pmCfgRaw) return DEFAULT_PM;
                    try { const p = JSON.parse(pmCfgRaw); return Array.isArray(p) ? p : DEFAULT_PM; } catch { return DEFAULT_PM; }
                  })();
                  const enabledPM = pmCfg.filter(m => m.enabled);
                  const isInstallments = enabledPM.find(m => m.id === salePaymentMethod)?.id === 'installments' || salePaymentMethod === 'card';
                  const selectedPMCfg = enabledPM.find(m => m.id === salePaymentMethod);
                  const maxInst = selectedPMCfg?.maxInstallments ?? 12;
                  const installmentRates = selectedPMCfg?.installmentRates ?? [];
                  return (
                    <>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 gap-2">
                          {enabledPM.map((pm) => (
                            <button key={pm.id} type="button"
                              onClick={() => setSalePaymentMethod(pm.id as any)}
                              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                salePaymentMethod === pm.id
                                  ? 'border-green-500 bg-green-500/10 text-green-600'
                                  : 'border-border hover:border-muted-foreground/50'
                              }`}>
                              {pm.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Parcelas (parcelado) */}
                      {(isInstallments || (selectedPMCfg?.maxInstallments && selectedPMCfg.maxInstallments > 1)) && (
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">Número de Parcelas</label>
                          <select value={saleInstallments} onChange={e => setSaleInstallments(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                            {Array.from({ length: maxInst }, (_, i) => i + 1).map(n => {
                              const rate = installmentRates[n - 1] ?? 0;
                              const totalWithFee = total * (1 + rate / 100);
                              return (
                                <option key={n} value={n}>
                                  {n}x de R$ {(totalWithFee / n).toFixed(2).replace('.', ',')} {rate > 0 ? `(+${rate}% juros)` : '(sem juros)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* Valor recebido */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Valor Recebido (R$)</label>
                  <Input value={saleAmountReceived} onChange={e => setSaleAmountReceived(e.target.value)}
                    placeholder={String(total.toFixed(2))} type="number" step="0.01" min="0" />
                </div>
                {/* Status do pagamento */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Status do Pagamento</label>
                  <div className="flex gap-2">
                    {([['paid','Pago','green'],['partial','Parcial','yellow'],['pending','Pendente','gray']] as const).map(([val, label, color]) => (
                      <button key={val} type="button"
                        onClick={() => setSalePaymentStatus(val)}
                        className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                          salePaymentStatus === val
                            ? `border-${color}-500 bg-${color}-500/10 text-${color}-600`
                            : 'border-border hover:border-muted-foreground/50'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Pagamento Programado */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <label className="text-sm font-semibold text-amber-800">Pagamento Programado (opcional)</label>
                  </div>
                  <p className="text-xs text-amber-700">Se o cliente vai pagar depois (ex: 40 dias), informe o prazo. A venda aparecerá no mês do vencimento.</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="Ex: 40"
                      value={salePaymentDueDays ?? ''}
                      onChange={e => setSalePaymentDueDays(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-24 bg-white"
                    />
                    <span className="text-sm text-amber-700">dias</span>
                    {salePaymentDueDays && salePaymentDueDays > 0 && (
                      <span className="text-xs text-amber-600 font-medium">
                        Vence em: {new Date(Date.now() + salePaymentDueDays * 86400000).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                {/* Observações */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
                  <textarea value={saleNotes} onChange={e => setSaleNotes(e.target.value)}
                    rows={2} placeholder="Observações sobre o pagamento..."
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-border">
                <Button variant="outline" onClick={() => setShowSaleModal(false)} className="flex-1">Pular</Button>
                <Button
                  onClick={() => {
                    const dueDays = salePaymentDueDays && salePaymentDueDays > 0 ? salePaymentDueDays : undefined;
                    const dueDate = dueDays ? new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0] : undefined;
                    createSaleMutation.mutate({
                      budgetId,
                      clientName,
                      clientPhone: clientPhone || undefined,
                      total: String(total.toFixed(2)),
                      paymentMethod: salePaymentMethod,
                      installments: salePaymentMethod === 'card' ? saleInstallments : 1,
                      amountReceived: saleAmountReceived || String(total.toFixed(2)),
                      paymentStatus: dueDays ? 'pending' : salePaymentStatus,
                      notes: saleNotes || undefined,
                      paymentDueDays: dueDays,
                      paymentDueDate: dueDate,
                    });
                  }}
                  disabled={createSaleMutation.isPending}
                  className="flex-1 text-white font-semibold bg-green-600 hover:bg-green-700">
                  {createSaleMutation.isPending ? 'Registrando...' : 'Registrar Venda'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Agendamento de Execução */}
        {showExecutionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border my-4">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-foreground">Agendar Execução</h2>
                </div>
                <button onClick={() => setShowExecutionModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Dados do cliente (somente leitura) */}
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Cliente</p>
                  <p className="text-sm font-semibold text-foreground">{clientName}</p>
                  {clientPhone && (
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                      <p className="text-xs text-muted-foreground">{clientPhone}</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-muted/50 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Serviços</p>
                  <p className="text-sm text-foreground">{items.map(i => i.name).join(', ')}</p>
                  <p className="text-sm font-bold text-green-600">R$ {total.toFixed(2).replace('.', ',')}</p>
                </div>

                {/* Data e horário */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Data de Execução *</label>
                    <Input type="date" value={execDate} onChange={e => setExecDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Horário</label>
                    <Input type="time" value={execTime} onChange={e => setExecTime(e.target.value)} />
                  </div>
                </div>

                {/* Endereço de execução */}
                <div className="border border-border rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Endereço de Execução *</p>
                  <AddressSearch value={execAddress} onChange={d => setExecAddress(prev => ({ ...prev, ...d }))} required />
                </div>

                {/* Equipe */}
                {teamsData.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Equipe</label>
                    <select
                      value={execTeamId ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setExecTeamId(val ? Number(val) : undefined);
                        setExecMemberId(undefined);
                        setExecAssignedTo('');
                      }}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Qualquer equipe</option>
                      {teamsData.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Responsável */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Responsável</label>
                  <select
                    value={execMemberId ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') { setExecMemberId(undefined); setExecAssignedTo(''); }
                      else {
                        const member = filteredExecMembers.find((m: any) => m.id === Number(val));
                        setExecMemberId(Number(val));
                        setExecAssignedTo(member?.name ?? '');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Sem responsável definido</option>
                    {filteredExecMembers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-border">
                <Button variant="outline" onClick={() => setShowExecutionModal(false)} className="flex-1">Pular</Button>
                <Button
                  onClick={() => {
                    if (!execDate) { toast.error('Informe a data de execução'); return; }
                    if (!execAddress.street) { toast.error('Informe o endereço de execução'); return; }
                    if (!execAddress.number) { toast.error('Informe o número do endereço'); return; }
                    createExecutionMutation.mutate({
                      budgetId,
                      clientName,
                      clientPhone: clientPhone || undefined,
                      street: execAddress.street,
                      addressNumber: execAddress.number,
                      complement: execAddress.complement || undefined,
                      neighborhood: execAddress.neighborhood || undefined,
                      city: execAddress.city || undefined,
                      state: execAddress.state || undefined,
                      serviceDescription: items.map(i => i.name).join(', '),
                      totalValue: String(total.toFixed(2)),
                      scheduledDate: execDate,
                      scheduledTime: execTime || undefined,
                      assignedTo: execAssignedTo || undefined,
                      assignedMemberId: execMemberId,
                      teamId: execTeamId,
                    });
                  }}
                  disabled={createExecutionMutation.isPending || !execDate}
                  className="flex-1 text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' }}>
                  {createExecutionMutation.isPending ? 'Criando...' : 'Criar OS de Execução'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/orcamentos")} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1 text-white font-semibold" style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
