import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do cliente R2 real — os testes validam a REGRA DE NEGÓCIO (isolamento
// por empresa), não a chamada de rede em si (que exigiria credencial real).
vi.mock("./storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./storage")>();
  return {
    ...actual, // mantém buildStorageKey/companyIdFromKey reais (são puras)
    getPrivateSignedUrl: vi.fn().mockResolvedValue("https://exemplo-r2.dev/link-assinado-fake?sig=abc"),
  };
});

function createAuthContext(companyId: number | null): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: companyId ? "company_email" : "manus",
      role: "admin",
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("storage.getSignedUrl — isolamento por empresa", () => {
  it("gera a URL assinada quando a key pertence à empresa da sessão", async () => {
    const caller = appRouter.createCaller(createAuthContext(30001));
    const result = await caller.storage.getSignedUrl({ key: "30001/sale-receipts/123-abc.pdf" });
    expect(result.url).toBe("https://exemplo-r2.dev/link-assinado-fake?sig=abc");
  });

  it("BLOQUEIA quando a key pertence a OUTRA empresa (IDOR)", async () => {
    const caller = appRouter.createCaller(createAuthContext(30002));
    await expect(
      caller.storage.getSignedUrl({ key: "30001/sale-receipts/123-abc.pdf" })
    ).rejects.toThrow(/não pertence à sua empresa/i);
  });

  it("BLOQUEIA quando a key não tem companyId reconhecível (formato inesperado)", async () => {
    const caller = appRouter.createCaller(createAuthContext(30001));
    await expect(
      caller.storage.getSignedUrl({ key: "arquivo-sem-prefixo-de-empresa.pdf" })
    ).rejects.toThrow(/não pertence à sua empresa/i);
  });

  it("exige empresa na sessão (dono do sistema via Manus não pode gerar link)", async () => {
    const caller = appRouter.createCaller(createAuthContext(null));
    await expect(
      caller.storage.getSignedUrl({ key: "30001/sale-receipts/123-abc.pdf" })
    ).rejects.toThrow(/nenhuma empresa/i);
  });

  it("simetria: empresa B também não acessa arquivo da empresa A, e vice-versa", async () => {
    const callerA = appRouter.createCaller(createAuthContext(1));
    const callerB = appRouter.createCaller(createAuthContext(2));

    await expect(callerB.storage.getSignedUrl({ key: "1/bank-statements/x.pdf" })).rejects.toThrow();
    await expect(callerA.storage.getSignedUrl({ key: "2/bank-statements/x.pdf" })).rejects.toThrow();

    // e cada uma consegue acessar a própria, sem problema
    await expect(callerA.storage.getSignedUrl({ key: "1/bank-statements/x.pdf" })).resolves.toBeDefined();
    await expect(callerB.storage.getSignedUrl({ key: "2/bank-statements/x.pdf" })).resolves.toBeDefined();
  });
});
