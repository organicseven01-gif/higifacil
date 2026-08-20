import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Phone, CheckCircle2, Clock, MessageCircle, ChevronDown, ChevronUp, Navigation, User, Wrench, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

function formatCurrency(value: number | string | null | undefined) {
  const num = parseFloat(String(value || 0));
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function formatPhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

function openWhatsApp(phone: string, name: string, address: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = encodeURIComponent(`Olá ${name}! Estou a caminho para realizar o serviço no endereço: ${address}. Qualquer dúvida, pode chamar!`);
  window.open(`https://wa.me/${number}?text=${msg}`, "_blank");
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
}

export default function TechPanel() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const { data: orders = [], refetch } = trpc.execution.list.useQuery(
    { date: today },
    { refetchInterval: 30000 } // atualiza a cada 30s
  );

  const updateStatusMutation = trpc.execution.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const filtered = orders.filter(o => {
    if (filter === "pending") return o.status === "pending";
    if (filter === "done") return o.status === "done";
    return true;
  });

  const totalPending = orders.filter(o => o.status === "pending").length;
  const totalDone = orders.filter(o => o.status === "done").length;
  const totalValue = orders.reduce((sum, o) => sum + parseFloat(String(o.totalValue || 0)), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-700 to-blue-900 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold">Painel do Técnico</h1>
            <p className="text-blue-200 text-xs capitalize">{formatDate(today)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200">Olá,</p>
            <p className="text-sm font-semibold">{user?.name?.split(" ")[0] || "Técnico"}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <p className="text-xl font-bold">{orders.length}</p>
            <p className="text-xs text-blue-200">Total</p>
          </div>
          <div className="bg-amber-500/30 rounded-xl p-2 text-center">
            <p className="text-xl font-bold text-amber-200">{totalPending}</p>
            <p className="text-xs text-blue-200">Pendentes</p>
          </div>
          <div className="bg-green-500/30 rounded-xl p-2 text-center">
            <p className="text-xl font-bold text-green-200">{totalDone}</p>
            <p className="text-xs text-blue-200">Concluídos</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 sticky top-[140px] z-20">
        {(["all", "pending", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Concluídos"}
          </button>
        ))}
      </div>

      {/* Lista de OS */}
      <div className="px-4 py-3 space-y-3 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {filter === "done" ? "Nenhuma OS concluída ainda" : "Nenhuma OS para hoje"}
            </p>
          </div>
        ) : (
          filtered.map((order, index) => {
            const isDone = order.status === "done";
            const isExpanded = expandedId === order.id;
            const address = [
              order.street,
              order.addressNumber,
              order.neighborhood,
              order.city,
            ].filter(Boolean).join(", ") || "";

            return (
              <div
                key={order.id}
                className={`rounded-2xl overflow-hidden shadow-sm border transition-all ${
                  isDone
                    ? "bg-green-50 border-green-200 opacity-80"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Número e status */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isDone ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {isDone ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{order.clientName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{order.scheduledTime || "Sem horário"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isDone ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {isDone ? "Concluído" : "Pendente"}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Serviço e endereço resumido */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <Wrench className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-600 line-clamp-1">{order.serviceDescription || "Serviço não especificado"}</p>
                    </div>
                    {address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-600 line-clamp-1">{address}</p>
                      </div>
                    )}
                    {order.totalValue && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <p className="text-xs font-semibold text-gray-700">{formatCurrency(order.totalValue)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    {/* Dados do cliente */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do Cliente</p>
                      <div className="bg-white rounded-xl p-3 space-y-2 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">{order.clientName}</span>
                        </div>
                        {order.clientPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">{formatPhone(order.clientPhone)}</span>
                          </div>
                        )}
                        {address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                            <span className="text-sm">{address}</span>
                          </div>
                        )}
                        {order.notes && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                            <span className="text-sm text-amber-700">{order.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações rápidas */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</p>
                      <div className="grid grid-cols-2 gap-2">
                        {address && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 h-11"
                            onClick={() => openMaps(address)}
                          >
                            <Navigation className="h-4 w-4" />
                            Navegar
                          </Button>
                        )}
                        {order.clientPhone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-green-700 border-green-200 bg-green-50 hover:bg-green-100 h-11"
                            onClick={() => openWhatsApp(order.clientPhone!, order.clientName, address)}
                          >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Toggle de status */}
                    <Button
                      className={`w-full h-12 text-sm font-semibold gap-2 rounded-xl ${
                        isDone
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                      onClick={() => {
                        updateStatusMutation.mutate({
                          id: order.id,
                          status: isDone ? "pending" : "done",
                        });
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      {isDone ? (
                        <><Clock className="h-4 w-4" /> Reabrir OS</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4" /> Marcar como Concluído</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé com total do dia */}
      {orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Valor do dia</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Progresso</p>
              <p className="text-sm font-semibold text-gray-700">{totalDone}/{orders.length} concluídos</p>
            </div>
          </div>
          {orders.length > 0 && (
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(totalDone / orders.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
