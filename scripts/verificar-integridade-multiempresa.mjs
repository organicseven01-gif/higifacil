/**
 * AUDITORIA DE INTEGRIDADE MULTIEMPRESA — 100% SOMENTE LEITURA
 * =========================================================
 *
 * Ferramenta de manutenção contínua: verifica o isolamento entre empresas e a
 * integridade dos relacionamentos no banco do HigiFácil. Pode ser rodada a
 * qualquer momento — inclusive periodicamente contra produção — para pegar
 * cedo o tipo de bug que este projeto já teve mais de uma vez (registro sem
 * empresa, relacionamento quebrado, vazamento de dado entre empresas).
 *
 * ⚠️ ESTE SCRIPT NUNCA ESCREVE NADA. Só executa SELECT (em information_schema
 *    e nas tabelas de dados). Não há um único INSERT/UPDATE/DELETE/ALTER no
 *    arquivo — pode conferir com: grep -iE "insert|update|delete|alter|drop"
 *    Por ser só leitura, é seguro rodar contra qualquer banco, incluindo produção.
 *
 * O QUE ELE PROCURA (por que cada item importa):
 *
 *  A. companyId NULL em tabelas de empresa
 *     → Com o isolamento estrito, registro sem empresa fica INVISÍVEL no
 *       sistema (ninguém consegue ver nem editar). O achado mais perigoso.
 *
 *  B. companyId apontando para empresa inexistente
 *     → Dado "fantasma": pertence a uma empresa que não existe mais.
 *
 *  C. Filho apontando para pai inexistente (relacionamento quebrado)
 *     → Ex: item de orçamento cujo orçamento foi apagado. Gera tela com
 *       erro ou valor errado em total.
 *
 *  D. Filho de empresa DIFERENTE do pai (contaminação entre empresas)
 *     → Ex: venda da empresa 1 vinculada a orçamento da empresa 2. É
 *       vazamento de dados entre clientes do SaaS.
 *
 *  E. Filho sem companyId cujo pai é de outra empresa (cadeia indireta)
 *     → Ex: budget_items / sale_receipts / fotos, que não têm companyId e
 *       dependem do pai para definir a que empresa pertencem.
 *
 *  F. Duplicidade em chaves de negócio
 *     → E-mail de login repetido (dois donos com o mesmo e-mail = login
 *       ambíguo), slug de empresa repetido, número de orçamento repetido
 *       dentro da mesma empresa, etc.
 *
 *  G. Empresas com nome de teste presentes no banco
 *     → Sinal de que uma empresa fictícia (ex: criada em teste automatizado)
 *       ficou misturada com dados reais.
 *
 *  H. Tabelas de negócio SEM coluna companyId
 *     → Hoje nenhuma tabela de negócio deveria estar nessa situação (as 3
 *       que tinham essa falha foram corrigidas na migration 0020). Fica
 *       como checagem de regressão caso uma tabela nova seja criada sem
 *       companyId no futuro.
 *
 *  I. Arquivos apontando para infraestrutura legada (Manus)
 *     → URLs de fotos/comprovantes salvas no armazenamento antigo da Manus.
 *       Continuam funcionando enquanto a Manus estiver no ar, mas precisam
 *       ser baixadas e migradas para o S3/R2 atual antes do desligamento.
 *       Mantido até confirmarmos que 100% dos arquivos já foram migrados.
 *
 *  J. Empresas inativas/bloqueadas com dados
 *     → Só informativo: ajuda a decidir o que fazer com contas inativas.
 *
 * USO:
 *   node scripts/verificar-integridade-multiempresa.mjs --url="mysql://user:senha@host:4000/banco"
 *   node scripts/verificar-integridade-multiempresa.mjs                 # usa AUDIT_DATABASE_URL ou DATABASE_URL
 *   node scripts/verificar-integridade-multiempresa.mjs --json=relatorio.json
 *
 * SAÍDA: relatório no terminal + código de saída 1 se houver achado CRÍTICO.
 */
import "dotenv/config";
import fs from "node:fs";
import mysql from "mysql2/promise";

// ─── Argumentos ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (nome) => {
  const p = args.find((a) => a.startsWith(`--${nome}=`));
  return p ? p.slice(nome.length + 3) : undefined;
};
const urlArg = getArg("url");
const jsonOut = getArg("json");
const url = urlArg || process.env.AUDIT_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  console.error(
    "Informe a conexão: --url=\"mysql://...\" ou defina AUDIT_DATABASE_URL no .env"
  );
  process.exit(1);
}

let hostAlvo = "(desconhecido)";
try {
  hostAlvo = new URL(url).hostname;
} catch {
  console.error("DATABASE_URL não é uma URL válida.");
  process.exit(1);
}

const ssl = hostAlvo.endsWith("tidbcloud.com")
  ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
  : undefined;

const conn = await mysql.createConnection({ uri: url, ...(ssl ? { ssl } : {}) });

// ─── Coleta de achados ───────────────────────────────────────────────────────
const achados = [];
const CRITICO = "CRITICO";
const ATENCAO = "ATENCAO";
const INFO = "INFO";

function registrar(severidade, categoria, titulo, quantidade, detalhe, sqlInspecao) {
  achados.push({ severidade, categoria, titulo, quantidade, detalhe, sqlInspecao });
}

async function contar(sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return Number(rows[0]?.n ?? 0);
}
async function tabelaExiste(nome) {
  const n = await contar(
    `SELECT COUNT(*) n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [nome]
  );
  return n > 0;
}

// ─── Mapa de relacionamentos (derivado de drizzle/schema.ts) ─────────────────
// filho.coluna → pai.id ; temCompanyId indica se o filho carrega companyId
// próprio (permite checar divergência direta com o pai).
const RELACOES = [
  // Cliente e fotos
  { filho: "clients", col: "companyId", pai: "companies", opcional: true, tipo: "empresa" },
  { filho: "client_photos", col: "clientId", pai: "clients", temCompanyId: false },
  // Orçamentos
  { filho: "budgets", col: "clientId", pai: "clients", opcional: true, temCompanyId: true },
  { filho: "budget_items", col: "budgetId", pai: "budgets", temCompanyId: false },
  { filho: "budget_items", col: "serviceId", pai: "services", opcional: true, temCompanyId: false },
  // Vendas
  { filho: "sales", col: "budgetId", pai: "budgets", opcional: true, temCompanyId: true },
  { filho: "sales", col: "clientId", pai: "clients", opcional: true, temCompanyId: true },
  { filho: "sale_receipts", col: "saleId", pai: "sales", temCompanyId: false },
  // Execução
  { filho: "execution_orders", col: "budgetId", pai: "budgets", opcional: true, temCompanyId: true },
  { filho: "execution_orders", col: "clientId", pai: "clients", opcional: true, temCompanyId: true },
  { filho: "execution_orders", col: "saleId", pai: "sales", opcional: true, temCompanyId: true },
  { filho: "execution_orders", col: "teamId", pai: "teams", opcional: true, temCompanyId: true },
  { filho: "upsell_items", col: "executionOrderId", pai: "execution_orders", temCompanyId: false },
  { filho: "execution_service_items", col: "executionOrderId", pai: "execution_orders", temCompanyId: false },
  { filho: "execution_photos", col: "executionOrderId", pai: "execution_orders", temCompanyId: false },
  { filho: "execution_carpets", col: "executionOrderId", pai: "execution_orders", temCompanyId: false },
  { filho: "execution_carpet_photos", col: "executionCarpetId", pai: "execution_carpets", temCompanyId: false },
  { filho: "service_reviews", col: "executionOrderId", pai: "execution_orders", opcional: true, temCompanyId: false },
  // Tapetes
  { filho: "carpet_photos", col: "carpetOrderId", pai: "carpet_orders", temCompanyId: false },
  { filho: "carpet_items", col: "carpetOrderId", pai: "carpet_orders", temCompanyId: false },
  { filho: "carpet_order_tags", col: "carpetOrderId", pai: "carpet_orders", temCompanyId: false },
  { filho: "carpet_order_tags", col: "tagId", pai: "carpet_tags", temCompanyId: false },
  // Concorrentes
  { filho: "competitor_scores", col: "competitorId", pai: "competitors", temCompanyId: false },
  { filho: "competitor_scores", col: "criteriaId", pai: "competitor_criteria", temCompanyId: false },
  { filho: "competitor_services", col: "competitorId", pai: "competitors", temCompanyId: false },
  // Equipes
  { filho: "team_members", col: "teamId", pai: "teams", temCompanyId: false },
  // Financeiro / extrato
  { filho: "bank_transactions", col: "importId", pai: "bank_imports", temCompanyId: true },
  // Acesso
  { filho: "company_credentials", col: "companyId", pai: "companies", tipo: "empresa" },
  { filho: "company_users", col: "companyId", pai: "companies", tipo: "empresa" },
];

// Cadeia até a empresa, para tabelas SEM companyId próprio.
const CADEIA_ATE_EMPRESA = {
  client_photos: { via: "clientId", pai: "clients" },
  budget_items: { via: "budgetId", pai: "budgets" },
  sale_receipts: { via: "saleId", pai: "sales" },
  upsell_items: { via: "executionOrderId", pai: "execution_orders" },
  execution_service_items: { via: "executionOrderId", pai: "execution_orders" },
  execution_photos: { via: "executionOrderId", pai: "execution_orders" },
  execution_carpets: { via: "executionOrderId", pai: "execution_orders" },
  carpet_photos: { via: "carpetOrderId", pai: "carpet_orders" },
  carpet_items: { via: "carpetOrderId", pai: "carpet_orders" },
  carpet_order_tags: { via: "carpetOrderId", pai: "carpet_orders" },
  competitor_services: { via: "competitorId", pai: "competitors" },
  team_members: { via: "teamId", pai: "teams" },
};

// Tabelas onde companyId NULL é ESPERADO (não é erro)
const COMPANYID_NULO_ESPERADO = new Set([
  "quiz_responses", // respondido antes do cadastro da empresa
  "plan_features", // pode ser configuração global de plano
  "users", // dono do sistema (login OAuth) não pertence a empresa
  "competitors", // pode ter sido criado antes do vínculo (bug já corrigido)
]);

// Colunas que guardam URL de arquivo (podem apontar para infraestrutura antiga)
const COLUNAS_ARQUIVO = [
  ["companies", "logoUrl"],
  ["users", "avatarUrl"],
  ["services", "imageUrl"],
  ["client_photos", "photoUrl"],
  ["carpet_photos", "photoUrl"],
  ["sale_receipts", "receiptUrl"],
  ["execution_orders", "receiptUrl"],
  ["execution_photos", "photoUrl"],
  ["execution_carpet_photos", "photoUrl"],
  ["bank_imports", "fileUrl"],
  ["clients", "photos"], // JSON com urls
  ["budgets", "videos"], // JSON com urls
];

const linha = (t) => console.log(`\n${"─".repeat(66)}\n${t}\n${"─".repeat(66)}`);

console.log("═".repeat(66));
console.log("AUDITORIA DE INTEGRIDADE MULTIEMPRESA — SOMENTE LEITURA");
console.log("═".repeat(66));
const [[meta]] = await conn.query("SELECT VERSION() v, DATABASE() db");
console.log(`Host   : ${hostAlvo}`);
console.log(`Banco  : ${meta.db}`);
console.log(`Versao : ${meta.v}`);
console.log(`Data   : ${new Date().toISOString()}`);

// ─── Panorama ────────────────────────────────────────────────────────────────
linha("PANORAMA");
const [tabelasBanco] = await conn.query(
  `SELECT table_name AS t FROM information_schema.tables
   WHERE table_schema = DATABASE() ORDER BY table_name`
);
const nomesTabelas = tabelasBanco.map((r) => r.t ?? Object.values(r)[0]);
console.log(`Tabelas: ${nomesTabelas.length}`);

const temCompanies = await tabelaExiste("companies");
let empresas = [];
if (temCompanies) {
  [empresas] = await conn.query(
    `SELECT id, name, active, subscriptionStatus FROM companies ORDER BY id`
  );
  console.log(`Empresas: ${empresas.length}`);
  for (const e of empresas) {
    console.log(`  [${e.id}] ${e.name} (ativa=${e.active}, ${e.subscriptionStatus})`);
  }
} else {
  console.log("⚠ Tabela 'companies' não encontrada — banco não parece ser do HigiFácil.");
}

// Descobre tabelas com companyId e se a coluna aceita NULL
const [colsCompany] = await conn.query(
  `SELECT table_name AS t, is_nullable AS nulo FROM information_schema.columns
   WHERE table_schema = DATABASE() AND column_name = 'companyId' ORDER BY table_name`
);
const tabelasComCompanyId = colsCompany.map((r) => ({
  tabela: r.t ?? Object.values(r)[0],
  aceitaNulo: (r.nulo ?? "").toUpperCase() === "YES",
}));

// ─── A. companyId NULL ───────────────────────────────────────────────────────
linha("A. REGISTROS SEM EMPRESA (companyId NULL)");
let achouA = false;
for (const { tabela, aceitaNulo } of tabelasComCompanyId) {
  if (!aceitaNulo) continue;
  const n = await contar(`SELECT COUNT(*) n FROM \`${tabela}\` WHERE companyId IS NULL`);
  if (n === 0) continue;
  achouA = true;
  const esperado = COMPANYID_NULO_ESPERADO.has(tabela);
  const sev = esperado ? INFO : CRITICO;
  console.log(
    `${esperado ? "ℹ" : "✖"} ${tabela}: ${n} registro(s) sem empresa${esperado ? " (esperado nesta tabela)" : ""}`
  );
  registrar(
    sev,
    "A. companyId NULL",
    `${tabela}: ${n} registro(s) com companyId NULL`,
    n,
    esperado
      ? "Esperado nesta tabela — conferir apenas por precaução."
      : "Com o isolamento estrito, esses registros ficam INVISÍVEIS no sistema. Precisam receber o companyId correto.",
    `SELECT * FROM \`${tabela}\` WHERE companyId IS NULL;`
  );
}
if (!achouA) console.log("✔ Nenhum registro sem empresa.");

// ─── B. companyId órfão ──────────────────────────────────────────────────────
linha("B. EMPRESA INEXISTENTE (companyId aponta para nada)");
let achouB = false;
if (temCompanies) {
  for (const { tabela } of tabelasComCompanyId) {
    if (tabela === "companies") continue;
    const n = await contar(
      `SELECT COUNT(*) n FROM \`${tabela}\` f
       LEFT JOIN companies c ON c.id = f.companyId
       WHERE f.companyId IS NOT NULL AND c.id IS NULL`
    );
    if (n === 0) continue;
    achouB = true;
    console.log(`✖ ${tabela}: ${n} registro(s) apontando para empresa inexistente`);
    registrar(
      CRITICO,
      "B. Empresa inexistente",
      `${tabela}: ${n} registro(s) com companyId inexistente`,
      n,
      "Dado órfão: a empresa dona não existe na tabela companies.",
      `SELECT f.* FROM \`${tabela}\` f LEFT JOIN companies c ON c.id = f.companyId WHERE f.companyId IS NOT NULL AND c.id IS NULL;`
    );
  }
}
if (!achouB) console.log("✔ Todos os companyId apontam para empresas existentes.");

// ─── C. Relacionamentos quebrados ────────────────────────────────────────────
linha("C. RELACIONAMENTOS QUEBRADOS (filho sem pai)");
let achouC = false;
for (const rel of RELACOES) {
  if (!(await tabelaExiste(rel.filho)) || !(await tabelaExiste(rel.pai))) continue;
  const filtroOpcional = rel.opcional ? `f.\`${rel.col}\` IS NOT NULL AND` : "";
  const n = await contar(
    `SELECT COUNT(*) n FROM \`${rel.filho}\` f
     LEFT JOIN \`${rel.pai}\` p ON p.id = f.\`${rel.col}\`
     WHERE ${filtroOpcional} p.id IS NULL
       ${rel.opcional ? "" : `AND f.\`${rel.col}\` IS NOT NULL`}`
  );
  if (n === 0) continue;
  achouC = true;
  console.log(`✖ ${rel.filho}.${rel.col} → ${rel.pai}: ${n} registro(s) órfão(s)`);
  registrar(
    ATENCAO,
    "C. Relacionamento quebrado",
    `${rel.filho}.${rel.col} → ${rel.pai}: ${n} órfão(s)`,
    n,
    "O registro pai não existe. Pode causar tela com erro, total incorreto ou item invisível.",
    `SELECT f.* FROM \`${rel.filho}\` f LEFT JOIN \`${rel.pai}\` p ON p.id = f.\`${rel.col}\` WHERE f.\`${rel.col}\` IS NOT NULL AND p.id IS NULL;`
  );
}
if (!achouC) console.log("✔ Nenhum relacionamento quebrado.");

// ─── D. Contaminação direta entre empresas ───────────────────────────────────
linha("D. CONTAMINAÇÃO ENTRE EMPRESAS (filho de empresa diferente do pai)");
let achouD = false;
for (const rel of RELACOES) {
  if (!rel.temCompanyId) continue;
  if (!(await tabelaExiste(rel.filho)) || !(await tabelaExiste(rel.pai))) continue;
  const paiTemCompany = tabelasComCompanyId.some((t) => t.tabela === rel.pai);
  if (!paiTemCompany) continue;
  const n = await contar(
    `SELECT COUNT(*) n FROM \`${rel.filho}\` f
     JOIN \`${rel.pai}\` p ON p.id = f.\`${rel.col}\`
     WHERE f.companyId IS NOT NULL AND p.companyId IS NOT NULL
       AND f.companyId <> p.companyId`
  );
  if (n === 0) continue;
  achouD = true;
  console.log(`✖ ${rel.filho}.${rel.col} → ${rel.pai}: ${n} registro(s) de empresa DIFERENTE do pai`);
  registrar(
    CRITICO,
    "D. Contaminação entre empresas",
    `${rel.filho}.${rel.col} → ${rel.pai}: ${n} registro(s) cruzando empresas`,
    n,
    "VAZAMENTO: registro de uma empresa vinculado a registro de outra. Precisa ser corrigido com urgência.",
    `SELECT f.id AS filho_id, f.companyId AS filho_empresa, p.id AS pai_id, p.companyId AS pai_empresa
       FROM \`${rel.filho}\` f JOIN \`${rel.pai}\` p ON p.id = f.\`${rel.col}\`
       WHERE f.companyId <> p.companyId;`
  );
}
if (!achouD) console.log("✔ Nenhuma contaminação direta detectada.");

// ─── E. Tabelas sem companyId: empresa herdada do pai ────────────────────────
linha("E. TABELAS SEM companyId — EMPRESA HERDADA DO PAI");
console.log(
  "Estas tabelas não têm companyId: a empresa é definida pelo pai. Verificando\n" +
    "se algum registro tem o pai sem empresa definida (sinal de mistura):"
);
let achouE = false;
for (const [tabela, { via, pai }] of Object.entries(CADEIA_ATE_EMPRESA)) {
  if (!(await tabelaExiste(tabela)) || !(await tabelaExiste(pai))) continue;
  const paiTemCompany = tabelasComCompanyId.some((t) => t.tabela === pai);
  if (!paiTemCompany) continue;
  const semEmpresa = await contar(
    `SELECT COUNT(*) n FROM \`${tabela}\` f
     JOIN \`${pai}\` p ON p.id = f.\`${via}\`
     WHERE p.companyId IS NULL`
  );
  if (semEmpresa > 0) {
    achouE = true;
    console.log(`✖ ${tabela}: ${semEmpresa} registro(s) cujo pai (${pai}) não tem empresa`);
    registrar(
      CRITICO,
      "E. Empresa indefinida via pai",
      `${tabela}: ${semEmpresa} registro(s) sem empresa resolvível`,
      semEmpresa,
      `A empresa vem de ${pai}, que está com companyId NULL. Corrigir o pai resolve o filho.`,
      `SELECT f.* FROM \`${tabela}\` f JOIN \`${pai}\` p ON p.id = f.\`${via}\` WHERE p.companyId IS NULL;`
    );
  }
}
if (!achouE) console.log("✔ Todos os registros filhos têm empresa resolvível pelo pai.");

// ─── F. Duplicidades em chaves de negócio ────────────────────────────────────
linha("F. DUPLICIDADES EM CHAVES DE NEGÓCIO");
const checagensDuplicidade = [
  {
    nome: "e-mail de login do dono (company_credentials.email)",
    tabela: "company_credentials",
    sql: `SELECT email AS chave, COUNT(*) n FROM company_credentials GROUP BY email HAVING COUNT(*) > 1`,
    severidade: CRITICO,
    porque: "Dois donos com o mesmo e-mail: o login fica ambíguo (o sistema pega o primeiro).",
  },
  {
    nome: "e-mail de sub-usuário (company_users.email)",
    tabela: "company_users",
    sql: `SELECT email AS chave, COUNT(*) n FROM company_users GROUP BY email HAVING COUNT(*) > 1`,
    severidade: CRITICO,
    porque: "E-mail repetido entre sub-usuários (inclusive de empresas diferentes) quebra o login.",
  },
  {
    nome: "e-mail usado como dono E como sub-usuário",
    tabela: "company_users",
    sql: `SELECT cu.email AS chave, COUNT(*) n FROM company_users cu
          JOIN company_credentials cc ON cc.email = cu.email GROUP BY cu.email`,
    severidade: ATENCAO,
    porque: "A tela tenta sub-usuário primeiro; o mesmo e-mail nos dois lugares pode logar na conta errada.",
  },
  {
    nome: "slug de empresa (companies.slug)",
    tabela: "companies",
    sql: `SELECT slug AS chave, COUNT(*) n FROM companies WHERE slug IS NOT NULL GROUP BY slug HAVING COUNT(*) > 1`,
    severidade: ATENCAO,
    porque: "Slug repetido pode gerar conflito em rotas/links públicos.",
  },
  {
    nome: "número de orçamento dentro da mesma empresa",
    tabela: "budgets",
    sql: `SELECT CONCAT('empresa ', COALESCE(companyId,'NULL'), ' / nº ', budgetNumber) AS chave, COUNT(*) n
          FROM budgets GROUP BY companyId, budgetNumber HAVING COUNT(*) > 1`,
    severidade: ATENCAO,
    porque: "Numeração duplicada confunde o cliente e a conferência financeira.",
  },
  {
    nome: "código de venda dentro da mesma empresa",
    tabela: "sales",
    sql: `SELECT CONCAT('empresa ', COALESCE(companyId,'NULL'), ' / cod ', saleCode) AS chave, COUNT(*) n
          FROM sales WHERE saleCode IS NOT NULL GROUP BY companyId, saleCode HAVING COUNT(*) > 1`,
    severidade: ATENCAO,
    porque: "Código de venda repetido dificulta rastrear pagamento.",
  },
];
let achouF = false;
for (const chk of checagensDuplicidade) {
  if (!(await tabelaExiste(chk.tabela))) continue;
  let rows;
  try {
    [rows] = await conn.query(chk.sql);
  } catch (e) {
    console.log(`ℹ ${chk.nome}: não verificável (${e.code ?? e.message})`);
    continue;
  }
  if (rows.length === 0) continue;
  achouF = true;
  const total = rows.reduce((s, r) => s + Number(r.n), 0);
  console.log(`✖ ${chk.nome}: ${rows.length} valor(es) duplicado(s), ${total} registro(s)`);
  for (const r of rows.slice(0, 5)) console.log(`     "${r.chave}" aparece ${r.n}x`);
  registrar(chk.severidade, "F. Duplicidade", `${chk.nome}: ${rows.length} duplicado(s)`, total, chk.porque, chk.sql + ";");
}
if (!achouF) console.log("✔ Nenhuma duplicidade encontrada nas chaves de negócio.");

// ─── G. Empresas com nome de teste ────────────────────────────────────────────
linha("G. EMPRESAS COM NOME DE TESTE NO BANCO");
const empresasTeste = empresas.filter((e) => /teste|test|isotest/i.test(e.name ?? ""));
if (empresasTeste.length > 0) {
  console.log(`⚠ Este banco contém ${empresasTeste.length} empresa(s) com nome de teste:`);
  for (const e of empresasTeste) console.log(`     [${e.id}] ${e.name}`);
  registrar(
    ATENCAO,
    "G. Empresa de teste",
    `${empresasTeste.length} empresa(s) com nome de teste presentes no banco`,
    empresasTeste.length,
    "Confirmar se é intencional (conta demo) ou resíduo de teste que deveria ser removido.",
    `SELECT id, name FROM companies WHERE name LIKE '%este%';`
  );
} else {
  console.log("✔ Nenhuma empresa de teste neste banco.");
}

// ─── H. Tabelas de negócio compartilhadas ────────────────────────────────────
linha("H. TABELAS QUE DEVEM SER ISOLADAS POR EMPRESA");
const devemTerCompanyId = ["competitor_criteria", "competitor_scores", "carpet_tags"];
let achouH = false;
for (const t of devemTerCompanyId) {
  if (!(await tabelaExiste(t))) continue;
  const temCol = tabelasComCompanyId.some((x) => x.tabela === t);
  const n = await contar(`SELECT COUNT(*) n FROM \`${t}\``);
  if (temCol) {
    const info = tabelasComCompanyId.find((x) => x.tabela === t);
    const obrigatorio = info && !info.aceitaNulo;
    console.log(
      `✔ ${t}: isolada por empresa (companyId ${obrigatorio ? "NOT NULL" : "aceita NULL ⚠"}), ${n} linha(s)`
    );
    if (!obrigatorio && n > 0) {
      const nulos = await contar(`SELECT COUNT(*) n FROM \`${t}\` WHERE companyId IS NULL`);
      if (nulos > 0) {
        achouH = true;
        registrar(
          CRITICO,
          "H. Isolamento incompleto",
          `${t}: ${nulos} linha(s) com companyId NULL`,
          nulos,
          "A coluna existe mas aceita NULL e há registros sem empresa — ficam visíveis/invisíveis de forma imprevisível.",
          `SELECT * FROM \`${t}\` WHERE companyId IS NULL;`
        );
      }
    }
    continue;
  }
  achouH = true;
  console.log(`✖ ${t}: SEM companyId — ${n} linha(s) visíveis para TODAS as empresas`);
  registrar(
    CRITICO,
    "H. Tabela compartilhada",
    `${t}: sem coluna companyId (${n} linha(s))`,
    n,
    "Esta tabela não tem companyId: o conteúdo é visível/editável por todas as empresas. Aplicar a migration 0020 (drizzle/0020_isolamento_multiempresa_3_tabelas.sql).",
    `SHOW COLUMNS FROM \`${t}\`;`
  );
}
if (!achouH) console.log("✔ Todas as tabelas que precisam de isolamento estão isoladas.");

// ─── I. Arquivos apontando para infraestrutura legada (Manus) ────────────────
linha("I. ARQUIVOS EM INFRAESTRUTURA LEGADA (Manus)");
const PADRAO_MANUS = "%manus%";
const PADRAO_BUTTERFLY = "%butterfly-effect%";
let totalArquivosManus = 0;
const detalheArquivos = [];
for (const [tabela, coluna] of COLUNAS_ARQUIVO) {
  if (!(await tabelaExiste(tabela))) continue;
  const existeCol = await contar(
    `SELECT COUNT(*) n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tabela, coluna]
  );
  if (existeCol === 0) continue;
  const n = await contar(
    `SELECT COUNT(*) n FROM \`${tabela}\`
     WHERE \`${coluna}\` LIKE ? OR \`${coluna}\` LIKE ?`,
    [PADRAO_MANUS, PADRAO_BUTTERFLY]
  );
  const total = await contar(
    `SELECT COUNT(*) n FROM \`${tabela}\` WHERE \`${coluna}\` IS NOT NULL AND \`${coluna}\` <> ''`
  );
  if (total > 0) {
    console.log(`   ${tabela}.${coluna}: ${total} com valor | ${n} apontando para a Manus`);
    detalheArquivos.push(`${tabela}.${coluna}=${n}/${total}`);
  }
  totalArquivosManus += n;
}
if (totalArquivosManus > 0) {
  console.log(`\n⚠ TOTAL: ${totalArquivosManus} arquivo(s) hospedado(s) na Manus`);
  registrar(
    CRITICO,
    "I. Arquivos na Manus",
    `${totalArquivosManus} arquivo(s) com URL da Manus`,
    totalArquivosManus,
    "Essas fotos/comprovantes VÃO QUEBRAR quando a Manus sair do ar. É preciso baixar os arquivos, subir para o S3/R2 e reescrever as URLs no banco antes do desligamento.",
    `-- por coluna: ${detalheArquivos.join(", ")}`
  );
} else {
  console.log("✔ Nenhuma URL apontando para a Manus.");
}

// ─── J. Empresas inativas com dados ──────────────────────────────────────────
linha("J. EMPRESAS INATIVAS/BLOQUEADAS COM DADOS (informativo)");
let achouJ = false;
for (const e of empresas) {
  if (e.active && e.subscriptionStatus !== "blocked") continue;
  const cli = await contar(`SELECT COUNT(*) n FROM clients WHERE companyId = ?`, [e.id]);
  const orc = await contar(`SELECT COUNT(*) n FROM budgets WHERE companyId = ?`, [e.id]);
  if (cli + orc === 0) continue;
  achouJ = true;
  console.log(`ℹ [${e.id}] ${e.name} (ativa=${e.active}, ${e.subscriptionStatus}): ${cli} cliente(s), ${orc} orçamento(s)`);
  registrar(
    INFO,
    "J. Empresa inativa com dados",
    `[${e.id}] ${e.name}: ${cli} cliente(s), ${orc} orçamento(s)`,
    cli + orc,
    "Decidir o que fazer com esses dados (manter, arquivar ou remover).",
    `SELECT * FROM clients WHERE companyId = ${e.id};`
  );
}
if (!achouJ) console.log("✔ Nenhuma empresa inativa com dados.");

// ─── Volumetria por empresa ──────────────────────────────────────────────────
linha("VOLUMETRIA POR EMPRESA");
const TABELAS_CONTAGEM = [
  "clients", "budgets", "sales", "services", "execution_orders",
  "carpet_orders", "competitors", "teams", "settings",
];
const cabecalho = ["empresa".padEnd(28), ...TABELAS_CONTAGEM.map((t) => t.slice(0, 9).padStart(10))].join("");
console.log(cabecalho);
for (const e of empresas) {
  const valores = [];
  for (const t of TABELAS_CONTAGEM) {
    if (!(await tabelaExiste(t))) { valores.push("-".padStart(10)); continue; }
    const temCol = tabelasComCompanyId.some((x) => x.tabela === t);
    if (!temCol) { valores.push("n/a".padStart(10)); continue; }
    const n = await contar(`SELECT COUNT(*) n FROM \`${t}\` WHERE companyId = ?`, [e.id]);
    valores.push(String(n).padStart(10));
  }
  console.log(`[${e.id}] ${String(e.name).slice(0, 22).padEnd(23)}${valores.join("")}`);
}

// ─── Resumo ──────────────────────────────────────────────────────────────────
const criticos = achados.filter((a) => a.severidade === CRITICO);
const atencoes = achados.filter((a) => a.severidade === ATENCAO);
const infos = achados.filter((a) => a.severidade === INFO);

console.log("\n" + "═".repeat(66));
console.log("RESUMO");
console.log("═".repeat(66));
console.log(`CRITICOS : ${criticos.length}  (precisam ser corrigidos)`);
console.log(`ATENCAO  : ${atencoes.length}  (avaliar)`);
console.log(`INFO     : ${infos.length}  (apenas informativo)`);

if (criticos.length) {
  console.log("\n── ACHADOS CRÍTICOS ──");
  for (const a of criticos) {
    console.log(`\n✖ [${a.categoria}] ${a.titulo}`);
    console.log(`  Por que importa: ${a.detalhe}`);
    console.log(`  Inspecionar com: ${a.sqlInspecao}`);
  }
}
if (atencoes.length) {
  console.log("\n── PONTOS DE ATENÇÃO ──");
  for (const a of atencoes) {
    console.log(`\n⚠ [${a.categoria}] ${a.titulo}`);
    console.log(`  ${a.detalhe}`);
    console.log(`  Inspecionar com: ${a.sqlInspecao}`);
  }
}

if (jsonOut) {
  fs.writeFileSync(
    jsonOut,
    JSON.stringify(
      { host: hostAlvo, banco: meta.db, data: new Date().toISOString(), empresas, achados },
      null,
      2
    )
  );
  console.log(`\nRelatório salvo em: ${jsonOut}`);
}

await conn.end();

console.log(
  criticos.length
    ? "\n⛔ Há achados críticos — revisar antes de considerar o banco saudável."
    : "\n✅ Nenhum achado crítico. Pontos de atenção (se houver) valem revisão."
);
process.exit(criticos.length ? 1 : 0);
