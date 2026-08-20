import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    // O logout limpa 3 cookies: OAuth (COOKIE_NAME) + company_session + company_user_session
    expect(clearedCookies).toHaveLength(3);
    const oauthCookie = clearedCookies.find(c => c.name === COOKIE_NAME);
    expect(oauthCookie).toBeDefined();
    expect(oauthCookie?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      // "lax" (e não "none"): `sameSite: none` só era necessário para o
      // redirecionamento cross-site do OAuth da Manus. Com o login por
      // e-mail/senha no próprio domínio, "lax" é o correto e mais seguro
      // (evita envio do cookie em requisições cross-site). Ver
      // getSessionCookieOptions em server/_core/cookies.ts.
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
    const companyCookie = clearedCookies.find(c => c.name === "company_session");
    expect(companyCookie).toBeDefined();
    const companyUserCookie = clearedCookies.find(c => c.name === "company_user_session");
    expect(companyUserCookie).toBeDefined();
  });
});
