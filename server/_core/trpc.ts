import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from './env';

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // companyId: usa o companyId do usuário.
  // Para usuários Manus OAuth (dono do sistema), loginMethod é "manus" e companyId é null.
  // Para empresas clientes (login por e-mail/senha), companyId é o id da empresa.
  // NUNCA faz fallback para 1, pois isso misturaria dados do dono com a empresa de id=1.
  const isManusOAuth = ctx.user.loginMethod === "manus";
  const companyId = isManusOAuth ? null : (ctx.user.companyId ?? null);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      companyId,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'master')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const isManusOAuth = ctx.user.loginMethod === "manus";
    const companyId = isManusOAuth ? null : (ctx.user.companyId ?? null);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        companyId,
      },
    });
  }),
);

/**
 * managementProcedure: Apenas usuários com role 'master' ou 'admin' (empresa) podem acessar.
 * Protege operações sensíveis como delete de clientes, orçamentos, serviços e vendas.
 * Técnicos e funcionários são bloqueados.
 */
export const managementProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Extrai o role efetivo: para sub-usuários, o role vem do loginMethod
    const loginMethod = ctx.user.loginMethod ?? "";
    let effectiveRole: string = ctx.user.role ?? "user";
    if (loginMethod.startsWith("company_user_")) {
      effectiveRole = loginMethod.replace("company_user_", "");
    }

    // Apenas master e admin (dono da empresa) podem executar operações de gestão
    const isAllowed = effectiveRole === "master" || effectiveRole === "admin";
    if (!isAllowed) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores da empresa." });
    }

    const isManusOAuth = ctx.user.loginMethod === "manus";
    const companyId = isManusOAuth ? null : (ctx.user.companyId ?? null);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        companyId,
      },
    });
  }),
);

/**
 * ownerProcedure: Apenas o dono do sistema (OWNER_OPEN_ID via Manus OAuth) pode acessar.
 * Garante separação total entre o painel admin e os painéis das empresas clientes.
 */
export const ownerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Verifica se é o dono via Manus OAuth (openId deve bater com OWNER_OPEN_ID)
    const isOwner = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
    if (!isOwner) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao administrador do sistema." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        companyId: null as unknown as number,
      },
    });
  }),
);
