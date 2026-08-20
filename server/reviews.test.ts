import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createServiceReview,
  getReviewByToken,
  submitReview,
  getReviewsByExecutionOrder,
  getReviewStats,
  getReviewsByClientPhone,
  rawExecute,
} from "./db";
import { exigirBancoDeTeste } from "./test-guard";

// ⚠️ ATENÇÃO: este arquivo ESCREVE no banco real (não usa mock).
// A trava abaixo impede execução acidental contra produção — sem ela, rodar
// `pnpm test` com a DATABASE_URL de produção polui a tabela service_reviews
// dos clientes. Ver server/test-guard.ts.
const guarda = exigirBancoDeTeste();
const d = guarda.temBanco ? describe : describe.skip;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PREFIXO_TESTE = "test-token-";
function makeToken() {
  return `${PREFIXO_TESTE}${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
d("Service Reviews", () => {
  let token: string;

  beforeEach(() => {
    token = makeToken();
  });

  // Limpa o que este arquivo criou — antes ficava resíduo acumulando no banco.
  afterAll(async () => {
    await rawExecute(`DELETE FROM service_reviews WHERE token LIKE ?`, [`${PREFIXO_TESTE}%`]);
  }, 30_000);

  it("creates a review link with a unique token", async () => {
    const result = await createServiceReview({
      executionOrderId: 9999,
      token,
      clientName: "João Teste",
      clientPhone: "11999990001",
      serviceDescription: "Limpeza de sofá",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("retrieves a review by token before submission", async () => {
    await createServiceReview({
      executionOrderId: 9999,
      token,
      clientName: "Maria Teste",
      clientPhone: "11999990002",
      serviceDescription: "Limpeza de tapete",
    });

    const review = await getReviewByToken(token);
    expect(review).not.toBeNull();
    expect(review!.clientName).toBe("Maria Teste");
    expect(review!.rating).toBeNull();
    expect(review!.respondedAt).toBeNull();
  });

  it("returns null for an unknown token", async () => {
    const review = await getReviewByToken("nonexistent-token-xyz");
    expect(review).toBeNull();
  });

  it("submits a review with rating and comment", async () => {
    await createServiceReview({
      executionOrderId: 9999,
      token,
      clientName: "Carlos Teste",
      clientPhone: "11999990003",
      serviceDescription: "Higienização de colchão",
    });

    const result = await submitReview(token, 5, "Excelente serviço!");
    expect(result.success).toBe(true);

    const review = await getReviewByToken(token);
    expect(review!.rating).toBe(5);
    expect(review!.comment).toBe("Excelente serviço!");
    expect(review!.respondedAt).not.toBeNull();
  });

  it("submits a review without comment", async () => {
    await createServiceReview({
      executionOrderId: 9999,
      token,
      clientName: "Ana Teste",
      clientPhone: "11999990004",
      serviceDescription: "Limpeza geral",
    });

    await submitReview(token, 4);
    const review = await getReviewByToken(token);
    expect(review!.rating).toBe(4);
    expect(review!.comment).toBeNull();
  });

  it("retrieves reviews by execution order", async () => {
    const osId = 88888;
    const t1 = makeToken();
    const t2 = makeToken();

    await createServiceReview({ executionOrderId: osId, token: t1, clientName: "Cliente A", clientPhone: null, serviceDescription: null });
    await createServiceReview({ executionOrderId: osId, token: t2, clientName: "Cliente B", clientPhone: null, serviceDescription: null });
    await submitReview(t1, 5);
    await submitReview(t2, 3);

    const reviews = await getReviewsByExecutionOrder(osId);
    expect(reviews.length).toBeGreaterThanOrEqual(2);
  });

  it("retrieves reviews by client phone", async () => {
    const phone = "11999990099";
    const t1 = makeToken();
    const t2 = makeToken();

    await createServiceReview({ executionOrderId: 9999, token: t1, clientName: "Fone Teste", clientPhone: phone, serviceDescription: "Serviço 1" });
    await createServiceReview({ executionOrderId: 9999, token: t2, clientName: "Fone Teste", clientPhone: phone, serviceDescription: "Serviço 2" });
    await submitReview(t1, 5, "Ótimo!");
    await submitReview(t2, 4);

    const reviews = await getReviewsByClientPhone(phone);
    expect(reviews.length).toBeGreaterThanOrEqual(2);
    expect(reviews.every(r => r.clientPhone === phone)).toBe(true);
  });

  it("calculates review stats correctly", async () => {
    const t1 = makeToken();
    const t2 = makeToken();
    const t3 = makeToken();

    await createServiceReview({ executionOrderId: 9999, token: t1, clientName: "Stats A", clientPhone: null, serviceDescription: null });
    await createServiceReview({ executionOrderId: 9999, token: t2, clientName: "Stats B", clientPhone: null, serviceDescription: null });
    await createServiceReview({ executionOrderId: 9999, token: t3, clientName: "Stats C (pending)", clientPhone: null, serviceDescription: null });
    await submitReview(t1, 5);
    await submitReview(t2, 3);
    // t3 não respondido

    const stats = await getReviewStats();
    expect(stats.total).toBeGreaterThanOrEqual(2);
    expect(stats.responded).toBeGreaterThanOrEqual(2);
    expect(stats.avgRating).toBeGreaterThan(0);
    expect(stats.avgRating).toBeLessThanOrEqual(5);
  });
});
