import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lock, Calendar, ArrowRight, Phone } from "lucide-react";
import { useState } from "react";

interface TrialExpiredGateProps {
  children: React.ReactNode;
}

/**
 * Bloqueia o acesso ao sistema quando o trial (Cortesia) expirou.
 * Exibe uma tela de upgrade com opções de assinatura.
 */
export default function TrialExpiredGate({ children }: TrialExpiredGateProps) {
  const { user } = useAuth();
  const isCompanyUser = (user?.loginMethod ?? "").startsWith("company");

  const { data: subData, isLoading } = trpc.stripe.getSubscriptionDetails.useQuery(undefined, {
    enabled: isCompanyUser,
    staleTime: 2 * 60 * 1000,
  });

  // Não bloquear enquanto carrega ou se não for usuário de empresa
  if (!isCompanyUser || isLoading) return <>{children}</>;

  // Verificar se trial expirou
  const trialExpired = subData?.trialExpired === true;

  if (!trialExpired) return <>{children}</>;

  // Tela de bloqueio
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(10, 22, 40, 0.97)" }}>
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        {/* Ícone */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(26, 159, 227, 0.15)", border: "2px solid rgba(26, 159, 227, 0.4)" }}>
            <Lock className="h-9 w-9" style={{ color: "#1A9FE3" }} />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Período de cortesia encerrado</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Seu acesso gratuito ao Higifácil chegou ao fim.
            Para continuar usando o sistema, escolha um plano abaixo.
          </p>
        </div>

        {/* Data de expiração */}
        {subData?.trialEndsAt && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Expirou em {new Date(subData.trialEndsAt).toLocaleDateString("pt-BR")}</span>
          </div>
        )}

        {/* Planos */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mensal */}
          <div className="rounded-xl p-4 text-left space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Mensal</div>
            <div className="text-xl font-bold text-white">R$ 49<span className="text-sm font-normal text-slate-400">,90/mês</span></div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>✓ Orçamentos ilimitados</li>
              <li>✓ Clientes e serviços</li>
              <li>✓ Relatórios</li>
            </ul>
          </div>

          {/* Anual */}
          <div className="rounded-xl p-4 text-left space-y-2 relative overflow-hidden" style={{ background: "rgba(26, 159, 227, 0.12)", border: "1px solid rgba(26, 159, 227, 0.4)" }}>
            <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#1A9FE3", color: "white" }}>MELHOR</div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "#1A9FE3" }}>Anual</div>
            <div className="text-xl font-bold text-white">R$ 490<span className="text-sm font-normal text-slate-400">/ano</span></div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>✓ Tudo do Mensal</li>
              <li>✓ 2 meses grátis</li>
              <li>✓ Suporte prioritário</li>
            </ul>
          </div>
        </div>

        {/* CTA principal — checkout direto */}
        <CheckoutButtons />

        {/* Contato */}
        <p className="text-xs text-slate-500">
          Dúvidas?{" "}
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Phone className="h-3 w-3" />
            Fale conosco no WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}

/** Botões de checkout Mensal e Anual — usa protectedProcedure pois o usuário já está logado */
function CheckoutButtons() {
  const [loading, setLoading] = useState<"solo" | "equipe" | null>(null);
  const checkoutMutation = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      setLoading(null);
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (e) => {
      setLoading(null);
      alert("Erro ao iniciar pagamento: " + e.message);
    },
  });

  function handleCheckout(plan: "solo" | "equipe") {
    setLoading(plan);
    checkoutMutation.mutate({ plan, origin: window.location.origin });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        className="w-full h-11 font-semibold text-white"
        style={{ background: "#1A9FE3" }}
        onClick={() => handleCheckout("equipe")}
        disabled={!!loading}
      >
        {loading === "equipe" ? "Redirecionando..." : <>Assinar Anual — R$ 490/ano <ArrowRight className="h-4 w-4 ml-2" /></>}
      </Button>
      <Button
        variant="outline"
        className="w-full h-10 font-medium text-slate-300 border-slate-600 bg-transparent hover:bg-slate-800"
        onClick={() => handleCheckout("solo")}
        disabled={!!loading}
      >
        {loading === "solo" ? "Redirecionando..." : "Assinar Mensal — R$ 49,90/mês"}
      </Button>
    </div>
  );
}
