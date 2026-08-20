import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/FeatureGate";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, CheckCircle2, Clock, MapPin, Phone, Plus, User,
  ClipboardList, TrendingUp, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, Wrench, Filter, X, Trash2, Search,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ExecutionFormModal from "@/components/execution/ExecutionFormModal";
import ExecutionDetailModal from "@/components/execution/ExecutionDetailModal";
import ConcludeServiceModal from "@/components/execution/ConcludeServiceModal";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

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

function getWeekDates(baseDate: Date): string[] {
  const dates: string[] = [];
  const day = baseDate.getDay(); // 0=Sun
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - day + (day === 0 ? -6 : 1));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type ExecutionOrder = {
  id: number;
  orderNumber: number | null;
  clientName: string;
  clientPhone: string | null;
  street: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  serviceDescription: string | null;
  totalValue: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  status: "pending" | "done" | "cancelled";
  assignedTo: string | null;
  notes: string | null;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge className="bg-green-100 text-green-700 border-green-200">Concluído</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelado</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>;
}

function ExecutionCard({ order, onComplete, onDetail, onDelete, serviceItemsTotal, upsellTotal }: {
  order: ExecutionOrder;
  onComplete: (id: number) => void;
  onDetail: (order: ExecutionOrder) => void;
  onDelete: (order: ExecutionOrder) => void;
  serviceItemsTotal?: number;
  upsellTotal?: number;
}) {
  const address = [order.street, order.addressNumber, order.complement, order.neighborhood, order.city]
    .filter(Boolean).join(", ");
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null;
  const wazeUrl = address ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes` : null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
        order.status === "done"
          ? "bg-green-50 border-green-200 opacity-80"
          : order.status === "cancelled"
          ? "bg-gray-50 border-gray-200 opacity-60"
          : "bg-white border-gray-200 hover:border-blue-300"
      }`}
      onClick={() => onDetail(order)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {order.scheduledTime && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {order.scheduledTime}
              </span>
            )}
            <StatusBadge status={order.status} />
            {order.orderNumber && (
              <span className="text-xs text-gray-400">#{String(order.orderNumber).padStart(4, "0")}</span>
            )}
          </div>

          <p className="font-semibold text-gray-900 truncate">{order.clientName}</p>

          {order.serviceDescription && (
            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{order.serviceDescription}</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {order.clientPhone && (
              <a
                href={`tel:${order.clientPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
              >
                <Phone className="h-3 w-3" />
                {order.clientPhone}
              </a>
            )}
            {address && mapsUrl && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 truncate max-w-[140px]">{address}</span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded shrink-0"
                  title="Abrir no Google Maps"
                >
                  Maps
                </a>
                <a
                  href={wazeUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-cyan-600 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-1.5 py-0.5 rounded shrink-0"
                  title="Abrir no Waze"
                >
                  Waze
                </a>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Mostrar somatório de service items + upsell se existir, caso contrário totalValue */}
          {(() => {
            const svcTotal = serviceItemsTotal ?? 0;
            const upTotal = upsellTotal ?? 0;
            const combined = svcTotal + upTotal;
            if (combined > 0) {
              return (
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(combined)}</span>
                  {upTotal > 0 && <p className="text-xs text-purple-500">+{formatCurrency(upTotal)} upsell</p>}
                </div>
              );
            }
            if (order.totalValue && parseDecimal(order.totalValue) > 0) {
              return <span className="text-sm font-bold text-gray-800">{formatCurrency(order.totalValue)}</span>;
            }
            return null;
          })()}
          {order.status === "pending" && (
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white text-xs h-8"
              onClick={(e) => { e.stopPropagation(); onComplete(order.id); }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Concluir
            </Button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(order); }}
            className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Excluir agendamento"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Execution() {
  const { user } = useAuth();
  // Detectar se é técnico (sub-usuário com role técnico)
  const loginMethod = user?.loginMethod ?? "";
  const isTecnico = loginMethod === "company_user_tecnico";
  const today = toLocalDateString(new Date());
  // Ler parâmetro ?data= da URL (vindo do fluxo Orçamento → Venda → Agendamento)
  const searchString = useSearch();
  const urlDate = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const d = params.get("data");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }, [searchString]);
  // Calcular weekOffset inicial baseado na data da URL
  const initialWeekOffset = useMemo(() => {
    if (!urlDate) return 0;
    const target = new Date(urlDate + "T12:00:00");
    const now = new Date();
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  }, [urlDate]);
  const [selectedDate, setSelectedDate] = useState(() => urlDate ?? today);
  const [weekOffset, setWeekOffset] = useState(() => initialWeekOffset);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ExecutionOrder | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string>("all");
  const [filterMemberId, setFilterMemberId] = useState<string>("all");
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<ExecutionOrder | null>(null);
  const [concludeOrder, setConcludeOrder] = useState<ExecutionOrder | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce da busca para evitar requisições a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(clientSearch), 400);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  // Buscar equipes e membros para os filtros
  const { data: teamsWithMembers = [] } = trpc.teams.listWithMembers.useQuery();
  const { data: allMembers = [] } = trpc.teams.activeMembers.useQuery();

  // Membros filtrados pela equipe selecionada
  const filteredMemberOptions = useMemo(() => {
    if (filterTeamId === "all") return allMembers;
    const team = teamsWithMembers.find((t: any) => String(t.id) === filterTeamId);
    return team?.members ?? [];
  }, [filterTeamId, teamsWithMembers, allMembers]);

  // Buscar métricas do dia selecionado
  const { data: metrics } = trpc.execution.metrics.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false }
  );

  // Buscar OS: por dia (normal) ou por busca de cliente (todos os dias)
  const isSearching = debouncedSearch.trim().length >= 2;
  const { data: orders = [], isLoading, refetch } = trpc.execution.list.useQuery(
    isSearching
      ? { clientSearch: debouncedSearch.trim() }
      : { date: selectedDate },
    { refetchOnWindowFocus: false }
  );

  // Buscar somatórios de itens de serviço para os cards
  const orderIds = useMemo(() => (orders as any[]).map((o: any) => o.id), [orders]);
  const { data: serviceItemsTotals = {} } = trpc.execution.getServiceItemsTotals.useQuery(
    { orderIds },
    { enabled: orderIds.length > 0, refetchOnWindowFocus: false }
  );
  const { data: upsellTotals = {} } = trpc.execution.getUpsellTotals.useQuery(
    { orderIds },
    { enabled: orderIds.length > 0, refetchOnWindowFocus: false }
  );
  // Buscar OS da semana para o calendárioo
  const { data: weekOrders = [] } = trpc.execution.list.useQuery(
    { startDate: weekDates[0], endDate: weekDates[6] },
    { refetchOnWindowFocus: false }
  );

  const utils = trpc.useUtils();

  const updateStatus = trpc.execution.updateStatus.useMutation({
    onSuccess: () => {
      utils.execution.list.invalidate();
      utils.execution.metrics.invalidate();
      toast.success("Status atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const handleComplete = (id: number) => {
    // Abre o modal de conclusão com fluxo completo de pagamento
    const order = (orders as ExecutionOrder[]).find(o => o.id === id);
    if (order) setConcludeOrder(order);
  };

  const deleteOrder = trpc.execution.delete.useMutation({
    onSuccess: () => {
      utils.execution.list.invalidate();
      utils.execution.metrics.invalidate();
      toast.success("Agendamento excluído!");
      setConfirmDeleteOrder(null);
    },
    onError: () => toast.error("Erro ao excluir agendamento"),
  });

  const handleDeleteConfirm = () => {
    if (confirmDeleteOrder) deleteOrder.mutate({ id: confirmDeleteOrder.id });
  };

  const filteredOrders = useMemo(() => {
    let result = orders as ExecutionOrder[];
    // Filtro por status (apenas quando não está buscando por cliente)
    if (!isSearching && statusFilter !== "all") result = result.filter(o => o.status === statusFilter);
    // Filtro por membro específico
    if (filterMemberId !== "all") {
      const member = allMembers.find((m: any) => String(m.id) === filterMemberId);
      if (member) result = result.filter(o => o.assignedTo === (member as any).name);
    } else if (filterTeamId !== "all") {
      // Filtro por equipe: mostrar OS de qualquer membro da equipe
      const team = teamsWithMembers.find((t: any) => String(t.id) === filterTeamId);
      const memberNames = (team?.members ?? []).map((m: any) => m.name);
      if (memberNames.length > 0) result = result.filter(o => o.assignedTo && memberNames.includes(o.assignedTo));
    }
    return result;
  }, [orders, statusFilter, filterTeamId, filterMemberId, allMembers, teamsWithMembers, isSearching]);

  // Contar OS por data para o calendário
  const countByDate = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const o of weekOrders as ExecutionOrder[]) {
      if (!map[o.scheduledDate]) map[o.scheduledDate] = { total: 0, done: 0 };
      map[o.scheduledDate].total++;
      if (o.status === "done") map[o.scheduledDate].done++;
    }
    return map;
  }, [weekOrders]);

  return (
    <FeatureGate featureKey="execucao" featureLabel="Execução de OS">
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Execução</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Agenda de serviços do dia</p>
          </div>
          <Button
            onClick={() => setShowFormModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Agendar</span>
          </Button>
        </div>        {/* KPIs do dia */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{metrics?.total ?? 0}</p>
              <p className="text-xs text-blue-500">serviços hoje</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-amber-600 font-medium">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{metrics?.pending ?? 0}</p>
              <p className="text-xs text-amber-500">a executar</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Concluídos</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{metrics?.done ?? 0}</p>
              <p className="text-xs text-green-500">finalizados</p>
            </CardContent>
          </Card>
          {!isTecnico && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">Valor do Dia</span>
              </div>
              <p className="text-lg font-bold text-purple-700">{formatCurrency(metrics?.totalValue ?? 0)}</p>
              <p className="text-xs text-purple-500">em serviços</p>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Calendário Semanal */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Semana
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setWeekOffset(0); setSelectedDate(today); }}>
                  Hoje
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2.5 gap-1 text-xs text-white ml-1"
                  style={{ background: 'oklch(0.50 0.18 264)' }}
                  onClick={() => setShowFormModal(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agendar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {weekDates.map((date) => {
                const isToday = date === today;
                const isSelected = date === selectedDate;
                const counts = countByDate[date];
                const [, , dd] = date.split("-");
                const dayName = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md"
                        : isToday
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span className="text-xs capitalize">{dayName.replace(".", "")}</span>
                    <span className={`text-base font-bold ${isSelected ? "text-white" : ""}`}>{dd}</span>
                    {counts?.total ? (
                      <span className={`text-xs font-medium ${isSelected ? "text-blue-200" : "text-blue-500"}`}>
                        {counts.done}/{counts.total}
                      </span>
                    ) : (
                      <span className="text-xs text-transparent">-</span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista de OS do dia */}
        <div>
          <div className="mb-3 space-y-2">
            {/* Linha 1: título + filtros de status */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-800 shrink-0">
                {isSearching ? (
                  <span>Resultados <span className="text-blue-600">"{debouncedSearch}"</span></span>
                ) : (
                  selectedDate === today ? "Hoje" : formatDate(selectedDate)
                )}
                <span className="text-gray-400 font-normal ml-2 text-sm">
                  ({filteredOrders.length} {filteredOrders.length === 1 ? "serviço" : "serviços"})
                </span>
              </h2>
              <div className="flex gap-1">
                {(["all", "pending", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      statusFilter === f
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Concluídos"}
                  </button>
                ))}
              </div>
            </div>

            {/* Linha 2: busca por cliente (largura total no mobile) */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-8 pl-8 pr-7 text-sm rounded-full border-gray-200 w-full"
              />
              {clientSearch && (
                <button
                  onClick={() => setClientSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Linha 3: filtro por equipe/funcionário (somente se houver equipes) */}
            {teamsWithMembers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <Select
                  value={filterTeamId}
                  onValueChange={(v) => { setFilterTeamId(v); setFilterMemberId("all"); }}
                >
                  <SelectTrigger className="h-7 text-xs border-gray-200 rounded-full px-3 w-auto min-w-[110px]">
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas equipes</SelectItem>
                    {teamsWithMembers.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterMemberId}
                  onValueChange={setFilterMemberId}
                >
                  <SelectTrigger className="h-7 text-xs border-gray-200 rounded-full px-3 w-auto min-w-[120px]">
                    <SelectValue placeholder="Funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filteredMemberOptions.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filterTeamId !== "all" || filterMemberId !== "all") && (
                  <button
                    onClick={() => { setFilterTeamId("all"); setFilterMemberId("all"); }}
                    className="h-7 w-7 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                    title="Limpar filtros"
                  >
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {statusFilter === "all" ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                    <CalendarDays className="h-8 w-8 text-blue-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Nenhum serviço agendado</p>
                  <p className="text-gray-400 text-sm mt-1">Clique em "Agendar" para adicionar um serviço</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-10 w-10 text-green-400 mb-3" />
                  <p className="text-gray-500">Nenhum serviço {statusFilter === "pending" ? "pendente" : "concluído"}</p>
                </>
              )}
            </div>
          ) : (() => {
            // Group orders by period
            const getperiod = (time: string | null) => {
              if (!time) return "sem_horario";
              const [h] = time.split(":").map(Number);
              if (h < 12) return "manha";
              if (h < 18) return "tarde";
              return "noite";
            };
            const periodConfig = [
              { key: "manha", label: "Manhã", icon: "☀️", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", range: "até 11:59" },
              { key: "tarde", label: "Tarde", icon: "🌤️", color: "text-orange-500", bg: "bg-orange-50 border-orange-200", range: "12:00 às 17:59" },
              { key: "noite", label: "Noite", icon: "🌙", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", range: "a partir das 18:00" },
              { key: "sem_horario", label: "Sem horário definido", icon: "🕐", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", range: "" },
            ];
            const grouped: Record<string, ExecutionOrder[]> = {};
            filteredOrders.forEach((o: ExecutionOrder) => {
              const p = getperiod(o.scheduledTime);
              if (!grouped[p]) grouped[p] = [];
              grouped[p].push(o);
            });
            const hasMultiplePeriods = Object.keys(grouped).length > 1;
            return (
              <div className="space-y-5">
                {periodConfig.map(({ key, label, icon, color, bg, range }) => {
                  const orders = grouped[key];
                  if (!orders || orders.length === 0) return null;
                  return (
                    <div key={key}>
                      {hasMultiplePeriods && (
                        <div className={`flex items-center gap-2 mb-2.5 px-3 py-1.5 rounded-lg border ${bg} w-fit`}>
                          <span className="text-base">{icon}</span>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>
                          {range && <span className="text-xs text-gray-400">({range})</span>}
                          <span className={`text-xs font-medium ${color} ml-1`}>{orders.length} {orders.length === 1 ? "serviço" : "serviços"}</span>
                        </div>
                      )}
                      <div className="space-y-3">
                        {orders.map((order: ExecutionOrder) => (
                          <ExecutionCard
                            key={order.id}
                            order={order}
                            onComplete={handleComplete}
                            onDetail={setSelectedOrder}
                            onDelete={setConfirmDeleteOrder}
                            serviceItemsTotal={(serviceItemsTotals as any)[order.id]}
                            upsellTotal={(upsellTotals as any)[order.id]}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modais */}
      {showFormModal && (
        <ExecutionFormModal
          defaultDate={selectedDate}
          onClose={() => setShowFormModal(false)}
          onSaved={() => {
            setShowFormModal(false);
            refetch();
            utils.execution.metrics.invalidate();
          }}
        />
      )}

      {selectedOrder && (
        <ExecutionDetailModal
          orderId={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onUpdated={() => {
            setSelectedOrder(null);
            refetch();
            utils.execution.metrics.invalidate();
          }}
        />
      )}

      {/* Modal de Conclusão com Pagamento */}
      {concludeOrder && (
        <ConcludeServiceModal
          orderId={concludeOrder.id}
          clientName={concludeOrder.clientName}
          totalValue={concludeOrder.totalValue}
          onClose={() => setConcludeOrder(null)}
          onConcluded={() => {
            setConcludeOrder(null);
            refetch();
            utils.execution.metrics.invalidate();
          }}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      {confirmDeleteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Excluir agendamento?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="text-sm font-medium text-gray-800">{confirmDeleteOrder.clientName}</p>
              {confirmDeleteOrder.serviceDescription && (
                <p className="text-xs text-gray-500 mt-0.5">{confirmDeleteOrder.serviceDescription}</p>
              )}
              {confirmDeleteOrder.scheduledDate && (
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(confirmDeleteOrder.scheduledDate)}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDeleteOrder(null)}
                disabled={deleteOrder.isPending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirm}
                disabled={deleteOrder.isPending}
              >
                {deleteOrder.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </FeatureGate>
  );
}
