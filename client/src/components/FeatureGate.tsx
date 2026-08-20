/**
 * FeatureGate — envolve um módulo e bloqueia o acesso se a empresa
 * não tiver o plano necessário, exibindo uma tela de upgrade.
 *
 * Uso:
 *   <FeatureGate featureKey="financeiro" featureLabel="Módulo Financeiro">
 *     <Financeiro />
 *   </FeatureGate>
 */
import { useFeatureAccess, PlanType } from "@/hooks/useFeatureAccess";
import { useLocation } from "wouter";
import { Lock, ArrowUpRight, User, UserPlus, UsersRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLAN_INFO: Record<PlanType, { label: string; color: string; icon: React.ElementType; price: string }> = {
  free:   { label: "Cortesia", color: "text-gray-400",    icon: User,        price: "Gratuito" },
  solo:   { label: "Mensal",   color: "text-blue-400",    icon: User,        price: "R$ 49,90/mês" },
  dupla:  { label: "Mensal",   color: "text-blue-400",    icon: UserPlus,    price: "R$ 49,90/mês" },
  equipe: { label: "Anual",    color: "text-emerald-400", icon: UsersRound,  price: "R$ 490/ano" },
};

const UPGRADE_NEEDED: Record<string, PlanType> = {
  // Módulos disponíveis no plano Mensal (solo)
  vendas:       "solo",
  agendamentos: "solo",
  execucao:     "solo",
  usuarios:     "solo",
  // Módulos que precisam do plano Anual (equipe)
  financeiro:   "equipe",
  tapetes:      "equipe",
  crm:          "equipe",
  concorrentes: "equipe",
  relatorios:   "equipe",
  upsell:       "equipe",
};

interface FeatureGateProps {
  featureKey: string;
  featureLabel: string;
  children: React.ReactNode;
}

export default function FeatureGate({ featureKey, featureLabel, children }: FeatureGateProps) {
  const { hasAccess, isLoading, planType } = useFeatureAccess(featureKey);
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasAccess) return <>{children}</>;

  // Determinar qual plano é necessário
  const requiredPlan: PlanType = UPGRADE_NEEDED[featureKey] ?? "equipe";
  const required = PLAN_INFO[requiredPlan];
  const RequiredIcon = required.icon;
  const current = PLAN_INFO[planType];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Ícone de cadeado */}
      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6 shadow-sm">
        <Lock className="w-9 h-9 text-gray-400" />
      </div>

      {/* Título */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{featureLabel}</h2>
      <p className="text-gray-500 text-base mb-6 max-w-sm">
        Este módulo está disponível a partir do plano{" "}
        <span className={`font-bold ${required.color.replace("text-", "text-")}`}>
          {required.label}
        </span>
        . Você está no plano{" "}
        <span className="font-semibold text-gray-700">{current.label}</span>.
      </p>

      {/* Card do plano necessário */}
      <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 mb-6 w-full max-w-xs shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <RequiredIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900">Plano {required.label}</p>
            <p className="text-sm text-blue-600 font-semibold">{required.price}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Inclui acesso ao <strong>{featureLabel}</strong> e muito mais</span>
        </div>
      </div>

      {/* Botão de upgrade */}
      <Button
        onClick={() => setLocation("/#planos")}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl text-base"
      >
        <ArrowUpRight className="w-5 h-5 mr-2" />
        Ver planos e fazer upgrade
      </Button>

      <p className="text-xs text-gray-400 mt-4">
        Cancele quando quiser · Sem fidelidade
      </p>
    </div>
  );
}
