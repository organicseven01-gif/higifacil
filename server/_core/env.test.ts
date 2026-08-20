import { describe, expect, it } from "vitest";
import { validarEnvProducao, isCronAuthorized } from "./env";

describe("validarEnvProducao", () => {
  it("não faz nada fora de produção, mesmo sem cookieSecret", () => {
    expect(() => validarEnvProducao({ isProduction: false, cookieSecret: "" })).not.toThrow();
  });

  it("lança erro em produção sem cookieSecret", () => {
    expect(() => validarEnvProducao({ isProduction: true, cookieSecret: "" })).toThrow(
      /JWT_SECRET ausente ou fraco/
    );
  });

  it("lança erro em produção com cookieSecret curto/fraco", () => {
    expect(() => validarEnvProducao({ isProduction: true, cookieSecret: "curto123" })).toThrow(
      /JWT_SECRET ausente ou fraco/
    );
  });

  it("não lança erro em produção com cookieSecret forte (>=32 chars)", () => {
    const forte = "a".repeat(64); // equivalente a `openssl rand -hex 32`
    expect(() => validarEnvProducao({ isProduction: true, cookieSecret: forte })).not.toThrow();
  });
});

describe("isCronAuthorized", () => {
  const SECRET = "segredo-de-teste-123";

  it("autoriza quando o header bate exatamente com Bearer <CRON_SECRET>", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejeita quando o header está ausente", () => {
    expect(isCronAuthorized(undefined, SECRET)).toBe(false);
  });

  it("rejeita quando o valor do Bearer está errado", () => {
    expect(isCronAuthorized("Bearer valor-errado", SECRET)).toBe(false);
  });

  it("rejeita quando CRON_SECRET não está configurado, mesmo com header presente", () => {
    // fail-closed: nunca autoriza "por omissão" quando a variável de ambiente
    // não foi definida — mesmo que, por acidente, algum header chegue vazio
    // batendo com uma comparação frouxa.
    expect(isCronAuthorized(`Bearer ${SECRET}`, "")).toBe(false);
    expect(isCronAuthorized(undefined, "")).toBe(false);
  });

  it("rejeita formato sem o prefixo Bearer", () => {
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false);
  });
});
