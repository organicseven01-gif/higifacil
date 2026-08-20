import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Search, Eye, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import ExecutionFormModal from "@/components/execution/ExecutionFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import RegisterSaleModal from "@/components/RegisterSaleModal";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "accepted", label: "Orç. Fechados" },
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  sent: "Pendente",
  accepted: "Orç. Fechado",
  rejected: "Recusado",
};

const statusClass: Record<string, string> = {
  pending: "badge-pending",
  sent: "badge-pending",
  accepted: "badge-accepted",
  rejected: "badge-rejected",
};

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

export default function Budgets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [registerSaleBudget, setRegisterSaleBudget] = useState<any>(null);
  const [registerSaleBudgetId, setRegisterSaleBudgetId] = useState<number | null>(null);
  const [scheduleExecutionBudget, setScheduleExecutionBudget] = useState<any>(null);

  // Busca os items do orçamento selecionado para o modal de venda
  const { data: registerSaleBudgetDetail } = trpc.budgets.getById.useQuery(
    { id: registerSaleBudgetId! },
    { enabled: !!registerSaleBudgetId }
  );

  const { data: budgets = [], isLoading } = trpc.budgets.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const deleteMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => { utils.budgets.list.invalidate(); toast.success("Orçamento excluído!"); },
    onError: () => toast.error("Erro ao excluir orçamento"),
  });

  const updateStatusMutation = trpc.budgets.updateStatus.useMutation({
    onSuccess: () => { utils.budgets.list.invalidate(); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const reactivateMutation = trpc.budgets.reactivate.useMutation({
    onSuccess: () => {
      utils.budgets.list.invalidate();
      toast.success("Orçamento reativado! Movido de volta para Pendentes.");
    },
    onError: (e) => toast.error("Erro ao reativar orçamento", { description: e.message }),
  });

  // duplicateMutation removido - substituído por Agendar Execução

  const totalValue = budgets.reduce((sum, b) => sum + parseFloat(String(b.total) || "0"), 0);

  // Seletor de período para os cards de resumo
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MONTH_NAMES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  // Todos os orçamentos sem filtro para os cards
  const { data: allBudgets = [] } = trpc.budgets.list.useQuery({});

  const periodBudgets = useMemo(() => allBudgets.filter((b) => {
    const d = new Date(b.createdAt);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  }), [allBudgets, selectedYear, selectedMonth]);

  const monthValue = periodBudgets.reduce((sum, b) => sum + parseFloat(String(b.total) || "0"), 0);
  const totalCount = periodBudgets.length;
  const pendingCount = periodBudgets.filter(b => b.status === "pending" || b.status === "sent").length;
  const pendingValue = periodBudgets.filter(b => b.status === "pending" || b.status === "sent").reduce((sum, b) => sum + parseFloat(String(b.total) || "0"), 0);
  const acceptedCount = periodBudgets.filter(b => b.status === "accepted").length;
  const acceptedValue = periodBudgets.filter(b => b.status === "accepted").reduce((sum, b) => sum + parseFloat(String(b.total) || "0"), 0);
  const rejectedCount = periodBudgets.filter(b => b.status === "rejected").length;

  // Dados do gráfico de linha: evolução diária de pendentes, aceitos e recusados
  const dailyChartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayBudgets = periodBudgets.filter(b => new Date(b.createdAt).getDate() === day);
      return {
        dia: day,
        Pendentes: dayBudgets.filter(b => b.status === "pending" || b.status === "sent").length,
        Fechados: dayBudgets.filter(b => b.status === "accepted").length,
        Recusados: dayBudgets.filter(b => b.status === "rejected").length,
      };
    });
  }, [periodBudgets, selectedYear, selectedMonth]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie todas as propostas comerciais</p>
          </div>
          <Button
            onClick={() => setLocation("/orcamentos/novo")}
            className="gap-2 text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
          >
            <Plus className="h-4 w-4" /> Novo Orçamento
          </Button>
        </div>

        {/* Stats com seletor de período */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-4">
          {/* Seletor de mês/ano */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Período</span>
            <div className="flex items-center gap-2">
              <button onClick={goToPrevMonth} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {MONTH_NAMES_FULL[selectedMonth]} {selectedYear}
              </span>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCurrentMonth && (
                <button
                  onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
                  className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                >
                  Hoje
                </button>
              )}
            </div>
          </div>
          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl p-3 border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">Orçamentos Realizados</p>
              <p className="text-xl font-bold mt-1" style={{ color: "oklch(0.32 0.14 240)" }}>{totalCount}</p>
            </div>
            <div className="rounded-xl p-3 border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">Valor Total dos Orçamentos</p>
              <p className="text-xl font-bold mt-1" style={{ color: "oklch(0.35 0.15 155)" }}>{formatCurrency(monthValue)}</p>
            </div>
            <div className="rounded-xl p-3 border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">Orçamentos Não Fechados</p>
              <p className="text-xl font-bold mt-1" style={{ color: "oklch(0.45 0.15 85)" }}>{pendingCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(pendingValue)}</p>
            </div>
            <div className="rounded-xl p-3 border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">Orçamentos Fechados</p>
              <p className="text-xl font-bold mt-1" style={{ color: "oklch(0.35 0.18 155)" }}>{acceptedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(acceptedValue)}</p>
            </div>
            <div className="rounded-xl p-3 border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">Recusados</p>
              <p className="text-xl font-bold mt-1" style={{ color: "oklch(0.45 0.18 25)" }}>{rejectedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Contato sem fechamento</p>
            </div>
          </div>
        </div>

        {/* Gráfico de Evolução Diária */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Evolução Diária</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Orçamentos por status por dia em {MONTH_NAMES_FULL[selectedMonth]} {selectedYear}</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(dailyChartData.length / 8)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid oklch(0.9 0 0)", fontSize: 12 }}
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="Pendentes"
                stroke="oklch(0.55 0.18 240)"
                strokeWidth={2}
                dot={{ r: 3, fill: "oklch(0.55 0.18 240)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Fechados"
                stroke="oklch(0.50 0.18 155)"
                strokeWidth={2}
                dot={{ r: 3, fill: "oklch(0.50 0.18 155)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Recusados"
                stroke="oklch(0.55 0.22 25)"
                strokeWidth={2}
                dot={{ r: 3, fill: "oklch(0.55 0.22 25)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === opt.value
                    ? "text-white shadow-sm"
                    : "bg-white border border-border text-muted-foreground hover:border-primary"
                }`}
                style={statusFilter === opt.value ? { background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budgets List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            <p className="text-lg font-medium">Nenhum orçamento encontrado</p>
            <p className="text-sm mt-1">Crie seu primeiro orçamento agora</p>
            <Button
              onClick={() => setLocation("/orcamentos/novo")}
              className="mt-4 text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
            >
              <Plus className="h-4 w-4 mr-2" /> Criar Orçamento
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {budgets.map((budget) => (
                <div key={budget.id} className="flex items-start sm:items-center gap-3 p-3 sm:p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {budget.budgetNumber && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: "oklch(0.95 0.04 240)", color: "oklch(0.32 0.14 240)" }}>
                          #{String(budget.budgetNumber).padStart(4, "0")}
                        </span>
                      )}
                      <p className="font-semibold text-foreground">{budget.clientName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass[budget.status]}`}>
                        {statusLabels[budget.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {budget.clientPhone} · {new Date(budget.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0">
                    <span className="font-bold text-sm" style={{ color: "oklch(0.32 0.14 240)" }}>
                      {formatCurrency(budget.total)}
                    </span>
                    <div className="flex gap-1 items-center">
                      {/* Botão Vendido */}
                      <button
                        onClick={() => {
                          if (budget.status === "accepted") {
                            // Desmarcar: volta para pendente
                            updateStatusMutation.mutate({ id: budget.id, status: "pending" });
                            toast.success("Desmarcado como vendido");
                          } else {
                            // Abrir modal de registro de venda
                            setRegisterSaleBudget(budget);
                            setRegisterSaleBudgetId(budget.id);
                          }
                        }}
                        title={budget.status === "accepted" ? "Desmarcar como vendido" : "Registrar venda"}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          budget.status === "accepted"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-muted hover:bg-green-50 text-muted-foreground hover:text-green-600"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{budget.status === "accepted" ? "Orç. Fechado" : "Orç. Fechado"}</span>
                      </button>
                      {/* Botão Recusado / Reativar */}
                      {budget.status === "rejected" ? (
                        <button
                          onClick={() => reactivateMutation.mutate({ id: budget.id })}
                          disabled={reactivateMutation.isPending}
                          title="Reativar orçamento (mover para Pendentes)"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reativar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            updateStatusMutation.mutate({ id: budget.id, status: "rejected" });
                            toast.success("Marcado como recusado");
                          }}
                          title="Marcar como recusado"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all bg-muted hover:bg-red-50 text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Recusado</span>
                        </button>
                      )}
                      <button
                        onClick={() => setLocation(`/orcamentos/${budget.id}/visualizar`)}
                        title="Visualizar"
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setLocation(`/orcamentos/${budget.id}/editar`)}
                        title="Editar"
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>

                      <button
                        onClick={() => { if (confirm("Excluir este orçamento?")) deleteMutation.mutate({ id: budget.id }); }}
                        title="Excluir"
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Registrar Venda */}
      {registerSaleBudget && (
        <RegisterSaleModal
          budget={{
            ...registerSaleBudget,
            items: registerSaleBudgetDetail?.items?.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: String(i.unitPrice),
              serviceId: i.serviceId,
            })) ?? [],
          }}
          onClose={() => { setRegisterSaleBudget(null); setRegisterSaleBudgetId(null); }}
          onSuccess={(scheduledDate) => {
            utils.budgets.list.invalidate();
            setRegisterSaleBudget(null);
            setRegisterSaleBudgetId(null);
            // Redirecionar para a aba Execução no dia agendado
            if (scheduledDate) {
              setLocation(`/execucao?data=${scheduledDate}`);
            }
          }}
        />
      )}

      {/* Modal Agendar Execução */}
      {scheduleExecutionBudget && (
        <ExecutionFormModal
          defaultDate={new Date().toISOString().split('T')[0]}
          editOrder={{
            id: 0,
            clientName: scheduleExecutionBudget.clientName ?? "",
            clientPhone: scheduleExecutionBudget.clientPhone ?? "",
            serviceDescription: scheduleExecutionBudget.items?.map((i: any) => i.description).join(", ") ?? "",
            totalValue: scheduleExecutionBudget.total ?? "",
            scheduledDate: new Date().toISOString().split('T')[0],
          } as any}
          onClose={() => setScheduleExecutionBudget(null)}
          onSaved={() => {
            setScheduleExecutionBudget(null);
            toast.success("Execução agendada com sucesso!");
          }}
        />
      )}
    </DashboardLayout>
  );
}
