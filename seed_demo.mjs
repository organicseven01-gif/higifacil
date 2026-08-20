import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load env
dotenv.config({ path: '.env' });
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);
const CID = 60002;

console.log('Connected! Starting seed...');

// Helper
async function run(sql, params = []) {
  try {
    await conn.execute(sql, params);
    console.log('✓', sql.substring(0, 60));
  } catch (e) {
    console.error('✗', sql.substring(0, 60), e.message);
  }
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
await run(`UPDATE settings SET value = ? WHERE companyId = ? AND \`key\` = 'monthlyGoal'`, ['8000', CID]);
// If no rows updated, insert
const [rows] = await conn.execute(`SELECT id FROM settings WHERE companyId = ? AND \`key\` = 'monthlyGoal'`, [CID]);
if (rows.length === 0) {
  await run(`INSERT INTO settings (\`key\`, value, companyId) VALUES ('monthlyGoal', '8000', ?)`, [CID]);
}

// PIX key
const [pixRows] = await conn.execute(`SELECT id FROM settings WHERE companyId = ? AND \`key\` = 'pixKey'`, [CID]);
if (pixRows.length === 0) {
  await run(`INSERT INTO settings (\`key\`, value, companyId) VALUES ('pixKey', '14988383685', ?)`, [CID]);
} else {
  await run(`UPDATE settings SET value = '14988383685' WHERE companyId = ? AND \`key\` = 'pixKey'`, [CID]);
}

const [pixTypeRows] = await conn.execute(`SELECT id FROM settings WHERE companyId = ? AND \`key\` = 'pixKeyType'`, [CID]);
if (pixTypeRows.length === 0) {
  await run(`INSERT INTO settings (\`key\`, value, companyId) VALUES ('pixKeyType', 'phone', ?)`, [CID]);
} else {
  await run(`UPDATE settings SET value = 'phone' WHERE companyId = ? AND \`key\` = 'pixKeyType'`, [CID]);
}

// ─── VERIFY EXISTING DATA ─────────────────────────────────────────────────────
const [existingClients] = await conn.execute(`SELECT COUNT(*) as cnt FROM clients WHERE companyId = ?`, [CID]);
const [existingSales] = await conn.execute(`SELECT COUNT(*) as cnt FROM sales WHERE companyId = ?`, [CID]);
const [existingExec] = await conn.execute(`SELECT COUNT(*) as cnt FROM execution_orders WHERE companyId = ?`, [CID]);
const [existingComp] = await conn.execute(`SELECT COUNT(*) as cnt FROM competitors WHERE companyId = ?`, [CID]);

console.log(`Existing: clients=${existingClients[0].cnt}, sales=${existingSales[0].cnt}, execution=${existingExec[0].cnt}, competitors=${existingComp[0].cnt}`);

// ─── SERVICES (if not exist) ───────────────────────────────────────────────────
const [existingServices] = await conn.execute(`SELECT id, name FROM services WHERE companyId = ?`, [CID]);
let serviceMap = {};
for (const s of existingServices) serviceMap[s.name] = s.id;

const servicesToInsert = [
  ['Higienização Sofá 2 Lugares', 180.00, 'Higienização'],
  ['Higienização Sofá 3 Lugares', 220.00, 'Higienização'],
  ['Higienização Sofá 4 Lugares', 280.00, 'Higienização'],
  ['Higienização Sofá 5+ Lugares', 350.00, 'Higienização'],
  ['Impermeabilização Sofá 2 Lugares', 120.00, 'Impermeabilização'],
  ['Impermeabilização Sofá 3 Lugares', 150.00, 'Impermeabilização'],
  ['Higienização Colchão Solteiro', 150.00, 'Higienização'],
  ['Higienização Colchão Casal', 200.00, 'Higienização'],
  ['Higienização Colchão Queen/King', 250.00, 'Higienização'],
  ['Higienização Poltrona', 120.00, 'Higienização'],
  ['Higienização Cadeira', 60.00, 'Higienização'],
  ['Higienização Tapete até 2m²', 80.00, 'Higienização'],
  ['Higienização Tapete 2-4m²', 120.00, 'Higienização'],
  ['Higienização + Impermeabilização Sofá 3L', 350.00, 'Combo'],
  ['Higienização + Impermeabilização Sofá 4L', 420.00, 'Combo'],
];

for (const [name, price, category] of servicesToInsert) {
  if (!serviceMap[name]) {
    const [result] = await conn.execute(
      `INSERT INTO services (name, price, category, companyId) VALUES (?, ?, ?, ?)`,
      [name, price, category, CID]
    );
    serviceMap[name] = result.insertId;
    console.log(`✓ Service: ${name}`);
  }
}

// ─── CLIENTS (if not enough) ──────────────────────────────────────────────────
if (existingClients[0].cnt < 20) {
  const clientsData = [
    ['Natasha Ferreira', '14988383685', 'Rua das Flores, 123 - Bauru/SP', 'Sofá 3 lugares bege, colchão casal'],
    ['Ana Paula Rodrigues', '14977112233', 'Av. Nações Unidas, 456 - Bauru/SP', 'Sofá retrátil cinza'],
    ['Mariana Costa', '14966223344', 'Rua XV de Novembro, 789 - Bauru/SP', 'Poltrona e sofá 2 lugares'],
    ['Fernanda Lima', '14955334455', 'Rua Araújo Leite, 321 - Bauru/SP', 'Colchão queen e tapete'],
    ['Juliana Alves', '14944445566', 'Av. Rodrigues Alves, 654 - Bauru/SP', 'Sofá 4 lugares + impermeabilização'],
    ['Roberto Souza', '14933556677', 'Rua Batista de Carvalho, 987 - Bauru/SP', 'Sofá em L grande'],
    ['Carlos Eduardo', '14922667788', 'Rua Gustavo Maciel, 147 - Bauru/SP', 'Colchão solteiro x2'],
    ['Patricia Mendes', '14911778899', 'Rua Araújo Leite, 258 - Bauru/SP', 'Sofá 3 lugares + poltrona'],
    ['Luciana Pereira', '14900889900', 'Av. Duque de Caxias, 369 - Bauru/SP', 'Tapete 3x4m + sofá'],
    ['Marcos Oliveira', '14988990011', 'Rua Henrique Savi, 741 - Bauru/SP', 'Sofá retrátil + colchão casal'],
    ['Beatriz Santos', '14977001122', 'Rua Araújo Leite, 852 - Bauru/SP', 'Sofá 2 lugares + cadeiras'],
    ['Thiago Martins', '14966112233', 'Av. Nações Unidas, 963 - Bauru/SP', 'Sofá 5 lugares'],
    ['Camila Ferreira', '14955223344', 'Rua XV de Novembro, 174 - Bauru/SP', 'Colchão casal + travesseiros'],
    ['Diego Barbosa', '14944334455', 'Rua Batista de Carvalho, 285 - Bauru/SP', 'Sofá 3 lugares cinza'],
    ['Renata Gomes', '14933445566', 'Av. Rodrigues Alves, 396 - Bauru/SP', 'Poltrona + sofá 2 lugares'],
    ['Eduardo Lima', '14922556677', 'Rua Araújo Leite, 507 - Bauru/SP', 'Sofá em L + impermeabilização'],
    ['Aline Nascimento', '14911667788', 'Rua Gustavo Maciel, 618 - Bauru/SP', 'Colchão queen + sofá'],
    ['Rafael Costa', '14900778899', 'Av. Duque de Caxias, 729 - Bauru/SP', 'Sofá 4 lugares bege'],
    ['Vanessa Ribeiro', '14988889900', 'Rua Henrique Savi, 840 - Bauru/SP', 'Sofá retrátil + poltrona'],
    ['Lucas Carvalho', '14977990011', 'Rua das Flores, 951 - Bauru/SP', 'Colchão solteiro + sofá 2L'],
    ['Isabela Moreira', '14966001122', 'Av. Nações Unidas, 162 - Bauru/SP', 'Sofá 3 lugares + tapete'],
    ['Felipe Araújo', '14955112233', 'Rua XV de Novembro, 273 - Bauru/SP', 'Sofá 5 lugares + impermeabilização'],
    ['Gabriela Teixeira', '14944223344', 'Rua Batista de Carvalho, 384 - Bauru/SP', 'Colchão casal + sofá'],
    ['Henrique Dias', '14933334455', 'Av. Rodrigues Alves, 495 - Bauru/SP', 'Sofá em L cinza'],
    ['Larissa Freitas', '14922445566', 'Rua Araújo Leite, 606 - Bauru/SP', 'Poltrona + cadeiras'],
    ['Bruno Cardoso', '14911556677', 'Rua Gustavo Maciel, 717 - Bauru/SP', 'Sofá 3 lugares + colchão'],
    ['Tatiana Rocha', '14900667788', 'Av. Duque de Caxias, 828 - Bauru/SP', 'Sofá 4 lugares + tapete'],
    ['Anderson Silva', '14988778899', 'Rua Henrique Savi, 939 - Bauru/SP', 'Colchão queen + poltrona'],
    ['Priscila Nunes', '14977889900', 'Rua das Flores, 50 - Bauru/SP', 'Sofá retrátil + impermeabilização'],
    ['Rodrigo Monteiro', '14966990011', 'Av. Nações Unidas, 161 - Bauru/SP', 'Sofá 2 lugares + cadeiras'],
  ];

  for (const [name, phone, address, notes] of clientsData) {
    await run(
      `INSERT INTO clients (name, phone, address, notes, companyId) VALUES (?, ?, ?, ?, ?)`,
      [name, phone, address, notes, CID]
    );
  }
}

// Get client IDs
const [allClients] = await conn.execute(`SELECT id, name FROM clients WHERE companyId = ? LIMIT 30`, [CID]);
const clients = allClients;

// ─── SALES (receitas) ─────────────────────────────────────────────────────────
if (existingSales[0].cnt < 30) {
  const salesData = [
    // Semana 1 (1-7 junho)
    [1, clients[0]?.id, clients[0]?.name, clients[0]?.phone || '14988383685', 350.00, 'pix', 350.00, 'paid', 'receita', 'Higienização + Impermeabilização Sofá 3L', '2026-06-02 10:00:00'],
    [2, clients[1]?.id, clients[1]?.name, clients[1]?.phone || '14977112233', 220.00, 'pix', 220.00, 'paid', 'receita', 'Higienização Sofá 3 Lugares', '2026-06-02 14:00:00'],
    [3, clients[2]?.id, clients[2]?.name, clients[2]?.phone || '14966223344', 280.00, 'cash', 280.00, 'paid', 'receita', 'Higienização Sofá 4 Lugares', '2026-06-03 09:00:00'],
    [4, clients[3]?.id, clients[3]?.name, clients[3]?.phone || '14955334455', 200.00, 'pix', 200.00, 'paid', 'receita', 'Higienização Colchão Casal', '2026-06-03 14:00:00'],
    [5, clients[4]?.id, clients[4]?.name, clients[4]?.phone || '14944445566', 420.00, 'pix', 420.00, 'paid', 'receita', 'Higienização + Impermeabilização Sofá 4L', '2026-06-04 09:00:00'],
    [6, clients[5]?.id, clients[5]?.name, clients[5]?.phone || '14933556677', 350.00, 'card', 350.00, 'paid', 'receita', 'Higienização Sofá 5+ Lugares', '2026-06-05 10:00:00'],
    [7, clients[6]?.id, clients[6]?.name, clients[6]?.phone || '14922667788', 300.00, 'pix', 300.00, 'paid', 'receita', 'Higienização Colchão Solteiro x2', '2026-06-05 14:00:00'],
    [8, clients[7]?.id, clients[7]?.name, clients[7]?.phone || '14911778899', 340.00, 'pix', 340.00, 'paid', 'receita', 'Higienização Sofá 3L + Poltrona', '2026-06-06 09:00:00'],
    [9, clients[8]?.id, clients[8]?.name, clients[8]?.phone || '14900889900', 200.00, 'cash', 200.00, 'paid', 'receita', 'Higienização Tapete 2-4m²', '2026-06-07 10:00:00'],
    // Semana 2 (8-14 junho)
    [10, clients[9]?.id, clients[9]?.name, clients[9]?.phone || '14988990011', 420.00, 'pix', 420.00, 'paid', 'receita', 'Sofá Retrátil + Colchão Casal', '2026-06-09 09:00:00'],
    [11, clients[10]?.id, clients[10]?.name, clients[10]?.phone || '14977001122', 240.00, 'pix', 240.00, 'paid', 'receita', 'Sofá 2L + Cadeiras', '2026-06-09 14:00:00'],
    [12, clients[11]?.id, clients[11]?.name, clients[11]?.phone || '14966112233', 350.00, 'card', 350.00, 'paid', 'receita', 'Higienização Sofá 5 Lugares', '2026-06-10 09:00:00'],
    [13, clients[12]?.id, clients[12]?.name, clients[12]?.phone || '14955223344', 250.00, 'pix', 250.00, 'paid', 'receita', 'Colchão Casal + Travesseiros', '2026-06-10 14:00:00'],
    [14, clients[13]?.id, clients[13]?.name, clients[13]?.phone || '14944334455', 220.00, 'cash', 220.00, 'paid', 'receita', 'Higienização Sofá 3 Lugares', '2026-06-11 09:00:00'],
    [15, clients[14]?.id, clients[14]?.name, clients[14]?.phone || '14933445566', 240.00, 'pix', 240.00, 'paid', 'receita', 'Poltrona + Sofá 2 Lugares', '2026-06-12 10:00:00'],
    [16, clients[15]?.id, clients[15]?.name, clients[15]?.phone || '14922556677', 470.00, 'pix', 470.00, 'paid', 'receita', 'Sofá em L + Impermeabilização', '2026-06-13 09:00:00'],
    [17, clients[16]?.id, clients[16]?.name, clients[16]?.phone || '14911667788', 450.00, 'card', 450.00, 'paid', 'receita', 'Colchão Queen + Sofá', '2026-06-14 10:00:00'],
    // Semana 3 (15-21 junho)
    [18, clients[17]?.id, clients[17]?.name, clients[17]?.phone || '14900778899', 280.00, 'pix', 280.00, 'paid', 'receita', 'Sofá 4 Lugares Bege', '2026-06-16 09:00:00'],
    [19, clients[18]?.id, clients[18]?.name, clients[18]?.phone || '14988889900', 370.00, 'pix', 370.00, 'paid', 'receita', 'Sofá Retrátil + Poltrona', '2026-06-17 09:00:00'],
    [20, clients[19]?.id, clients[19]?.name, clients[19]?.phone || '14977990011', 230.00, 'cash', 230.00, 'paid', 'receita', 'Colchão Solteiro + Sofá 2L', '2026-06-17 14:00:00'],
    [21, clients[20]?.id, clients[20]?.name, clients[20]?.phone || '14966001122', 300.00, 'pix', 300.00, 'paid', 'receita', 'Sofá 3L + Tapete', '2026-06-18 09:00:00'],
    [22, clients[21]?.id, clients[21]?.name, clients[21]?.phone || '14955112233', 500.00, 'pix', 500.00, 'paid', 'receita', 'Sofá 5L + Impermeabilização', '2026-06-19 09:00:00'],
    [23, clients[22]?.id, clients[22]?.name, clients[22]?.phone || '14944223344', 420.00, 'card', 420.00, 'paid', 'receita', 'Colchão Casal + Sofá', '2026-06-20 10:00:00'],
    [24, clients[23]?.id, clients[23]?.name, clients[23]?.phone || '14933334455', 350.00, 'pix', 350.00, 'paid', 'receita', 'Sofá em L Cinza', '2026-06-21 09:00:00'],
    // Semana 4 (22-30 junho - agendados)
    [25, clients[24]?.id, clients[24]?.name, clients[24]?.phone || '14922445566', 180.00, 'pix', 0.00, 'pending', 'receita', 'Poltrona + Cadeiras', '2026-06-23 09:00:00'],
    [26, clients[25]?.id, clients[25]?.name, clients[25]?.phone || '14911556677', 420.00, 'pix', 0.00, 'pending', 'receita', 'Sofá 3L + Colchão', '2026-06-24 09:00:00'],
    [27, clients[26]?.id, clients[26]?.name, clients[26]?.phone || '14900667788', 400.00, 'pix', 0.00, 'pending', 'receita', 'Sofá 4L + Tapete', '2026-06-25 10:00:00'],
    [28, clients[27]?.id, clients[27]?.name, clients[27]?.phone || '14988778899', 450.00, 'pix', 0.00, 'pending', 'receita', 'Colchão Queen + Poltrona', '2026-06-26 09:00:00'],
    [29, clients[28]?.id, clients[28]?.name, clients[28]?.phone || '14977889900', 480.00, 'pix', 0.00, 'pending', 'receita', 'Sofá Retrátil + Impermeabilização', '2026-06-27 09:00:00'],
    [30, clients[29]?.id, clients[29]?.name, clients[29]?.phone || '14966990011', 240.00, 'pix', 0.00, 'pending', 'receita', 'Sofá 2L + Cadeiras', '2026-06-28 10:00:00'],
  ];

  for (const [code, clientId, clientName, clientPhone, total, method, received, status, type, desc, date] of salesData) {
    if (!clientName) continue;
    await run(
      `INSERT INTO sales (saleCode, clientId, clientName, clientPhone, total, paymentMethod, amountReceived, paymentStatus, transactionType, description, saleDate, companyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, clientId || null, clientName, clientPhone, total, method, received, status, type, desc, date, CID]
    );
  }
}

// ─── EXECUTION ORDERS ─────────────────────────────────────────────────────────
if (existingExec[0].cnt < 40) {
  // Get sale IDs
  const [allSales] = await conn.execute(
    `SELECT id, saleCode, clientId, clientName, clientPhone, total, paymentMethod, amountReceived, paymentStatus FROM sales WHERE companyId = ? AND transactionType = 'receita' ORDER BY saleCode LIMIT 30`,
    [CID]
  );

  const execData = [
    // Dias passados (concluídos)
    [1, '2026-06-02', '09:00', 'Rua das Flores, 123 - Bauru/SP', 'completed'],
    [2, '2026-06-02', '14:00', 'Av. Nações Unidas, 456 - Bauru/SP', 'completed'],
    [3, '2026-06-03', '09:00', 'Rua XV de Novembro, 789 - Bauru/SP', 'completed'],
    [4, '2026-06-03', '14:00', 'Rua Araújo Leite, 321 - Bauru/SP', 'completed'],
    [5, '2026-06-04', '09:00', 'Av. Rodrigues Alves, 654 - Bauru/SP', 'completed'],
    [6, '2026-06-05', '10:00', 'Rua Batista de Carvalho, 987 - Bauru/SP', 'completed'],
    [7, '2026-06-05', '14:00', 'Rua Gustavo Maciel, 147 - Bauru/SP', 'completed'],
    [8, '2026-06-06', '09:00', 'Rua Araújo Leite, 258 - Bauru/SP', 'completed'],
    [9, '2026-06-07', '10:00', 'Av. Duque de Caxias, 369 - Bauru/SP', 'completed'],
    [10, '2026-06-09', '09:00', 'Rua Henrique Savi, 741 - Bauru/SP', 'completed'],
    [11, '2026-06-09', '14:00', 'Rua Araújo Leite, 852 - Bauru/SP', 'completed'],
    // Hoje (09/06) e dias futuros (pendentes)
    [12, '2026-06-09', '16:00', 'Av. Nações Unidas, 963 - Bauru/SP', 'pending'],
    [13, '2026-06-10', '09:00', 'Rua XV de Novembro, 174 - Bauru/SP', 'pending'],
    [14, '2026-06-10', '14:00', 'Rua Batista de Carvalho, 285 - Bauru/SP', 'pending'],
    [15, '2026-06-11', '09:00', 'Av. Rodrigues Alves, 396 - Bauru/SP', 'pending'],
    [16, '2026-06-12', '10:00', 'Rua Araújo Leite, 507 - Bauru/SP', 'pending'],
    [17, '2026-06-13', '09:00', 'Rua Gustavo Maciel, 618 - Bauru/SP', 'pending'],
    [18, '2026-06-14', '10:00', 'Av. Duque de Caxias, 729 - Bauru/SP', 'pending'],
    [19, '2026-06-16', '09:00', 'Rua Henrique Savi, 840 - Bauru/SP', 'pending'],
    [20, '2026-06-17', '09:00', 'Rua das Flores, 951 - Bauru/SP', 'pending'],
    [21, '2026-06-17', '14:00', 'Av. Nações Unidas, 162 - Bauru/SP', 'pending'],
    [22, '2026-06-18', '09:00', 'Rua XV de Novembro, 273 - Bauru/SP', 'pending'],
    [23, '2026-06-19', '09:00', 'Rua Batista de Carvalho, 384 - Bauru/SP', 'pending'],
    [24, '2026-06-20', '10:00', 'Av. Rodrigues Alves, 495 - Bauru/SP', 'pending'],
    [25, '2026-06-21', '09:00', 'Rua Araújo Leite, 606 - Bauru/SP', 'pending'],
    [26, '2026-06-23', '09:00', 'Rua Gustavo Maciel, 717 - Bauru/SP', 'pending'],
    [27, '2026-06-24', '09:00', 'Av. Duque de Caxias, 828 - Bauru/SP', 'pending'],
    [28, '2026-06-25', '10:00', 'Rua Henrique Savi, 939 - Bauru/SP', 'pending'],
    [29, '2026-06-26', '09:00', 'Rua das Flores, 50 - Bauru/SP', 'pending'],
    [30, '2026-06-27', '09:00', 'Av. Nações Unidas, 161 - Bauru/SP', 'pending'],
  ];

  for (let i = 0; i < execData.length; i++) {
    const [idx, date, time, address, status] = execData[i];
    const sale = allSales[i];
    if (!sale) continue;

    const serviceDesc = sale.description || 'Higienização de estofados';
    await run(
      `INSERT INTO execution_orders (orderNumber, saleId, clientId, clientName, clientPhone, serviceDescription, address, scheduledDate, scheduledTime, status, totalAmount, paymentMethod, amountReceived, paymentStatus, companyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idx, sale.id, sale.clientId || null, sale.clientName, sale.clientPhone || '',
        serviceDesc, address, date, time,
        status, sale.total, sale.paymentMethod, sale.amountReceived, sale.paymentStatus,
        CID
      ]
    );
  }
}

// ─── BUDGETS ──────────────────────────────────────────────────────────────────
const [existingBudgets] = await conn.execute(`SELECT COUNT(*) as cnt FROM budgets WHERE companyId = ?`, [CID]);
if (existingBudgets[0].cnt < 10) {
  const budgetsData = [
    [clients[0]?.name, clients[0]?.phone || '14988383685', 350.00, 'approved', '2026-06-01'],
    [clients[1]?.name, clients[1]?.phone || '14977112233', 220.00, 'approved', '2026-06-01'],
    [clients[2]?.name, clients[2]?.phone || '14966223344', 280.00, 'approved', '2026-06-02'],
    [clients[4]?.name, clients[4]?.phone || '14944445566', 420.00, 'approved', '2026-06-03'],
    [clients[5]?.name, clients[5]?.phone || '14933556677', 350.00, 'approved', '2026-06-04'],
    [clients[20]?.name, clients[20]?.phone || '14966001122', 300.00, 'pending', '2026-06-08'],
    [clients[21]?.name, clients[21]?.phone || '14955112233', 500.00, 'pending', '2026-06-08'],
    [clients[22]?.name, clients[22]?.phone || '14944223344', 420.00, 'pending', '2026-06-09'],
    ['Maria Aparecida', '14988111222', 260.00, 'pending', '2026-06-09'],
    ['José Roberto', '14977222333', 180.00, 'rejected', '2026-06-05'],
    ['Sandra Mara', '14966333444', 450.00, 'pending', '2026-06-09'],
    ['Paulo Henrique', '14955444555', 320.00, 'pending', '2026-06-08'],
  ];

  for (let i = 0; i < budgetsData.length; i++) {
    const [name, phone, total, status, date] = budgetsData[i];
    if (!name) continue;
    await run(
      `INSERT INTO budgets (budgetCode, clientName, clientPhone, total, status, validUntil, companyId) VALUES (?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL 7 DAY), ?)`,
      [i + 1, name, phone, total, status, date, CID]
    );
  }
}

console.log('\n✅ Seed completed successfully!');
await conn.end();
