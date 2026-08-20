import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { companies, companyCredentials } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { notifyOwner } from "./_core/notification";
import { sendWelcomeEmail, sendPaymentConfirmationEmail } from "./email";

// Instanciado sob demanda (não no carregamento do módulo) para não derrubar
// o servidor inteiro quando STRIPE_SECRET_KEY[_LIVE] ainda não está
// configurada — o SDK do Stripe lança erro na construção se a chave vier
// vazia.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || "";
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY (ou STRIPE_SECRET_KEY_LIVE) não configurada.");
    }
    _stripe = new Stripe(apiKey, { apiVersion: "2026-02-25.clover" as any });
  }
  return _stripe;
}

function planFromPriceId(priceId: string): "solo" | "dupla" | "equipe" | null {
  // STRIPE_PRICE_SOLO = Mensal (R$49,90/mês) → planType 'solo'
  if (priceId === (process.env.STRIPE_PRICE_SOLO ?? "price_1TcOY8AMXLA9niY2gjDQiOsl")) return "solo";
  // STRIPE_PRICE_DUPLA = Anual (R$490/ano) → planType 'equipe'
  if (priceId === (process.env.STRIPE_PRICE_DUPLA ?? "price_1TcOYnAMXLA9niY2xbXgeHZM")) return "equipe";
  if (priceId === (process.env.STRIPE_PRICE_EQUIPE ?? "price_1TcOYnAMXLA9niY2xbXgeHZM")) return "equipe";
  return null;
}

function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

export function registerStripeWebhook(app: Express) {
  // MUST be registered BEFORE express.json() middleware
  app.post(
    "/api/stripe/webhook",
    // raw body needed for signature verification
    (req: Request, res: Response, next) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => {
        (req as any).rawBody = data;
        next();
      });
    },
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET || "";
      let event: Stripe.Event;

      try {
        event = getStripe().webhooks.constructEvent(
          (req as any).rawBody,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Test event — return verification response
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Event: ${event.type} | ID: ${event.id}`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const priceId = session.metadata?.price_id ?? "";
            const plan = planFromPriceId(priceId);
            const stripeCustomerId = session.customer as string;
            const stripeSubscriptionId = session.subscription as string;
            const isNewCompany = session.metadata?.new_company === "true";

            if (isNewCompany) {
              // ── Novo cliente: criar empresa + credenciais automaticamente ──
              const companyName = session.metadata?.company_name ?? "Nova Empresa";
              const companyEmail = session.metadata?.company_email ?? (session.customer_email ?? "");

              if (!companyEmail) {
                console.error("[Stripe Webhook] No email for new company — cannot create account");
                break;
              }

              const db = await getDb();
              if (!db) { console.error("[Stripe Webhook] Database not available"); break; }

              // Verificar se já existe empresa com esse e-mail
              const existing = await db
                .select({ id: companies.id })
                .from(companies)
                .where(eq(companies.email, companyEmail))
                .limit(1);

              if (existing.length > 0) {
                // Empresa já existe — apenas atualizar plano e limpar trial
                await db
                  .update(companies)
                  .set({
                    planType: plan ?? "solo",
                    stripeCustomerId,
                    stripeSubscriptionId,
                    subscriptionStatus: "active",
                    trialEndsAt: null, // limpar trial ao assinar
                  })
                  .where(eq(companies.id, existing[0].id));
                console.log(`[Stripe Webhook] Existing company ${existing[0].id} upgraded to plan: ${plan}`);
              } else {
                // Criar nova empresa
                const slug = slugify(companyName) + "-" + Date.now().toString(36);
                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + 14);

                await db.insert(companies).values({
                  name: companyName,
                  email: companyEmail,
                  slug,
                  plan: "trial",
                  planType: plan ?? "solo",
                  subscriptionStatus: "active",
                  stripeCustomerId,
                  stripeSubscriptionId,
                  trialEndsAt,
                  active: true,
                });

                // Buscar empresa recém-criada
                const [newCompany] = await db
                  .select()
                  .from(companies)
                  .where(eq(companies.slug, slug))
                  .limit(1);

                if (newCompany) {
                  // Gerar senha temporária
                  const tempPassword = generatePassword(10);
                  const passwordHash = await bcrypt.hash(tempPassword, 10);

                  await db.insert(companyCredentials).values({
                    companyId: newCompany.id,
                    email: companyEmail,
                    passwordHash,
                  });

                  console.log(`[Stripe Webhook] New company created: ${newCompany.id} (${companyName}) — plan: ${plan}`);

                  // Enviar e-mail de boas-vindas para o cliente
                  const planLabels: Record<string, string> = { solo: 'Mensal', dupla: 'Mensal', equipe: 'Anual', free: 'Cortesia' };
                  await sendWelcomeEmail({
                    to: companyEmail,
                    companyName,
                    email: companyEmail,
                    tempPassword,
                    planName: planLabels[plan ?? 'solo'] ?? 'Mensal',
                  });

                  // Notificar dono do sistema
                  const planLabelNotify: Record<string, string> = { solo: 'Mensal (R$49,90/mês)', dupla: 'Mensal (R$49,90/mês)', equipe: 'Anual (R$490/ano)', free: 'Cortesia' };
                  await notifyOwner({
                    title: `🎉 Nova empresa cadastrada via pagamento: ${companyName}`,
                    content: `Empresa: ${companyName}\nE-mail: ${companyEmail}\nPlano: ${planLabelNotify[plan ?? 'solo'] ?? plan}\nSenha temporária: ${tempPassword}\n\nE-mail de boas-vindas enviado automaticamente para o cliente.`,
                  });
                }
              }
            } else {
              // ── Empresa existente: atualizar plano ──
              const companyId = session.metadata?.company_id
                ? parseInt(session.metadata.company_id)
                : null;

              if (companyId && plan) {
                const db = await getDb();
                if (!db) { console.error("[Stripe Webhook] Database not available"); break; }
                await db
                  .update(companies)
                  .set({
                    planType: plan,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    subscriptionStatus: "active",
                    trialEndsAt: null, // limpar trial ao assinar
                  })
                  .where(eq(companies.id, companyId));
                console.log(`[Stripe Webhook] Company ${companyId} upgraded to plan: ${plan}`);
              }
            }
            break;
          }

          case "customer.subscription.deleted":
          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const stripeSubscriptionId = subscription.id;
            const status = subscription.status;

            if (status === "canceled" || status === "unpaid" || status === "past_due") {
              const db2 = await getDb();
              if (!db2) { console.error("[Stripe Webhook] Database not available"); break; }
              await db2
                .update(companies)
                .set({
                  subscriptionStatus: status === "canceled" ? "cancelled" : "expired",
                  planType: "free",
                })
                .where(eq(companies.stripeSubscriptionId, stripeSubscriptionId));
              console.log(`[Stripe Webhook] Subscription ${stripeSubscriptionId} status: ${status} → plan set to free`);
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err: any) {
        console.error("[Stripe Webhook] Processing error:", err.message);
        return res.status(500).json({ error: "Webhook processing failed" });
      }

      return res.json({ received: true });
    }
  );
}
