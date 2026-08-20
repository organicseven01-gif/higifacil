/**
 * Validação do AMBIENTE DE TESTE — somente leitura (não altera nada).
 *
 * Confere:
 *  1. Conexão e versão do banco
 *  2. Inventário de tabelas vs. o que o schema/código espera
 *  3. Dados de teste por empresa
 *  4. Varredura de vazamento: linhas órfãs (companyId NULL) e tabelas
 *     isoladas por empresa vs. tabelas globais
 *
 * Uso: node scripts/validar-ambiente-teste.mjs
 */
import "dotenv/config";
import fs from "node:fs";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definida");
  process.exit(1);
}
const ssl = url.includes("tidbcloud.com")
  ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
  : undefined;
const c = await mysql.createConnection({ uri: url, ...(ssl ? { ssl } : {}) });

const linha = (t) => console.log(`\n${"=".repeat(60)}\n${t}\n${"=".repeat(60)}`);

// ─── 1. Conexão ───────────────────────────────────────────────────────────────
linha("1. CONEXAO");
const [[info]] = await c.query("SELECT VERSION() v, DATABASE() db");
console.log(`Versao : ${info.v}`);
console.log(`Banco  : ${info.db}`);

// ─── 2. Inventário de tabelas ────────────────────────────────────────────────
linha("2. TABELAS");
const [tabelas] = await c.query(
  `SELECT table_name AS nome FROM information_schema.tables
   WHERE table_schema = DATABASE() ORDER BY table_name`
);
const nomesNoBanco = tabelas.map((t) => t.nome ?? t.NOME ?? Object.values(t)[0]);
console.log(`Total no banco: ${nomesNoBanco.length}`);

// O que o schema.ts declara
const schemaSrc = fs.readFileSync("drizzle/schema.ts", "utf8");
const noSchema = [...schemaSrc.matchAll(/mysqlTable\("([^"]+)"/g)].map((m) => m[1]);
// Tabelas usadas em SQL cru no servidor (fora do schema)
const extras = ["demo_bookings", "default_services_catalog"];
const esperadas = [...new Set([...noSchema, ...extras])];

const faltando = esperadas.filter((t) => !nomesNoBanco.includes(t));
const sobrando = nomesNoBanco.filter((t) => !esperadas.includes(t));
console.log(`Declaradas no schema.ts        : ${noSchema.length}`);
console.log(`Extras esperadas (SQL cru)     : ${extras.join(", ")}`);
console.log(`FALTANDO no banco              : ${faltando.length ? faltando.join(", ") : "nenhuma ✔"}`);
console.log(`No banco mas nao esperadas     : ${sobrando.length ? sobrando.join(", ") : "nenhuma ✔"}`);

// ─── 3. Dados por empresa ────────────────────────────────────────────────────
linha("3. DADOS POR EMPRESA");
const [empresas] = await c.query(
  `SELECT id, name, planType, subscriptionStatus, active FROM companies ORDER BY id`
);
for (const e of empresas) {
  const [[cred]] = await c.query(
    `SELECT COUNT(*) n FROM company_credentials WHERE companyId = ?`, [e.id]
  );
  const [[subusuarios]] = await c.query(
    `SELECT COUNT(*) n FROM company_users WHERE companyId = ?`, [e.id]
  );
  const [[cli]] = await c.query(`SELECT COUNT(*) n FROM clients WHERE companyId = ?`, [e.id]);
  const [[orc]] = await c.query(`SELECT COUNT(*) n FROM budgets WHERE companyId = ?`, [e.id]);
  const [[itens]] = await c.query(
    `SELECT COUNT(*) n FROM budget_items WHERE budgetId IN (SELECT id FROM budgets WHERE companyId = ?)`,
    [e.id]
  );
  const [[srv]] = await c.query(`SELECT COUNT(*) n FROM services WHERE companyId = ?`, [e.id]);
  const [[vnd]] = await c.query(`SELECT COUNT(*) n FROM sales WHERE companyId = ?`, [e.id]);
  const [[exec]] = await c.query(`SELECT COUNT(*) n FROM execution_orders WHERE companyId = ?`, [e.id]);
  const [[tap]] = await c.query(`SELECT COUNT(*) n FROM carpet_orders WHERE companyId = ?`, [e.id]);
  console.log(
    `\n[id=${e.id}] ${e.name}  (plano ${e.planType}/${e.subscriptionStatus}, ativa=${e.active})\n` +
      `   login(owner)=${cred.n}  subusuarios=${subusuarios.n}  clientes=${cli.n}  ` +
      `orcamentos=${orc.n} (itens=${itens.n})  servicos=${srv.n}  vendas=${vnd.n}  ` +
      `execucoes=${exec.n}  tapetes=${tap.n}`
  );
}

// ─── 4. Varredura de isolamento ──────────────────────────────────────────────
linha("4. ISOLAMENTO: ORFAOS E TABELAS GLOBAIS");

// Tabelas que possuem coluna companyId
const [colunas] = await c.query(
  `SELECT table_name AS t FROM information_schema.columns
   WHERE table_schema = DATABASE() AND column_name = 'companyId'
   ORDER BY table_name`
);
const comCompanyId = colunas.map((r) => r.t ?? Object.values(r)[0]);
console.log(`Tabelas COM companyId (${comCompanyId.length}):`);
console.log("  " + comCompanyId.join(", "));

// Órfãos: linhas com companyId NULL (perigo em multiempresa)
let totalOrfaos = 0;
const orfaosPorTabela = [];
for (const t of comCompanyId) {
  const [[r]] = await c.query(`SELECT COUNT(*) n FROM \`${t}\` WHERE companyId IS NULL`);
  if (r.n > 0) {
    orfaosPorTabela.push(`${t}=${r.n}`);
    totalOrfaos += r.n;
  }
}
console.log(`\nLinhas ORFAS (companyId NULL): ${totalOrfaos === 0 ? "nenhuma ✔" : orfaosPorTabela.join(", ")}`);

// Tabelas de dados de negócio SEM companyId → compartilhadas entre empresas
const semIsolamentoConhecidas = [
  "competitor_criteria",
  "competitor_scores",
  "carpet_tags",
];
console.log(`\nTabelas de negocio SEM companyId (compartilhadas entre empresas):`);
for (const t of semIsolamentoConhecidas) {
  if (!nomesNoBanco.includes(t)) continue;
  const [[r]] = await c.query(`SELECT COUNT(*) n FROM \`${t}\``);
  console.log(`  ${t}: ${r.n} linha(s)  ${r.n > 0 ? "⚠ visivel para todas as empresas" : "(vazia — sem impacto hoje)"}`);
}

await c.end();
console.log("\nValidacao concluida (nenhum dado foi alterado).");
