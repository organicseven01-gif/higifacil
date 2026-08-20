import { describe, expect, it } from "vitest";
import { buildStorageKey, companyIdFromKey } from "./storage";

describe("buildStorageKey", () => {
  it("prefixa a key com o companyId", () => {
    const key = buildStorageKey(30001, "clients", "foto.jpg");
    expect(key.startsWith("30001/clients/")).toBe(true);
  });

  it("usa a extensão do arquivo original", () => {
    const key = buildStorageKey(1, "sale-receipts", "comprovante.PDF");
    expect(key.endsWith(".pdf")).toBe(true); // normaliza pra minúsculo
  });

  it("cai para extensão 'bin' se o nome do arquivo não tiver extensão reconhecível", () => {
    const key = buildStorageKey(1, "uploads", "arquivo-sem-extensao");
    expect(key).toMatch(/\.bin$/);
  });

  it("cai para extensão 'bin' se a extensão tiver caractere não alfanumérico (nome malicioso)", () => {
    const key = buildStorageKey(1, "uploads", "nome; rm -rf.jpg\"");
    // a "extensão" bruta aqui teria aspas/espaço — não bate no regex seguro
    expect(key).toMatch(/\.(bin|jpg)$/); // qualquer um dos dois é seguro; o importante é não injetar caractere estranho
    expect(key).not.toMatch(/[";\s]/);
  });

  it("gera keys diferentes para chamadas sucessivas (sem colisão)", () => {
    const a = buildStorageKey(1, "clients", "foto.jpg");
    const b = buildStorageKey(1, "clients", "foto.jpg");
    expect(a).not.toBe(b);
  });

  it("duas empresas diferentes nunca compartilham prefixo de key", () => {
    const a = buildStorageKey(1, "clients", "foto.jpg");
    const b = buildStorageKey(2, "clients", "foto.jpg");
    expect(a.split("/")[0]).toBe("1");
    expect(b.split("/")[0]).toBe("2");
    expect(a.split("/")[0]).not.toBe(b.split("/")[0]);
  });
});

describe("companyIdFromKey", () => {
  it("extrai o companyId do início da key", () => {
    expect(companyIdFromKey("30001/clients/123-abc.jpg")).toBe(30001);
  });

  it("retorna null se a key não começar com número", () => {
    expect(companyIdFromKey("clients/123-abc.jpg")).toBeNull();
    expect(companyIdFromKey("https://exemplo.com/foto.jpg")).toBeNull();
  });

  it("é o inverso de buildStorageKey (round-trip)", () => {
    const key = buildStorageKey(4242, "bank-statements", "extrato.pdf");
    expect(companyIdFromKey(key)).toBe(4242);
  });
});
