-- Torna companyId OBRIGATÓRIO (NOT NULL) nas tabelas raiz de negócio.
--
-- ─── POR QUE ─────────────────────────────────────────────────────────────────
-- Na produção da Manus foram encontrados 15 clientes, 12 orçamentos e 4 vendas
-- gravados SEM empresa. Causa (confirmada no código):
--
--   1. server/_core/trpc.ts define `companyId = null` quando o login é via
--      OAuth da Manus ("dono do sistema", que vê todas as empresas).
--   2. server/db.ts gravava com `...(companyId ? { companyId } : {})` — ou seja,
--      quando companyId era nulo a coluna simplesmente NÃO ia no INSERT, e o
--      registro nascia órfão, sem erro nenhum.
--
-- Antes do multiempresa isso não incomodava (tudo aparecia para todos). Com o
-- isolamento estrito, registro órfão fica INVISÍVEL no sistema.
--
-- Com companyId NOT NULL, o banco recusa o registro órfão — a proteção deixa de
-- depender de alguém lembrar de passar o parâmetro no código.
--
-- ─── TABELAS QUE CONTINUAM ACEITANDO NULL (de propósito) ──────────────────────
--   users            → o dono do sistema não pertence a nenhuma empresa
--   quiz_responses   → respondido antes de a empresa existir
--   app_notifications→ 228 notificações antigas sem empresa não são atribuíveis
--                      com segurança; a função createAppNotification passou a
--                      receber companyId, então as NOVAS sempre terão empresa.
--
-- ─── ⚠️ ORDEM OBRIGATÓRIA EM BANCO COM DADOS ─────────────────────────────────
-- Este arquivo aplica o ALTER direto, o que só funciona se NÃO houver linha com
-- companyId NULL. No banco de teste isso é verdade. Ao restaurar os dados reais
-- em higifacil_import, rodar ANTES o backfill (0022) e só depois este arquivo.
-- Conferir com:
--   SELECT 'clients' t, COUNT(*) n FROM clients WHERE companyId IS NULL
--   UNION ALL SELECT 'budgets', COUNT(*) FROM budgets WHERE companyId IS NULL
--   UNION ALL SELECT 'sales',   COUNT(*) FROM sales   WHERE companyId IS NULL;
-- Todos precisam ser 0.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `service_categories` MODIFY `companyId` int NOT NULL;
ALTER TABLE `services`           MODIFY `companyId` int NOT NULL;
ALTER TABLE `clients`            MODIFY `companyId` int NOT NULL;
ALTER TABLE `budgets`            MODIFY `companyId` int NOT NULL;
ALTER TABLE `settings`           MODIFY `companyId` int NOT NULL;
ALTER TABLE `competitors`        MODIFY `companyId` int NOT NULL;
ALTER TABLE `carpet_orders`      MODIFY `companyId` int NOT NULL;
ALTER TABLE `sales`              MODIFY `companyId` int NOT NULL;
ALTER TABLE `execution_orders`   MODIFY `companyId` int NOT NULL;
ALTER TABLE `teams`              MODIFY `companyId` int NOT NULL;
ALTER TABLE `cancelled_orders`   MODIFY `companyId` int NOT NULL;
ALTER TABLE `preset_messages`    MODIFY `companyId` int NOT NULL;
