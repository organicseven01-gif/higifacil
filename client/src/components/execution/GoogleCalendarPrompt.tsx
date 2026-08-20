/**
 * GoogleCalendarPrompt
 * Modal que aparece após criar um agendamento, perguntando se o usuário
 * quer salvar o evento no Google Agenda como backup.
 */
import { Calendar, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  calendarUrl: string;
  onClose: () => void;
}

export default function GoogleCalendarPrompt({ calendarUrl, onClose }: Props) {
  function handleSave() {
    window.open(calendarUrl, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ícone */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mx-auto">
          <Calendar className="w-7 h-7 text-blue-600" />
        </div>

        {/* Texto */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Salvar no Google Agenda?
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Crie um backup do agendamento no Google Agenda. Assim, mesmo se o sistema ficar fora do ar, você ainda tem acesso à sua agenda.
          </p>
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Sim, abrir Google Agenda
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700"
          >
            Agora não
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Abre em nova aba · Não sai do Higifácil
        </p>
      </div>
    </div>
  );
}
