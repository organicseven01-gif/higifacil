/**
 * Hook para verificar se a empresa logada tem acesso a uma funcionalidade
 * com base no seu planType e na tabela plan_features.
 *
 * Uso:
 *   const { hasAccess, isLoading, planType } = useFeatureAccess("financeiro");
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export type PlanType = "free" | "solo" | "dupla" | "equipe";

export function useFeatureAccess(featureKey: string) {
  const { data: sub, isLoading: loadingSub } = trpc.stripe.getSubscriptionDetails.useQuery();
  const { data: features = [], isLoading: loadingFeatures } = trpc.planFeatures.list.useQuery();

  const planType: PlanType = (sub?.planType as PlanType) ?? "free";

  const hasAccess = useMemo(() => {
    // Equipe sempre tem acesso total
    if (planType === "equipe") return true;

    const feature = features.find((f) => f.featureKey === featureKey);
    if (!feature) return true; // se não encontrou, libera (não bloqueia por padrão)

    if (planType === "solo") return feature.soloEnabled;
    if (planType === "dupla") return feature.duplaEnabled;

    // free: só acessa o que solo também acessa
    return feature.soloEnabled;
  }, [planType, features, featureKey]);

  return {
    hasAccess,
    isLoading: loadingSub || loadingFeatures,
    planType,
  };
}
