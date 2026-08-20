import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Calendar, MapPin, Wrench, AlertCircle, Loader2, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(v: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
}

export default function ClientConfirmation() {
  const [token, setToken] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Extrair token da URL: /confirmar/:token
    const parts = window.location.pathname.split("/");
    const t = parts[parts.length - 1];
    if (t && t.length > 10) setToken(t);
  }, []);

  const { data: order, isLoading, error } = trpc.execution.getByToken.useQuery(
    { token },
    { enabled: token.length > 10 }
  );

  const confirmMutation = trpc.execution.confirmByToken.useMutation({
    onSuccess: () => setConfirmed(true),
  });

  if (!token || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Carregando detalhes do agendamento...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-gray-500 text-sm">
            Este link de confirmação não existe ou já expirou. Entre em contato com a empresa para mais informações.
          </p>
        </div>
      </div>
    );
  }

  const [y, m, d] = order.scheduledDate.split("-");
  const formattedDate = `${d}/${m}/${y}`;
  const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dateObj = new Date(`${order.scheduledDate}T12:00:00`);
  const weekday = weekdays[dateObj.getDay()];

  const address = [order.street, order.addressNumber, order.complement, order.neighborhood, order.city, order.state]
    .filter(Boolean).join(", ");

  if (confirmed || order.clientConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmado!</h1>
          <p className="text-gray-600 mb-4">
            Obrigado, <strong>{order.clientName}</strong>! Seu agendamento está confirmado para{" "}
            <strong>{weekday}, {formattedDate}</strong>
            {order.scheduledTime ? ` às ${order.scheduledTime}` : ""}.
          </p>
          <p className="text-sm text-gray-400">
            Nosso técnico estará no local no horário combinado. Qualquer dúvida, entre em contato conosco.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white text-center">
          <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Agendamento de Serviço</h1>
          <p className="text-blue-100 text-sm mt-1">Confirme os detalhes do seu serviço</p>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4">
          {/* Cliente */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-lg font-bold text-gray-900">{order.clientName}</p>
            {order.clientPhone && (
              <p className="text-sm text-gray-500">{order.clientPhone}</p>
            )}
          </div>

          {/* Data e Horário */}
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</p>
              </div>
              <p className="font-bold text-gray-900">{formattedDate}</p>
              <p className="text-sm text-gray-500">{weekday}</p>
            </div>
            {order.scheduledTime && (
              <div className="flex-1 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-indigo-500 text-sm">⏰</span>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horário</p>
                </div>
                <p className="font-bold text-gray-900">{order.scheduledTime}</p>
              </div>
            )}
          </div>

          {/* Técnico */}
          {order.assignedTo && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Técnico Responsável</p>
              </div>
              <p className="font-semibold text-gray-900">{order.assignedTo}</p>
            </div>
          )}

          {/* Endereço */}
          {address && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-red-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Local do Serviço</p>
              </div>
              <p className="text-sm text-gray-700">{address}</p>
            </div>
          )}

          {/* Serviços */}
          {order.serviceDescription && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-blue-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviços</p>
              </div>
              <p className="text-sm text-gray-700">{order.serviceDescription}</p>
              {order.totalValue && parseFloat(order.totalValue) > 0 && (
                <p className="text-base font-bold text-green-600 mt-2">{fmt(order.totalValue)}</p>
              )}
            </div>
          )}

          {/* Observações */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-yellow-800">{order.notes}</p>
            </div>
          )}

          {/* Botão de confirmação */}
          <Button
            onClick={() => confirmMutation.mutate({ token })}
            disabled={confirmMutation.isPending}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-base"
          >
            {confirmMutation.isPending ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Confirmando...</>
            ) : (
              <><CheckCircle2 className="h-5 w-5 mr-2" /> Confirmar Presença</>
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Ao confirmar, você está ciente dos detalhes do serviço acima.
          </p>
        </div>
      </div>
    </div>
  );
}
