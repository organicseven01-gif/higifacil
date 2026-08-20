/**
 * Proteção para testes que escrevem no banco REAL.
 *
 * Alguns testes (reviews, isolamento multiempresa) não usam mock: eles gravam
 * de verdade. Se alguém rodar `pnpm test` com a DATABASE_URL de PRODUÇÃO
 * apontada, esses testes poluiriam a base dos clientes (foi o que aconteceu no
 * banco de teste: 22 avaliações órfãs deixadas para trás).
 *
 * Esta função é a trava: só libera o teste se o banco parecer de teste. Caso
 * contrário, o teste FALHA com mensagem explícita em vez de escrever.
 *
 * Para rodar contra um banco com nome fora do padrão, defina explicitamente
 * ALLOW_DB_TESTS=sim — assim a liberação é sempre uma decisão consciente.
 */

const PADRAO_BANCO_DE_TESTE = /teste|test|staging|dev|sandbox|local/i;

export type ResultadoGuarda = {
  liberado: boolean;
  motivo: string;
  nomeBanco: string;
};

export function verificarBancoDeTeste(): ResultadoGuarda {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    return { liberado: false, motivo: "DATABASE_URL não definida", nomeBanco: "" };
  }

  let nomeBanco = "";
  let host = "";
  try {
    const u = new URL(url);
    nomeBanco = u.pathname.replace(/^\//, "");
    host = u.hostname;
  } catch {
    return { liberado: false, motivo: "DATABASE_URL não é uma URL válida", nomeBanco: "" };
  }

  if (process.env.ALLOW_DB_TESTS === "sim") {
    return { liberado: true, motivo: "liberado explicitamente via ALLOW_DB_TESTS=sim", nomeBanco };
  }

  if (PADRAO_BANCO_DE_TESTE.test(nomeBanco)) {
    return { liberado: true, motivo: `banco "${nomeBanco}" reconhecido como de teste`, nomeBanco };
  }

  return {
    liberado: false,
    nomeBanco,
    motivo:
      `O banco "${nomeBanco}" (host ${host}) NÃO parece ser de teste.\n` +
      `Estes testes ESCREVEM no banco — rodar contra produção poluiria os dados dos clientes.\n` +
      `Se este banco é realmente de teste, renomeie-o incluindo "teste"/"test" ou rode com ALLOW_DB_TESTS=sim.`,
  };
}

/**
 * Usar no início de um describe que escreve no banco:
 *   const guarda = exigirBancoDeTeste();
 *   const d = guarda.liberado ? describe : describe.skip;
 *
 * Quando não há banco configurado, o teste é PULADO (não falha, para não
 * quebrar CI sem banco). Quando há banco mas ele parece de produção, o teste
 * FALHA de propósito — silenciar aí seria perigoso.
 */
export function exigirBancoDeTeste(): ResultadoGuarda & { temBanco: boolean } {
  const r = verificarBancoDeTeste();
  const temBanco = Boolean(process.env.DATABASE_URL);
  if (temBanco && !r.liberado) {
    throw new Error(`\n⛔ TESTE BLOQUEADO POR SEGURANÇA\n${r.motivo}\n`);
  }
  return { ...r, temBanco };
}
