import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import ExecutionFormModal from "@/components/execution/ExecutionFormModal";
import FirstAccessModal from "@/components/FirstAccessModal";
import HelpModal from "@/components/HelpModal";
import HelpButton from "@/components/HelpButton";
import {
  FileText, Users, TrendingUp, PlusCircle, Eye,
  CreditCard, ShoppingCart, DollarSign, Clock, CheckCircle2, Waves,
  ChevronLeft, ChevronRight, Armchair, Tag, BarChart2, Wallet,
  CalendarDays, MapPin, Phone, ArrowRight, Plus, Settings, X, Send, MessageCircle,
  AlertTriangle, Timer,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, ComposedChart,
} from "recharts";

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

const statusLabels: Record<string, string> = {
  pending: "Pendente", sent: "Enviado", accepted: "Aceito", rejected: "Recusado",
};
const statusClass: Record<string, string> = {
  pending: "badge-pending", sent: "badge-sent", accepted: "badge-accepted", rejected: "badge-rejected",
};

const PIE_COLORS: Record<string, string> = {
  accepted: "#22c55e", pending: "#f59e0b", sent: "#3b82f6", rejected: "#ef4444",
};
const PAYMENT_COLORS: Record<string, string> = {
  pix: "#3b82f6", cash: "#22c55e", boleto: "#f59e0b", card: "#8b5cf6",
};
const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX", cash: "Dinheiro", boleto: "Boleto", card: "Cartão",
};

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTH_NAMES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">{value} orçamento{value !== 1 ? "s" : ""}</p>
      <p className="font-medium" style={{ color: PIE_COLORS[p.key] }}>{p.percent}%</p>
    </div>
  );
}

function PaymentTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="font-medium text-green-600">{formatCurrency(value)}</p>
    </div>
  );
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}


/** Botões de checkout para o modal de planos no Dashboard */
function PlansCheckoutButtons({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState<"solo" | "equipe" | null>(null);
  const checkoutMutation = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      setLoading(null);
      if (data.url) window.open(data.url, "_blank");
      onClose();
    },
    onError: (e) => {
      setLoading(null);
      toast.error("Erro ao iniciar pagamento: " + e.message);
    },
  });
  function handleCheckout(plan: "solo" | "equipe") {
    setLoading(plan);
    checkoutMutation.mutate({ plan, origin: window.location.origin });
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        className="w-full h-11 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: "#1A9FE3" }}
        onClick={() => handleCheckout("equipe")}
        disabled={!!loading}
      >
        {loading === "equipe" ? "Redirecionando..." : <>Assinar Anual — R$ 490/ano <ArrowRight className="h-4 w-4" /></>}
      </button>
      <button
        className="w-full h-10 rounded-xl font-medium text-sm border text-slate-300 bg-transparent hover:bg-slate-800 transition-colors disabled:opacity-60"
        style={{ borderColor: "rgba(255,255,255,0.15)" }}
        onClick={() => handleCheckout("solo")}
        disabled={!!loading}
      >
        {loading === "solo" ? "Redirecionando..." : "Assinar Mensal — R$ 49,90/mês"}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ── Configuração de widgets ──────────────────────────────────────────────────
  const DEFAULT_WIDGETS = {
    meta: true,
    agenda: true,
    kpis: true,
    graficos: true,
    orcamentosRecentes: true,
  };
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [widgets, setWidgets] = useState<typeof DEFAULT_WIDGETS>(() => {
    try {
      const saved = localStorage.getItem('dashboard_widgets');
      return saved ? { ...DEFAULT_WIDGETS, ...JSON.parse(saved) } : DEFAULT_WIDGETS;
    } catch { return DEFAULT_WIDGETS; }
  });
  function toggleWidget(key: keyof typeof DEFAULT_WIDGETS) {
    setWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboard_widgets', JSON.stringify(next));
      return next;
    });
  }

  // ── Filtro de período ─────────────────────────────────────────────────────────
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth()); // 0-11
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const startDate = useMemo(() => new Date(filterYear, filterMonth, 1), [filterMonth, filterYear]);
  const endDate = useMemo(() => new Date(filterYear, filterMonth + 1, 0, 23, 59, 59), [filterMonth, filterYear]);

  function prevMonth() {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrentMonth = filterMonth === now.getMonth() && filterYear === now.getFullYear();
    if (isCurrentMonth) return;
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  }
  const isCurrentMonth = filterMonth === now.getMonth() && filterYear === now.getFullYear();

  // ── Queries com filtro de período ────────────────────────────────────────────
  const { data: allSales = [] } = trpc.sales.list.useQuery({});
  const { data: filteredSales = [] } = trpc.sales.list.useQuery({ startDate, endDate });
  const { data: budgets = [] } = trpc.budgets.list.useQuery({});
  const { data: clients = [] } = trpc.clients.list.useQuery({});
  const { data: saleMetrics } = trpc.sales.metrics.useQuery();
  const { data: appSettings } = trpc.settings.get.useQuery();
  // ── Trial / Subscription ──────────────────────────────────────────────────
  const { data: subData } = trpc.stripe.getSubscriptionDetails.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const trialDaysLeft = useMemo(() => {
    if (!subData?.trialEndsAt || subData?.trialExpired) return null;
    const diff = new Date(subData.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subData]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const { data: pendingData } = trpc.sales.pending.useQuery({});
  const { data: servicesData = [] } = trpc.services.list.useQuery({ activeOnly: true });


  // ── Onboarding checklist ──────────────────────────────────────────────────────
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    return localStorage.getItem('onboarding_dismissed') === 'true';
  });
  const onboardingSteps = useMemo(() => [
    {
      id: 'company',
      label: 'Dados da empresa preenchidos',
      description: 'Nome, telefone e cidade da empresa',
      done: !!(appSettings?.company_name && appSettings?.company_phone),
      href: '/configuracoes',
    },
    {
      id: 'budget_template',
      label: 'Tipo de orçamento preferido',
      description: 'Escolha entre Premium, WhatsApp ou Profissional',
      done: !!(appSettings?.budget_template),
      href: '/configuracoes',
    },
    {
      id: 'budget',
      label: 'Primeiro orçamento criado',
      description: 'Teste o sistema criando um orçamento',
      done: budgets.length > 0,
      href: '/orcamentos/novo',
    },
  ], [appSettings, budgets]);
  const onboardingCompleted = onboardingSteps.every((s) => s.done);
  const onboardingProgress = onboardingSteps.filter((s) => s.done).length;

  // ── Budget metrics (filtrados pelo período) ──────────────────────────────────
  const filteredBudgets = useMemo(() => budgets.filter((b) => {
    const d = new Date(b.createdAt);
    return d >= startDate && d <= endDate;
  }), [budgets, startDate, endDate]);

  const acceptedBudgets = filteredBudgets.filter((b) => b.status === "accepted").length;
  const conversionRate = filteredBudgets.length > 0 ? Math.round((acceptedBudgets / filteredBudgets.length) * 100) : 0;
  const recentBudgets = [...budgets].slice(0, 5);

  // ── Sales metrics (filtrados pelo período) ───────────────────────────────────
  const totalRevenue = filteredSales.reduce((sum, s) => sum + parseFloat(String(s.total) || "0"), 0);
  const paidSales = filteredSales.filter((s) => s.paymentStatus === "paid");
  const paidRevenue = paidSales.reduce((sum, s) => sum + parseFloat(String(s.total) || "0"), 0);
  // A Receber: GLOBAL — todas as vendas pendentes ou parciais, sem filtro de mês
  const allPendingSales = allSales.filter((s) => s.paymentStatus === "pending" || s.paymentStatus === "partial");
  const pendingRevenue = allPendingSales.reduce((sum, s) => {
    const total = parseFloat(String(s.total) || "0");
    const received = parseFloat(String(s.amountReceived) || "0");
    return sum + Math.max(0, total - received);
  }, 0);

  // ── Calendário semanal de execução ─────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calSelectedDate, setCalSelectedDate] = useState(today);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const calBaseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + calWeekOffset * 7);
    return d;
  }, [calWeekOffset]);
  const calWeekDates = useMemo(() => {
    const dates: string[] = [];
    const day = calBaseDate.getDay();
    const monday = new Date(calBaseDate);
    monday.setDate(calBaseDate.getDate() - day + (day === 0 ? -6 : 1));
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [calBaseDate]);
  const { data: calWeekOrders = [] } = trpc.execution.list.useQuery(
    { startDate: calWeekDates[0], endDate: calWeekDates[6] },
    { refetchOnWindowFocus: false }
  );
  const { data: calDayOrders = [] } = trpc.execution.list.useQuery(
    { date: calSelectedDate },
    { refetchOnWindowFocus: false }
  );
  const calCountByDate = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const o of calWeekOrders as any[]) {
      if (!map[o.scheduledDate]) map[o.scheduledDate] = { total: 0, done: 0 };
      map[o.scheduledDate].total++;
      if (o.status === 'done') map[o.scheduledDate].done++;
    }
    return map;
  }, [calWeekOrders]);

  // ── Weekly execution orders ──────────────────────────────────────────
  const { data: weeklyOrders = [] } = trpc.execution.weeklyOrders.useQuery();
  const { data: weeklyStats } = trpc.execution.weeklyStats.useQuery();

  // ── Modais extrasextras ─────────────────────────────────────────────────────────
  // ── Modal de primeiro acesso (pós-compra) ─────────────────────────────────
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("primeiro_acesso") === "true";
  });

  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalMethod, setPaymentModalMethod] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { data: pendingWeeklyList = [] } = trpc.weeklySummary.pendingList.useQuery();
  const { data: upsellListData = [] } = trpc.execution.upsellList.useQuery({
    month: String(filterMonth + 1),
    year: String(filterYear),
  });

  // ── Resumo semanal ────────────────────────────────────────────────────────
  const weeklySummaryMutation = trpc.weeklySummary.send.useMutation({
    onSuccess: (res) => {
      if (res.count === 0) {
        toast.info('Nenhum orçamento pendente esta semana.');
      } else {
        toast.success(`Resumo enviado! ${res.count} orçamento(s) pendente(s) notificados.`);
      }
    },
    onError: () => toast.error('Erro ao enviar resumo semanal'),
  });

  // ── Contagem de vendas do mês (filtradas pelo período) ───────────────────────
  const thisMonthSalesCount = filteredSales.filter(s => s.transactionType === 'receita').length;

  // ── Meta mensal: popup de início de mês ────────────────────────────────────
  const [showGoalSetModal, setShowGoalSetModal] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState('');
  const saveGoalMutation = trpc.settings.save.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      setShowGoalSetModal(false);
      toast.success('Meta do mês definida! 🎯');
    },
    onError: () => toast.error('Erro ao salvar meta'),
  });
  // Detectar início de mês: mostrar popup se ainda não perguntou neste mês
  useEffect(() => {
    if (!appSettings) return;
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    const storageKey = `goal_asked_${todayYear}_${todayMonth}`;
    const alreadyAsked = localStorage.getItem(storageKey) === 'true';
    if (alreadyAsked) return;
    // Só mostra entre os dias 1 e 5 do mês
    const dayOfMonth = now.getDate();
    if (dayOfMonth > 5) return;
    localStorage.setItem(storageKey, 'true');
    setTimeout(() => setShowGoalSetModal(true), 1500);
  }, [appSettings]);

  // ── Celebração de meta ─────────────────────────────────────────────────────
  const [showGoalModal, setShowGoalModal] = useState(false);
  const goalCelebrationFired = useRef(false);

  const fireGoalCelebration = useCallback(() => {
    // Confetes em rajadas
    const duration = 4000;
    const end = Date.now() + duration;
    const colors = ['#22c55e', '#16a34a', '#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6'];
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    // Confete central
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors, startVelocity: 45 });
    // Som de celebração via Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playNote = (freq: number, start: number, dur: number, vol = 0.3) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      // Melodia de vitória
      playNote(523, 0, 0.15);    // C5
      playNote(659, 0.15, 0.15); // E5
      playNote(784, 0.3, 0.15);  // G5
      playNote(1047, 0.45, 0.4); // C6
      playNote(784, 0.85, 0.15); // G5
      playNote(1047, 1.0, 0.6);  // C6
    } catch (_) { /* silencia erros de audio */ }
    setShowGoalModal(true);
  }, []);

  // Dispara celebração quando a meta é atingida pela primeira vez na sessão
  const goal = parseFloat((appSettings as any)?.monthly_goal ?? "0") || 0;
  // Usa totalRevenue calculado de filteredSales para respeitar o filtro de período
  const currentRevenue = totalRevenue;
  const isGoalReachedGlobal = goal > 0 && currentRevenue >= goal;
  useEffect(() => {
    if (isGoalReachedGlobal && !goalCelebrationFired.current && appSettings) {
      goalCelebrationFired.current = true;
      // Pequeno delay para o componente estar montado
      setTimeout(() => fireGoalCelebration(), 800);
    }
  }, [isGoalReachedGlobal, appSettings, fireGoalCelebration]);

  // ── CRM: clientes para contatar hoje ─────────────────────────────────────────
  const { data: todayReactivations = [] } = trpc.crm.todayReactivations.useQuery();
  const reactivationCount = (todayReactivations as any[]).length;

  // ── Execution dashboard metrics ─────────────────────────────────────────────
  const { data: execMetrics } = trpc.execution.dashboardMetrics.useQuery({
    month: String(filterMonth + 1),
    year: String(filterYear),
  });

  // ── Pie chart (status orçamentos do período) ─────────────────────────────────
  const pieData = useMemo(() => {
    const counts: Record<string, number> = { accepted: 0, pending: 0, sent: 0, rejected: 0 };
    filteredBudgets.forEach((b) => { if (counts[b.status] !== undefined) counts[b.status]++; });
    const total = filteredBudgets.length || 1;
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        key, name: statusLabels[key], value,
        percent: Math.round((value / total) * 100),
      }));
  }, [filteredBudgets]);

  // ── Monthly bar chart (últimos 6 meses, sempre mostra histórico) ─────────────
  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const y = d.getFullYear(); const m = d.getMonth();
      const inMonth = budgets.filter((b) => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === y && bd.getMonth() === m;
      });
      return {
        month: MONTH_NAMES[m],
        Aceitos: inMonth.filter((b) => b.status === "accepted").length,
        Recusados: inMonth.filter((b) => b.status === "rejected").length,
        Pendentes: inMonth.filter((b) => ["pending", "sent"].includes(b.status)).length,
      };
    });
  }, [budgets]);

  // ── Payment method breakdown (dados do período filtrado) ─────────────────────
  const paymentData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const method = s.paymentMethod || "pix";
      // Agrupa todos os tipos de cartão em "card"
      const key = method.startsWith("card") ? "card" : method;
      totals[key] = (totals[key] || 0) + parseFloat(String(s.total) || "0");
    });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, name: PAYMENT_LABELS[key] || key, value }));
  }, [filteredSales]);

  return (
    <>
    {showFirstAccessModal && (
      <FirstAccessModal onDismiss={() => setShowFirstAccessModal(false)} />
    )}

    {/* ── MODAL DE AJUDA ──────────────────────────────────────────────────────── */}
    <HelpModal
      isOpen={showHelpModal}
      onClose={() => setShowHelpModal(false)}
      title="Ajuda - Dashboard"
      videoUrl="" // Adicione a URL do vídeo aqui
    />

      {/* ── MODAL DE PLANOS (trial) ──────────────────────────────────────────────── */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,22,40,0.92)" }}>
          <div className="relative w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: "#0d1f3c", border: "1px solid rgba(26,159,227,0.3)" }}>
            {/* Fechar */}
            <button
              onClick={() => setShowPlansModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Cabeçalho */}
            <div className="text-center space-y-1 pt-1">
              <h2 className="text-xl font-bold text-white">Escolha seu plano</h2>
              <p className="text-sm text-slate-400">
                {trialDaysLeft !== null && trialDaysLeft <= 3
                  ? "Seu período gratuito está acabando. Assine agora para não perder o acesso."
                  : "Continue usando o Higifácil após o período gratuito."}
              </p>
            </div>
            {/* Cards de plano */}
            <div className="grid grid-cols-2 gap-3">
              {/* Mensal */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Mensal</div>
                  <div className="text-xl font-bold text-white leading-none">R$ 49<span className="text-sm font-normal text-slate-400">,90</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">por mês</div>
                </div>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>✓ Orçamentos ilimitados</li>
                  <li>✓ Clientes e serviços</li>
                  <li>✓ Controle financeiro</li>
                  <li>✓ Agenda e execução</li>
                </ul>
              </div>
              {/* Anual — destaque com economia exata */}
              <div className="rounded-xl p-4 space-y-3 relative overflow-hidden" style={{ background: "rgba(26,159,227,0.12)", border: "2px solid rgba(26,159,227,0.5)" }}>
                {/* Tag de economia */}
                <div
                  className="absolute -top-0 -right-0 text-[10px] font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl"
                  style={{ background: "#22c55e", color: "white", letterSpacing: "0.02em" }}
                >
                  18% OFF
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#1A9FE3" }}>Anual</div>
                  <div className="text-xl font-bold text-white leading-none">R$ 490<span className="text-sm font-normal text-slate-400">/ano</span></div>
                  <div className="text-xs mt-0.5" style={{ color: "#1A9FE3" }}>
                    R$ 40,83/mês · economize R$ 108,80
                  </div>
                </div>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>✓ Tudo do Mensal</li>
                  <li className="font-medium" style={{ color: "#22c55e" }}>✓ +2 meses grátis</li>
                  <li>✓ Suporte prioritário</li>
                  <li>✓ Onboarding guiado</li>
                </ul>
              </div>
            </div>
            {/* Botões de checkout */}
            <PlansCheckoutButtons onClose={() => setShowPlansModal(false)} />
            {/* Rodapé */}
            <p className="text-center text-xs text-slate-500">
              Dúvidas? Fale pelo WhatsApp{" "}
              <a href="https://wa.me/5582998383003" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">(82) 99838-3003</a>
            </p>
          </div>
        </div>
      )}
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── BOTÃO DE AJUDA ─────────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <HelpButton onClick={() => setShowHelpModal(true)} />
        </div>

        {/* ── BANNER DE TRIAL REGRESSIVO ─────────────────────────────────────────── */}
        {subData && !subData.trialExpired && subData.planType === "free" && trialDaysLeft !== null && (
          <div
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{
              background: trialDaysLeft <= 3
                ? "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.08) 100%)"
                : trialDaysLeft <= 7
                ? "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.08) 100%)"
                : "linear-gradient(135deg, rgba(26,159,227,0.15) 0%, rgba(26,159,227,0.08) 100%)",
              border: `1px solid ${
                trialDaysLeft <= 3 ? "rgba(239,68,68,0.4)"
                : trialDaysLeft <= 7 ? "rgba(245,158,11,0.4)"
                : "rgba(26,159,227,0.3)"
              }`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: trialDaysLeft <= 3 ? "rgba(239,68,68,0.2)" : trialDaysLeft <= 7 ? "rgba(245,158,11,0.2)" : "rgba(26,159,227,0.2)",
                }}
              >
                {trialDaysLeft <= 7
                  ? <AlertTriangle className="h-4 w-4" style={{ color: trialDaysLeft <= 3 ? "#ef4444" : "#f59e0b" }} />
                  : <Timer className="h-4 w-4" style={{ color: "#1A9FE3" }} />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {trialDaysLeft === 0
                    ? "Seu período gratuito expira hoje!"
                    : trialDaysLeft === 1
                    ? "Último dia de acesso gratuito!"
                    : `${trialDaysLeft} dias restantes de acesso gratuito`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trialDaysLeft <= 3
                    ? "Assine agora para não perder o acesso ao sistema."
                    : "Assine um plano para continuar usando após o período de teste."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPlansModal(true)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: trialDaysLeft <= 3 ? "#ef4444" : trialDaysLeft <= 7 ? "#f59e0b" : "#1A9FE3",
                color: "white",
              }}
            >
              Ver planos
            </button>
          </div>
        )}

        {/* ── HEADER com filtro de período ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {appSettings?.owner_name
                ? `Olá, ${appSettings.owner_name.split(' ')[0]}! 👋`
                : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {appSettings?.company_name
                ? appSettings.company_name
                : 'Visão geral do seu negócio'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Seletor de período */}
            <div className="flex items-center gap-1 bg-white border border-border rounded-xl px-3 py-2 shadow-sm">
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
                {MONTH_NAMES_FULL[filterMonth]} {filterYear}
              </span>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <button
              onClick={() => setShowWidgetConfig(true)}
              className="p-2 rounded-xl border border-border bg-white hover:bg-muted transition-colors shadow-sm"
              title="Configurar widgets"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setLocation("/orcamentos/novo")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
            >
              <PlusCircle className="h-4 w-4" />
              Novo Orçamento
            </button>
          </div>
        </div>

        {/* ── ONBOARDING CHECKLIST ─────────────────────────────────────── */}
        {!onboardingDismissed && !onboardingCompleted && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🚀</span>
                  <h3 className="font-bold text-foreground">Configure sua conta</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {onboardingProgress}/4 concluídos
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Complete os passos abaixo para começar a usar o sistema</p>
                {/* Barra de progresso */}
                <div className="w-full bg-blue-100 rounded-full h-1.5 mb-4">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${(onboardingProgress / 4) * 100}%`, background: "oklch(0.50 0.18 240)" }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {onboardingSteps.map((step) => (
                    <a
                      key={step.id}
                      href={step.done ? undefined : step.href}
                      onClick={(e) => { if (step.done) e.preventDefault(); else setLocation(step.href); }}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        step.done
                          ? 'bg-green-50 border-green-200 cursor-default'
                          : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        step.done ? 'bg-green-500' : 'border-2 border-blue-300'
                      }`}>
                        {step.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${
                          step.done ? 'text-green-700 line-through decoration-green-400' : 'text-foreground'
                        }`}>{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                      {!step.done && <ArrowRight className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 ml-auto" />}
                    </a>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setOnboardingDismissed(true); localStorage.setItem('onboarding_dismissed', 'true'); }}
                className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                title="Fechar"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* ── ALERTA DE PENDENTES HÁ MAIS DE 3 DIAS ─────────────────── */}
        {(() => {
          if (!pendingData?.items?.length) return null;
          const overdue = pendingData.items.filter((s: any) => {
            const ref = s.saleDate || s.createdAt;
            if (!ref) return false;
            const days = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
            return days > 3;
          });
          if (overdue.length === 0) return null;
          const overdueTotal = overdue.reduce((sum: number, s: any) => {
            return sum + Math.max(0, Number(s.total ?? 0) - Number(s.amountReceived ?? 0));
          }, 0);
          return (
            <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-400/60 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                  {overdue.length} venda{overdue.length !== 1 ? 's' : ''} pendente{overdue.length !== 1 ? 's' : ''} há mais de 3 dias
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Total em aberto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueTotal)}
                </p>
              </div>
              <a href="/vendas" className="flex-shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1">
                Ver pendentes <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          );
        })()}

        {/* Painel de configuracao */}
        {showWidgetConfig && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setShowWidgetConfig(false)}>
            <div className="flex-1" />
            <div
              className="w-72 bg-white shadow-2xl border-l border-border h-full overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" style={{ color: 'oklch(0.50 0.18 264)' }} />
                  <h2 className="font-semibold text-foreground">Personalizar Dashboard</h2>
                </div>
                <button onClick={() => setShowWidgetConfig(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-1">
                <p className="text-xs text-muted-foreground mb-4">Escolha quais seções aparecem no seu dashboard. A meta do mês, agendamentos, KPIs financeiros e orçamentos recentes são sempre visíveis.</p>
                {([
                  { key: 'meta' as const, label: 'Meta do Mês', desc: 'Barra de progresso da meta mensal' },
                  { key: 'agenda' as const, label: 'Agenda da Semana', desc: 'Calendário semanal de execução' },
                  { key: 'kpis' as const, label: 'KPIs Financeiros', desc: 'Total faturado, recebido, a receber e conversão' },
                  { key: 'graficos' as const, label: 'Gráficos', desc: 'Gráficos de pagamento, orçamentos e execução' },
                  { key: 'orcamentosRecentes' as const, label: 'Orçamentos Recentes', desc: 'Últimos orçamentos criados' },
                ] as const).map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => toggleWidget(key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      widgets[key]
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-border bg-white hover:bg-muted/40'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      widgets[key] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {widgets[key] && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${widgets[key] ? 'text-blue-700' : 'text-foreground'}`}>{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BARRA DE META MENSAL ────────────────────────────────────────────────────────────── */}
        {widgets.meta && (() => {
          const goal = parseFloat((appSettings as any)?.monthly_goal ?? "0") || 0;
          // Card de convite quando não há meta definida
          if (!goal) return (
            <div
              className="rounded-2xl border border-dashed border-blue-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4"
              style={{ background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'oklch(0.50 0.18 264)' }}>
                  <span className="text-white">🎯</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Defina sua meta do mês</p>
                  <p className="text-xs text-muted-foreground">Acompanhe seu progresso e bata a meta todo mês</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => { setGoalInputValue(''); setShowGoalSetModal(true); }}
                className="text-white shrink-0 rounded-xl text-xs font-semibold"
                style={{ background: 'oklch(0.50 0.18 264)' }}
              >
                Definir meta
              </Button>
            </div>
          );
          // Usa totalRevenue calculado de filteredSales para respeitar o filtro de período
          const current = totalRevenue;
          const pct = Math.min(100, Math.round((current / goal) * 100));
          const isGoalReached = pct >= 100;
          // Cores dinâmicas baseadas no progresso
          const barColor = isGoalReached
            ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
            : pct >= 75
            ? 'linear-gradient(90deg, oklch(0.55 0.22 30) 0%, oklch(0.65 0.20 60) 100%)'
            : pct >= 50
            ? 'linear-gradient(90deg, oklch(0.50 0.18 264) 0%, oklch(0.55 0.22 30) 100%)'
            : 'linear-gradient(90deg, oklch(0.50 0.18 264) 0%, oklch(0.60 0.18 264) 100%)';
          return (
            <div
              className="rounded-2xl border border-border shadow-sm px-5 py-4 overflow-hidden relative"
              style={{
                background: isGoalReached
                  ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                  : 'linear-gradient(135deg, #fff7ed, #fff)',
                borderColor: isGoalReached ? '#86efac' : undefined,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                    style={{ background: isGoalReached ? '#22c55e' : 'oklch(0.55 0.22 30)' }}
                  >
                    {isGoalReached ? '🎉' : '🚀'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {isGoalReached ? 'Meta atingida!' : 'Meta do Mês'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isGoalReached
                        ? `Parabéns! Você bateu ${formatCurrency(goal)}`
                        : `Falta ${formatCurrency(Math.max(0, goal - current))} para a meta`}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-3xl font-black leading-none"
                      style={{ color: isGoalReached ? '#16a34a' : 'oklch(0.55 0.22 30)' }}
                    >
                      {pct}%
                    </p>
                    <button
                      onClick={() => { setGoalInputValue(String(goal)); setShowGoalSetModal(true); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-black/10 transition-colors"
                      title="Editar meta"
                    >
                      ✏️
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(current)}</p>
                  {isGoalReached && (
                    <button
                      onClick={() => { fireGoalCelebration(); }}
                      className="text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      🎉 Comemorar
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="relative">
                {/* Trilha */}
                <div className="h-7 bg-black/5 rounded-full overflow-hidden relative">
                  {/* Preenchimento */}
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${Math.max(pct, 1.5)}%`, background: barColor }}
                  >
                    {/* Brilho interno */}
                    <div className="absolute inset-0 bg-white/20 rounded-full" style={{ width: '40%' }} />
                  </div>
                  {/* Foguete na ponta da barra */}
                  {pct > 2 && pct < 97 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 leading-none pointer-events-none transition-all duration-1000"
                      style={{ left: `calc(${pct}% - 18px)`, fontSize: '1.75rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                    >
                      🚀
                    </div>
                  )}
                  {/* Marcadores de 25%, 50%, 75% */}
                  {[25, 50, 75].map(mark => (
                    <div
                      key={mark}
                      className="absolute top-0 bottom-0 w-px bg-white/40"
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                </div>
                {/* Labels abaixo */}
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-xs text-muted-foreground">R$ 0</span>
                  <span className="text-xs font-semibold" style={{ color: isGoalReached ? '#16a34a' : 'oklch(0.55 0.22 30)' }}>
                    {formatCurrency(goal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── CALENDÁRIO SEMANAL DE EXECUÇÃO ────────────────────────────────────────────────────────────── */}
        {widgets.agenda && (<div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-3 border-b border-border">
            {/* Linha 1: título + botões de ação */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.50 0.18 264)' }} />
                <h2 className="font-semibold text-foreground text-sm whitespace-nowrap">Agenda da Semana</h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors text-white"
                  style={{ background: 'oklch(0.50 0.18 264)' }}
                >
                  <Plus className="h-3 w-3" />
                  Agendar
                </button>
                <button
                  onClick={() => setLocation('/execucao')}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'oklch(0.50 0.18 264)', background: 'oklch(0.96 0.04 264)' }}
                >
                  Ver todos
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
            {/* Linha 2: navegação de semana */}
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={() => setCalWeekOffset(w => w - 1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => { setCalWeekOffset(0); setCalSelectedDate(today); }}
                className="px-2 py-1 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                Hoje
              </button>
              <button
                onClick={() => setCalWeekOffset(w => w + 1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          {/* Grade da semana */}
          <div className="px-4 pt-3 pb-2">
            <div className="grid grid-cols-7 gap-1">
              {calWeekDates.map((date) => {
                const isToday = date === today;
                const isSelected = date === calSelectedDate;
                const counts = calCountByDate[date];
                const [, , dd] = date.split('-');
                const dayName = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' });
                return (
                  <button
                    key={date}
                    onClick={() => setCalSelectedDate(date)}
                    className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all ${
                      isSelected
                        ? 'text-white shadow-md'
                        : isToday
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-600'
                    }`}
                    style={isSelected ? { background: 'oklch(0.50 0.18 264)' } : {}}
                  >
                    <span className="text-xs capitalize">{dayName.replace('.', '')}</span>
                    <span className={`text-base font-bold ${isSelected ? 'text-white' : ''}`}>{dd}</span>
                    {counts?.total ? (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {counts.done}/{counts.total}
                      </span>
                    ) : (
                      <span className="text-xs text-transparent select-none">·</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Serviços do dia selecionado */}
          <div className="border-t border-border">
            <div className="px-5 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {calSelectedDate === today ? 'Hoje' : new Date(calSelectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                {(calDayOrders as any[]).length > 0 && (
                  <span className="ml-2 text-foreground normal-case font-normal">
                    — {(calDayOrders as any[]).length} serviço{(calDayOrders as any[]).length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
            {(calDayOrders as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Armchair className="h-7 w-7 mb-1.5 opacity-25" />
                <p className="text-xs">Nenhum serviço agendado para este dia</p>
                <button
                  onClick={() => setLocation('/execucao')}
                  className="mt-2 text-xs font-medium underline"
                  style={{ color: 'oklch(0.50 0.18 264)' }}
                >
                  Agendar serviço
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(calDayOrders as any[]).slice(0, 5).map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => setLocation('/execucao')}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      order.status === 'done' ? 'bg-green-500' :
                      order.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.clientName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {order.scheduledTime && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {order.scheduledTime}
                          </span>
                        )}
                        {order.serviceDescription && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{order.serviceDescription}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === 'done' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.status === 'done' ? 'Concluído' : order.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </div>
                  </button>
                ))}
                {(calDayOrders as any[]).length > 5 && (
                  <button
                    onClick={() => setLocation('/execucao')}
                    className="w-full py-3 text-xs font-medium text-center transition-colors hover:bg-muted/40"
                    style={{ color: 'oklch(0.50 0.18 264)' }}
                  >
                    Ver mais {(calDayOrders as any[]).length - 5} serviço{(calDayOrders as any[]).length - 5 !== 1 ? 's' : ''} →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>)}

        {/* ── CARD DE RELACIONAMENTO COM CLIENTES ─────────────────────────────────────── */}
        {reactivationCount > 0 && (
          <button
            onClick={() => setLocation('/crm')}
            className="w-full flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm hover:bg-amber-100 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-xl">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">
                {reactivationCount} cliente{reactivationCount !== 1 ? 's' : ''} para manter contato hoje
              </p>
              <p className="text-xs text-amber-700 mt-0.5">Toque para enviar uma mensagem de relacionamento →</p>
            </div>
          </button>
        )}

        {/* ── KPIs DE VENDAS (filtrados pelo período) ────────────────────────────────────────────────────────────── */}
        {widgets.kpis && (<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.12 152)" }}>
                <DollarSign className="h-4 w-4" style={{ color: "oklch(0.38 0.18 155)" }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Total Faturado</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{thisMonthSalesCount} venda{thisMonthSalesCount !== 1 ? "s" : ""} no mês</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Recebido</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(paidRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{paidSales.length} paga{paidSales.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">A Receber</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{allPendingSales.length} pendente{allPendingSales.length !== 1 ? "s" : ""} (geral)</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.93 0.10 264)" }}>
                <TrendingUp className="h-4 w-4" style={{ color: "oklch(0.38 0.18 264)" }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Taxa de Conversão</span>
            </div>
            <p className="text-xl font-bold" style={{ color: conversionRate >= 50 ? "#22c55e" : "#f59e0b" }}>{conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredBudgets.length} orçamentos no período</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              <span className="text-xs text-green-600">✓ {acceptedBudgets} fechados</span>
              <span className="text-xs text-amber-500">⏳ {filteredBudgets.filter((b: any) => ["pending","sent"].includes(b.status)).length} pendentes</span>
              <span className="text-xs text-red-500">✕ {filteredBudgets.filter((b: any) => b.status === "rejected").length} recusados</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full gap-1.5 text-xs h-7 border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => setShowWeeklyModal(true)}
            >
              <Send className="h-3 w-3" />
              Resumo Semanal
            </Button>
          </div>
        </div>)}
        {/* ── WIDGET SERVIÇOS DA SEMANA ────────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.93 0.10 264)" }}>
              <Armchair className="h-5 w-5" style={{ color: "oklch(0.38 0.18 264)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Serviços Realizados na Semana</p>
              <p className="text-2xl font-bold text-foreground">{weeklyStats?.doneThisWeek ?? 0}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Total agendado</p>
              <p className="text-lg font-semibold text-foreground">{weeklyStats?.totalThisWeek ?? 0}</p>
            </div>
          </div>
          {(weeklyStats?.totalThisWeek ?? 0) > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{weeklyStats?.doneThisWeek ?? 0} concluídos</span>
                <span>{Math.round(((weeklyStats?.doneThisWeek ?? 0) / (weeklyStats?.totalThisWeek ?? 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.round(((weeklyStats?.doneThisWeek ?? 0) / (weeklyStats?.totalThisWeek ?? 1)) * 100)}%`, background: "oklch(0.38 0.18 264)" }}
                />
              </div>
            </div>
          )}
        </div>
        {/* ── GRÁFICOS ────────────────────────────────────────────────────────────────────────────────────── */}
        {widgets.graficos && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Faturamento por Método de Pagamento (período filtrado) */}
          {/* Card compacto de métodos de pagamento */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Métodos de Pagamento</h2>
              <span className="ml-auto text-xs text-muted-foreground">{MONTH_NAMES_FULL[filterMonth]} {filterYear}</span>
            </div>
            {paymentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                <CreditCard className="h-7 w-7 mb-2 opacity-30" />
                <p className="text-xs">Nenhuma venda neste período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentData.map((entry) => {
                  const pct = totalRevenue > 0 ? Math.round((entry.value / totalRevenue) * 100) : 0;
                  const clientsForMethod = filteredSales.filter((s) => {
                    const key = (s.paymentMethod || 'pix').startsWith('card') ? 'card' : (s.paymentMethod || 'pix');
                    return key === entry.key;
                  });
                  return (
                    <button
                      key={entry.key}
                      onClick={() => { setPaymentModalMethod(entry.key); setShowPaymentModal(true); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left group"
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PAYMENT_COLORS[entry.key] || '#94a3b8' }} />
                      <span className="text-sm text-foreground font-medium flex-1">{entry.name}</span>
                      <span className="text-xs text-muted-foreground">{clientsForMethod.length} venda{clientsForMethod.length !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(entry.value)}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground flex-1">Total faturado</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
                </div>
              </div>
            )}
          </div>


        </div>)}

        {/* ── CARD UPSELL (clicável) ────────────────────────────────────────────────────────────── */}
        <button
          onClick={() => setShowUpsellModal(true)}
          className="w-full bg-white rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.93 0.12 60)" }}>
                <Tag className="h-5 w-5" style={{ color: "oklch(0.50 0.18 60)" }} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Upsell do Mês</span>
                <p className="text-2xl font-bold" style={{ color: "oklch(0.50 0.18 60)" }}>
                  {formatCurrency(execMetrics?.upsellTotal ?? 0)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Vendas extras em campo</p>
              <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.38 0.18 264)" }}>Ver lista →</p>
            </div>
          </div>
        </button>

        {/* ── CARDS DE MÓDULOS ────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Financeiro */}
          <button onClick={() => setLocation("/financeiro")}
            className="group bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-lg transition-all text-left">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.42 0.20 200))" }}>
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-foreground text-sm">Financeiro</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalRevenue)} no mês</p>
            <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.38 0.18 264)" }}>Ver dashboard →</p>
          </button>

          {/* Vendas */}
          <button onClick={() => setLocation("/vendas")}
            className="group bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-lg transition-all text-left">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, oklch(0.38 0.18 155), oklch(0.50 0.18 130))" }}>
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-foreground text-sm">Vendas</p>
            <p className="text-xs text-muted-foreground mt-1">{thisMonthSalesCount} venda{thisMonthSalesCount !== 1 ? "s" : ""} no mês</p>
            <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.38 0.18 264)" }}>Ver dashboard →</p>
          </button>

          {/* Orçamentos */}
          <button onClick={() => setLocation("/orcamentos")}
            className="group bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-lg transition-all text-left">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, oklch(0.50 0.18 60), oklch(0.55 0.18 40))" }}>
              <FileText className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-foreground text-sm">Orçamentos</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredBudgets.length} no mês · {acceptedBudgets} aceitos</p>
            <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.38 0.18 264)" }}>Ver dashboard →</p>
          </button>

          {/* Clientes */}
          <button onClick={() => setLocation("/clientes")}
            className="group bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-lg transition-all text-left">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 300), oklch(0.55 0.18 280))" }}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-foreground text-sm">Clientes</p>
            <p className="text-xs text-muted-foreground mt-1">{clients.length} cadastrado{clients.length !== 1 ? "s" : ""}</p>
            <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.38 0.18 264)" }}>Ver dashboard →</p>
          </button>
        </div>


        {/* ── ORÇAMENTOS RECENTES ────────────────────────────────────────────────────────────── */}
        {widgets.orcamentosRecentes && (<div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Orçamentos Recentes</h2>
            <button onClick={() => setLocation("/orcamentos")}
              className="text-sm font-medium hover:underline" style={{ color: "oklch(0.38 0.18 264)" }}>
              Ver todos
            </button>
          </div>
          {recentBudgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum orçamento criado ainda</p>
              <button onClick={() => setLocation("/orcamentos/novo")}
                className="mt-3 text-sm font-medium hover:underline" style={{ color: "oklch(0.38 0.18 264)" }}>
                Criar primeiro orçamento
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentBudgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{budget.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {budget.clientPhone} · {new Date(budget.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-semibold text-sm" style={{ color: "oklch(0.32 0.14 240)" }}>
                      {formatCurrency(budget.total)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass[budget.status]}`}>
                      {statusLabels[budget.status]}
                    </span>
                    <button onClick={() => setLocation(`/orcamentos/${budget.id}/visualizar`)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>)}

        {/* Widget Faturamentos Mensais removido a pedido do usuário */}


      </div>

      {/* Modal de agendamento rápido */}
      {showScheduleModal && (
        <ExecutionFormModal
          defaultDate={calSelectedDate}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => {
            setShowScheduleModal(false);
            utils.execution.list.invalidate();
          }}
        />
      )}

      {/* Modal de conquista - meta atingida */}
      {showGoalModal && (() => {
        const now2 = new Date();
        const monthName = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][now2.getMonth()];
        const paidCount = filteredSales.filter(s => s.paymentStatus === 'paid').length;
        const totalSalesCount = filteredSales.length;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowGoalModal(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative overflow-hidden"
              onClick={e => e.stopPropagation()}
              style={{ border: '2px solid #86efac' }}
            >
              {/* Fundo decorativo */}
              <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(circle at 50% 0%, #22c55e 0%, transparent 70%)' }} />

              {/* Emoji de celebração */}
              <div className="text-6xl mb-3 animate-bounce">🎉</div>

              <h2 className="text-2xl font-black text-foreground mb-1">Meta Atingida!</h2>
              <p className="text-muted-foreground text-sm mb-6">{monthName} {now2.getFullYear()}</p>

              {/* Cards de resumo */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
                  <p className="text-lg font-black text-green-600">{formatCurrency(currentRevenue)}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-xs text-muted-foreground mb-1">Meta</p>
                  <p className="text-lg font-black text-blue-600">{formatCurrency(goal)}</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                  <p className="text-xs text-muted-foreground mb-1">Vendas</p>
                  <p className="text-lg font-black text-purple-600">{totalSalesCount}</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <p className="text-xs text-muted-foreground mb-1">Superado em</p>
                  <p className="text-lg font-black text-orange-600">{formatCurrency(Math.max(0, currentRevenue - goal))}</p>
                </div>
              </div>

              {/* Mensagem motivacional */}
              <p className="text-sm text-muted-foreground mb-6">
                🚀 Parabéns! Você bateu sua meta de {formatCurrency(goal)} em {monthName}!
                {currentRevenue > goal && ` Superou em ${Math.round(((currentRevenue - goal) / goal) * 100)}%!`}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowGoalModal(false); fireGoalCelebration(); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  🎉 Comemorar!
                </button>
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ── MODAL RESUMO SEMANAL ──────────────────────────────────────────────────────── */}
      {showWeeklyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowWeeklyModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-foreground text-lg">Resumo Semanal</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{(pendingWeeklyList as any[]).length} orçamento(s) pendente(s) esta semana</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => weeklySummaryMutation.mutate()}
                  disabled={weeklySummaryMutation.isPending}
                >
                  <Send className="h-3 w-3" />
                  {weeklySummaryMutation.isPending ? 'Enviando...' : 'Notificar'}
                </Button>
                <button onClick={() => setShowWeeklyModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {(pendingWeeklyList as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum orçamento pendente esta semana</p>
                  <p className="text-xs mt-1">Todos os orçamentos foram respondidos!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(pendingWeeklyList as any[]).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-amber-50/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{b.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Orç. #{b.budgetNumber} · {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs font-medium text-amber-700 mt-0.5">{formatCurrency(b.total ?? 0)}</p>
                      </div>
                      {b.clientPhone && (
                        <a
                          href={`https://wa.me/55${b.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${b.clientName}! Tudo bem? Passando para verificar se você teve a oportunidade de analisar o orçamento #${b.budgetNumber} que enviamos. Ficamos à disposição para qualquer dúvida! 😊`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shrink-0"
                          style={{ background: '#25D366' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL UPSELL DO MÊS ──────────────────────────────────────────────────────── */}
      {/* ── MODAL MÉTODOS DE PAGAMENTO ──────────────────────────────────────────────── */}
      {showPaymentModal && (() => {
        const method = paymentModalMethod;
        const methodLabel = method ? (PAYMENT_LABELS[method] || method) : 'Todos';
        const methodColor = method ? (PAYMENT_COLORS[method] || '#94a3b8') : '#94a3b8';
        const salesForMethod = filteredSales.filter((s) => {
          if (!method) return true;
          const key = (s.paymentMethod || 'pix').startsWith('card') ? 'card' : (s.paymentMethod || 'pix');
          return key === method;
        });
        const totalForMethod = salesForMethod.reduce((sum, s) => sum + parseFloat(String(s.total) || '0'), 0);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowPaymentModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: methodColor }} />
                  <div>
                    <h2 className="font-bold text-foreground text-lg">{methodLabel}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {MONTH_NAMES_FULL[filterMonth]} {filterYear} · {salesForMethod.length} venda{salesForMethod.length !== 1 ? 's' : ''} · {formatCurrency(totalForMethod)}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {salesForMethod.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhuma venda neste período</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {salesForMethod
                      .slice()
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((sale: any) => {
                        const phone = sale.clientPhone || sale.client?.phone || '';
                        return (
                          <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {sale.clientName || sale.client?.name || 'Cliente'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <p className="text-sm font-bold text-foreground">{formatCurrency(sale.total)}</p>
                              {phone && (
                                <a
                                  href={`https://wa.me/55${phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                                  style={{ background: '#e8fdf0', color: '#25D366' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showUpsellModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowUpsellModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-foreground text-lg">Upsell do Mês</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{MONTH_NAMES_FULL[filterMonth]} {filterYear} · {(upsellListData as any[]).length} OS com upsell</p>
              </div>
              <button onClick={() => setShowUpsellModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {(upsellListData as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Tag className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum upsell registrado neste mês</p>
                  <p className="text-xs mt-1">Vendas extras em campo aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(upsellListData as any[]).map((o: any) => (
                    <div key={o.id} className="p-3 rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{o.clientName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 60)" }}>{formatCurrency(o.upsellTotal)}</p>
                          {o.clientPhone && (
                            <a
                              href={`https://wa.me/55${o.clientPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium flex items-center gap-1 mt-1 justify-end"
                              style={{ color: '#25D366' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <MessageCircle className="h-3 w-3" />
                              {o.clientPhone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {(o.upsells as any[]).map((u: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-orange-50 rounded-lg px-2 py-1">
                            <span className="text-muted-foreground truncate">{u.description}</span>
                            <span className="font-medium text-orange-700 ml-2 shrink-0">{formatCurrency(u.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de definir/editar meta mensal */}
      {showGoalSetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowGoalSetModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' }}>
                🎯
              </div>
              <h2 className="text-lg font-black text-foreground">Meta de {MONTH_NAMES_FULL[now.getMonth()]}</h2>
              <p className="text-sm text-muted-foreground mt-1">Qual é o seu objetivo de faturamento para este mês?</p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Valor da meta (R$)</label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Ex: 5000"
                value={goalInputValue}
                onChange={e => setGoalInputValue(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && goalInputValue) {
                    saveGoalMutation.mutate({ monthly_goal: goalInputValue });
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowGoalSetModal(false)}
                className="flex-1 rounded-xl h-11"
              >
                Agora não
              </Button>
              <Button
                onClick={() => {
                  if (!goalInputValue || parseFloat(goalInputValue) <= 0) {
                    toast.error('Informe um valor válido para a meta');
                    return;
                  }
                  saveGoalMutation.mutate({ monthly_goal: goalInputValue });
                }}
                disabled={saveGoalMutation.isPending}
                className="flex-1 text-white rounded-xl h-11 font-semibold"
                style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' }}
              >
                {saveGoalMutation.isPending ? 'Salvando...' : 'Definir meta 🎯'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </>
  );
}
