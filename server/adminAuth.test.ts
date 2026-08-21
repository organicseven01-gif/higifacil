import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mocka as funções de banco usadas pelas procedures administrativas — os
// testes validam a REGRA DE AUTORIZAÇÃO (quem pode chamar), não a query em
// si (que exigiria banco real).
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCompanies: vi.fn().mockResolvedValue([{ id: 1, name: "Empresa Teste" }]),
    getSystemMetrics: vi.fn().mockResolvedValue({ totalCompanies: 1 }),
  };
});

function ctxFor(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const platformAdmin: TrpcContext["user"] = {
  id: -900000001,
  openId: "platform_admin_1",
  email: "dono@higifacil.com.br",
  name: "Dono da Plataforma",
  loginMethod: "platform_admin",
  role: "master",
  companyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as TrpcContext["user"];

const companyMaster: TrpcContext["user"] = {
  id: -1,
  openId: "company_1",
  email: "dono@empresa.com.br",
  name: "Dono da Empresa",
  loginMethod: "company_email",
  role: "admin", // role "admin" DA EMPRESA — não é o dono da plataforma
  companyId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as TrpcContext["user"];

const companySubUser: TrpcContext["user"] = {
  id: -100001,
  openId: "company_user_1",
  email: "tecnico@empresa.com.br",
  name: "Técnico",
  loginMethod: "company_user_tecnico",
  role: "user",
  companyId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as TrpcContext["user"];

describe("Procedures administrativas — só a sessão do dono da plataforma passa", () => {
  const casosNegados: [string, TrpcContext["user"]][] = [
    ["sem usuário logado", null],
    ["empresa master (role admin da empresa)", companyMaster],
    ["sub-usuário técnico da empresa", companySubUser],
  ];

  for (const [descricao, user] of casosNegados) {
    it(`admin.listCompanies BLOQUEIA — ${descricao}`, async () => {
      const caller = appRouter.createCaller(ctxFor(user));
      await expect(caller.admin.listCompanies()).rejects.toThrow();
    });

    it(`admin.systemMetrics BLOQUEIA — ${descricao}`, async () => {
      const caller = appRouter.createCaller(ctxFor(user));
      await expect(caller.admin.systemMetrics()).rejects.toThrow();
    });

    it(`adminPlan.listCompanyPlans BLOQUEIA — ${descricao}`, async () => {
      const caller = appRouter.createCaller(ctxFor(user));
      await expect(caller.adminPlan.listCompanyPlans()).rejects.toThrow();
    });

    it(`planFeatures.seed BLOQUEIA — ${descricao}`, async () => {
      const caller = appRouter.createCaller(ctxFor(user));
      await expect(caller.planFeatures.seed()).rejects.toThrow();
    });

    it(`demoBookings.list BLOQUEIA — ${descricao}`, async () => {
      const caller = appRouter.createCaller(ctxFor(user));
      await expect(caller.demoBookings.list(undefined)).rejects.toThrow();
    });
  }

  it("admin.listCompanies PERMITE — sessão administrativa da plataforma", async () => {
    const caller = appRouter.createCaller(ctxFor(platformAdmin));
    await expect(caller.admin.listCompanies()).resolves.toBeDefined();
  });

  it("admin.systemMetrics PERMITE — sessão administrativa da plataforma", async () => {
    const caller = appRouter.createCaller(ctxFor(platformAdmin));
    await expect(caller.admin.systemMetrics()).resolves.toBeDefined();
  });
});
