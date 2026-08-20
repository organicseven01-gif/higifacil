import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { checkRateLimit, getRateLimitRetryAfter, resetRateLimit } from "./_core/rateLimiter";
import {
  getCompanyUsers,
  getCompanyUserByEmail,
  getCompanyUserById,
  createCompanyUser,
  updateCompanyUser,
  deleteCompanyUser,
  updateCompanyUserLastLogin,
  getCompanyById,
  getSettings,
} from "./db";

const ROLE_LABELS: Record<string, string> = {
  master: "Master",
  tecnico: "Técnico",
  secretaria: "Secretaria",
};

export const companyUsersRouter = router({
  // Listar usuários da empresa
  list: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.user?.companyId;
    if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
    return getCompanyUsers(companyId);
  }),

  // Criar novo usuário
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2, "Nome obrigatório"),
      email: z.string().email("E-mail inválido"),
      phone: z.string().optional(),
      password: z.string().min(8, "Senha mínima de 8 caracteres")
        .regex(/[A-Z]/, "Senha deve ter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Senha deve ter ao menos um número"),
      role: z.enum(["master", "tecnico", "secretaria"]),
      modules: z.array(z.string()).optional(), // módulos permitidos
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.user?.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verificar se e-mail já existe (normaliza para minúsculas)
      const normalizedEmail = input.email.toLowerCase().trim();
      const existing = await getCompanyUserByEmail(normalizedEmail);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado" });

      const passwordHash = await bcrypt.hash(input.password, 10);
      return createCompanyUser({
        companyId,
        name: input.name,
        email: normalizedEmail,
        phone: input.phone ?? null,
        passwordHash,
        role: input.role,
        active: true,
        allowedModules: input.modules ? JSON.stringify(input.modules) : null,
      });
    }),

  // Editar usuário
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().nullable().optional(),
      password: z.string().min(8).optional(),
      role: z.enum(["master", "tecnico", "secretaria"]).optional(),
      active: z.boolean().optional(),
      modules: z.array(z.string()).optional(), // módulos permitidos
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.user?.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const { id, password, modules, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };

      if (password) {
        data.passwordHash = await bcrypt.hash(password, 10);
      }
      if (modules !== undefined) {
        data.allowedModules = JSON.stringify(modules);
      }

      return updateCompanyUser(id, companyId, data);
    }),

  // Excluir usuário
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.user?.companyId;
      if (!companyId) throw new TRPCError({ code: "UNAUTHORIZED" });
      return deleteCompanyUser(input.id, companyId);
    }),

  // Retorna dados do sub-usuário logado + nome da empresa
  me: protectedProcedure.query(async ({ ctx }) => {
    const loginMethod = ctx.user?.loginMethod ?? "";
    if (!loginMethod.startsWith("company_user_")) return null;
    // ID do sub-usuário é negativo: -(companyUserId + 100000)
    const companyUserId = -(ctx.user!.id) - 100000;
    const [companyUser, company, settingsRows] = await Promise.all([
      getCompanyUserById(companyUserId),
      getCompanyById(ctx.user!.companyId!),
      getSettings(ctx.user!.companyId!),
    ]);
    const companyNameSetting = settingsRows.find((s: any) => s.key === "company_name");
    const companyName = companyNameSetting?.value || company?.name || "";

    // Parse dos módulos permitidos (JSON array salvo no banco)
    let allowedModules: string[] | null = null;
    if (companyUser?.allowedModules) {
      try {
        allowedModules = JSON.parse(companyUser.allowedModules);
      } catch {
        allowedModules = null;
      }
    }

    return {
      id: companyUserId,
      name: companyUser?.name ?? ctx.user!.name,
      email: companyUser?.email ?? ctx.user!.email,
      phone: companyUser?.phone ?? null,
      role: companyUser?.role ?? loginMethod.replace("company_user_", ""),
      allowedModules, // null = usar padrão do role; array = módulos customizados
      companyId: ctx.user!.companyId,
      companyName,
    };
  }),

  // Troca de senha pelo próprio sub-usuário
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, "Senha atual obrigatória"),
      newPassword: z.string().min(8, "Senha mínima de 8 caracteres")
        .regex(/[A-Z]/, "Senha deve ter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Senha deve ter ao menos um número"),
    }))
    .mutation(async ({ ctx, input }) => {
      const loginMethod = ctx.user?.loginMethod ?? "";
      if (!loginMethod.startsWith("company_user_")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas sub-usuários podem usar este endpoint" });
      }
      const companyUserId = -(ctx.user!.id) - 100000;
      const companyUser = await getCompanyUserById(companyUserId);
      if (!companyUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

      const valid = await bcrypt.compare(input.currentPassword, companyUser.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });

      const newHash = await bcrypt.hash(input.newPassword, 10);
      await updateCompanyUser(companyUserId, companyUser.companyId, { passwordHash: newHash });
      return { success: true };
    }),

  // Login de usuário sub-empresa (público)
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Rate limiting: 5 tentativas por minuto por IP
      const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) {
        const retryAfter = getRateLimitRetryAfter(ip);
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Muitas tentativas de login. Aguarde ${retryAfter} segundos antes de tentar novamente.` });
      }
      const user = await getCompanyUserByEmail(input.email.toLowerCase().trim());
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos" });
      if (!user.active) throw new TRPCError({ code: "FORBIDDEN", message: "Usuário inativo" });

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos" });

      // Login bem-sucedido: resetar contador
      resetRateLimit(ip);
      await updateCompanyUserLastLogin(user.id);

      // Criar cookie de sessao JWT assinado para sub-usuario
      const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
      const sessionData = await new SignJWT({
        companyUserId: user.id,
        companyId: user.companyId,
        email: user.email,
        name: user.name,
        role: user.role,
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secretKey);

      const isProduction = process.env.NODE_ENV === "production";
      ctx.res.cookie("company_user_session", sessionData, {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 dias
      });

      return {
        success: true,
        name: user.name,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
        companyId: user.companyId,
      };
    }),
});
