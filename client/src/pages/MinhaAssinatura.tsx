import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Calendar,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Gift,
  Clock,
} from "lucide-react";

const PLAN_INFO: Record<string, {
  label: string;
  color: string;
  badgeColor: string;
  features: string[];
  price: string;
  description: string;
}> = {
  free: {
    label: "Sem plano",
    color: "bg-gray-500/10 border-gray-500/20",
    badgeColor: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    features: ["Acesso limitado", "Suporte básico"],
    price: "—",
    description: "Nenhum plano ativo",
  },
  cortesia: {
    label: "Cortesia",
    color: "bg-emerald-500/10 border-emerald-500/20",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    features: ["Acesso completo ao sistema", "Orçamentos ilimitados", "Gestão de clientes", "Suporte via WhatsApp"],
    price: "Gratuito",
    description: "Acesso cortesia concedido pela equipe Higifácil",
  },
  solo: {
    label: "Mensal",
    color: "bg-blue-500/10 border-blue-500/20",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    features: ["Acesso completo ao sistema", "Orçamentos ilimitados", "Gestão de clientes e vendas", "Suporte via WhatsApp"],
    price: "R$ 49,90/mês",
    description: "Renovação automática todo mês",
  },
  dupla: {
    label: "Anual",
    color: "bg-amber-500/10 border-amber-500/20",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    features: ["Acesso completo ao sistema", "Orçamentos ilimitados", "Gestão de clientes e vendas", "Suporte via WhatsApp", "Onboarding gratuito incluído"],
    price: "R$ 490/ano",
    description: "Melhor custo-benefício — equivale a R$ 40,83/mês",
  },
  equipe: {
    label: "Anual",
    color: "bg-amber-500/10 border-amber-500/20",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    features: ["Acesso completo ao sistema", "Orçamentos ilimitados", "Gestão de clientes e vendas", "Suporte via WhatsApp", "Onboarding gratuito incluído"],
    price: "R$ 490/ano",
    description: "Melhor custo-benefício — equivale a R$ 40,83/mês",
  },
  mensal: {
    label: "Mensal",
    color: "bg-blue-500/10 border-blue-500/20",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    features: ["Acesso completo ao sistema", "Orçamentos ilimitados", "Gestão de clientes e vendas", "Suporte via WhatsApp"],
    price: "R$ 49,90/mês",
    description: "Renovação automática todo mês",
  },
  anual: {
    label: "Anual",
    color: "bg-amber-500/10 border-amber-500/20",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    features: ["Acesso completo ao sistema", "Orçamentos ilimitados", "Gestão de clientes e vendas", "Suporte via WhatsApp", "Onboarding gratuito incluído"],
    price: "R$ 490/ano",
    description: "Melhor custo-benefício — equivale a R$ 40,83/mês",
  },
};

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Ativo", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2 },
  trial: { label: "Período de teste", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  expired: { label: "Expirado", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  blocked: { label: "Bloqueado", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: AlertTriangle },
};

const WHATSAPP_SUPORTE = "https://wa.me/5582998383003?text=Ol%C3%A1%2C+preciso+de+ajuda+com+minha+assinatura+do+Higif%C3%A1cil!";

export default function MinhaAssinatura() {
  const [, navigate] = useLocation();
  const [cancelling, setCancelling] = useState(false);

  const { data: sub, isLoading, refetch } = trpc.stripe.getSubscriptionDetails.useQuery();
  const cancelMutation = trpc.stripe.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Assinatura cancelada", { description: "Seu plano permanece ativo até o fim do período atual." });
      refetch();
      setCancelling(false);
    },
    onError: (err) => {
      toast.error("Erro ao cancelar", { description: err.message });
      setCancelling(false);
    },
  });

  const planType = sub?.planType ?? "free";
  const plan = PLAN_INFO[planType] ?? PLAN_INFO.free;
  const statusKey = sub?.subscriptionStatus ?? "active";
  const status = STATUS_INFO[statusKey] ?? STATUS_INFO.active;
  const StatusIcon = status.icon;

  const isCortesia = planType === "free";
  const isAnual = planType === "dupla" || planType === "equipe";
  const isMensal = planType === "solo";
  const hasActiveStripe = !!sub?.stripeSubscriptionId;

  const renewalFormatted = sub?.renewalDate
    ? new Date(sub.renewalDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  // Trial info
  const trialEndsAt = (sub as any)?.trialEndsAt;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Minha Assinatura</h1>
          <p className="text-slate-400 mt-1">Gerencie seu plano e faturamento</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Plano atual */}
            <div className={`rounded-xl border p-6 ${plan.color}`} style={{ background: "rgba(15,23,42,0.6)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xl font-bold text-white">
                      {isCortesia ? "Acesso Cortesia" : `Plano ${plan.label}`}
                    </span>
                    <Badge className={`text-xs border ${plan.badgeColor}`}>{plan.label}</Badge>
                    <Badge className={`text-xs border ${status.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                  <p className="text-white font-semibold mt-1">{plan.price}</p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Trial ativo */}
            {isCortesia && trialDaysLeft !== null && trialDaysLeft > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Período de cortesia ativo</p>
                  <p className="text-sm text-slate-400">
                    Restam <span className="text-emerald-400 font-bold">{trialDaysLeft} dias</span> de acesso gratuito
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  onClick={() => navigate("/#planos")}
                >
                  Assinar agora
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Renovação (só para assinantes Stripe) */}
            {renewalFormatted && hasActiveStripe && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">
                    {sub?.cancelAtPeriodEnd ? "Acesso garantido até" : "Próxima renovação"}
                  </p>
                  <p className="font-semibold text-white">{renewalFormatted}</p>
                  {sub?.cancelAtPeriodEnd && (
                    <p className="text-xs text-amber-400 mt-0.5">Assinatura cancelada — acesso mantido até esta data</p>
                  )}
                </div>
              </div>
            )}

            {/* Onboarding para plano Anual */}
            {isAnual && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Onboarding gratuito incluído no seu plano</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Agende uma call com nossa equipe para configurar o sistema do jeito certo para o seu negócio.
                  </p>
                  <a
                    href="https://wa.me/5582998383003?text=Ol%C3%A1%2C+sou+assinante+do+plano+Anual+e+gostaria+de+agendar+meu+onboarding!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-green-400 hover:text-green-300"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Agendar onboarding pelo WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Sem assinatura ativa */}
            {planType === "free" && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-700/50 border border-slate-600/30 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Sem assinatura ativa</p>
                  <p className="text-sm text-slate-400">Faça upgrade para desbloquear todos os recursos</p>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  onClick={() => navigate("/#planos")}
                >
                  Ver planos
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Upgrade Mensal → Anual */}
            {isMensal && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Economize com o plano Anual</p>
                  <p className="text-sm text-slate-400">R$ 490/ano — equivale a R$ 40,83/mês + onboarding grátis</p>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  onClick={() => navigate("/#planos")}
                >
                  Upgrade
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Segurança */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Pagamento seguro via Stripe</p>
                <p className="text-sm text-slate-400">Seus dados de pagamento são protegidos com criptografia de ponta</p>
              </div>
            </div>

            {/* Suporte */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-blue-400">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Precisa de ajuda?</p>
                <p className="text-sm text-slate-400">Fale com nossa equipe pelo WhatsApp — (82) 99838-3003</p>
              </div>
              <a
                href={WHATSAPP_SUPORTE}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0">
                  Falar com suporte
                </Button>
              </a>
            </div>

            {/* Cancelar */}
            {hasActiveStripe && !sub?.cancelAtPeriodEnd && (
              <div className="pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 w-full">
                      Cancelar assinatura
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Cancelar assinatura?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        Sua assinatura será cancelada ao fim do período atual
                        {renewalFormatted ? ` (${renewalFormatted})` : ""}. Você continuará com acesso até lá.
                        Após o cancelamento, sua conta perderá o acesso ao sistema.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                        Manter assinatura
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          setCancelling(true);
                          cancelMutation.mutate();
                        }}
                        disabled={cancelling}
                      >
                        {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Você pode cancelar a qualquer momento sem multa
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
