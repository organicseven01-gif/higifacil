import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X, Calendar, User, Search, ChevronRight, CheckCircle2,
  UserPlus, UserSearch, FileText, Phone, Mail, MapPin, Home, Hash, Building2, Loader2, CalendarCheck, Clock, Wrench, ArrowRight, Copy, Check as CheckIcon
} from "lucide-react";
import ExecutionFormModal from "@/components/execution/ExecutionFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BudgetItem {
  name: string;
  quantity: number;
  unitPrice: string;
  serviceId?: number;
}

interface RegisterSaleModalProps {
  budget: {
    id: number;
    budgetNumber?: number;
    clientName: string;
    clientPhone?: string;
    total: string | number;
    createdAt: Date | string;
    items?: BudgetItem[];
  };
  onClose: () => void;
  onSuccess: (scheduledDate?: string) => void;
}

function fmt(val: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val) || 0);
}

function toDateInputValue(d: Date | string) {
  return new Date(d).toISOString().split("T")[0];
}

type Mode = "choose" | "search" | "new";

const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function RegisterSaleModal({ budget, onClose, onSuccess }: RegisterSaleModalProps) {
  const utils = trpc.useUtils();
  const [showScheduleExecution, setShowScheduleExecution] = useState(false);
  const [saleClientData, setSaleClientData] = useState<{ name: string; phone: string; clientAddress?: string; saleId?: number; budgetId?: number } | null>(null);
  const [confirmationData, setConfirmationData] = useState<{ scheduledDate: string; assignedTo: string; serviceItems: Array<{ serviceName: string; quantity: number; unitPrice: string }>; confirmToken?: string } | null>(null);
  // Guarda nome/telefone do cliente para a tela de confirmação (persiste mesmo após resetar saleClientData)
  const [confirmedClientName, setConfirmedClientName] = useState("");
  const [confirmedClientPhone, setConfirmedClientPhone] = useState("");

  // ── Modo de seleção de cliente ────────────────────────────────────
  const [mode, setMode] = useState<Mode>("choose");

  // ── Busca de cliente existente ────────────────────────────────────
  const [clientSearch, setClientSearch] = useState(budget.clientName || "");
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Novo cliente — dados pessoais ─────────────────────────────────
  const [newName, setNewName] = useState(budget.clientName || "");
  const [newPhone, setNewPhone] = useState(budget.clientPhone || "");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // ── Novo cliente — endereço ───────────────────────────────────────
  const [newCep, setNewCep] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newAddressNumber, setNewAddressNumber] = useState("");
  const [newComplement, setNewComplement] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // Agendamento - usa data de hoje (nao a data do orcamento) para aparecer no mes atual
  const [saleDate, setSaleDate] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

   // ── Queries / Mutations ───────────────────────────────────────
  // Buscar dados completos do cliente selecionado (com endereço)
  const { data: clientFullData } = trpc.clients.getById.useQuery(
    { id: selectedClient?.id ?? 0 },
    { enabled: !!selectedClient?.id }
  );
  const clientFull = clientFullData as any;

  const { data: allClients = [] } = trpc.clients.list.useQuery(
    { search: clientSearch || undefined },
    { enabled: mode === "search" }
  );
  const filteredClients = useMemo(() => allClients.slice(0, 8), [allClients]);

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      toast.success("Cliente cadastrado com sucesso!");
      if (data && typeof data === "object" && "id" in data && (data as any).id) {
        setSelectedClient({ id: (data as any).id, name: newName, phone: newPhone });
        setMode("search");
      }
      setCreatingClient(false);
    },
    onError: (err) => {
      toast.error("Erro ao cadastrar cliente: " + err.message);
      setCreatingClient(false);
    },
  });

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: () => { utils.sales.list.invalidate(); utils.sales.metrics.invalidate(); },
    onError: (err) => toast.error("Erro ao registrar venda: " + err.message),
  });

  const updateStatusMutation = trpc.budgets.updateStatus.useMutation({
    onSuccess: () => { utils.budgets.list.invalidate(); },
    onError: () => toast.error("Erro ao atualizar status do orçamento"),
  });

  // ── Busca de CEP ──────────────────────────────────────────────────
  async function handleCepBlur() {
    const cep = newCep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewStreet(data.logradouro || "");
        setNewNeighborhood(data.bairro || "");
        setNewCity(data.localidade || "");
        setNewState(data.uf || "");
        toast.success("Endereço preenchido automaticamente!");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }

  // ── Handlers ──────────────────────────────────────────────────────
  function handleSelectClient(client: { id: number; name: string; phone: string }) {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowDropdown(false);
  }

  async function handleCreateNewClient() {
    if (!newName.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (!newPhone.trim()) { toast.error("Telefone do cliente é obrigatório"); return; }
    setCreatingClient(true);
    createClientMutation.mutate({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
      cep: newCep.replace(/\D/g, "") || undefined,
      street: newStreet.trim() || undefined,
      addressNumber: newAddressNumber.trim() || undefined,
      complement: newComplement.trim() || undefined,
      neighborhood: newNeighborhood.trim() || undefined,
      city: newCity.trim() || undefined,
      state: newState || undefined,
    } as any);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Selecione ou cadastre um cliente para registrar a venda.");
      return;
    }
    try {
      // Atualiza status do orçamento para 'accepted' — falha silenciosa não bloqueia a venda
      try {
        await updateStatusMutation.mutateAsync({ id: budget.id, status: "accepted" });
      } catch (statusErr) {
        console.warn("[RegisterSaleModal] Não foi possível atualizar status do orçamento:", statusErr);
        // Continua mesmo assim — a venda deve ser criada independentemente
      }

      // Cria a venda
      const createdSale = await createSaleMutation.mutateAsync({
        budgetId: budget.id,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        total: String(budget.total),
        paymentMethod: "pix" as any,
        installments: 1,
        amountReceived: "0",
        paymentStatus: "pending",
        serviceStatus: "scheduled",
        scheduledDate: saleDate,
        transactionType: "receita",
        description: `Venda - Orçamento #${String(budget.budgetNumber ?? budget.id).padStart(4, "0")}`,
        notes: notes.trim() || undefined,
        saleDate: new Date(saleDate + "T12:00:00"),
      });

      toast.success("Venda registrada! Agendando execução...");
      // Ir direto para o agendamento sem tela intermediária
      const addrParts = [clientFull?.street, clientFull?.addressNumber, clientFull?.neighborhood, clientFull?.city].filter(Boolean);
      setSaleClientData({
        name: selectedClient.name,
        phone: selectedClient.phone,
        clientAddress: addrParts.length > 0 ? addrParts.join(", ") : undefined,
        saleId: (createdSale as any)?.id,  // vincula a OS à venda para atualizar total ao concluir
        budgetId: budget.id,
      });
      setShowScheduleExecution(true);
    } catch (err: any) {
      console.error("[RegisterSaleModal] Erro ao registrar venda:", err);
      toast.error("Erro ao registrar venda: " + (err?.message ?? "Tente novamente."));
    }
  }

  const isSaving = createSaleMutation.isPending || updateStatusMutation.isPending;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[92vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Registrar Venda</h2>
              <p className="text-xs text-muted-foreground">
                Orçamento #{String(budget.budgetNumber ?? budget.id).padStart(4, "0")} · {fmt(budget.total)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── Seção Cliente ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-foreground">Cliente</Label>
              <span className="text-xs text-red-500 font-medium">*obrigatório</span>
            </div>

            {/* Cliente já selecionado */}
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
                  onClick={() => { setSelectedClient(null); setMode("choose"); }}
                  className="text-green-600 hover:text-green-800 p-1"
                  title="Trocar cliente"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : mode === "choose" ? (
              /* Escolha inicial: dois botões */
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("search")}
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
                  onClick={() => setMode("new")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-green-400 hover:bg-green-50 transition-all text-center group"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Novo cliente</p>
                    <p className="text-xs text-muted-foreground">Cadastrar agora</p>
                  </div>
                </button>
              </div>
            ) : mode === "search" ? (
              /* Busca de cliente existente */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por nome ou telefone..."
                    className="pl-9"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                {showDropdown && clientSearch.trim().length >= 1 && (
                  <div className="bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client: any) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleSelectClient(client)}
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
                          onClick={() => setMode("new")}
                          className="mt-2 text-sm text-green-600 font-medium hover:underline"
                        >
                          Cadastrar novo cliente →
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button type="button" onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground">
                  ← Voltar
                </button>
              </div>
            ) : (
              /* ── Cadastro completo de novo cliente ── */
              <div className="p-4 rounded-xl border-2 border-green-400 bg-green-50/20 space-y-4">
                <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Cadastrar novo cliente
                </p>

                {/* Dados pessoais */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Nome completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" className="pl-8 text-sm" autoFocus />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Telefone / WhatsApp *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" className="pl-8 text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="pl-8 text-sm" type="email" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* CEP */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">CEP</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={newCep}
                          onChange={e => setNewCep(formatCep(e.target.value))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          className="pl-8 text-sm"
                          maxLength={9}
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Preenche o endereço automaticamente</p>
                    </div>
                    {/* Estado */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Estado</Label>
                      <select
                        value={newState}
                        onChange={e => setNewState(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione</option>
                        {BRAZIL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* Rua */}
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Rua / Logradouro</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={newStreet} onChange={e => setNewStreet(e.target.value)} placeholder="Rua, Avenida, Travessa..." className="pl-8 text-sm" />
                      </div>
                    </div>
                    {/* Número */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Número</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={newAddressNumber} onChange={e => setNewAddressNumber(e.target.value)} placeholder="123" className="pl-8 text-sm" />
                      </div>
                    </div>
                    {/* Complemento */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Complemento</Label>
                      <Input value={newComplement} onChange={e => setNewComplement(e.target.value)} placeholder="Apto, Bloco..." className="text-sm" />
                    </div>
                    {/* Bairro */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Bairro</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={newNeighborhood} onChange={e => setNewNeighborhood(e.target.value)} placeholder="Bairro" className="pl-8 text-sm" />
                      </div>
                    </div>
                    {/* Cidade */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Cidade</Label>
                      <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Cidade" className="text-sm" />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Observações sobre o cliente</Label>
                  <textarea
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Ex: cliente VIP, preferências, etc."
                    rows={2}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border bg-background">
                    ← Voltar
                  </button>
                  <Button
                    type="button"
                    onClick={handleCreateNewClient}
                    disabled={creatingClient || !newName.trim() || !newPhone.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    {creatingClient ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...</span>
                    ) : "✓ Cadastrar e selecionar"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Data de Agendamento ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-foreground">Data de agendamento</Label>
            </div>
            <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Padrão: data de hoje. Altere para a data agendada do serviço.</p>
          </div>

          {/* ── Aviso sobre pagamento ── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-blue-500 text-base mt-0.5">💡</span>
            <p className="text-xs text-blue-700">
              <strong>Forma de pagamento e comprovante</strong> serão registrados na hora de <strong>concluir o serviço</strong>, após a execução.
            </p>
          </div>

          {/* ── Observações da Venda ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-foreground">Observações (opcional)</Label>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: cliente pediu atenção especial em alguma peça, observações do agendamento..."
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* ── Botões ── */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
              disabled={isSaving || !selectedClient}
            >
              {isSaving ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</span>
              ) : "✓ Registrar Venda"}
            </Button>
          </div>
        </form>
      </div>
    </div>

    {/* Modal de agendamento de execução — abre direto após registrar venda */}
    {showScheduleExecution && saleClientData && !confirmationData && (
      <ExecutionFormModal
        defaultDate={saleDate}
        initialData={{
          clientName: saleClientData.name,
          clientPhone: saleClientData.phone ?? undefined,
          street: clientFull?.street ?? undefined,
          addressNumber: clientFull?.addressNumber ?? undefined,
          complement: clientFull?.complement ?? undefined,
          neighborhood: clientFull?.neighborhood ?? undefined,
          city: clientFull?.city ?? undefined,
          state: clientFull?.state ?? undefined,
          saleId: saleClientData.saleId,
          budgetId: saleClientData.budgetId,
        }}
        initialServiceItems={
          budget.items && budget.items.length > 0
            ? budget.items.map(item => ({
                serviceName: item.name,
                serviceId: item.serviceId,
                quantity: item.quantity,
                unitPrice: String(item.unitPrice),
              }))
            : undefined
        }
        onClose={() => {
          // Pular agendamento e fechar tudo
          setShowScheduleExecution(false);
          setSaleClientData(null);
          onSuccess();
        }}
        onSaved={(result) => {
          // Salva nome/telefone antes de resetar saleClientData
          if (saleClientData) {
            setConfirmedClientName(saleClientData.name);
            setConfirmedClientPhone(saleClientData.phone);
          }
          setShowScheduleExecution(false);
          setSaleClientData(null);
          if (result) {
            setConfirmationData(result);
          } else {
            onSuccess();
          }
        }}
      />
    )}

    {/* Tela de confirmação do agendamento */}
    {confirmationData && (
      <ConfirmationScreen
        confirmationData={confirmationData}
        budgetNumber={budget.budgetNumber ?? budget.id}
        clientName={confirmedClientName || saleClientData?.name || ""}
        clientPhone={confirmedClientPhone || saleClientData?.phone || ""}
        onClose={() => {
          const date = confirmationData.scheduledDate;
          setConfirmationData(null);
          onSuccess(date);
        }}
      />
    )}
    </>
  );
}

// ── Tela de confirmação do agendamento ─────────────────────────────────────
function ConfirmationScreen({
  confirmationData,
  budgetNumber,
  clientName,
  clientPhone,
  onClose,
}: {
  confirmationData: { scheduledDate: string; assignedTo: string; serviceItems: Array<{ serviceName: string; quantity: number; unitPrice: string }>; confirmToken?: string };
  budgetNumber: number;
  clientName: string;
  clientPhone: string;
  onClose: () => void;
}) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const fmt = (v: string | number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

  const formattedDate = (() => {
    const [y, m, d] = confirmationData.scheduledDate.split("-");
    return `${d}/${m}/${y}`;
  })();
  const total = confirmationData.serviceItems.reduce(
    (sum, i) => sum + (parseFloat(String(i.unitPrice).replace(",", ".")) || 0) * i.quantity,
    0
  );

  // Gerar mensagem padrão para WhatsApp
  const servicesList = confirmationData.serviceItems
    .map(i => `  • ${i.serviceName}${i.quantity > 1 ? ` x${i.quantity}` : ""}`)
    .join("\n");
  const defaultMessage = `Olá, ${clientName}! 👋\n\nSeu serviço foi agendado com sucesso!\n\n📅 *Data:* ${formattedDate}\n🔧 *Técnico:* ${confirmationData.assignedTo || "A definir"}\n\n📋 *Serviços agendados:*\n${servicesList}\n\n💰 *Total:* ${fmt(total)}\n\nQualquer dúvida, estamos à disposição! 😊`;
  const [whatsAppMsg, setWhatsAppMsg] = useState(defaultMessage);

  function copyMessage() {
    navigator.clipboard.writeText(whatsAppMsg).then(() => {
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => toast.error("Não foi possível copiar"));
  }

  function sendWhatsApp() {
    const phone = clientPhone.replace(/\D/g, "");
    const encoded = encodeURIComponent(whatsAppMsg);
    // wa.me abre o app nativo no celular (WhatsApp ou WhatsApp Business)
    const url = phone
      ? `https://wa.me/55${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header verde de sucesso */}
        <div className="bg-green-500 px-6 py-5 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <CalendarCheck className="h-7 w-7 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold">Agendamento Confirmado!</h2>
          <p className="text-green-100 text-base font-semibold mt-1">{clientName}</p>
          <p className="text-green-100 text-sm mt-0.5">
            Orçamento #{String(budgetNumber).padStart(4, "0")} convertido em venda
          </p>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4">
          {/* Cliente */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cliente</p>
              <p className="font-semibold text-gray-900">{clientName}</p>
            </div>
          </div>

          {/* Data e Técnico */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Data</p>
                <p className="font-semibold text-gray-900">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Técnico</p>
                <p className="font-semibold text-gray-900 truncate">
                  {confirmationData.assignedTo || "A definir"}
                </p>
              </div>
            </div>
          </div>

          {/* Serviços */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Serviços agendados</p>
            <div className="space-y-1.5">
              {confirmationData.serviceItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-800">
                      {item.serviceName}
                      {item.quantity > 1 && <span className="text-gray-400 ml-1">×{item.quantity}</span>}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {fmt(parseFloat(String(item.unitPrice).replace(",", ".")) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-base font-bold text-green-600">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Modal de edição de mensagem WhatsApp */}
        {showWhatsApp && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-[#25D366] px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <span className="font-bold">Mensagem de Confirmação</span>
                </div>
                <button onClick={() => setShowWhatsApp(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-gray-500">Edite a mensagem abaixo antes de enviar. Ela será aberta no WhatsApp pronta para enviar.</p>
                <textarea
                  value={whatsAppMsg}
                  onChange={e => setWhatsAppMsg(e.target.value)}
                  rows={12}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366] font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWhatsAppMsg(defaultMessage)}
                    className="flex-1 text-sm h-10"
                  >
                    Restaurar padrão
                  </Button>
                  <Button
                    type="button"
                    onClick={sendWhatsApp}
                    className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white h-10 text-sm"
                  >
                    Abrir no WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyMessage}
              className="flex-1 h-11 rounded-xl border-gray-300 text-gray-700 font-semibold"
            >
              {copied ? <CheckIcon className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar mensagem"}
            </Button>
            <Button
              type="button"
              onClick={() => setShowWhatsApp(true)}
              className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold h-11 rounded-xl"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </Button>
          </div>
          <Button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11 rounded-xl"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Ver na agenda do dia {formattedDate}
          </Button>
        </div>
      </div>
    </div>
  );
}
