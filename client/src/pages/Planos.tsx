import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle2,
  Lock,
  User,
  UserPlus,
  UsersRound,
  ArrowRight,
  CreditCard,
  Shield,
  Zap,
  Star,
  X,
  FileText,
  Users,
  Wrench,
  BarChart3,
  ShoppingCart,
  CalendarCheck,
  Waves,
  TrendingUp,
  Heart,
  DollarSign,
  UserCog,
  LayoutDashboard,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "/logo-higifacil.png";

const plans = [
  {
    id: "solo",
    name: "Solo",
    price: 10,
    priceLabel: "R$ 10",
    period: "/mês",
    desc: "Para quem trabalha sozinho e precisa de agilidade",
    icon: User,
    highlight: false,
    color: "#64748b",
    badge: null,
  },
  {
    id: "dupla",
    name: "Dupla",
    price: 15,
    priceLabel: "R$ 15",
    period: "/mês",
    desc: "Para você + 1 parceiro ou auxiliar",
    icon: UserPlus,
    highlight: true,
    color: "#1A9FE3",
    badge: "Mais popular",
  },
  {
    id: "equipe",
    name: "Equipe",
    price: 20,
    priceLabel: "R$ 20",
    period: "/mês",
    desc: "Para equipes com secretária e múltiplos técnicos",
    icon: UsersRound,
    highlight: false,
    color: "#0A1628",
    badge: "Completo",
  },
];

type FeatureRow = {
  icon: React.ElementType;
  feature: string;
  solo: boolean | string;
  dupla: boolean | string;
  equipe: boolean | string;
};

type FeatureCategory = {
  category: string;
  rows: FeatureRow[];
};

const featureCategories: FeatureCategory[] = [
  {
    category: "Orçamentos",
    rows: [
      { icon: FileText, feature: "Orçamentos ilimitados", solo: true, dupla: true, equipe: true },
      { icon: FileText, feature: "PDF profissional com logo", solo: true, dupla: true, equipe: true },
      { icon: FileText, feature: "Envio por WhatsApp", solo: true, dupla: true, equipe: true },
      { icon: FileText, feature: "Catálogo de serviços", solo: true, dupla: true, equipe: true },
    ],
  },
  {
    category: "Clientes",
    rows: [
      { icon: Users, feature: "Gestão de clientes", solo: true, dupla: true, equipe: true },
      { icon: Users, feature: "Histórico de atendimentos", solo: true, dupla: true, equipe: true },
      { icon: Heart, feature: "CRM de reativação", solo: false, dupla: false, equipe: true },
    ],
  },
  {
    category: "Vendas e Pagamentos",
    rows: [
      { icon: ShoppingCart, feature: "Registro de vendas", solo: false, dupla: true, equipe: true },
      { icon: ShoppingCart, feature: "Controle de pagamentos", solo: false, dupla: true, equipe: true },
      { icon: DollarSign, feature: "Módulo financeiro completo", solo: false, dupla: false, equipe: true },
      { icon: BarChart3, feature: "Relatórios financeiros", solo: false, dupla: false, equipe: true },
    ],
  },
  {
    category: "Agendamentos e Execução",
    rows: [
      { icon: CalendarCheck, feature: "Agendamentos com mapa", solo: false, dupla: true, equipe: true },
      { icon: CalendarCheck, feature: "Execução de OS", solo: false, dupla: true, equipe: true },
      { icon: Waves, feature: "Tapetes (lavanderia)", solo: false, dupla: false, equipe: true },
    ],
  },
  {
    category: "Equipe e Gestão",
    rows: [
      { icon: UserCog, feature: "Usuários", solo: "1 usuário", dupla: "Até 2 usuários", equipe: "Ilimitados" },
      { icon: UserCog, feature: "Perfis de acesso (técnico, secretária)", solo: false, dupla: true, equipe: true },
      { icon: TrendingUp, feature: "Análise de concorrência", solo: false, dupla: false, equipe: true },
    ],
  },
  {
    category: "Dashboard e Suporte",
    rows: [
      { icon: LayoutDashboard, feature: "Dashboard de resumo", solo: true, dupla: true, equipe: true },
      { icon: Shield, feature: "Suporte por e-mail", solo: true, dupla: true, equipe: true },
      { icon: Zap, feature: "Ativação imediata", solo: true, dupla: true, equipe: true },
    ],
  },
];

export default function Planos() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const [checkoutModal, setCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [formErrors, setFormErrors] = useState({ name: "", email: "" });

  const { data: companySession, isLoading: sessionLoading } = trpc.companyAuth.me.useQuery();
  const { data: myPlan } = trpc.stripe.getMyPlan.useQuery(undefined, { enabled: !!companySession });

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecionando para o pagamento seguro...");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao iniciar pagamento. Tente novamente.");
    },
  });

  const createCheckoutPublic = trpc.stripe.createCheckoutPublic.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecionando para o pagamento seguro...");
        setCheckoutModal(false);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao iniciar pagamento. Tente novamente.");
    },
  });

  function handleSelectPlan(planId: string) {
    // Se ainda carregando a sessão, aguardar
    if (sessionLoading) {
      toast.info("Aguarde um momento...");
      return;
    }
    if (companySession) {
      // Empresa já logada: vai direto para checkout sem pedir nome/e-mail
      createCheckout.mutate({ plan: planId as "solo" | "dupla" | "equipe", origin: window.location.origin });
      return;
    }
    // Usuário não logado: pedir nome e e-mail para checkout público
    setSelectedPlan(planId);
    setForm({ name: "", email: "" });
    setFormErrors({ name: "", email: "" });
    setCheckoutModal(true);
  }

  function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = { name: "", email: "" };
    if (!form.name || form.name.trim().length < 2) errors.name = "Informe seu nome completo";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Informe um e-mail válido";
    if (errors.name || errors.email) { setFormErrors(errors); return; }
    createCheckoutPublic.mutate({
      plan: selectedPlan as "solo" | "dupla" | "equipe",
      origin: window.location.origin,
      name: form.name.trim(),
      email: form.email.trim(),
    });
  }

  const currentPlan = myPlan?.planType || (companySession as any)?.planType || null;
  const isLoggedIn = isAuthenticated || !!companySession;
  const selectedPlanInfo = plans.find((p) => p.id === selectedPlan);

  function renderCell(value: boolean | string) {
    if (value === true) return <CheckCircle2 className="h-5 w-5 mx-auto" style={{ color: "#10B981" }} />;
    if (value === false) return <X className="h-4 w-4 mx-auto text-gray-300" />;
    return <span className="text-xs font-semibold text-gray-600">{value}</span>;
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center">
            <img src={LOGO_URL} alt="Higifácil" className="h-9 object-contain" />
          </button>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Button onClick={() => setLocation("/dashboard")} className="text-sm font-semibold text-white" style={{ background: "#1A9FE3" }}>
                Ir para o sistema
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setLocation("/entrar")} className="text-sm font-medium" style={{ color: "#0A1628" }}>
                  Entrar
                </Button>
                <Button onClick={() => setLocation("/solicitar-acesso")} className="text-sm font-semibold text-white" style={{ background: "#1A9FE3" }}>
                  Solicitar Acesso
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 text-center" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 100%)" }}>
        <div className="max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: "rgba(26,159,227,0.15)", color: "#1A9FE3", border: "1px solid rgba(26,159,227,0.3)" }}>
            <CreditCard className="h-3.5 w-3.5" /> Planos e preços
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Escolha o plano<br />
            <span style={{ color: "#1A9FE3" }}>certo para você</span>
          </h1>
          <p className="text-white/60 text-lg">
            Sem contrato, sem surpresas. Cancele quando quiser.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/40 flex-wrap">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Pagamento seguro</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" /> Ativação imediata</span>
            <span className="flex items-center gap-1.5"><Star className="h-4 w-4" /> Suporte incluído</span>
          </div>
        </div>
      </section>

      {/* Cards de planos */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const PlanIcon = plan.icon;
              const isCurrent = currentPlan === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={`p-8 border-2 relative flex flex-col ${plan.highlight ? "shadow-2xl scale-105" : "shadow-sm"}`}
                  style={{ borderColor: isCurrent ? "#10B981" : plan.highlight ? "#1A9FE3" : "#e5e7eb" }}
                >
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold" style={{ background: "#10B981" }}>
                      ✓ Plano atual
                    </div>
                  )}
                  {!isCurrent && plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold" style={{ background: plan.highlight ? "#1A9FE3" : "#0A1628" }}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}18` }}>
                      <PlanIcon className="h-6 w-6" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl leading-tight" style={{ color: "#0A1628" }}>{plan.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-5">{plan.desc}</p>
                  <div className="flex items-end gap-1 mb-6 pb-6 border-b border-gray-100">
                    <span className="text-5xl font-black" style={{ color: plan.highlight ? "#1A9FE3" : "#0A1628" }}>{plan.priceLabel}</span>
                    <span className="text-gray-400 text-sm mb-1.5">{plan.period}</span>
                  </div>

                  {/* Resumo de destaques do plano */}
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {featureCategories.flatMap(cat => cat.rows).filter(row => row[plan.id as "solo" | "dupla" | "equipe"] !== false).slice(0, 7).map((row) => {
                      const val = row[plan.id as "solo" | "dupla" | "equipe"];
                      return (
                        <li key={row.feature} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10B981" }} />
                          {val === true ? row.feature : <span>{row.feature} <span className="text-xs text-gray-400">({val})</span></span>}
                        </li>
                      );
                    })}
                    {featureCategories.flatMap(cat => cat.rows).filter(row => row[plan.id as "solo" | "dupla" | "equipe"] !== false).length > 7 && (
                      <li className="text-xs text-gray-400 pl-6">
                        + {featureCategories.flatMap(cat => cat.rows).filter(row => row[plan.id as "solo" | "dupla" | "equipe"] !== false).length - 7} recursos incluídos
                      </li>
                    )}
                  </ul>

                  <div className="mt-auto">
                    {isCurrent ? (
                      <Button className="w-full font-bold" variant="outline" disabled style={{ borderColor: "#10B981", color: "#10B981" }}>
                        <Check className="mr-2 h-4 w-4" /> Plano ativo
                      </Button>
                    ) : (
                      <Button
                        className="w-full font-bold text-white"
                        style={{ background: plan.highlight ? "#1A9FE3" : "#0A1628" }}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={createCheckout.isPending || createCheckoutPublic.isPending}
                      >
                        {(createCheckout.isPending || createCheckoutPublic.isPending) && selectedPlan === plan.id
                          ? "Aguarde..."
                          : companySession
                          ? `Assinar plano ${plan.name}`
                          : `Começar com o ${plan.name}`}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tabela de comparação detalhada por categoria */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3" style={{ color: "#0A1628" }}>
              Comparativo completo
            </h2>
            <p className="text-gray-500 text-sm">Veja exatamente o que cada plano inclui</p>
          </div>

          <div className="rounded-2xl shadow-sm border border-gray-100 overflow-hidden bg-white">
            {/* Cabeçalho fixo */}
            <div className="grid grid-cols-4 sticky top-16 z-10" style={{ background: "#0A1628" }}>
              <div className="py-4 px-6 text-white/50 text-sm font-medium">Recurso</div>
              {plans.map((p) => {
                const PlanIcon = p.icon;
                return (
                  <div key={p.id} className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <PlanIcon className="h-5 w-5" style={{ color: p.highlight ? "#1A9FE3" : "rgba(255,255,255,0.7)" }} />
                      <span className="text-white text-sm font-black">{p.name}</span>
                      <span className="text-white/40 text-xs">{p.priceLabel}/mês</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Categorias e linhas */}
            {featureCategories.map((cat, catIdx) => (
              <div key={cat.category}>
                {/* Cabeçalho da categoria */}
                <div className="grid grid-cols-4 py-2.5 px-6" style={{ background: "rgba(10,22,40,0.04)" }}>
                  <div className="col-span-4 text-xs font-bold uppercase tracking-wider" style={{ color: "#0A1628" }}>
                    {cat.category}
                  </div>
                </div>
                {/* Linhas */}
                {cat.rows.map((row, rowIdx) => {
                  const RowIcon = row.icon;
                  return (
                    <div
                      key={row.feature}
                      className={`grid grid-cols-4 border-b border-gray-50 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                    >
                      <div className="py-3.5 px-6 flex items-center gap-2 text-sm text-gray-700">
                        <RowIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {row.feature}
                      </div>
                      {(["solo", "dupla", "equipe"] as const).map((key) => (
                        <div key={key} className="py-3.5 px-4 flex items-center justify-center">
                          {renderCell(row[key])}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Linha de CTA */}
            <div className="grid grid-cols-4 py-6 px-4 border-t-2 border-gray-100">
              <div className="px-2 flex items-center text-sm font-bold text-gray-500">Assinar agora</div>
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                return (
                  <div key={plan.id} className="px-2">
                    {isCurrent ? (
                      <Button size="sm" className="w-full font-bold" variant="outline" disabled style={{ borderColor: "#10B981", color: "#10B981" }}>
                        Plano atual
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full font-bold text-white"
                        style={{ background: plan.highlight ? "#1A9FE3" : "#0A1628" }}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={createCheckout.isPending || createCheckoutPublic.isPending}
                      >
                        {plan.name} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-black mb-3" style={{ color: "#0A1628" }}>Dúvidas frequentes</h2>
          <p className="text-gray-500 mb-10 text-sm">Tudo que você precisa saber antes de assinar</p>
          <div className="space-y-4 text-left">
            {[
              { q: "Posso cancelar quando quiser?", a: "Sim. Sem multa, sem burocracia. Ao cancelar, você mantém o acesso até o fim do período pago." },
              { q: "Como funciona o pagamento?", a: "O pagamento é mensal, processado com segurança pelo Stripe. Aceitamos cartão de crédito." },
              { q: "Posso mudar de plano depois?", a: "Sim. Você pode fazer upgrade a qualquer momento pelo sistema, na seção Minha Assinatura." },
              { q: "Preciso de cartão de crédito para testar?", a: "Não há período de teste gratuito. Você assina e já tem acesso imediato ao sistema." },
              { q: "O que acontece se eu fizer upgrade?", a: "Os novos módulos são liberados imediatamente após a confirmação do pagamento. Você receberá um e-mail de confirmação." },
            ].map((item) => (
              <div key={item.q} className="border border-gray-100 rounded-xl p-5">
                <p className="font-bold text-sm mb-1.5" style={{ color: "#0A1628" }}>{item.q}</p>
                <p className="text-gray-500 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 text-center" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 100%)" }}>
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-black text-white mb-3">Pronto para começar?</h2>
          <p className="text-white/60 mb-8">Escolha seu plano e comece a organizar sua empresa hoje.</p>
          <Button
            className="text-white font-bold px-8 py-3 text-base"
            style={{ background: "#1A9FE3" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Ver planos <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Modal de checkout para novos usuários */}
      <Dialog open={checkoutModal} onOpenChange={setCheckoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black" style={{ color: "#0A1628" }}>
              Assinar plano {selectedPlanInfo?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Informe seus dados para ir ao pagamento seguro.
              {selectedPlanInfo && (
                <span className="block mt-1 font-semibold" style={{ color: "#1A9FE3" }}>
                  {selectedPlanInfo.priceLabel}/mês
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="checkout-name" className="text-sm font-semibold text-gray-700">
                Nome da empresa ou seu nome
              </Label>
              <Input
                id="checkout-name"
                placeholder="Ex: Higienizadora do João"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
              {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="checkout-email" className="text-sm font-semibold text-gray-700">
                Seu e-mail
              </Label>
              <Input
                id="checkout-email"
                type="email"
                placeholder="voce@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1"
              />
              {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
            </div>
            <p className="text-xs text-gray-400">
              Após o pagamento, você receberá as credenciais de acesso no e-mail informado.
            </p>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCheckoutModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 font-bold text-white"
                style={{ background: "#1A9FE3" }}
                disabled={createCheckoutPublic.isPending}
              >
                {createCheckoutPublic.isPending ? "Aguarde..." : "Ir para o pagamento"}
                <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
