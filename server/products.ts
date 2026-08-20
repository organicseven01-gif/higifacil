// ─── Stripe Products & Pricing ──────────────────────────────────────────────
// Higifácil: Mensal (R$49,90/mês) e Anual (R$490/ano)
//
// Mapeamento interno de planType no banco:
//   "solo"   → Plano Mensal  (R$49,90/mês)
//   "equipe" → Plano Anual   (R$490/ano)
//   "free"   → Cortesia (liberado manualmente)
//   "dupla"  → legado, equivale a "solo"

export type HigiPlanType = "free" | "solo" | "equipe";

// Mapa de planType interno → label exibido ao usuário
export const PLAN_TYPE_LABELS: Record<string, string> = {
  free: "Cortesia",
  solo: "Mensal",
  dupla: "Mensal", // legado
  equipe: "Anual",
};

// Mapa de Price ID → planType interno no banco
export const PRICE_ID_TO_PLAN_TYPE: Record<string, "solo" | "equipe"> = {
  [process.env.STRIPE_PRICE_SOLO ?? "price_1TcOY8AMXLA9niY2gjDQiOsl"]: "solo",
  [process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM"]: "equipe",
};

export const PLANS: Record<
  "solo" | "equipe",
  { name: string; priceMonthly: number; priceId: string; description: string; features: string[]; badge?: string }
> = {
  solo: {
    name: "Mensal",
    priceMonthly: 4990, // em centavos (R$49,90)
    priceId: process.env.STRIPE_PRICE_SOLO ?? "price_1TcOY8AMXLA9niY2gjDQiOsl",
    description: "Acesso completo com cobrança mensal",
    features: [
      "Orçamentos ilimitados",
      "CRM de clientes",
      "Calendário de execução",
      "Relatórios completos",
      "Suporte via WhatsApp",
    ],
  },
  equipe: {
    name: "Anual",
    priceMonthly: 40833, // em centavos (R$490/ano ÷ 12 ≈ R$40,83/mês)
    priceId: process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM", // STRIPE_PRICE_DUPLA = Price ID do plano Anual
    description: "Melhor custo-benefício — 2 meses grátis",
    badge: "MELHOR",
    features: [
      "Tudo do Mensal",
      "2 meses grátis (economia de R$99,80)",
      "Suporte prioritário",
      "Acesso antecipado a novidades",
    ],
  },
};

export const FREE_PLAN = {
  name: "Cortesia",
  price: 0,
  description: "Acesso gratuito por período determinado",
  features: [
    "Acesso completo ao sistema",
    "Sem cobrança durante o período",
    "Liberado manualmente pelo administrador",
  ],
};
