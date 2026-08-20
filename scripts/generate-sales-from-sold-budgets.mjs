import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // 1. Buscar todos os orçamentos vendidos: sold=true OU status=accepted
    const [budgets] = await connection.execute(
      `SELECT id, budgetNumber, clientName, clientPhone, CAST(total AS CHAR) as total, sold, status, createdAt
       FROM budgets
       WHERE sold = 1 OR status = 'accepted'
       ORDER BY createdAt DESC`
    );

    console.log(`\n=== Orçamentos vendidos (sold=true ou status=accepted): ${budgets.length} ===`);
    for (const b of budgets) {
      console.log(`  #${String(b.budgetNumber ?? b.id).padStart(4,'0')} | ${b.clientName} | R$ ${b.total} | status: ${b.status} | sold: ${b.sold}`);
    }

    if (budgets.length === 0) {
      console.log('\nNenhum orçamento vendido encontrado.');
      await connection.end();
      return;
    }

    // 2. Para cada orçamento vendido, verificar se já existe venda
    let criadas = 0;
    let jaExistiam = 0;

    for (const budget of budgets) {
      const [existingSales] = await connection.execute(
        `SELECT id FROM sales WHERE budgetId = ?`,
        [budget.id]
      );

      if (existingSales.length > 0) {
        console.log(`  ✓ Orçamento #${String(budget.budgetNumber ?? budget.id).padStart(4,'0')} (${budget.clientName}) já tem venda vinculada (sale_id: ${existingSales[0].id})`);
        jaExistiam++;
        continue;
      }

      // 3. Criar venda para este orçamento
      const total = parseFloat(budget.total) || 0;
      const saleDate = new Date(budget.createdAt);

      await connection.execute(
        `INSERT INTO sales (budgetId, clientName, clientPhone, total, paymentMethod, installments, amountReceived, paymentStatus, transactionType, description, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'pix', 1, ?, 'paid', 'receita', ?, NOW(), NOW())`,
        [
          budget.id,
          budget.clientName,
          budget.clientPhone || '',
          budget.total,
          budget.total,
          `Venda - Orçamento #${String(budget.budgetNumber ?? budget.id).padStart(4,'0')}`,
        ]
      );

      console.log(`  ✅ Venda criada para orçamento #${String(budget.budgetNumber ?? budget.id).padStart(4,'0')} (${budget.clientName}) — R$ ${budget.total}`);
      criadas++;
    }

    console.log(`\n=== Resumo ===`);
    console.log(`  Vendas criadas:       ${criadas}`);
    console.log(`  Já existiam:          ${jaExistiam}`);
    console.log(`  Total processados:    ${budgets.length}`);

  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
