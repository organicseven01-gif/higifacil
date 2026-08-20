import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/FeatureGate";
import { trpc } from "@/lib/trpc";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Search, Pencil, Trash2, FileBarChart2 } from "lucide-react";
import BankStatementTab from "@/components/financeiro/BankStatementTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

const paymentLabels: Record<string, string> = {
  pix: "PIX", card: "Cartão", cash: "Espécie", boleto: "Boleto",
  card_1x: "Cartão 1x", card_2x: "Cartão 2x", card_3x: "Cartão 3x",
  card_2x_ant: "Cartão 2x (ant.)", card_3x_ant: "Cartão 3x (ant.)",
};

const PAYMENT_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Espécie" },
  { value: "boleto", label: "Boleto" },
  { value: "card_1x", label: "Cartão 1x" },
  { value: "card_2x", label: "Cartão 2x" },
  { value: "card_3x", label: "Cartão 3x" },
  { value: "card_2x_ant", label: "Cartão 2x Antecipado" },
  { value: "card_3x_ant", label: "Cartão 3x Antecipado" },
];

// ── Modal de Nova/Editar Despesa ──────────────────────────────────────────────
function TransactionFormModal({
  open, onClose, onSuccess, editSale
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editSale?: any;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editSale;

  const [form, setForm] = useState({
    transactionType: "despesa",
    description: editSale?.description ?? "",
    total: editSale?.total ? String(Number(editSale.total).toFixed(2)) : "",
    saleDate: editSale?.saleDate
      ? new Date(editSale.saleDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    clientName: editSale?.clientName ?? "",
    paymentMethod: editSale?.paymentMethod ?? "pix",
    category: editSale?.category ?? "",
  });

  const createMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      toast.success("Despesa registrada!");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      toast.success("Despesa atualizada!");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totalVal = form.total.replace(",", ".");
    if (!totalVal || isNaN(Number(totalVal))) { toast.error("Informe um valor válido"); return; }

    if (isEdit) {
      updateMutation.mutate({
        id: editSale.id,
        description: form.description || undefined,
        category: form.category || undefined,
        clientName: form.clientName || "",
        total: totalVal,
        paymentMethod: form.paymentMethod as any,
        saleDate: form.saleDate ? new Date(form.saleDate) : undefined,
      });
    } else {
      createMutation.mutate({
        transactionType: "despesa",
        description: form.description || undefined,
        category: form.category || undefined,
        clientName: form.clientName || "",
        total: totalVal,
        paymentMethod: form.paymentMethod as any,
        saleDate: form.saleDate ? new Date(form.saleDate) : undefined,
        paymentStatus: "paid",
        amountReceived: totalVal,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input placeholder="Ex: Aluguel, fornecedor..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={form.saleDate} onChange={e => setForm(f => ({ ...f, saleDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Cliente / Fornecedor (opcional)</Label>
            <Input placeholder="Nome..." value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Categoria (opcional)</Label>
            <Input placeholder="Ex: Aluguel, Serviço, Material..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Forma de Pagamento</Label>
            <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Salvando..." : isEdit ? "Salvar Alterações" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Financeiro() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [typeFilter, setTypeFilter] = useState<"all" | "despesa">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSale, setEditSale] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"lancamentos" | "extrato">("lancamentos");

  const utils = trpc.useUtils();

  // Calcular datas do mês selecionado
  const { startDate, endDate } = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    return { startDate: start, endDate: end };
  }, [selectedMonth]);

  const { data: allSales = [], isLoading } = trpc.sales.list.useQuery(
    { startDate, endDate },
    { refetchOnWindowFocus: false }
  );

  const deleteMutation = trpc.sales.delete.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      toast.success("Despesa excluída!");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  // Filtrar por tipo e busca
  const filteredSales = useMemo(() => {
    let result = allSales as any[];
    if (typeFilter !== "all") result = result.filter(s => s.transactionType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        (s.clientName ?? "").toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [allSales, typeFilter, search]);

  // Métricas do mês
  const { faturamento, despesas, lucro, paidRevenue } = useMemo(() => {
    const all = allSales as any[];
    const receitas = all.filter(s => s.transactionType === "receita" || !s.transactionType);
    const despesasList = all.filter(s => s.transactionType === "despesa");
    const fat = receitas.reduce((sum: number, s: any) => sum + parseFloat(String(s.total ?? 0)), 0);
    const desp = despesasList.reduce((sum: number, s: any) => sum + parseFloat(String(s.total ?? 0)), 0);
    const paid = receitas
      .filter((s: any) => s.paymentStatus === "paid")
      .reduce((sum: number, s: any) => sum + parseFloat(String(s.total ?? 0)), 0);
    return { faturamento: fat, despesas: desp, lucro: fat - desp, paidRevenue: paid };
  }, [allSales]);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  return (
    <FeatureGate featureKey="financeiro" featureLabel="Módulo Financeiro">
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={() => { setEditSale(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("lancamentos")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "lancamentos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lançamentos
          </button>
          <button
            onClick={() => setActiveTab("extrato")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "extrato" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileBarChart2 className="h-3.5 w-3.5" />
            Extrato Bancário
          </button>
        </div>

        {/* Conteúdo da aba Extrato */}
        {activeTab === "extrato" && (
          <BankStatementTab selectedMonth={selectedMonth} />
        )}

        {/* Conteúdo da aba Lançamentos */}
        {activeTab === "lancamentos" && (<div className="space-y-4">
        {/* Dashboard de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1.5 rounded-lg bg-green-500/10 flex-shrink-0"><DollarSign className="h-3.5 w-3.5 text-green-500" /></div>
              <span className="text-xs text-muted-foreground leading-tight">Faturamento</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-green-500 break-all leading-tight">{fmt(faturamento)}</p>
            <p className="text-xs text-muted-foreground mt-1">Receitas</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1.5 rounded-lg bg-red-500/10 flex-shrink-0"><TrendingDown className="h-3.5 w-3.5 text-red-500" /></div>
              <span className="text-xs text-muted-foreground leading-tight">Despesas</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-red-500 break-all leading-tight">{fmt(despesas)}</p>
            <p className="text-xs text-muted-foreground mt-1">Saídas</p>
          </div>
          <div className={`p-3 sm:p-4 rounded-xl border-2 ${lucro >= 0 ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" : "border-red-300 bg-red-50 dark:bg-red-950/20"}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${lucro >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                <TrendingUp className={`h-3.5 w-3.5 ${lucro >= 0 ? "text-emerald-500" : "text-red-500"}`} />
              </div>
              <span className={`text-xs font-medium leading-tight ${lucro >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>Lucro</span>
            </div>
            <p className={`text-base sm:text-xl font-bold break-all leading-tight ${lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(lucro)}</p>
            <p className="text-xs text-muted-foreground mt-1">Fat. − Desp.</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 flex-shrink-0"><Wallet className="h-3.5 w-3.5 text-blue-500" /></div>
              <span className="text-xs text-muted-foreground leading-tight">Recebido</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-blue-500 break-all leading-tight">{fmt(paidRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Quitadas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["all", "despesa"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  typeFilter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "Todos" : "Despesas"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, descrição..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Lista de transações */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Carregando...</div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma transação encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">Registre despesas para visualizá-las aqui</p>
            </div>
          ) : (
            filteredSales.map((sale: any) => {
              const isReceita = sale.transactionType !== "despesa";
              const value = parseFloat(String(sale.total ?? 0));
              return (
                <div key={sale.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                  {/* Ícone */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isReceita ? "bg-green-100" : "bg-red-100"}`}>
                    {isReceita ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {sale.description || sale.clientName || (isReceita ? "Receita" : "Despesa")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {sale.clientName && sale.description && (
                        <span className="text-xs text-muted-foreground truncate">{sale.clientName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{fmtDate(sale.saleDate)}</span>
                      {sale.paymentMethod && (
                        <span className="text-xs text-muted-foreground">· {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod}</span>
                      )}
                      {sale.category && (
                        <Badge variant="outline" className="text-xs py-0 h-4">{sale.category}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${isReceita ? "text-green-600" : "text-red-600"}`}>
                      {isReceita ? "+" : "-"}{fmt(value)}
                    </p>
                    {sale.paymentStatus && (
                      <span className={`text-xs ${
                        sale.paymentStatus === "paid" ? "text-green-500" :
                        sale.paymentStatus === "partial" ? "text-amber-500" : "text-red-400"
                      }`}>
                        {sale.paymentStatus === "paid" ? "Pago" : sale.paymentStatus === "partial" ? "Parcial" : "Pendente"}
                      </span>
                    )}
                  </div>

                  {/* Ações: editar e deletar */}
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={() => { setEditSale(sale); setShowForm(true); }}
                      title="Editar"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirm === sale.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMutation.mutate({ id: sale.id })}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-muted text-foreground rounded-md hover:bg-muted/80"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(sale.id)}
                        title="Excluir"
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>)}
      </div>

      {showForm && (
        <TransactionFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditSale(null); }}
          onSuccess={() => { setShowForm(false); setEditSale(null); }}
          editSale={editSale}
        />
      )}
    </DashboardLayout>
    </FeatureGate>
  );
}
