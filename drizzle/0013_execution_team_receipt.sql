-- Adicionar teamId e assignedMemberId à execution_orders
ALTER TABLE `execution_orders`
  ADD COLUMN IF NOT EXISTS `teamId` int,
  ADD COLUMN IF NOT EXISTS `assignedMemberId` int,
  ADD COLUMN IF NOT EXISTS `receiptUrl` text,
  ADD COLUMN IF NOT EXISTS `receiptKey` varchar(500),
  ADD COLUMN IF NOT EXISTS `observations` text,
  ADD COLUMN IF NOT EXISTS `budgetId` int;

-- Adicionar teamId e receiptUrl à upsell_items
ALTER TABLE `upsell_items`
  ADD COLUMN IF NOT EXISTS `isCarpet` boolean NOT NULL DEFAULT false;
