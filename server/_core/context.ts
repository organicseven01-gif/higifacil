import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getCompanyById, getCompanyUserByEmail, getAdminUserById } from "../db";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const COMPANY_SESSION_COOKIE = "company_session";
const COMPANY_USER_SESSION_COOKIE = "company_user_session";
export const ADMIN_SESSION_COOKIE = "admin_session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Parseia os cookies do header da requisição (sem depender do cookie-parser middleware).
 */
function parseCookies(req: CreateExpressContextOptions["req"]): Map<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return new Map();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

/**
 * Tenta autenticar via cookie de sessao de empresa (login por e-mail/senha).
 * Valida o JWT assinado com JWT_SECRET para evitar adulteracao do companyId.
 */
async function renewCompanySessionCookie(
  req: CreateExpressContextOptions["req"],
  res: CreateExpressContextOptions["res"],
  companyId: number,
  email: string | undefined
): Promise<void> {
  try {
    const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
    const newToken = await new SignJWT({ companyId, email })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);
    const cookieOpts = getSessionCookieOptions(req);
    res.cookie(COMPANY_SESSION_COOKIE, newToken, { ...cookieOpts, maxAge: THIRTY_DAYS_MS });
  } catch {
    // Silently ignore renewal errors
  }
}

async function authenticateCompanySession(req: CreateExpressContextOptions["req"], res?: CreateExpressContextOptions["res"]): Promise<User | null> {
  const cookies = parseCookies(req);
  const token = cookies.get(COMPANY_SESSION_COOKIE);
  if (!token) return null;

  try {
    // Tenta validar como JWT assinado (novo formato)
    const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
    let companyId: number | undefined;
    let email: string | undefined;

    try {
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
      companyId = payload.companyId as number;
      email = payload.email as string;
    } catch {
      // Fallback: tenta Base64 para cookies antigos (migracao)
      try {
        const data = JSON.parse(Buffer.from(token, "base64").toString());
        companyId = data?.companyId;
        email = data?.email;
      } catch {
        return null;
      }
    }

    if (!companyId) return null;
    const company = await getCompanyById(companyId);
    if (!company || !company.active) return null;
    if (company.subscriptionStatus === "blocked") return null;
    // Renovar o cookie automaticamente a cada requisição
    if (res) {
      await renewCompanySessionCookie(req, res, companyId, email);
    }
    const syntheticUser: User = {
      id: -(companyId),
      openId: `company_${companyId}`,
      name: company.name,
      email: email ?? null,
      loginMethod: "company_email",
      role: "admin",
      companyId: companyId,
      phone: null,
      avatarUrl: null,
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    return syntheticUser;
  } catch {
    return null;
  }
}

/**
 * Tenta autenticar via cookie de sessao administrativa (dono da plataforma).
 * Totalmente separado do login de empresas/sub-usuarios e do antigo OAuth da
 * Manus: cookie proprio (admin_session), tabela propria (admin_users).
 */
async function authenticateAdminSession(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  const cookies = parseCookies(req);
  const token = cookies.get(ADMIN_SESSION_COOKIE);
  if (!token) return null;

  try {
    const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    const adminId = payload.adminId as number;
    if (!adminId) return null;

    const admin = await getAdminUserById(adminId);
    if (!admin) return null;

    const syntheticUser: User = {
      id: -(admin.id + 900000000), // faixa própria, longe dos ids sintéticos de empresa/sub-usuário
      openId: `platform_admin_${admin.id}`,
      name: admin.name,
      email: admin.email,
      loginMethod: "platform_admin",
      role: "master",
      companyId: null,
      phone: null,
      avatarUrl: null,
      bio: null,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastSignedIn: admin.lastSignedIn ?? admin.createdAt,
    };
    return syntheticUser;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. Tentar autenticação administrativa (dono da plataforma) — cookie próprio,
  //    independente de empresa e do antigo OAuth da Manus.
  try {
    user = await authenticateAdminSession(opts.req);
  } catch {
    user = null;
  }

  // 2. Tentar autenticação OAuth (Manus) — legado, hoje sem uso funcional
  //    (VITE_OAUTH_PORTAL_URL vazio), mantido apenas para não quebrar sessões
  //    antigas caso a variável volte a ser configurada.
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  // 3. Se nao autenticado ainda, tentar via cookie de sessao de usuario sub-empresa
  if (!user) {
    try {
      const cookies = parseCookies(opts.req);
      const userToken = cookies.get(COMPANY_USER_SESSION_COOKIE);
      if (userToken) {
        // Tenta JWT assinado primeiro, depois fallback para Base64 (migracao)
        let data: any = null;
        const secretKey = new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
        try {
          const { payload } = await jwtVerify(userToken, secretKey, { algorithms: ["HS256"] });
          data = payload;
        } catch {
          try { data = JSON.parse(Buffer.from(userToken, "base64").toString()); } catch { data = null; }
        }
        if (data?.companyUserId && data?.companyId) {
          const company = await getCompanyById(data.companyId);
          if (company && company.active && company.subscriptionStatus !== "blocked") {
            // Mapear o role do sub-usuário para o enum da tabela users
            // Usamos loginMethod para preservar o role real (tecnico, secretaria, master)
            const subUserRole = data.role ?? "tecnico";
            const mappedRole = subUserRole === "master" ? "admin" : "user";
            // Usuários master são tratados como donos da empresa (company_email)
            // para que tenham acesso ao Dashboard e a todas as funcionalidades
            const loginMethodValue = subUserRole === "master" ? "company_email" : `company_user_${subUserRole}`;
            user = {
              id: -(data.companyUserId + 100000), // ID negativo único para sub-usuários
              openId: `company_user_${data.companyUserId}`,
              name: data.name ?? "Usuário",
              email: data.email ?? null,
              loginMethod: loginMethodValue, // master → company_email, outros → company_user_ROLE
              role: mappedRole,
              companyId: data.companyId,
              phone: null,
              avatarUrl: null,
              bio: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSignedIn: new Date(),
            } as User;
          }
        }
      }
    } catch {
      user = null;
    }
  }

  // 4. Se não autenticado via sub-usuário, tentar via cookie de sessão de empresa master
  if (!user) {
    try {
      user = await authenticateCompanySession(opts.req, opts.res);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
