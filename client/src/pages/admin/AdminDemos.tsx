import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar, Clock, Phone, MapPin, CheckCircle2, XCircle, UserX, Loader2, Trash2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Realizada</Badge>;
  if (status === "no_show") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Não compareceu</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelada</Badge>;
  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pendente</Badge>;
}

export default function AdminDemos() {
  const [statusFilter, setStatusFilter] = useState("all");
  const utils = trpc.useUtils();

  const { data: metrics } = trpc.demoBookings.metrics.useQuery();
  const { data: bookings = [], isLoading, refetch } = trpc.demoBookings.list.useQuery(
    { status: statusFilter },
    { refetchOnWindowFocus: false }
  );

  const updateStatus = trpc.demoBookings.updateStatus.useMutation({
    onSuccess: () => {
      utils.demoBookings.list.invalidate();
      utils.demoBookings.metrics.invalidate();
      toast.success("Status atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const deleteBooking = trpc.demoBookings.delete.useMutation({
    onSuccess: () => {
      utils.demoBookings.list.invalidate();
      utils.demoBookings.metrics.invalidate();
      toast.success("Agendamento excluído!");
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const waLink = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    const num = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${num}`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Demonstrações Agendadas</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie os agendamentos de demonstração do Higifácil</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: metrics?.total ?? 0, color: "bg-blue-500/20 text-blue-400" },
            { label: "Hoje", value: metrics?.today ?? 0, color: "bg-purple-500/20 text-purple-400" },
            { label: "Esta semana", value: metrics?.thisWeek ?? 0, color: "bg-cyan-500/20 text-cyan-400" },
            { label: "Pendentes", value: metrics?.pending ?? 0, color: "bg-amber-500/20 text-amber-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color.split(" ")[1]}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="done">Realizadas</SelectItem>
              <SelectItem value="no_show">Não compareceu</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-500 text-sm">{bookings.length} agendamento{bookings.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhum agendamento encontrado</p>
            <p className="text-slate-600 text-sm mt-1">Os agendamentos feitos na landing page aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(bookings as any[]).map((b: any) => (
              <div key={b.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-base">{b.name}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {formatDateBR(b.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {b.scheduled_time}
                      </span>
                      <a
                        href={waLink(b.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {b.whatsapp}
                      </a>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {b.city}
                      </span>
                    </div>
                    {b.notes && (
                      <p className="text-slate-500 text-xs mt-2 italic">"{b.notes}"</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "done" })}
                          disabled={updateStatus.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Realizada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "no_show" })}
                          disabled={updateStatus.isPending}
                          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs h-8 px-3"
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" /> Faltou
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}
                          disabled={updateStatus.isPending}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8 px-3"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                      </>
                    )}
                    {b.status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: b.id, status: "pending" })}
                        disabled={updateStatus.isPending}
                        className="border-slate-600 text-slate-400 hover:bg-slate-700 text-xs h-8 px-3"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reabrir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Excluir este agendamento?")) deleteBooking.mutate({ id: b.id });
                      }}
                      disabled={deleteBooking.isPending}
                      className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
