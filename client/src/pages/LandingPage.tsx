import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  FileText,
  Users,
  TrendingUp,
  Smartphone,
  BarChart3,
  Star,
  ArrowRight,
  Waves,
  PlayCircle,
  ShoppingCart,
  Target,
  MapPin,
  Bell,
  Trophy,
  DollarSign,
  RefreshCw,
  Zap,
  X,
  ChevronRight,
  Play,
  Monitor,
  LayoutDashboard,
  Receipt,
  Calendar,
  User,
  UserPlus,
  UsersRound,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";

const LOGO_URL = "/logo-higifacil.png";

const features = [
  {
    icon: FileText,
    title: "Orçamento em 2 minutos, no celular",
    desc: "Você está na casa do cliente, ele pergunta o preço — você abre o Higifácil, monta o orçamento com logo e foto, e manda pelo WhatsApp na hora. Ele aprova antes de você sair.",
  },
  {
    icon: ShoppingCart,
    title: "Venda registrada, dinheiro controlado",
    desc: "Cada serviço fechado entra automaticamente no painel de vendas. Sem anotar no caderno, sem esquecer. Você sabe exatamente quanto entrou no mês — sem surpresa no final.",
  },
  {
    icon: Users,
    title: "Histórico que faz você parecer um profissional",
    desc: "Quando o cliente liga de novo, você já sabe o que ele fez, quanto pagou e quando foi. Isso impressiona — e faz ele confiar mais em você do que no concorrente.",
  },
  {
    icon: PlayCircle,
    title: "Agenda do dia no celular, rota no Maps",
    desc: "Seu técnico abre o app, vê os serviços do dia e clica para navegar direto ao endereço do cliente. Sem ligação, sem confusão, sem atraso.",
  },
  {
    icon: Waves,
    title: "Tapetes: entrada, lavagem, entrega",
    desc: "Rastreie cada tapete do recebimento até a entrega. Nunca mais confunda tapete, nunca mais perca prazo. Um diferencial que seus clientes vão comentar.",
  },
  {
    icon: BarChart3,
    title: "Financeiro sem planilha",
    desc: "Receitas, despesas e o que ainda vai receber — tudo em um painel simples. Você para de trabalhar no escuro e começa a tomar decisões com dados reais.",
  },
  {
    icon: TrendingUp,
    title: "Saiba o que o concorrente cobra",
    desc: "Registre os preços da concorrência na sua região e compare com os seus. Cobre mais onde pode, seja competitivo onde precisa. Precificação com inteligência.",
  },
  {
    icon: Smartphone,
    title: "No celular, sem baixar nada",
    desc: "Funciona direto no navegador do celular. Você em campo, seu parceiro no escritório — tudo sincronizado em tempo real, sem instalar app.",
  },
];

const differentials = [
  {
    icon: Trophy,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    title: "Meta mensal com celebração",
    subtitle: "Saiba exatamente onde você está",
    desc: "Defina sua meta de faturamento e acompanhe o progresso em tempo real com uma barra visual animada. Quando a meta é atingida, o sistema celebra com confetes e uma melodia de vitória — porque cada conquista merece ser comemorada.",
    badge: "Exclusivo Higifácil",
  },
  {
    icon: RefreshCw,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    title: "Reativação automática de clientes",
    subtitle: "Nunca mais perder um cliente por esquecimento",
    desc: "Configure lembretes automáticos por cliente: 30, 60 ou 90 dias após o último serviço. Todo dia o sistema mostra quem precisa ser contatado. Envie mensagens personalizadas ou geradas por IA para toda a lista de uma vez, direto pelo WhatsApp.",
    badge: "IA integrada",
  },
  {
    icon: MapPin,
    color: "#1A9FE3",
    bg: "rgba(26,159,227,0.1)",
    title: "Navegação com um clique",
    subtitle: "Do agendamento ao endereço do cliente",
    desc: "Abra o calendário semanal, veja os serviços do dia e clique em qualquer OS para navegar direto ao endereço do cliente no Google Maps ou Waze. Seus técnicos nunca mais vão perder tempo procurando endereço.",
    badge: "Google Maps + Waze",
  },
  {
    icon: TrendingUp,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
    title: "Taxa de conversão de orçamentos",
    subtitle: "Saiba quantos orçamentos viraram vendas",
    desc: "Acompanhe em tempo real quantos orçamentos enviados foram convertidos em serviços fechados. Identifique padrões, melhore sua abordagem e aumente seu percentual de fechamento mês a mês.",
    badge: "Exclusivo Higifácil",
  },
  {
    icon: ArrowRight,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    title: "Controle de Upsell mensal",
    subtitle: "Saiba quantos upsells você fez no mês",
    desc: "Registre e acompanhe cada venda adicional realizada durante um atendimento. Saiba exatamente quantos upsells foram feitos no mês e quanto de receita extra eles geraram para o seu negócio.",
    badge: "Exclusivo Higifácil",
  },
  {
    icon: MapPin,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    title: "Calculadora de deslocamento",
    subtitle: "Saiba quanto cobrar fora da cidade",
    desc: "Calcule o custo de deslocamento para clientes fora da sua cidade com base na distância via Google Maps. Nunca mais trabalhe no prejuízo por não cobrar o deslocamento corretamente.",
    badge: "Google Maps + Waze",
  },
  {
    icon: Zap,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    title: "Serviços pré-cadastrados",
    subtitle: "Comece a usar sem configurar nada",
    desc: "O sistema já vem com os principais serviços de higienização cadastrados desde o primeiro acesso. Você só edita o que quiser — sem perder tempo configurando do zero antes de começar a trabalhar.",
    badge: "Pronto para usar",
  },
  {
    icon: Bell,
    color: "#1A9FE3",
    bg: "rgba(26,159,227,0.1)",
    title: "Lembrete automático de 180 dias",
    subtitle: "Nunca mais esquecer de um cliente",
    desc: "Todo cliente cadastrado entra automaticamente em um ciclo de lembrete de 180 dias. Quando o prazo chega, o sistema avisa para você entrar em contato — sem precisar configurar nada. Fidelização no piloto automático.",
    badge: "Automático",
  },
];

const plans = [
  {
    id: "solo",
    name: "Solo",
    price: "R$ 10",
    period: "/mês",
    desc: "Para quem trabalha sozinho e precisa de agilidade",
    icon: User,
    features: [
      "1 usuário",
      "Orçamentos ilimitados",
      "Gestão de clientes",
      "Catálogo de serviços",
      "Dashboard de resumo",
      "Suporte por e-mail",
    ],
    locked: [
      "Vendas e agendamentos",
      "Módulo financeiro",
      "Tapetes e CRM",
    ],
    highlight: false,
    color: "#64748b",
  },
  {
    id: "dupla",
    name: "Dupla",
    price: "R$ 15",
    period: "/mês",
    desc: "Para você + 1 parceiro ou auxiliar",
    icon: UserPlus,
    features: [
      "Até 2 usuários",
      "Tudo do Solo",
      "Vendas e registro de pagamento",
      "Agendamentos com Maps",
      "Execução de OS",
      "Gestão de usuários",
    ],
    locked: [
      "Módulo financeiro completo",
      "Tapetes e CRM",
      "Relatórios avançados",
    ],
    highlight: true,
    color: "#1A9FE3",
  },
  {
    id: "equipe",
    name: "Equipe",
    price: "R$ 20",
    period: "/mês",
    desc: "Para equipes com secretária e múltiplos técnicos",
    icon: UsersRound,
    features: [
      "Usuários ilimitados",
      "Tudo do Dupla",
      "Financeiro completo",
      "Tapetes (lavanderia)",
      "CRM de clientes",
      "Análise de concorrência",
      "Relatórios avançados",
      "Upsell automático",
    ],
    locked: [],
    highlight: false,
    color: "#0A1628",
  },
];

const testimonials = [
  {
    name: "Carlos Silva",
    company: "CS Higienização",
    text: "Antes eu mandava o preço no WhatsApp e o cliente sumia. Agora mando um PDF com minha logo, foto do serviço e condições de pagamento. A resposta vem antes de eu sair da casa do cliente.",
    stars: 5,
  },
  {
    name: "Ana Ferreira",
    company: "Clean Estofados",
    text: "Eu estava no meio de um serviço quando um cliente novo me ligou pedindo orçamento. Em 2 minutos mandei tudo pelo WhatsApp. Ele fechou na hora. Nunca tinha conseguido isso antes.",
    stars: 5,
  },
  {
    name: "Roberto Matos",
    company: "Matos Higiene",
    text: "Meus técnicos abrem o celular, veem a OS do dia e já navegam até o cliente. Eu acompanho tudo do escritório em tempo real. Meus clientes percebem que somos uma empresa organizada.",
    stars: 5,
  },
];

const painPoints = [
  {
    icon: FileText,
    problem: "Manda o preço no WhatsApp e o cliente some",
    consequence: "Sem orçamento profissional, você perde credibilidade e a venda",
    solution: "Envie um orçamento profissional pelo celular em 2 minutos",
    result: "Cliente recebe, aprova e fecha antes de você sair da casa dele",
  },
  {
    icon: BarChart3,
    problem: "Trabalha o mês inteiro… e no fim não sabe quanto sobrou",
    consequence: "Trabalha muito, mas não sabe se está crescendo ou perdendo",
    solution: "Veja quanto sua empresa faturou sem precisar fazer conta",
    result: "Decisões com dados reais — não com achismo",
  },
  {
    icon: Users,
    problem: "Esquece de ligar para clientes antigos",
    consequence: "Eles ligam para o concorrente e você nem sabe",
    solution: "O sistema lembra você de entrar em contato automaticamente",
    result: "Cliente volta sem você precisar lembrar de nada",
  },
  {
    icon: MapPin,
    problem: "O técnico vai pro endereço errado ou chega atrasado",
    consequence: "Cliente insatisfeito, reputação em risco, serviço perdido",
    solution: "Abra a rota direto no celular com Waze ou Google Maps",
    result: "Técnico abre o celular e navega direto — sem ligação, sem confusão",
  },
  {
    icon: LayoutDashboard,
    problem: "Você atende o dia inteiro e a operação vira bagunça",
    consequence: "Sem controle, você perde prazo, cliente e dinheiro",
    solution: "Organize agenda, clientes e serviços em um só lugar",
    result: "Operação no controle — mesmo nos dias mais corridos",
  },
];

// ─── Quiz de Perfil ────────────────────────────────────────────────────────────
const quizQuestions = [
  {
    id: "q1",
    question: "Como você trabalha hoje?",
    emoji: "👤",
    options: [
      { value: "solo", label: "Sozinho(a)", desc: "Faço tudo eu mesmo(a)", icon: "🙋" },
      { value: "dupla", label: "Com 1 parceiro", desc: "Eu + 1 auxiliar ou sócio", icon: "🤝" },
      { value: "equipe", label: "Com equipe", desc: "Tenho técnicos e/ou secretária", icon: "👥" },
    ],
  },
  {
    id: "q2",
    question: "Como você passa orçamento hoje?",
    emoji: "📋",
    options: [
      { value: "whatsapp", label: "Pelo WhatsApp", desc: "Digito o valor na conversa", icon: "💬" },
      { value: "papel", label: "No papel ou planilha", desc: "Anoto ou uso Excel/Google Sheets", icon: "📄" },
      { value: "fala_preco", label: "Falo o preço na hora", desc: "Dou o valor de cabeça", icon: "🗣️" },
    ],
  },
  {
    id: "q3",
    question: "O que acontece depois que fecha o serviço?",
    emoji: "✅",
    options: [
      { value: "agenda", label: "Anoto na agenda", desc: "Tenho um caderno ou app de notas", icon: "📅" },
      { value: "planilha", label: "Registro em planilha", desc: "Controlo no Excel ou similar", icon: "📊" },
      { value: "memoria", label: "Fica na memória", desc: "Confio na minha cabeça", icon: "🧠" },
    ],
  },
];

const quizResults: Record<string, { title: string; desc: string; plan: string; planName: string; color: string }> = {
  solo: {
    title: "Você é um Profissional Solo",
    desc: "Você trabalha com agilidade e precisa de uma ferramenta que não atrapalhe seu ritmo. O plano Solo foi feito para você: orçamentos profissionais em segundos, histórico de clientes e controle simples — tudo no celular.",
    plan: "solo",
    planName: "Solo",
    color: "#64748b",
  },
  dupla: {
    title: "Você está crescendo em Dupla",
    desc: "Você já tem um parceiro e precisa de coordenação. O plano Dupla te dá agendamentos, execução de OS e controle de vendas — para você e seu parceiro trabalharem em sincronia sem confusão.",
    plan: "dupla",
    planName: "Dupla",
    color: "#1A9FE3",
  },
  equipe: {
    title: "Você lidera uma Equipe",
    desc: "Você tem estrutura e precisa de controle total. O plano Equipe te dá financeiro completo, CRM, tapetes, relatórios e muito mais — para você gerenciar sua equipe com profissionalismo.",
    plan: "equipe",
    planName: "Equipe",
    color: "#0A1628",
  },
};

function determinePlan(answers: Record<string, string>): string {
  const q1 = answers["q1"] || "";
  if (q1 === "equipe") return "equipe";
  if (q1 === "dupla") return "dupla";
  return "solo";
}

export default function LandingPage() {
  const [, setLocation] = useLocation();

  // Lightbox state
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);

  // Toggle planos mensal/anual
  const [billingCycle, setBillingCycle] = useState<"mensal" | "anual">("anual");

  // Quiz state
  const [quizStep, setQuizStep] = useState(0); // 0 = not started, 1-3 = questions, 4 = result
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) {
    const stored = sessionStorage.getItem("quiz_session_id");
    if (stored) {
      sessionIdRef.current = stored;
    } else {
      const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem("quiz_session_id", id);
      sessionIdRef.current = id;
    }
  }
  const saveQuizMutation = trpc.quizResponses.save.useMutation();

  // Modal de checkout público
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutMutation = trpc.stripe.createCheckoutPublic.useMutation({
    onSuccess: (data) => {
      setCheckoutLoading(false);
      setCheckoutModal(false);
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (e) => {
      setCheckoutLoading(false);
      alert("Erro ao iniciar pagamento: " + e.message);
    },
  });
  function handleAssinar() {
    setCheckoutModal(true);
  }
  function handleAssinarAnual() {
    setBillingCycle("anual");
    setCheckoutModal(true);
  }
  function submitCheckout() {
    if (!checkoutName.trim() || !checkoutEmail.trim()) return;
    const plan = billingCycle === "anual" ? "equipe" : "solo";
    setCheckoutLoading(true);
    checkoutMutation.mutate({ plan, origin: window.location.origin, name: checkoutName.trim(), email: checkoutEmail.trim() });
  }

  useEffect(() => {
    document.title = "Higifácil – Gestão para Higienizadores";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Sistema de gestão para higienizadores de estofados, impermeabilizadores e lavanderias. Orçamentos, execução, tapetes e financeiro."
      );
    }
    return () => {
      document.title = "Higifácil";
    };
  }, []);

  function handleQuizAnswer(questionId: string, value: string) {
    const newAnswers = { ...quizAnswers, [questionId]: value };
    setQuizAnswers(newAnswers);
    if (quizStep < 3) {
      setQuizStep(quizStep + 1);
    } else {
      const plan = determinePlan(newAnswers);
      setQuizResult(plan);
      setQuizStep(4);
      // Rolar até a seção de preços após breve delay para o resultado aparecer
      setTimeout(() => {
        const el = document.getElementById("planos");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 1200);
      // Salvar no banco de forma silenciosa
      saveQuizMutation.mutate({
        sessionId: sessionIdRef.current,
        q1WorkStyle: newAnswers["q1"],
        q2QuoteMethod: newAnswers["q2"],
        q3AfterClose: newAnswers["q3"],
        suggestedPlan: plan,
      });
    }
  }

  function resetQuiz() {
    setQuizStep(0);
    setQuizAnswers({});
    setQuizResult(null);
  }

  function scrollToPlanos() {
    const el = document.getElementById('planos');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
  function scrollToDemo() {
    const el = document.getElementById('demo');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  const currentQuestion = quizStep >= 1 && quizStep <= 3 ? quizQuestions[quizStep - 1] : null;
  const resultData = quizResult ? quizResults[quizResult] : null;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex flex-col items-start shrink-0">
            <img src={LOGO_URL} alt="Higifácil" className="h-7 sm:h-9 object-contain" />
            <span className="text-[9px] text-gray-400 leading-tight hidden sm:block" style={{ marginTop: "-2px" }}>Sistema de gestão para higienizadores</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setLocation("/entrar")} className="text-xs sm:text-sm font-medium px-2 sm:px-4" style={{ color: "#0A1628" }}>
              Já tenho conta
            </Button>
            <Button onClick={scrollToDemo} className="text-xs sm:text-sm font-semibold text-white px-3 sm:px-4 h-8 sm:h-10" style={{ background: "#1A9FE3" }}>
              <span className="hidden sm:inline">Como funciona?</span>
              <span className="sm:hidden">Como funciona?</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      {/* Hero — split layout: texto esquerda + vídeo direita */}
      <section id="demo" className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 60%, #0A1628 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #1A9FE3 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1A9FE3 0%, transparent 40%)" }} />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Coluna esquerda — texto */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: "rgba(26,159,227,0.15)", color: "#1A9FE3", border: "1px solid rgba(26,159,227,0.3)" }}>
                ⚡ Orçamento profissional em 2 minutos — direto do celular
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
                Desenvolvido por um higienizador,<br />
                <span style={{ color: "#1A9FE3" }}>para higienizadores:</span>
              </h1>
              <p className="text-base md:text-lg text-white/70 mb-8 leading-relaxed max-w-xl">
                Orçamento formalizado em minutos: enquanto você atende na rua, o seu cliente já recebe um orçamento visual, rápido e profissional, direto no WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                <Button
                  size="lg"
                  onClick={scrollToPlanos}
                  className="text-white font-bold px-8 py-6 text-base rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                  style={{ background: "#1A9FE3" }}
                >
                  Quero fechar mais vendas <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <p className="text-white/40 text-sm mt-5">Cancele quando quiser · Suporte na implantação</p>
            </div>

            {/* Coluna direita — vídeo em miniatura */}
            <div className="w-full lg:w-[480px] shrink-0">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video bg-gray-900 flex items-center justify-center border border-white/10">
                <iframe 
                  src="https://www.youtube.com/embed/49jzFnJWc_A" 
                  className="w-full h-full" 
                  allowFullScreen 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <p className="text-white/30 text-xs text-center mt-3">Veja o sistema funcionando na prática →</p>
            </div>

          </div>
        </div>
      </section>

      {/* Dores — Cards Impactantes — 2ª dobra */}
      <section className="py-20 border-b border-gray-100" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#0A1628" }}>
              Reconhece algum desses momentos?
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">Cada situação abaixo custa dinheiro todo mês. O Higifácil resolve todas de uma vez — no celular, em campo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((p, i) => (
              <div key={i} className="rounded-2xl overflow-hidden shadow-lg border-0 bg-white hover:shadow-xl transition-all hover:-translate-y-1">
                {/* Problema */}
                <div className="p-5" style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)" }}>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: "#ef4444" }}>
                      <X className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-red-800 leading-snug">{p.problem}</p>
                      <p className="text-xs text-red-500 mt-1 leading-relaxed">{p.consequence}</p>
                    </div>
                  </div>
                </div>
                {/* Divider com seta */}
                <div className="flex items-center justify-center py-2 bg-gradient-to-b from-red-50 to-green-50">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-0.5 h-2 bg-gray-300 rounded" />
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                {/* Solução */}
                <div className="p-5" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: "#10B981" }}>
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-green-800 leading-snug">{p.solution}</p>
                      <p className="text-xs text-green-600 mt-1 leading-relaxed font-medium">→ {p.result}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Card CTA */}
            <div className="rounded-2xl overflow-hidden shadow-lg border-0 flex flex-col items-center justify-center p-8 text-center" style={{ background: "linear-gradient(135deg, #0A1628, #0d2040)" }}>
              <p className="text-white font-black text-lg leading-snug mb-2">Chega de perder dinheiro por falta de organização.</p>
              <p className="text-white/60 text-sm mb-6">O Higifácil resolve tudo isso em um só lugar.</p>
              <button
                onClick={scrollToPlanos}
                className="w-full py-3 px-6 rounded-xl font-bold text-white text-sm"
                style={{ background: "#1A9FE3" }}
              >
                Quero resolver isso agora →
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* Diferenciais Exclusivos — 3ª dobra */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#0A1628" }}>Diferenciais que só o Higifácil tem</h2>
            <p className="text-gray-500">Recursos pensados para o profissional de higienização — que você não encontra em nenhum outro sistema do mercado.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {differentials.map((d) => (
              <div key={d.title} className="rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: d.bg }}>
                    <d.icon className="h-6 w-6" style={{ color: d.color }} />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-1" style={{ background: d.bg, color: d.color }}>{d.badge}</span>
                    <h3 className="font-black text-base" style={{ color: "#0A1628" }}>{d.title}</h3>
                    <p className="text-xs text-gray-400">{d.subtitle}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{d.desc}</p>
              </div>
            ))}
            {/* Card CTA — mesmo estilo da grade */}
            <div className="rounded-2xl overflow-hidden shadow-lg border-0 flex flex-col items-center justify-center p-8 text-center" style={{ background: "linear-gradient(135deg, #0A1628, #0d2040)" }}>
              <p className="text-white font-black text-lg leading-snug mb-2">Tudo isso em um único sistema.</p>
              <p className="text-white/60 text-sm mb-6">Sem cobranças extras. Sem complicação.</p>
              <button
                onClick={scrollToPlanos}
                className="w-full py-3 px-6 rounded-xl font-bold text-white text-sm"
                style={{ background: "#1A9FE3" }}
              >
                Quero esses recursos agora →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "2 min", label: "para montar e enviar um orçamento", icon: Zap },
              { value: "100%", label: "no celular, sem instalar nada", icon: Smartphone },
              { value: "0", label: "planilhas necessárias", icon: Target },
              { value: "Agora", label: "comece a usar imediatamente, sem espera", icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2">
                <stat.icon className="h-6 w-6" style={{ color: "#1A9FE3" }} />
                <p className="text-3xl font-black" style={{ color: "#0A1628" }}>{stat.value}</p>
                <p className="text-xs text-gray-500 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#0A1628" }}>Feito para quem trabalha em campo</h2>
            <p className="text-gray-500">Cada funcionalidade foi pensada para o profissional que está na rua, no celular, no meio do serviço — e precisa de agilidade real.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(26,159,227,0.1)" }}>
                  <f.icon className="h-5 w-5" style={{ color: "#1A9FE3" }} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: "#0A1628" }}>{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Screenshots do Sistema */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#0A1628" }}>Simples no celular, poderoso nos resultados</h2>
            <p className="text-gray-500">Você não precisa ser técnico para usar. Abriu, entendeu, usou — do orçamento ao financeiro, tudo em uma tela só.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Dashboard */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="overflow-hidden cursor-zoom-in" style={{ height: "200px", background: "#f1f5f9" }} onClick={() => setLightboxImg({ src: "/screenshots/dashboard.png", alt: "Dashboard" })}>
                <img src="/screenshots/dashboard.png" alt="Dashboard" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutDashboard className="h-4 w-4" style={{ color: "#1A9FE3" }} />
                  <h3 className="font-bold text-sm" style={{ color: "#0A1628" }}>Dashboard</h3>
                </div>
                <p className="text-xs text-gray-500">Visão geral do negócio com meta, faturamento e vendas em tempo real.</p>
              </div>
            </div>

            {/* Orçamentos */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="overflow-hidden cursor-zoom-in" style={{ height: "200px", background: "#f1f5f9" }} onClick={() => setLightboxImg({ src: "/screenshots/orcamento.png", alt: "Orçamentos" })}>
                <img src="/screenshots/orcamento.png" alt="Orçamentos" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4" style={{ color: "#10B981" }} />
                  <h3 className="font-bold text-sm" style={{ color: "#0A1628" }}>Orçamentos</h3>
                </div>
                <p className="text-xs text-gray-500">Monte orçamentos item a item com logo e envie pelo WhatsApp em 2 minutos.</p>
              </div>
            </div>

            {/* Agendamentos */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="overflow-hidden cursor-zoom-in" style={{ height: "200px", background: "#f1f5f9" }} onClick={() => setLightboxImg({ src: "/screenshots/agendamento.png", alt: "Agendamentos" })}>
                <img src="/screenshots/agendamento.png" alt="Agendamentos" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" style={{ color: "#F59E0B" }} />
                  <h3 className="font-bold text-sm" style={{ color: "#0A1628" }}>Agendamentos</h3>
                </div>
                <p className="text-xs text-gray-500">Calendário do dia com navegação direta ao cliente pelo Google Maps.</p>
              </div>
            </div>

            {/* Clientes */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="overflow-hidden cursor-zoom-in" style={{ height: "200px", background: "#f1f5f9" }} onClick={() => setLightboxImg({ src: "/screenshots/clientes.png", alt: "Clientes" })}>
                <img src="/screenshots/clientes.png" alt="Clientes" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4" style={{ color: "#8B5CF6" }} />
                  <h3 className="font-bold text-sm" style={{ color: "#0A1628" }}>Clientes</h3>
                </div>
                <p className="text-xs text-gray-500">Histórico completo com faturamento por cliente e top 10 mais rentáveis.</p>
              </div>
            </div>

            {/* Tapetes */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="overflow-hidden cursor-zoom-in" style={{ height: "200px", background: "#f1f5f9" }} onClick={() => setLightboxImg({ src: "/screenshots/tapetes.png", alt: "Tapetes" })}>
                <img src="/screenshots/tapetes.png" alt="Tapetes" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Waves className="h-4 w-4" style={{ color: "#06B6D4" }} />
                  <h3 className="font-bold text-sm" style={{ color: "#0A1628" }}>Tapetes</h3>
                </div>
                <p className="text-xs text-gray-500">Rastreie cada tapete do recebimento à entrega com alerta de atraso.</p>
              </div>
            </div>

            {/* Financeiro */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="overflow-hidden cursor-zoom-in" style={{ height: "200px", background: "#f1f5f9" }} onClick={() => setLightboxImg({ src: "/screenshots/financeiro.png", alt: "Financeiro" })}>
                <img src="/screenshots/financeiro.png" alt="Financeiro" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4" style={{ color: "#EF4444" }} />
                  <h3 className="font-bold text-sm" style={{ color: "#0A1628" }}>Financeiro</h3>
                </div>
                <p className="text-xs text-gray-500">Despesas, faturamento e lucro líquido em um painel simples e claro.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bloco de destaque: Tapetes */}
      <section className="py-16" style={{ background: "#f0f9ff" }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: "rgba(26,159,227,0.15)", color: "#1A9FE3" }}>
                <Waves className="h-3.5 w-3.5" /> Para lavanderias de tapetes
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-4" style={{ color: "#0A1628" }}>
                Controle de tapetes que<br />só o Higifácil tem
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Rastreie cada tapete desde a entrada até a entrega: registre o cliente, o tipo de tapete, o prazo de entrega e o status de lavagem. Nunca mais confunda tapetes, nunca mais perca prazo. Um diferencial que seus clientes vão notar — e comentar.
              </p>
              <ul className="space-y-3">
                {[
                  "Registro de entrada com foto e descrição",
                  "Controle de status: lavando, secando, pronto, entregue",
                  "Prazo de entrega com alerta de atraso",
                  "Histórico completo por cliente",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#1A9FE3" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, #0A1628, #0d2040)" }}>
                <Waves className="h-16 w-16 mx-auto mb-4" style={{ color: "#1A9FE3" }} />
                <p className="text-white font-black text-xl mb-2">Gestão de Tapetes</p>
                <p className="text-white/60 text-sm">
                  O módulo que lavanderias de estofados esperavam. Rastreamento completo, do recebimento à entrega.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bloco de destaque: Análise de Concorrência */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                <TrendingUp className="h-3.5 w-3.5" /> Inteligência de mercado
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-4" style={{ color: "#0A1628" }}>
                Saiba o que seus concorrentes<br />estão cobrando
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Registre os preços dos concorrentes na sua região e compare com os seus. Identifique onde você pode cobrar mais e onde precisa ser mais competitivo. Tome decisões de precificação com dados reais, não com achismo.
              </p>
              <ul className="space-y-3">
                {[
                  "Cadastro de concorrentes por região",
                  "Comparativo de preços por tipo de serviço",
                  "Posicionamento estratégico de preços",
                  "Histórico de variações de mercado",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10B981" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, #064e3b, #065f46)" }}>
                <TrendingUp className="h-16 w-16 mx-auto mb-4" style={{ color: "#10B981" }} />
                <p className="text-white font-black text-xl mb-2">Análise de Concorrência</p>
                <p className="text-white/60 text-sm">
                  Monitore o mercado e precifique com inteligência. Cobre o que você vale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "#0A1628" }}>Quem já usa sabe a diferença</h2>
            <p className="text-gray-500">Profissionais que pararam de perder venda por falta de agilidade — e hoje fecham mais com menos esforço.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <Card key={t.name} className="p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#0A1628" }}>{t.name}</p>
                  <p className="text-xs text-gray-400">{t.company}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────────────────────── */}
      <section id="planos" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">

          {/* Título */}
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "#0A1628" }}>Planos e preços</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Menos do que uma pizza por mês. Sem contrato, cancele quando quiser.</p>
          </div>

          {/* Toggle anual / mensal — Anual primeiro por ser o destaque */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => setBillingCycle("anual")}
              className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full transition-all ${
                billingCycle === "anual"
                  ? "text-white shadow-md"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              style={billingCycle === "anual" ? { background: "#0A1628" } : {}}
            >
              Anual
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: billingCycle === "anual" ? "rgba(255,255,255,0.2)" : "#dcfce7", color: billingCycle === "anual" ? "#fff" : "#16a34a" }}>
                2 meses grátis
              </span>
            </button>
            <button
              onClick={() => setBillingCycle("mensal")}
              className={`text-sm font-semibold px-5 py-2 rounded-full transition-all ${
                billingCycle === "mensal"
                  ? "text-white shadow-md"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              style={billingCycle === "mensal" ? { background: "#0A1628" } : {}}
            >
              Mensal
            </button>
          </div>

          {/* Card de plano único centralizado */}
          <div className="max-w-md mx-auto">
            <div
              className="relative rounded-3xl p-8 shadow-2xl border-2 flex flex-col"
              style={{ borderColor: "#1A9FE3", background: "linear-gradient(135deg, #0A1628 0%, #0d2040 100%)" }}
            >
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-white text-xs font-bold shadow-lg" style={{ background: "#1A9FE3" }}>
                ⚡ Acesso completo ao sistema
              </div>

              {/* Nome do plano */}
              <div className="text-center mt-2 mb-6">
                <h3 className="text-2xl font-black text-white mb-1">Higifácil Pro</h3>
                <p className="text-white/50 text-sm">Tudo que você precisa para crescer</p>
              </div>

              {/* Preço */}
              <div className="text-center mb-8">
                {billingCycle === "mensal" ? (
                  <>
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-white/50 text-lg font-semibold">R$</span>
                      <span className="text-6xl font-black text-white leading-none">49</span>
                      <span className="text-white text-2xl font-black leading-none mb-1">,90</span>
                    </div>
                    <p className="text-white/40 text-sm mt-2">/mês · cobrado mensalmente</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-white/50 text-lg font-semibold">R$</span>
                      <span className="text-6xl font-black leading-none" style={{ color: "#1A9FE3" }}>40</span>
                      <span className="text-2xl font-black leading-none mb-1" style={{ color: "#1A9FE3" }}>,83</span>
                    </div>
                    <p className="text-white/40 text-sm mt-1">/mês · cobrado R$ 490,00/ano</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                      <CheckCircle2 className="h-3 w-3" />
                      Você economiza R$ 108,80 por ano
                    </div>
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {[
                  "Orçamentos ilimitados",
                  "Envio pelo WhatsApp em menos de 2 minutos",
                  "Navegação integrada até o cliente (Google Maps e Waze)",
                  "Controle de execução e registro de pagamentos",
                  "Financeiro simples e organizado",
                  "Gestão de clientes com histórico completo",
                  "Controle de tapetes e lavanderia",
                  "Dashboard com metas e faturamento",
                  "Implantação guiada passo a passo",
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#1A9FE3" }} />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* Bônus exclusivo plano anual */}
              {billingCycle === "anual" && (
                <div className="mb-6 rounded-xl p-4" style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">🎁</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#FFD700" }}>Bônus exclusivo — Plano Anual</p>
                      <p className="text-sm font-semibold text-white">Call de onboarding com especialista</p>
                      <p className="text-xs text-white/60 mt-0.5">Configure tudo certo desde o início</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <Button
                size="lg"
                className="w-full font-bold text-white text-base py-6 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                style={{ background: "#1A9FE3" }}
                onClick={handleAssinar}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Redirecionando..." : <>Assinar agora <ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>

              <p className="text-white/30 text-xs text-center mt-4">
                {billingCycle === "mensal" ? "Cancele quando quiser · Sem fidelidade" : "Cobrado uma vez por ano · Cancele antes da renovação"}
              </p>
            </div>
          </div>

          {/* Rodapé da seção */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Suporte na implantação incluso em todos os planos · Pagamento seguro via Stripe
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20" style={{ background: "#0A1628" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Próximo cliente que perguntar o preço,<br />você fecha na hora</h2>
          <p className="text-white/60 mb-8 text-lg">Dois minutos. Um orçamento profissional com sua logo. Enviado pelo WhatsApp. Cliente aprova antes de você sair da casa dele. É isso que o Higifácil faz por você — todo dia.</p>
          <Button
            size="lg"
            onClick={handleAssinarAnual}
            disabled={checkoutLoading}
            className="text-white font-bold px-10 py-6 text-base rounded-xl hover:opacity-90"
            style={{ background: "#1A9FE3" }}
          >
            {checkoutLoading ? "Redirecionando..." : <>Quero começar agora <ArrowRight className="ml-2 h-5 w-5" /></>}
          </Button>
          <p className="text-white/30 text-sm mt-4">R$ 490/ano · Cancele quando quiser · Suporte na implantação incluso</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100" style={{ background: "#0A1628" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex flex-col items-center md:items-start gap-1">
              <img src={LOGO_URL} alt="Higifácil" className="h-8 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              <p className="text-xs text-white/40">Sistema de gestão para higienizadores</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/50 justify-center">
              <button onClick={() => setLocation("/entrar")} className="hover:text-white transition-colors">Entrar</button>
              <button onClick={() => setLocation("/solicitar-acesso")} className="hover:text-white transition-colors">Solicitar Acesso</button>
              <a href="mailto:contato@higifacil.com.br" className="hover:text-white transition-colors">contato@higifacil.com.br</a>
              <button onClick={() => setLocation("/admin")} className="hover:text-white/30 transition-colors text-white/20 text-xs">Acesso ao Sistema</button>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Higifácil · higifacil.com.br · Todos os direitos reservados.</p>
            <p className="text-xs text-white/20">CNPJ: a definir · Feito com ♥ para higienizadores do Brasil</p>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light leading-none"
            onClick={() => setLightboxImg(null)}
            aria-label="Fechar"
          >
            ×
          </button>
          <img
            src={lightboxImg.src}
            alt={lightboxImg.alt}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/40 text-xs">{lightboxImg.alt} · clique fora para fechar</p>
        </div>
      )}

      {/* Modal de checkout: coletar nome e email */}
      {checkoutModal && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => !checkoutLoading && setCheckoutModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "#0A1628", border: "1px solid rgba(26,159,227,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">
                {billingCycle === "anual" ? "Plano Anual — R$ 490/ano" : "Plano Mensal — R$ 49,90/mês"}
              </h3>
              <p className="text-sm text-slate-400">Informe seus dados para continuar para o pagamento seguro</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome completo</label>
                <input
                  type="text"
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  disabled={checkoutLoading}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  disabled={checkoutLoading}
                  onKeyDown={(e) => e.key === "Enter" && submitCheckout()}
                />
              </div>
            </div>
            <Button
              className="w-full font-bold text-white h-11"
              style={{ background: "#1A9FE3" }}
              onClick={submitCheckout}
              disabled={checkoutLoading || !checkoutName.trim() || !checkoutEmail.trim()}
            >
              {checkoutLoading ? "Redirecionando para o pagamento..." : <>Ir para o pagamento <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
            <p className="text-[10px] text-slate-500 text-center">
              Pagamento seguro via Stripe · Cancele quando quiser
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
