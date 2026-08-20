import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, ChevronDown, Search, UserSearch, UserPlus, ChevronRight, X, CheckCircle2, Truck } from "lucide-react";
import CalculadoraDeslocamento, { type DeslocamentoResult } from "@/components/CalculadoraDeslocamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useMemo } from "react";

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
  return parseFloat(value.replace(",", ".")) || 0;
}

export default function NewBudget() {
  const [, setLocation] = useLocation();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientMode, setClientMode] = useState<"choose" | "search" | "free">("choose");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [videos, setVideos] = useState("");
  const [validDays, setValidDays] = useState(7);
  const [deslocamento, setDeslocamento] = useState<DeslocamentoResult | null>(null);
  const [showDeslocamento, setShowDeslocamento] = useState(false);
  const [isTimbrado, setIsTimbrado] = useState(false);
  const [showTimbradoModal, setShowTimbradoModal] = useState(false);
  const [timbradoResponsavelInput, setTimbradoResponsavelInput] = useState("");
  const saveSettingsMutation = trpc.settings.save.useMutation();
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const categoryChipsRef = useRef<HTMLDivElement>(null);

  const { data: services = [] } = trpc.services.list.useQuery({ search: serviceSearch || selectedCategory || undefined, activeOnly: true });
  const { data: serviceCategories = [] } = trpc.serviceCategories.list.useQuery();
  const { data: allClients = [] } = trpc.clients.list.useQuery(
    { search: clientSearch || undefined },
    { enabled: clientMode === "search" }
  );
  const filteredClients = useMemo(() => allClients.slice(0, 8), [allClients]);
  const { data: settingsData } = trpc.settings.get.useQuery();

  // Inicializa validDays com o valor configurado nas Configurações
  useEffect(() => {
    if (settingsData?.valid_days) {
      setValidDays(parseInt(settingsData.valid_days) || 7);
    }
  }, [settingsData?.valid_days]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const inDropdown = serviceDropdownRef.current && serviceDropdownRef.current.contains(event.target as Node);
      const inChips = categoryChipsRef.current && categoryChipsRef.current.contains(event.target as Node);
      if (!inDropdown && !inChips) {
        setShowServiceDropdown(false);
      }
    };
    if (showServiceDropdown) {
      // Usar setTimeout para garantir que o listener seja adicionado após o click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showServiceDropdown]);

  // Fecha o dropdown ao pressionar Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowServiceDropdown(false);
      }
    };
    if (showServiceDropdown) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showServiceDropdown]);

  const createMutation = trpc.budgets.create.useMutation({
    onSuccess: (data) => {
      toast.success("Orçamento criado com sucesso!", {
        description: `Orçamento #${String(data.budgetNumber ?? "").padStart(4, "0")} salvo e pronto para envio.`,
        duration: 5000,
        action: {
          label: "Ver listagem",
          onClick: () => setLocation("/orcamentos"),
        },
      });
      setLocation(`/orcamentos/${data.id}/visualizar`);
    },
    onError: (e) => toast.error("Erro ao criar orçamento", { description: e.message }),
  });

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + parseCurrency(item.subtotal), 0);
  const discountAmount = discountType === "percent"
    ? subtotal * (parseCurrency(discountValue) / 100)
    : parseCurrency(discountValue);
  const totalServicos = Math.max(0, subtotal - discountAmount);
  const totalDeslocamento = deslocamento?.custoTotal ?? 0;
  const total = totalServicos + totalDeslocamento;

  const addItem = (service?: any) => {
    const newItem: BudgetItem = {
      serviceId: service?.id,
      name: service?.name || "",
      description: service?.description || "",
      quantity: 1,
      unitPrice: service ? String(service.price) : "0",
      subtotal: service ? String(service.price) : "0",
    };
    setItems((prev) => [...prev, newItem]);
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

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleTimbrado = () => {
    const newVal = !isTimbrado;
    if (newVal) {
      const responsavel = (settingsData as any)?.timbrado_responsavel;
      if (!responsavel || responsavel.trim() === "") {
        setShowTimbradoModal(true);
        return;
      }
    }
    setIsTimbrado(newVal);
  };

  const handleSaveTimbradoResponsavel = () => {
    if (!timbradoResponsavelInput.trim()) { toast.error("Informe o nome do responsável"); return; }
    saveSettingsMutation.mutate(
      { card_fee_1x: "0", card_fee_2x: "0", card_fee_3x: "0", timbrado_responsavel: timbradoResponsavelInput.trim() },
      {
        onSuccess: () => {
          setShowTimbradoModal(false);
          setIsTimbrado(true);
          toast.success("Responsável salvo! Orçamento timbrado ativado.");
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  const handleSubmit = () => {
    if (!clientName.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (!clientPhone.trim()) { toast.error("Informe o contato do cliente"); return; }
    if (items.length === 0) { toast.error("Adicione pelo menos um item"); return; }

    createMutation.mutate({
      clientId: 0,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientAddress: "",
      subtotal: subtotal.toFixed(2),
      discountType,
      discountValue: discountAmount.toFixed(2),
      total: total.toFixed(2),
      notes: notes + (deslocamento ? `\n\n[Deslocamento: ${deslocamento.distanciaKm.toFixed(1)}km (${deslocamento.tipoViagem === 'ida_volta' ? 'Ida e Volta' : deslocamento.tipoViagem === 'ida' ? 'Só Ida' : 'Só Volta'}) | R$ ${deslocamento.valorKm.toFixed(2)}/km${deslocamento.pedagio > 0 ? ` | Pedágio: R$ ${deslocamento.pedagio.toFixed(2)}` : ''} | Total: R$ ${deslocamento.custoTotal.toFixed(2)}]` : ''),
      videos,
      validDays,
      paymentConditions: "",
      isTimbrado,
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/orcamentos")} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Novo Orçamento</h1>
            <p className="text-muted-foreground text-sm">Crie uma proposta profissional para seu cliente</p>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.32 0.14 240)" }}>1</span>
            Dados do Cliente
          </h2>

          {/* Cliente selecionado da lista */}
          {selectedClient ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-400 bg-green-50">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {selectedClient.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 text-sm truncate">{selectedClient.name}</p>
                <p className="text-xs text-green-600">{selectedClient.phone}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <button
                type="button"
                onClick={() => { setSelectedClient(null); setClientName(""); setClientPhone(""); setClientMode("choose"); }}
                className="text-green-600 hover:text-green-800 p-1"
                title="Trocar cliente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : clientMode === "choose" ? (
            /* Escolha inicial */
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClientMode("search")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <UserSearch className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cliente cadastrado</p>
                  <p className="text-xs text-muted-foreground">Buscar na lista</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setClientMode("free")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-yellow-400 hover:bg-yellow-50 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <UserPlus className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Digitar nome</p>
                  <p className="text-xs text-muted-foreground">Sem cadastro</p>
                </div>
              </button>
            </div>
          ) : clientMode === "search" ? (
            /* Busca de cliente existente */
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Buscar por nome ou telefone..."
                  className="pl-9 h-11"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {showClientDropdown && clientSearch.trim().length >= 1 && (
                <div className="bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientName(client.name);
                          setClientPhone(client.phone);
                          setShowClientDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                      <button
                        type="button"
                        onClick={() => { setClientMode("free"); setShowClientDropdown(false); }}
                        className="mt-2 text-sm text-yellow-600 font-medium hover:underline"
                      >
                        Digitar nome sem cadastro →
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={() => setClientMode("choose")} className="text-xs text-muted-foreground hover:text-foreground">← Voltar</button>
            </div>
          ) : (
            /* Modo livre: digitar nome e telefone */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                    Nome do Cliente <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Ex: Rubia Braga / Casa"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-11 text-base font-medium"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                    Contato (WhatsApp) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Ex: (11) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="h-11 text-base font-medium"
                  />
                </div>
              </div>
              <button type="button" onClick={() => setClientMode("choose")} className="text-xs text-muted-foreground hover:text-foreground">← Voltar</button>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.32 0.14 240)" }}>2</span>
            Itens do Orçamento
          </h2>

          {/* Items — cards em mobile, tabela em desktop */}
          {items.length > 0 && (
            <div className="mb-4">
              {/* Mobile: cards */}
              <div className="sm:hidden space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="border border-border rounded-xl p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground shrink-0">#{index + 1}</span>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        className="h-9 text-base flex-1 min-w-0"
                        placeholder="Nome do serviço"
                      />
                      <button onClick={() => removeItem(index)} className="p-1.5 rounded hover:bg-red-50 transition-colors shrink-0">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Quantidade</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                          onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateItem(index, "quantity", 1); }}
                          className="h-9 text-base text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Valor unit. (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          className="h-9 text-base text-right"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-sm font-semibold" style={{ color: "oklch(0.32 0.14 240)" }}>
                        Subtotal: {formatCurrency(parseCurrency(item.subtotal))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 text-muted-foreground font-medium">Descrição</th>
                      <th className="text-center pb-2 text-muted-foreground font-medium w-20">Qtd</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium w-28">Valor Unit.</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium w-28">Subtotal</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2 pr-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Nome do serviço"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                            onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateItem(index, "quantity", 1); }}
                            className="h-8 text-sm text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                            className="h-8 text-sm text-right"
                          />
                        </td>
                        <td className="py-2 pl-2 text-right font-semibold" style={{ color: "oklch(0.32 0.14 240)" }}>
                          {formatCurrency(parseCurrency(item.subtotal))}
                        </td>
                        <td className="py-2 pl-2">
                          <button onClick={() => removeItem(index)} className="p-1 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4 text-red-400" />
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

          {/* Add Item */}
          <div className="flex gap-2">
            <div className="relative flex-1" ref={serviceDropdownRef}>
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
                            <span className="font-bold text-base text-blue-600 shrink-0">
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
                      <button
                        key={service.id}
                        onClick={() => { addItem(service); setShowServiceDropdown(false); }}
                        className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 block"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {service.serviceCode != null && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">
                                #{String(service.serviceCode).padStart(3, '0')}
                              </span>
                            )}
                            <p className="font-medium text-foreground text-sm break-words">{service.name}</p>
                          </div>
                          <span className="font-semibold text-sm text-blue-600 shrink-0">
                            {formatCurrency(parseFloat(String(service.price)))}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{service.category}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => addItem()}
              className="gap-1 shrink-0"
            >
              <Plus className="h-4 w-4" /> Item Manual
            </Button>
          </div>
        </div>

        {/* Deslocamento - Opcional */}
        {!showDeslocamento ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeslocamento(true)}
            className="w-full gap-2 h-10 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Adicionar Deslocamento (Opcional)
          </Button>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.55 0.18 30)" }}>3</span>
              Deslocamento
              <button
                type="button"
                onClick={() => { setShowDeslocamento(false); setDeslocamento(null); }}
                className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </h2>
            <CalculadoraDeslocamento
              onResult={setDeslocamento}
              initialResult={deslocamento}
            />
          </div>
        )}

        {/* Totals & Discount */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.32 0.14 240)" }}>4</span>
            Valores e Desconto
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Subtotal Serviços</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {deslocamento && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-orange-500" />
                  Deslocamento{deslocamento.pedagio > 0 ? ` + Pedágio` : ""}
                </span>
                <span className="font-semibold text-orange-600">+ {formatCurrency(deslocamento.custoTotal)}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground shrink-0">Desconto</span>
              <div className="flex gap-2 flex-1">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "fixed" | "percent")}
                  className="h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="fixed">R$ fixo</option>
                  <option value="percent">% percentual</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="flex-1"
                  placeholder="0"
                />
              </div>
              <span className="text-red-500 font-medium shrink-0">- {formatCurrency(discountAmount)}</span>
            </div>
            {deslocamento && (
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-muted-foreground">Serviços</span>
                <span>{formatCurrency(totalServicos)}</span>
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
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: "oklch(0.32 0.14 240)" }}>4</span>
            Informações Adicionais
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Validade do Orçamento (dias)</label>
              <Input
                type="number"
                min="1"
                value={validDays === 0 ? "" : validDays}
                onChange={(e) => setValidDays(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) setValidDays(1); }}
                className="max-w-xs"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Observações para o Cliente</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Informações adicionais, termos e condições..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>


          </div>
        </div>

        {/* Toggle Timbrado */}
        <button
          type="button"
          onClick={handleToggleTimbrado}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
            isTimbrado
              ? "border-blue-400 bg-blue-50"
              : "border-dashed border-border hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isTimbrado ? "bg-blue-500" : "bg-muted"
          }`}>
            <span className="text-lg">{isTimbrado ? "📋" : "📋"}</span>
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isTimbrado ? "text-blue-700" : "text-foreground"}`}>
              {isTimbrado ? "Orçamento Timbrado ativado" : "Gerar como Orçamento Timbrado"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isTimbrado
                ? `Responsável: ${(settingsData as any)?.timbrado_responsavel || timbradoResponsavelInput}`
                : "Para prefeituras e órgãos públicos — layout formal com cabeçalho"}
            </p>
          </div>
          <div className={`relative inline-flex shrink-0 h-6 w-11 items-center rounded-full transition-colors ${
            isTimbrado ? "bg-blue-500" : "bg-muted-foreground/30"
          }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
              isTimbrado ? "translate-x-6" : "translate-x-1"
            }`} />
          </div>
        </button>

        {/* Modal Timbrado */}
        {showTimbradoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Dados do Timbrado</h3>
                  <p className="text-xs text-muted-foreground">Necessário para gerar o documento formal</p>
                </div>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Responsável / Representante Legal</label>
                  <Input
                    value={timbradoResponsavelInput}
                    onChange={(e) => setTimbradoResponsavelInput(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="h-11"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTimbradoResponsavel()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Os demais dados (nome, CNPJ, endereço) são puxados dos Dados da Empresa nas Configurações.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowTimbradoModal(false)} className="flex-1">Cancelar</Button>
                <Button
                  onClick={handleSaveTimbradoResponsavel}
                  disabled={saveSettingsMutation.isPending}
                  className="flex-1 text-white"
                  style={{ background: "oklch(0.45 0.18 240)" }}
                >
                  {saveSettingsMutation.isPending ? "Salvando..." : "Salvar e Ativar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/orcamentos")} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 text-white font-semibold"
            style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
          >
            {createMutation.isPending ? "Criando..." : "Criar Orçamento"}
          </Button>
        </div>
      </div>
      </DashboardLayout>
  );
}
