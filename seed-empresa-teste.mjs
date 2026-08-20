/**
 * Seed: Empresa Fictícia de Teste - "Limpa Fácil Higienização"
 * Gera dados realistas de 6 meses (set/2025 a fev/2026)
 * 
 * Uso: node seed-empresa-teste.mjs
 */

import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ DATABASE_URL não definida');
  process.exit(1);
}

const conn = await createConnection(DB_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateMonthsAgo(months, dayOffset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

function dateStr(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function mysqlDatetime(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ─── 1. Criar a empresa ───────────────────────────────────────────────────────

console.log('🏢 Criando empresa fictícia...');

const [existingCompany] = await conn.execute(
  "SELECT id FROM companies WHERE name = 'Limpa Fácil Higienização'"
);

let companyId;
if (existingCompany.length > 0) {
  companyId = existingCompany[0].id;
  console.log(`  ↩️  Empresa já existe (id=${companyId}), reutilizando.`);
} else {
  const [result] = await conn.execute(
    `INSERT INTO companies (name, cnpj, email, phone, plan, subscriptionStatus, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'professional', 'active', 1, NOW(), NOW())`,
    [
      'Limpa Fácil Higienização',
      '12.345.678/0001-99',
      'contato@limpafacil.com.br',
      '(11) 99876-5432',
    ]
  );
  companyId = result.insertId;
  console.log(`  ✅ Empresa criada (id=${companyId})`);
}

// ─── 2. Criar credenciais de login ────────────────────────────────────────────

const EMAIL = 'demo@limpafacil.com.br';
const SENHA = 'demo1234';

const [existingCred] = await conn.execute(
  'SELECT id FROM company_credentials WHERE companyId = ?',
  [companyId]
);

if (existingCred.length === 0) {
  const hash = await bcrypt.hash(SENHA, 10);
  await conn.execute(
    `INSERT INTO company_credentials (companyId, email, passwordHash, createdAt, updatedAt)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [companyId, EMAIL, hash]
  );
  console.log(`  ✅ Credenciais criadas: ${EMAIL} / ${SENHA}`);
} else {
  console.log(`  ↩️  Credenciais já existem.`);
}

// ─── 3. Criar serviços ────────────────────────────────────────────────────────

console.log('🔧 Criando serviços...');

const servicosBase = [
  { name: 'Sofá 2 lugares', price: 180.00, category: 'Estofados' },
  { name: 'Sofá 3 lugares', price: 240.00, category: 'Estofados' },
  { name: 'Sofá 4 lugares', price: 300.00, category: 'Estofados' },
  { name: 'Poltrona', price: 120.00, category: 'Estofados' },
  { name: 'Cadeira de escritório', price: 90.00, category: 'Estofados' },
  { name: 'Colchão casal', price: 280.00, category: 'Colchões' },
  { name: 'Colchão solteiro', price: 200.00, category: 'Colchões' },
  { name: 'Tapete até 4m²', price: 150.00, category: 'Tapetes' },
  { name: 'Tapete 4-9m²', price: 220.00, category: 'Tapetes' },
  { name: 'Cadeirão reclinável', price: 160.00, category: 'Estofados' },
];

const serviceIds = [];
for (let i = 0; i < servicosBase.length; i++) {
  const s = servicosBase[i];
  const [existing] = await conn.execute(
    'SELECT id FROM services WHERE name = ? AND companyId = ?',
    [s.name, companyId]
  );
  if (existing.length > 0) {
    serviceIds.push(existing[0].id);
  } else {
    const [r] = await conn.execute(
      `INSERT INTO services (serviceCode, name, price, category, active, companyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [i + 1, s.name, s.price, s.category, companyId]
    );
    serviceIds.push(r.insertId);
  }
}
console.log(`  ✅ ${servicosBase.length} serviços criados`);

// ─── 4. Criar clientes ────────────────────────────────────────────────────────

console.log('👥 Criando clientes...');

const clientesBase = [
  { name: 'Ana Paula Ferreira', phone: '(11) 98765-1001', city: 'São Paulo', neighborhood: 'Moema' },
  { name: 'Carlos Eduardo Souza', phone: '(11) 97654-2002', city: 'São Paulo', neighborhood: 'Lapa' },
  { name: 'Fernanda Lima', phone: '(11) 96543-3003', city: 'São Paulo', neighborhood: 'Pinheiros' },
  { name: 'Roberto Alves', phone: '(11) 95432-4004', city: 'São Paulo', neighborhood: 'Santana' },
  { name: 'Juliana Martins', phone: '(11) 94321-5005', city: 'São Paulo', neighborhood: 'Tatuapé' },
  { name: 'Marcos Oliveira', phone: '(11) 93210-6006', city: 'São Paulo', neighborhood: 'Vila Madalena' },
  { name: 'Patrícia Costa', phone: '(11) 92109-7007', city: 'São Paulo', neighborhood: 'Perdizes' },
  { name: 'Diego Nascimento', phone: '(11) 91098-8008', city: 'São Paulo', neighborhood: 'Ipiranga' },
  { name: 'Camila Rodrigues', phone: '(11) 90987-9009', city: 'São Paulo', neighborhood: 'Butantã' },
  { name: 'Thiago Pereira', phone: '(11) 89876-0010', city: 'São Paulo', neighborhood: 'Jabaquara' },
  { name: 'Letícia Santos', phone: '(11) 88765-1011', city: 'São Paulo', neighborhood: 'Saúde' },
  { name: 'Bruno Carvalho', phone: '(11) 87654-2012', city: 'São Paulo', neighborhood: 'Consolação' },
  { name: 'Aline Mendes', phone: '(11) 86543-3013', city: 'São Paulo', neighborhood: 'Bela Vista' },
  { name: 'Gustavo Ribeiro', phone: '(11) 85432-4014', city: 'São Paulo', neighborhood: 'Liberdade' },
  { name: 'Renata Gomes', phone: '(11) 84321-5015', city: 'São Paulo', neighborhood: 'Jardins' },
  { name: 'Felipe Araújo', phone: '(11) 83210-6016', city: 'São Paulo', neighborhood: 'Morumbi' },
  { name: 'Vanessa Dias', phone: '(11) 82109-7017', city: 'São Paulo', neighborhood: 'Campo Belo' },
  { name: 'Lucas Barbosa', phone: '(11) 81098-8018', city: 'São Paulo', neighborhood: 'Santo André' },
  { name: 'Mariana Freitas', phone: '(11) 80987-9019', city: 'São Paulo', neighborhood: 'Osasco' },
  { name: 'Eduardo Pinto', phone: '(11) 79876-0020', city: 'São Paulo', neighborhood: 'Guarulhos' },
];

const clientIds = [];
for (const c of clientesBase) {
  const [existing] = await conn.execute(
    'SELECT id FROM clients WHERE phone = ? AND companyId = ?',
    [c.phone, companyId]
  );
  if (existing.length > 0) {
    clientIds.push(existing[0].id);
  } else {
    const [r] = await conn.execute(
      `INSERT INTO clients (name, phone, city, neighborhood, companyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [c.name, c.phone, c.city, c.neighborhood, companyId]
    );
    clientIds.push(r.insertId);
  }
}
console.log(`  ✅ ${clientesBase.length} clientes criados`);

// ─── 5. Criar orçamentos + vendas + OS de execução (6 meses) ─────────────────

console.log('📋 Criando orçamentos, vendas e OS (6 meses de histórico)...');

const paymentMethods = ['pix', 'pix', 'pix', 'card_1x', 'card_2x', 'card_3x', 'cash'];
const serviceDescriptions = [
  'Sofá 3 lugares + 2 poltronas',
  'Colchão casal + travesseiros',
  'Sofá 4 lugares + cadeirão',
  'Tapete sala + sofá 2 lugares',
  'Sofá 2 lugares + cadeira escritório',
  'Colchão solteiro + poltrona',
  'Sofá 3 lugares',
  'Tapete 6m² + sofá 3 lugares',
  'Cadeirão reclinável + sofá 2 lugares',
  'Colchão casal + sofá 3 lugares',
];

let budgetCount = 0;
let saleCount = 0;
let osCount = 0;

// 6 meses: de 5 meses atrás até hoje
for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
  // Quantidade de orçamentos por mês (cresce ao longo do tempo)
  const qtdOrcamentos = rnd(8, 15);
  
  for (let i = 0; i < qtdOrcamentos; i++) {
    const client = clientesBase[rnd(0, clientIds.length - 1)];
    const clientId = clientIds[clientesBase.indexOf(client)];
    const dayOffset = rnd(0, 25);
    const budgetDate = dateMonthsAgo(monthsAgo, dayOffset);
    
    // Serviços do orçamento (1-3 itens)
    const qtdItens = rnd(1, 3);
    const itens = [];
    let subtotal = 0;
    for (let j = 0; j < qtdItens; j++) {
      const svcIdx = rnd(0, servicosBase.length - 1);
      const svc = servicosBase[svcIdx];
      const qty = rnd(1, 2);
      const price = svc.price * (1 + rnd(-10, 15) / 100); // variação de ±10-15%
      const itemSubtotal = Math.round(price * qty * 100) / 100;
      subtotal += itemSubtotal;
      itens.push({ serviceId: serviceIds[svcIdx], name: svc.name, qty, price, subtotal: itemSubtotal });
    }
    
    const discount = rnd(0, 1) === 1 ? Math.round(subtotal * rnd(5, 10) / 100 * 100) / 100 : 0;
    const total = Math.round((subtotal - discount) * 100) / 100;
    
    // 75% dos orçamentos são aceitos/vendidos, 15% recusados, 10% pendentes
    const rand = rnd(1, 100);
    let status = 'pending';
    let sold = false;
    if (rand <= 75) { status = 'accepted'; sold = true; }
    else if (rand <= 90) { status = 'rejected'; }
    
    const [budgetResult] = await conn.execute(
      `INSERT INTO budgets (budgetNumber, clientId, clientName, clientPhone, clientAddress, subtotal, discountType, discountValue, total, status, sold, soldAt, validDays, companyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'fixed', ?, ?, ?, ?, ?, 7, ?, ?, ?)`,
      [
        ++budgetCount,
        clientId,
        client.name,
        client.phone,
        `${client.neighborhood}, ${client.city} - SP`,
        subtotal.toFixed(2),
        discount.toFixed(2),
        total.toFixed(2),
        status,
        sold ? 1 : 0,
        sold ? mysqlDatetime(budgetDate) : null,
        companyId,
        mysqlDatetime(budgetDate),
        mysqlDatetime(budgetDate),
      ]
    );
    const budgetId = budgetResult.insertId;
    
    // Inserir itens do orçamento
    for (const item of itens) {
      await conn.execute(
        `INSERT INTO budget_items (budgetId, serviceId, name, quantity, unitPrice, subtotal, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [budgetId, item.serviceId, item.name, item.qty, item.price.toFixed(2), item.subtotal.toFixed(2), mysqlDatetime(budgetDate)]
      );
    }
    
    // Se vendido, criar venda
    if (sold) {
      const payMethod = pick(paymentMethods);
      const saleDate = new Date(budgetDate);
      saleDate.setDate(saleDate.getDate() + rnd(0, 2));
      
      // 80% pagos, 20% pendentes
      const isPaid = rnd(1, 10) <= 8;
      const amountReceived = isPaid ? total : 0;
      
      const [saleResult] = await conn.execute(
        `INSERT INTO sales (saleCode, budgetId, transactionType, description, clientName, clientPhone, clientId, total, paymentMethod, amountReceived, paymentStatus, saleDate, companyId, createdAt, updatedAt)
         VALUES (?, ?, 'receita', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ++saleCount,
          budgetId,
          pick(serviceDescriptions),
          client.name,
          client.phone,
          clientId,
          total.toFixed(2),
          payMethod,
          amountReceived.toFixed(2),
          isPaid ? 'paid' : 'pending',
          mysqlDatetime(saleDate),
          companyId,
          mysqlDatetime(saleDate),
          mysqlDatetime(saleDate),
        ]
      );
      const saleId = saleResult.insertId;
      
      // Criar OS de execução
      const osDate = new Date(saleDate);
      osDate.setDate(osDate.getDate() + rnd(1, 7));
      const isDone = osDate < new Date(); // se a data já passou, está concluída
      
      await conn.execute(
        `INSERT INTO execution_orders (orderNumber, saleId, clientId, clientName, clientPhone, street, neighborhood, city, state, serviceDescription, totalValue, scheduledDate, scheduledTime, status, assignedTo, companyId, completedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ++osCount,
          saleId,
          clientId,
          client.name,
          client.phone,
          `Rua ${pick(['das Flores', 'dos Pinheiros', 'da Paz', 'São João', 'Paulista'])}, ${rnd(10, 999)}`,
          client.neighborhood,
          client.city,
          pick(serviceDescriptions),
          total.toFixed(2),
          dateStr(osDate),
          `${rnd(8, 17).toString().padStart(2, '0')}:00`,
          isDone ? 'done' : 'pending',
          pick(['Carlos Técnico', 'Marcos Técnico', 'André Técnico', 'Paulo Técnico']),
          companyId,
          isDone ? mysqlDatetime(osDate) : null,
          mysqlDatetime(osDate),
          mysqlDatetime(osDate),
        ]
      );
    }
  }
}

console.log(`  ✅ ${budgetCount} orçamentos criados`);
console.log(`  ✅ ${saleCount} vendas criadas`);
console.log(`  ✅ ${osCount} OS de execução criadas`);

// ─── 6. Criar alguns tapetes ──────────────────────────────────────────────────

console.log('🧹 Criando pedidos de tapetes...');

const carpetTypes = ['Persa', 'Sisal', 'Felpudo', 'Vinil', 'Lã'];
let carpetCount = 0;

for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
  const qtd = rnd(3, 8);
  for (let i = 0; i < qtd; i++) {
    const client = clientesBase[rnd(0, clientIds.length - 1)];
    const collectedDate = dateMonthsAgo(monthsAgo, rnd(0, 20));
    const expectedDelivery = new Date(collectedDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + rnd(3, 7));
    const deliveredAt = new Date(expectedDelivery);
    deliveredAt.setDate(deliveredAt.getDate() + rnd(-1, 2));
    
    const width = (rnd(10, 30) / 10).toFixed(1);
    const length = (rnd(15, 40) / 10).toFixed(1);
    const sqm = (parseFloat(width) * parseFloat(length)).toFixed(2);
    const price = (parseFloat(sqm) * rnd(25, 45)).toFixed(2);
    
    const isDelivered = deliveredAt < new Date();
    
    await conn.execute(
      `INSERT INTO carpet_orders (orderNumber, clientName, clientPhone, carpetType, carpetSize, collectedAt, expectedDelivery, deliveredAt, status, price, paid, companyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ++carpetCount,
        client.name,
        client.phone,
        pick(carpetTypes),
        `${width}x${length}m`,
        mysqlDatetime(collectedDate),
        mysqlDatetime(expectedDelivery),
        isDelivered ? mysqlDatetime(deliveredAt) : null,
        isDelivered ? 'delivered' : pick(['collected', 'washing', 'ready']),
        price,
        isDelivered ? 1 : rnd(0, 1),
        companyId,
        mysqlDatetime(collectedDate),
        mysqlDatetime(collectedDate),
      ]
    );
  }
}

console.log(`  ✅ ${carpetCount} pedidos de tapetes criados`);

// ─── 7. Criar configurações básicas ──────────────────────────────────────────

console.log('⚙️  Criando configurações...');

const configsToInsert = [
  { key: `company_name_${companyId}`, value: 'Limpa Fácil Higienização' },
  { key: `pix_key_${companyId}`, value: '12.345.678/0001-99' },
  { key: `whatsapp_${companyId}`, value: '(11) 99876-5432' },
];

for (const cfg of configsToInsert) {
  const [existing] = await conn.execute(
    'SELECT id FROM settings WHERE `key` = ? AND companyId = ?',
    [cfg.key, companyId]
  );
  if (existing.length === 0) {
    await conn.execute(
      'INSERT INTO settings (`key`, value, companyId, updatedAt) VALUES (?, ?, ?, NOW())',
      [cfg.key, cfg.value, companyId]
    );
  }
}
console.log(`  ✅ Configurações criadas`);

// ─── Resumo ───────────────────────────────────────────────────────────────────

await conn.end();

console.log('\n' + '='.repeat(60));
console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
console.log('='.repeat(60));
console.log(`\n📊 Empresa criada:`);
console.log(`   Nome:  Limpa Fácil Higienização`);
console.log(`   ID:    ${companyId}`);
console.log(`\n🔑 Credenciais de acesso:`);
console.log(`   URL:   /entrar`);
console.log(`   Email: ${EMAIL}`);
console.log(`   Senha: ${SENHA}`);
console.log(`\n📈 Dados gerados (6 meses):`);
console.log(`   Clientes:    ${clientesBase.length}`);
console.log(`   Serviços:    ${servicosBase.length}`);
console.log(`   Orçamentos:  ${budgetCount}`);
console.log(`   Vendas:      ${saleCount}`);
console.log(`   OS Execução: ${osCount}`);
console.log(`   Tapetes:     ${carpetCount}`);
console.log('='.repeat(60));
