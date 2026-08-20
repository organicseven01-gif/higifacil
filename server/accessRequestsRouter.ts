import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  createAccessRequest,
  listAccessRequests,
  updateAccessRequestStatus,
  getAccessRequestById,
  createCompany,
  createCompanyCredential,
  getCompanyCredentialByCompanyId,
  updateCompanyCredential,
  updateCompany,
} from "./db";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "./email";

export const accessRequestsRouter = router({
  // Enviar solicitação de acesso (público — qualquer pessoa pode solicitar)
  submit: publicProcedure
    .input(z.object({
      companyName: z.string().min(2),
      ownerName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      city: z.string().optional(),
      segment: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await createAccessRequest(input);
      await notifyOwner({
        title: `Nova solicitacao de acesso: ${input.companyName}`,
        content: `Empresa: ${input.companyName}\nResponsavel: ${input.ownerName}\nE-mail: ${input.email}\nTelefone: ${input.phone ?? "-"}\nCidade: ${input.city ?? "-"}\nSegmento: ${input.segment ?? "-"}\n\nAcesse o Painel Master para aprovar ou rejeitar.`,
      });
      return { success: true };
    }),

  // Listar solicitações (apenas usuários autenticados — master)
  list: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input }) => {
      return listAccessRequests(input.status);
    }),

  // Rejeitar solicitação (master)
  reject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await updateAccessRequestStatus(input.id, "rejected", ctx.user?.name ?? "master");
      return { success: true };
    }),

  // Manter compatibilidade com o review antigo
  review: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateAccessRequestStatus(input.id, input.status, ctx.user?.name ?? "master");
      return { success: true };
    }),

  // Aprovar + criar empresa + definir credenciais em um único fluxo
  approveAndOnboard: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      password: z.string().min(6),
      // Planos reais do sistema: free = Cortesia, solo = Mensal, equipe = Anual
      plan: z.enum(["free", "solo", "equipe"]).default("free"),
      trialDays: z.number().min(1).max(365).optional(), // apenas para plan=free (Cortesia)
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar a solicitação
      const req = await getAccessRequestById(input.requestId);
      if (!req) throw new Error("Solicitação não encontrada");
      if (req.status !== "pending") throw new Error("Solicitação já processada");

      // 2. Criar a empresa (com plan "trial" temporário compatível com createCompany)
      const company = await createCompany({
        name: req.companyName,
        email: req.email,
        phone: req.phone ?? undefined,
        plan: "trial",
      });

      // 3. Atualizar planType e trialEndsAt conforme plano selecionado
      const planUpdates: Record<string, unknown> = {
        planType: input.plan,
        subscriptionStatus: "active",
      };
      if (input.plan === "free") {
        // Cortesia: definir prazo de trial
        const days = input.trialDays ?? 30;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + days);
        planUpdates.trialEndsAt = trialEndsAt;
      } else {
        // Plano pago: sem expiração de trial
        planUpdates.trialEndsAt = null;
        planUpdates.subscriptionExpiresAt = null;
      }
      await updateCompany(company.id, planUpdates as any);

      // 4. Criar credenciais de acesso
      const hash = await bcrypt.hash(input.password, 10);
      await createCompanyCredential({
        companyId: company.id,
        email: req.email,
        passwordHash: hash,
      });

      // 5. Marcar solicitação como aprovada
      await updateAccessRequestStatus(input.requestId, "approved", ctx.user?.name ?? "master");

      // 6. Enviar e-mail de boas-vindas com credenciais de acesso
      const planLabels: Record<string, string> = {
        free: "Cortesia",
        solo: "Mensal",
        equipe: "Anual",
      };
      try {
        await sendWelcomeEmail({
          to: req.email,
          companyName: req.companyName,
          email: req.email,
          tempPassword: input.password,
          planName: planLabels[input.plan] ?? "Cortesia",
        });
      } catch (e) {
        // Não bloqueia a aprovação se o e-mail falhar
        console.error("[approveAndOnboard] Falha ao enviar e-mail de boas-vindas:", e);
      }

      return {
        success: true,
        companyId: company.id,
        companyName: req.companyName,
        loginEmail: req.email,
        password: input.password,
      };
    }),

  // Redefinir senha de uma empresa (master)
  resetCompanyPassword: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const hash = await bcrypt.hash(input.newPassword, 10);
      const existing = await getCompanyCredentialByCompanyId(input.companyId);
      if (!existing) throw new Error("Empresa não possui credenciais. Use 'Definir Senha' primeiro.");
      await updateCompanyCredential(input.companyId, { passwordHash: hash });
      return { success: true };
    }),
});
