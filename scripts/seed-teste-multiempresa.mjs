/**
 * Seed de AMBIENTE DE TESTE — cria duas empresas fictícias (A e B) para
 * validar o isolamento multiempresa do HigiFácil.
 *
 * ⚠️ NÃO usa nenhum dado real. NÃO deve ser executado contra o banco de
 * produção. Aborta se a DATABASE_URL não parecer de teste.
 *
 * Uso:
 *   node scripts/seed-teste-multiempresa.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✖ DATABASE_URL não definida. Preencha o .env antes de rodar.");
  process.exit(1);
}

// Trava de segurança: evita rodar sem intenção explícita contra um banco
// que não tenha "teste"/"test"/"staging"/"dev" no nome.
const dbNameMatch = DATABASE_URL.match(/\/([^/?]+)(\?|$)/);
const dbName = dbNameMatch ? dbNameMatch[1] : "";
const looksLikeTest = /teste|test|staging|dev|sandbox/i.test(dbName);
if (!looksLikeTest && process.env.SEED_CONFIRM !== "sim") {
  console.error(
    `✖ O banco "${dbName}" não parece ser de teste.\n` +
      `  Para evitar escrever em produção por acidente, este script exige que\n` +
      `  o nome do banco contenha teste/test/staging/dev/sandbox, ou que você\n` +
      `  rode com SEED_CONFIRM=sim para confirmar explicitamente.`
  );
  process.exit(1);
}

const ssl = DATABASE_URL.includes("tidbcloud.com")
  ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
  : undefined;

const conn = await mysql.createConnection({ uri: DATABASE_URL, ...(ssl ? { ssl } : {}) });

const SENHA_TESTE = "Teste@1234";
const hash = await bcrypt.hash(SENHA_TESTE, 10);

async function criarEmpresa({ nome, slug, email, cliente, orcamento, servico }) {
  // Empresa
  const [empRes] = await conn.execute(
    `INSERT INTO companies (name, email, slug, plan, planType, subscriptionStatus, active, createdAt, updatedAt)
     VALUES (?, ?, ?, 'trial', 'solo', 'active', 1, NOW(), NOW())`,
    [nome, email, slug]
  );
  const companyId = empRes.insertId;

  // Credencial de login (dono da empresa)
  await conn.execute(
    `INSERT INTO company_credentials (companyId, email, passwordHash, createdAt, updatedAt)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [companyId, email, hash]
  );

  // Sub-usuário (funcionário da empresa) — testa o caminho de login de
  // sub-usuário, que é diferente do login do dono (company_credentials)
  await conn.execute(
    `INSERT INTO company_users (companyId, name, email, passwordHash, role, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'vendedor', 1, NOW(), NOW())`,
    [companyId, `Vendedor ${nome}`, `vendedor.${slug.split("-")[2]}@teste.local`, hash]
  );

  // Serviço
  const [svcRes] = await conn.execute(
    `INSERT INTO services (name, price, category, active, companyId, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, NOW(), NOW())`,
    [servico.nome, servico.preco, "Higienização", companyId]
  );
  const serviceId = svcRes.insertId;

  // Cliente
  const [cliRes] = await conn.execute(
    `INSERT INTO clients (name, phone, email, city, state, companyId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [cliente.nome, cliente.telefone, cliente.email, cliente.cidade, "SP", companyId]
  );
  const clientId = cliRes.insertId;

  // Orçamento + item
  const [orcRes] = await conn.execute(
    `INSERT INTO budgets
       (budgetNumber, clientId, clientName, clientPhone, clientAddress,
        subtotal, discountType, discountValue, total, status, validDays,
        companyId, createdAt, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, 'fixed', '0.00', ?, 'pending', 7, ?, NOW(), NOW())`,
    [
      clientId,
      cliente.nome,
      cliente.telefone,
      orcamento.endereco,
      servico.preco,
      servico.preco,
      companyId,
    ]
  );
  const budgetId = orcRes.insertId;

  await conn.execute(
    `INSERT INTO budget_items (budgetId, serviceId, name, quantity, unitPrice, subtotal, createdAt)
     VALUES (?, ?, ?, 1, ?, ?, NOW())`,
    [budgetId, serviceId, servico.nome, servico.preco, servico.preco]
  );

  return { companyId, clientId, budgetId, serviceId, email };
}

const stamp = Date.now().toString(36);

const empresaA = await criarEmpresa({
  nome: "Empresa Teste A",
  slug: `empresa-teste-a-${stamp}`,
  email: "empresa.a@teste.local",
  servico: { nome: "Higienização Sofá 3 Lugares (A)", preco: "200.00" },
  cliente: {
    nome: "Cliente A da Silva",
    telefone: "11900000001",
    email: "cliente.a@teste.local",
    cidade: "São Paulo",
  },
  orcamento: { endereco: "Rua A de Teste, 100 - São Paulo/SP" },
});

const empresaB = await criarEmpresa({
  nome: "Empresa Teste B",
  slug: `empresa-teste-b-${stamp}`,
  email: "empresa.b@teste.local",
  servico: { nome: "Higienização Colchão Casal (B)", preco: "160.00" },
  cliente: {
    nome: "Cliente B de Souza",
    telefone: "11900000002",
    email: "cliente.b@teste.local",
    cidade: "Campinas",
  },
  orcamento: { endereco: "Rua B de Teste, 200 - Campinas/SP" },
});

console.log("\n✔ Seed de teste criado com sucesso (dados 100% fictícios)\n");
console.log("EMPRESA A:", JSON.stringify(empresaA, null, 2));
console.log("EMPRESA B:", JSON.stringify(empresaB, null, 2));
console.log(`\nLogin de teste (rota /entrar ou /empresa/login):`);
console.log(`  Empresa A (dono)      → empresa.a@teste.local  / ${SENHA_TESTE}`);
console.log(`  Empresa A (vendedor)  → vendedor.a@teste.local  / ${SENHA_TESTE}`);
console.log(`  Empresa B (dono)      → empresa.b@teste.local  / ${SENHA_TESTE}`);
console.log(`  Empresa B (vendedor)  → vendedor.b@teste.local  / ${SENHA_TESTE}`);

await conn.end();
