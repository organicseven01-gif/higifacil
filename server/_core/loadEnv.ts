/**
 * Carrega o .env — deve ser o PRIMEIRO import do entrypoint do servidor.
 *
 * Por que não usar `import "dotenv/config"` direto?
 * Porque ele procura o .env no diretório de trabalho atual (process.cwd()), e
 * o servidor pode ser iniciado de outra pasta (o ambiente de preview, por
 * exemplo, roda a partir do diretório pai do projeto). Quando isso acontecia,
 * o .env não era encontrado, `DATABASE_URL` ficava vazia e o app subia "sem
 * banco" — o que aparecia como erro confuso na interface, tipo "e-mail ou
 * senha inválidos" no login (porque a consulta de credenciais não retornava
 * nada, em vez de falhar dizendo que não havia conexão).
 *
 * Aqui procuramos o .env subindo os diretórios a partir da localização deste
 * arquivo, o que funciona tanto em desenvolvimento (server/_core/) quanto no
 * build de produção (dist/).
 *
 * Este módulo é separado de propósito: em ESM todos os imports são avaliados
 * antes do código do módulo, então carregar o .env dentro do index.ts não
 * funcionaria — módulos como `_core/env.ts` leem process.env no momento do
 * import e já teriam capturado valores vazios.
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(): string | null {
  let dir = import.meta.dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dotenv.config(); // fallback: comportamento padrão (procura no cwd)
  return null;
}

export const loadedEnvPath = loadEnvFile();

/** Log de diagnóstico: mostra se o banco foi configurado, sem expor segredos. */
export function logEnvDiagnostics() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  let dbInfo = "NÃO CONFIGURADO (app roda sem banco)";
  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      dbInfo = `${u.hostname}:${u.port || "(padrão)"}${u.pathname}`;
    } catch {
      dbInfo = "definida (formato não reconhecido como URL)";
    }
  }
  console.log(`[env] arquivo: ${loadedEnvPath ?? "(nenhum .env encontrado — usando variáveis do sistema)"}`);
  console.log(`[env] DATABASE_URL: ${dbInfo}`);
  console.log(`[env] JWT_SECRET: ${process.env.JWT_SECRET ? "definido" : "NÃO DEFINIDO (login não vai funcionar)"}`);
}
