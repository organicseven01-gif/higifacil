-- Backfill dos registros órfãos (companyId NULL) encontrados na produção.
--
-- ⚠️ RODAR SOMENTE NA CÓPIA RESTAURADA (higifacil_import).
--    NUNCA na produção da Manus.
--
-- ⚠️ RODAR ANTES da migration 0021 (que exige companyId NOT NULL).
--
-- ─── CONTEXTO ────────────────────────────────────────────────────────────────
-- Todos os órfãos foram criados a partir de 03/03/2026 — o dia em que a segunda
-- empresa foi criada e o sistema virou multiempresa. Foram gravados enquanto o
-- dono usava o login OAuth da Manus, que não define companyId.
--
-- O dono confirmou que TODOS pertencem à empresa 1 (SOS Limpa Tudo Estofados).
-- O rastreamento por telefone corroborou em 6 dos 15 clientes (telefone batendo
-- com orçamento/venda/execução da empresa 1) e nos orçamentos/vendas ligados.
--
-- Quantidades esperadas (medidas na produção em 14/08/2026):
--   clients            15
--   budgets            12
--   sales               4
--   cancelled_orders    1
--   app_notifications 228  (tratadas à parte — ver final)
-- ─────────────────────────────────────────────────────────────────────────────

-- Confirme o id da empresa dona antes de rodar:
SET @EMPRESA_DONA = 1;  -- SOS Limpa Tudo Estofados

-- ─── 1. Tabelas raiz ─────────────────────────────────────────────────────────
UPDATE `clients`          SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `budgets`          SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `sales`            SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `cancelled_orders` SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;

-- Estas normalmente não têm órfãos, mas a migration 0021 vai exigir NOT NULL.
-- Se houver alguma linha órfã, ela também pertence à empresa 1 (era a única
-- empresa em operação quando o dado foi criado).
UPDATE `service_categories` SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `services`           SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `settings`           SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `competitors`        SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `carpet_orders`      SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `execution_orders`   SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `teams`              SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;
UPDATE `preset_messages`    SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;

-- ─── 2. carpet_tags (necessário para a migration 0020) ───────────────────────
-- A produção tem 21 etiquetas de tapete sem empresa. A 0020 exige NOT NULL,
-- então precisam de dono. Eram usadas pela empresa 1.
UPDATE `carpet_tags` SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;

-- competitor_criteria e competitor_scores estavam vazias na produção; se por
-- algum motivo tiverem dados, herdam a empresa pelo concorrente:
UPDATE `competitor_scores` s
   JOIN `competitors` c ON c.id = s.competitorId
    SET s.companyId = c.companyId
  WHERE s.companyId IS NULL AND c.companyId IS NOT NULL;
UPDATE `competitor_criteria` SET `companyId` = @EMPRESA_DONA WHERE `companyId` IS NULL;

-- ─── 3. Tabelas filhas (a coluna existe na produção mas o código não a usa) ──
-- Preenchidas por consistência, herdando a empresa do registro pai.
UPDATE `budget_items` bi JOIN `budgets` b ON b.id = bi.budgetId
   SET bi.companyId = b.companyId WHERE bi.companyId IS NULL;

UPDATE `sale_receipts` sr JOIN `sales` s ON s.id = sr.saleId
   SET sr.companyId = s.companyId WHERE sr.companyId IS NULL;

UPDATE `execution_service_items` esi JOIN `execution_orders` eo ON eo.id = esi.executionOrderId
   SET esi.companyId = eo.companyId WHERE esi.companyId IS NULL;

UPDATE `upsell_items` ui JOIN `execution_orders` eo ON eo.id = ui.executionOrderId
   SET ui.companyId = eo.companyId WHERE ui.companyId IS NULL;

UPDATE `execution_photos` ep JOIN `execution_orders` eo ON eo.id = ep.executionOrderId
   SET ep.companyId = eo.companyId WHERE ep.companyId IS NULL;

UPDATE `execution_carpets` ec JOIN `execution_orders` eo ON eo.id = ec.executionOrderId
   SET ec.companyId = eo.companyId WHERE ec.companyId IS NULL;

UPDATE `carpet_photos` cp JOIN `carpet_orders` co ON co.id = cp.carpetOrderId
   SET cp.companyId = co.companyId WHERE cp.companyId IS NULL;

UPDATE `team_members` tm JOIN `teams` t ON t.id = tm.teamId
   SET tm.companyId = t.companyId WHERE tm.companyId IS NULL;

UPDATE `service_reviews` sr JOIN `execution_orders` eo ON eo.id = sr.executionOrderId
   SET sr.companyId = eo.companyId WHERE sr.companyId IS NULL;

-- ─── 4. app_notifications ────────────────────────────────────────────────────
-- 228 notificações antigas sem empresa. As que referenciam uma OS podem herdar
-- a empresa dela; as demais permanecem NULL (a coluna continua aceitando NULL,
-- e notificação órfã apenas não aparece para ninguém — sem perda relevante).
UPDATE `app_notifications` an JOIN `execution_orders` eo ON eo.id = an.referenceId
   SET an.companyId = eo.companyId
 WHERE an.companyId IS NULL AND an.referenceType = 'execution_order';

-- ─── 5. CONFERÊNCIA (precisa retornar 0 em todas antes de rodar a 0021) ──────
-- SELECT 'clients' t, COUNT(*) n FROM clients WHERE companyId IS NULL
-- UNION ALL SELECT 'budgets',           COUNT(*) FROM budgets           WHERE companyId IS NULL
-- UNION ALL SELECT 'sales',             COUNT(*) FROM sales             WHERE companyId IS NULL
-- UNION ALL SELECT 'cancelled_orders',  COUNT(*) FROM cancelled_orders  WHERE companyId IS NULL
-- UNION ALL SELECT 'service_categories',COUNT(*) FROM service_categories WHERE companyId IS NULL
-- UNION ALL SELECT 'services',          COUNT(*) FROM services          WHERE companyId IS NULL
-- UNION ALL SELECT 'settings',          COUNT(*) FROM settings          WHERE companyId IS NULL
-- UNION ALL SELECT 'competitors',       COUNT(*) FROM competitors       WHERE companyId IS NULL
-- UNION ALL SELECT 'carpet_orders',     COUNT(*) FROM carpet_orders     WHERE companyId IS NULL
-- UNION ALL SELECT 'execution_orders',  COUNT(*) FROM execution_orders  WHERE companyId IS NULL
-- UNION ALL SELECT 'teams',             COUNT(*) FROM teams             WHERE companyId IS NULL
-- UNION ALL SELECT 'preset_messages',   COUNT(*) FROM preset_messages   WHERE companyId IS NULL
-- UNION ALL SELECT 'carpet_tags',       COUNT(*) FROM carpet_tags       WHERE companyId IS NULL;
