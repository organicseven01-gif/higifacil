-- Isolamento multiempresa: adiciona companyId (NOT NULL + FK) nas 3 tabelas
-- que eram compartilhadas entre TODAS as empresas do SaaS.
--
-- Contexto: competitor_criteria, competitor_scores e carpet_tags não tinham
-- coluna de empresa. Qualquer empresa via e editava os registros das outras
-- (critérios de comparação, notas dadas a concorrentes e etiquetas de tapete).
--
-- Seguro rodar: as três tabelas estavam VAZIAS no momento da aplicação, então
-- não houve necessidade de backfill. Se em algum ambiente elas tiverem dados,
-- rodar ANTES o backfill do companyId correto e só depois aplicar o NOT NULL
-- (ver bloco comentado no final).

ALTER TABLE `competitor_criteria` ADD COLUMN `companyId` int NOT NULL;
ALTER TABLE `competitor_criteria`
  ADD CONSTRAINT `fk_competitor_criteria_company`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`);

ALTER TABLE `competitor_scores` ADD COLUMN `companyId` int NOT NULL;
ALTER TABLE `competitor_scores`
  ADD CONSTRAINT `fk_competitor_scores_company`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`);

ALTER TABLE `carpet_tags` ADD COLUMN `companyId` int NOT NULL;
ALTER TABLE `carpet_tags`
  ADD CONSTRAINT `fk_carpet_tags_company`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`);

-- ─────────────────────────────────────────────────────────────────────────────
-- SE A TABELA TIVER DADOS (ex: na migração dos dados reais da Manus), usar
-- esta ordem em vez do ALTER direto acima:
--
--   1) ALTER TABLE `x` ADD COLUMN `companyId` int NULL;
--   2) UPDATE `x` SET `companyId` = <id_da_empresa_dona>;   -- backfill
--      -- para competitor_scores, o dono sai do concorrente:
--      -- UPDATE competitor_scores s JOIN competitors c ON c.id = s.competitorId
--      --   SET s.companyId = c.companyId WHERE c.companyId IS NOT NULL;
--   3) confirmar que não sobrou NULL:
--      SELECT COUNT(*) FROM `x` WHERE `companyId` IS NULL;   -- precisa ser 0
--   4) ALTER TABLE `x` MODIFY `companyId` int NOT NULL;
--   5) adicionar a FOREIGN KEY.
-- ─────────────────────────────────────────────────────────────────────────────
