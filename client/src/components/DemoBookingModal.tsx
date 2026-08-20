import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Calendar, Clock, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  onClose: () => void;
}

export default function DemoBookingModal({ onClose }: Props) {
  const today = useMemo(() => toLocalDateStr(new Date()), []);
  const [step, setStep] = useState<"form" | "date" | "time" | "success">("form");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { data: slots = [], isLoading: loadingSlots } = trpc.demoBookings.availableSlots.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  const bookMutation = trpc.demoBookings.book.useMutation({
    onSuccess: () => setStep("success"),
    onError: (err) => toast.error(err.message || "Erro ao agendar. Tente novamente."),
  });

  // Gerar dias do calendário
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(toLocalDateStr(new Date(year, month, d)));
    }
    return days;
  }, [calendarMonth]);

  const handleFormNext = () => {
    if (!name.trim() || !whatsapp.trim() || !city.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setStep("date");
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
    setStep("time");
  };

  const handleConfirm = () => {
    if (!selectedTime) return;
    bookMutation.mutate({ name, whatsapp, city, scheduledDate: selectedDate, scheduledTime: selectedTime });
  };

  const prevMonth = () => {
    setCalendarMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const nextMonth = () => {
    setCalendarMonth(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#0A1628" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Agendar demonstração</h2>
            <p className="text-white/50 text-xs mt-0.5">Gratuita · 1 hora · Online</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Step indicator */}
          {step !== "success" && (
            <div className="flex items-center gap-2 mb-5">
              {["form", "date", "time"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? "text-white" : ["form", "date", "time"].indexOf(step) > i ? "text-white" : "text-white/30"
                  }`} style={{
                    background: step === s ? "#1A9FE3" : ["form", "date", "time"].indexOf(step) > i ? "#1A9FE3" : "rgba(255,255,255,0.1)"
                  }}>
                    {["form", "date", "time"].indexOf(step) > i ? "✓" : i + 1}
                  </div>
                  {i < 2 && <div className={`h-px flex-1 w-8 transition-all`} style={{ background: ["form", "date", "time"].indexOf(step) > i ? "#1A9FE3" : "rgba(255,255,255,0.1)" }} />}
                </div>
              ))}
              <span className="text-white/40 text-xs ml-1">
                {step === "form" ? "Seus dados" : step === "date" ? "Escolha a data" : "Escolha o horário"}
              </span>
            </div>
          )}

          {/* Step 1: Dados */}
          {step === "form" && (
            <div className="space-y-4">
              <div>
                <Label className="text-white/70 text-xs mb-1.5 block">Nome completo</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400"
                />
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1.5 block">WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400"
                />
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1.5 block">Cidade</Label>
                <Input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Sua cidade"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400"
                />
              </div>
              <Button
                onClick={handleFormNext}
                className="w-full font-semibold text-white mt-2"
                style={{ background: "#1A9FE3" }}
              >
                Próximo: escolher data <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Calendário */}
          {step === "date" && (
            <div>
              <button onClick={() => setStep("form")} className="flex items-center gap-1 text-white/50 hover:text-white text-xs mb-4 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </button>
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="text-white/50 hover:text-white transition-colors p-1">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-white font-semibold text-sm">
                  {MONTHS_PT[calendarMonth.month]} {calendarMonth.year}
                </span>
                <button onClick={nextMonth} className="text-white/50 hover:text-white transition-colors p-1">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_PT.map(d => (
                  <div key={d} className="text-center text-white/30 text-xs py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const isPast = date < today;
                  const isSelected = date === selectedDate;
                  return (
                    <button
                      key={date}
                      disabled={isPast}
                      onClick={() => handleDateSelect(date)}
                      className={`rounded-lg py-2 text-xs font-medium transition-all ${
                        isPast ? "text-white/20 cursor-not-allowed" :
                        isSelected ? "text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                      style={isSelected ? { background: "#1A9FE3" } : {}}
                    >
                      {date.split("-")[2]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Horários */}
          {step === "time" && (
            <div>
              <button onClick={() => setStep("date")} className="flex items-center gap-1 text-white/50 hover:text-white text-xs mb-4 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </button>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-white/70 text-sm">{formatDateBR(selectedDate)}</span>
              </div>
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {slots.map(({ time, available }) => (
                    <button
                      key={time}
                      disabled={!available}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                        !available ? "text-white/20 cursor-not-allowed line-through" :
                        selectedTime === time ? "text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                      }`}
                      style={selectedTime === time ? { background: "#1A9FE3", border: "none" } : {}}
                    >
                      <Clock className="h-3 w-3 inline mr-1 opacity-60" />{time}
                    </button>
                  ))}
                </div>
              )}
              <Button
                onClick={handleConfirm}
                disabled={!selectedTime || bookMutation.isPending}
                className="w-full font-semibold text-white"
                style={{ background: "#1A9FE3" }}
              >
                {bookMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar agendamento
              </Button>
            </div>
          )}

          {/* Sucesso */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(26,159,227,0.15)" }}>
                <CheckCircle2 className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Demonstração agendada!</h3>
              <p className="text-white/60 text-sm mb-1">
                {formatDateBR(selectedDate)} às {selectedTime}
              </p>
              <p className="text-white/40 text-xs mb-6">
                Entraremos em contato pelo WhatsApp para confirmar.
              </p>
              <Button onClick={onClose} className="font-semibold text-white" style={{ background: "#1A9FE3" }}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
